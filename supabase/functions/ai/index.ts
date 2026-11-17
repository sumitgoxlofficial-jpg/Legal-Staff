// Legal Staff AI: AI Case Brain, AI Legal Research and AI Drafting Studio, answered by Groq (OpenAI-compatible API).
// The Groq key never reaches the browser: it is read from the GROQ_API_KEY function secret, or from Vault (secret
// 'groq_api_key', via public.groq_api_key()). Each call costs one AI credit, counted per firm per IST month against the
// plan's allowance (Solo 200, Professional 1,000, Firm 5,000) by public.ai_take_credit(). Case answers use only that case's
// own records, which are read here on the server for a member of the firm.
// Callers: a signed-in member ({ firm_id, mode, question, case_id?, template?, history? }), or a health check
// ({ action: "selftest" } with x-cron-secret). Deploy with JWT verification off; it checks the caller itself.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
class Fail extends Error { status: number; constructor(msg: string, status = 400) { super(msg); this.status = status; } }

// Groq's model list changes over time, so the models are chosen from its live list: GROQ_MODEL if set, then the first
// available of these preferences (large, capable chat models first), then any chat model it offers.
const PREFER = [/gpt-oss-120b/, /llama-3\.3-70b/, /llama-4-maverick/, /kimi-k2/, /qwen3-32b/, /llama-4-scout/, /gpt-oss-20b/, /llama-3\.1-8b/];
let models: string[] | null = null;
async function pickModels(key: string) {
  if (models) return models;
  const r = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: "Bearer " + key } });
  if (r.status === 401) throw new Fail("The AI service rejected the API key. Replace the Groq key.", 502);
  const ids: string[] = ((await r.json().catch(() => ({})))?.data ?? []).map((m: any) => String(m.id))
    .filter((id: string) => !/whisper|tts|guard|embed|vision|playai|orpheus|compound|prompt-guard/i.test(id));
  const chosen: string[] = [];
  const want = Deno.env.get("GROQ_MODEL"); if (want && ids.includes(want)) chosen.push(want);
  for (const re of PREFER) { const id = ids.find((x) => re.test(x)); if (id && !chosen.includes(id)) chosen.push(id); if (chosen.length >= 2) break; }
  for (const id of ids) { if (chosen.length >= 2) break; if (!chosen.includes(id)) chosen.push(id); }
  if (!chosen.length) throw new Fail("No AI model is available on the Groq account.", 502);
  return (models = chosen);
}
const CREDITS: Record<string, number> = { Solo: 200, Professional: 1000, Firm: 5000 };
const NEEDS_PRO: Record<string, boolean> = { brain: true, draft: true };
const istMonth = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 7);
const dmy = (s: string) => /^\d{4}-\d{2}-\d{2}/.test(s ?? "") ? `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}` : (s ?? "");

const RULES = `You are the assistant inside Legal Staff, practice-management software for advocates in India.
Rules you must follow:
- Never invent case law, judgment names, citations, section numbers, dates or facts. If you are not certain a judgment or provision exists and says what you claim, do not state it as fact; say it must be checked.
- Indian criminal law changed on 1 July 2024: the BNS, BNSS and BSA replaced the IPC, CrPC and Evidence Act. When relevant, mention both the old and the new provision and say which applies by date.
- Write in clear, plain English for a practising advocate. Be concise. Use short paragraphs and simple numbered or dashed lists. Do not use markdown symbols such as #, ** or tables.
- Write dates as DD.MM.YYYY.`;

async function groqKey(admin: any) {
  const env = Deno.env.get("GROQ_API_KEY");
  if (env) return env;
  const { data } = await admin.rpc("groq_api_key");
  if (!data) throw new Fail("AI is not set up yet: the Groq API key is missing.", 501);
  return data as string;
}
async function complete(key: string, messages: any[], maxTokens: number) {
  const list = await pickModels(key);
  for (const [i, model] of list.entries()) {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: maxTokens }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return { text: String(j.choices?.[0]?.message?.content ?? "").trim(), model };
    const msg = j?.error?.message ?? `status ${r.status}`;
    // Try the smaller model only if this one is unavailable or busy; anything else (bad key, bad request) stops here.
    if (i < list.length - 1 && (r.status === 404 || r.status === 429 || r.status >= 500 || /model/i.test(msg))) continue;
    if (r.status === 401) throw new Fail("The AI service rejected the API key. Replace the Groq key.", 502);
    if (r.status === 429) throw new Fail("The AI service is busy right now. Please try again in a minute.", 503);
    throw new Fail("The AI service could not answer: " + msg, 502);
  }
  throw new Fail("The AI service is busy right now. Please try again in a minute.", 503);
}

/** The case's own records, as compact text the model can quote from with [source] tags the app turns into links. */
async function caseRecord(admin: any, firmId: string, caseId: string) {
  const { data: rows, error } = await admin.from("records").select("kind,id,data").eq("firm_id", firmId).in("kind", ["case", "client", "hearing", "order", "doc", "task"]);
  if (error) throw error;
  const all = rows ?? [], c = all.find((r: any) => r.kind === "case" && r.id === caseId)?.data;
  if (!c) throw new Fail("That case was not found.", 404);
  const of = (k: string) => all.filter((r: any) => r.kind === k && r.data?.caseId === caseId).map((r: any) => r.data);
  const client = c.clientId ? all.find((r: any) => r.kind === "client" && r.id === c.clientId)?.data : null;
  const L: string[] = [];
  const add = (label: string, v: unknown) => { if (v != null && String(v).trim() !== "" && !(Array.isArray(v) && !v.length)) L.push(`${label}: ${Array.isArray(v) ? v.join("; ") : v}`); };
  L.push(`CASE: ${c.title}${c.no ? " (" + c.no + ")" : ""}`);
  add("Court", c.court); add("CNR", c.cnr); add("Stage", c.stage); add("Status", c.status); add("Filed", c.filed ? dmy(c.filed) : "");
  if (client) add("Client", [client.name, client.contact].filter(Boolean).join(", "));
  add("[Case details › Parties]", (c.parties ?? []).map((p: any) => `${p.name}${p.role ? " (" + p.role + ")" : ""}${p.side ? ", " + p.side : ""}`));
  add("[Case details › Summary]", c.summary);
  add("[Case details › Issues]", c.issues);
  add("[Case details › Our arguments]", c.ourArgs ?? (c.args ? String(c.args).split(/\n+/) : []));
  add("[Case details › Opponent's arguments]", c.oppArgs);
  add("[Case details › Missing documents]", c.missing);
  const orders = of("order").sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
  for (const o of orders.slice(0, 12)) {
    L.push(`[Order ${dmy(o.date)}] ${o.summary ?? ""}${o.nextDate ? ` Next date in the order: ${dmy(o.nextDate)}${o.confirmed ? "" : " (not yet confirmed)"}.` : ""}`);
    (o.paras ?? []).slice(0, 12).forEach((p: string, i: number) => L.push(`  ¶${i + 1}: ${String(p).slice(0, 600)}`));
  }
  const hs = of("hearing").sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));
  for (const h of hs.slice(-15)) L.push(`[Hearing ${dmy(h.date)}] ${h.time ?? ""} ${h.court ?? ""}${h.purpose ? " · " + h.purpose : ""}${h.outcome ? " · Outcome: " + h.outcome + (h.outcomeNote ? " — " + h.outcomeNote : "") : ""}${h.assignee ? " · " + h.assignee : ""}`);
  const docs = of("doc");
  if (docs.length) L.push("[Documents] " + docs.slice(0, 40).map((d: any) => `${d.name}${d.meta ? " (" + String(d.meta).split(" · ")[0] + ")" : ""}`).join("; "));
  const tasks = of("task").filter((t: any) => !t.done);
  if (tasks.length) L.push("[Tasks] " + tasks.slice(0, 20).map((t: any) => `${t.t}${t.due ? " (due " + dmy(t.due) + ")" : ""}${t.who ? " — " + t.who : ""}`).join("; "));
  return { title: c.title as string, text: L.join("\n").slice(0, 24000) };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const body: any = await req.json().catch(() => ({}));
    // Health check for the operator: confirms the key works, spends no firm's credits.
    const hdr = req.headers.get("x-cron-secret");
    if (hdr && body.action === "selftest") {
      const { data: okSecret } = await admin.rpc("cron_secret_ok", { s: hdr });
      if (okSecret !== true) return json({ error: "Not allowed." }, 403);
      const r = await complete(await groqKey(admin), [{ role: "user", content: "Reply with the single word: ready" }], 300);
      return json({ ok: true, model: r.model, models, reply: r.text });
    }

    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) throw new Fail("Sign in again.", 401);
    const { firm_id: firmId, mode, case_id: caseId } = body;
    const question = String(body.question ?? "").trim().slice(0, 4000);
    if (!["brain", "research", "draft"].includes(mode)) throw new Fail("Unknown AI request.");
    if (!question) throw new Fail("Type a question first.");
    const { data: member } = await asUser.rpc("is_member", { f: firmId });
    if (!member) throw new Fail("You are not a member of this firm.", 403);
    const { data: access } = await asUser.rpc("firm_access", { f: firmId });
    if (!access) throw new Fail("Your plan has ended. Subscribe to use AI.", 402);
    const { data: sub } = await admin.from("subscriptions").select("plan").eq("firm_id", firmId).maybeSingle();
    const plan = sub?.plan ?? "Solo", limit = CREDITS[plan] ?? 200;
    if (NEEDS_PRO[mode] && plan === "Solo") throw new Fail("This AI feature is part of the Professional plan. Upgrade to use it.", 402);

    // Build the request before spending a credit, so a bad case id costs nothing.
    let messages: any[], maxTokens = 2500;
    if (mode === "research") {
      messages = [{ role: "system", content: RULES + `
You are answering a general legal research question. Explain the law and procedure, name the statute and provision, and give practical steps. If you mention a judgment, give only ones you are sure exist, and add that the citation must be verified. End with one line starting "Verify:" that lists what the advocate should check in the bare act or a law database.` }, { role: "user", content: question }];
    } else {
      if (!caseId) throw new Fail("Choose a case first.");
      const rec = await caseRecord(admin, firmId, caseId);
      if (mode === "brain") {
        const history = (Array.isArray(body.history) ? body.history : []).slice(-6).filter((m: any) => m && m.text)
          .map((m: any) => ({ role: m.role === "user" ? "user" : "assistant", content: String(m.text).slice(0, 2000) }));
        messages = [{ role: "system", content: RULES + `
Answer questions about ONE case, using ONLY the case record below. Do not use outside facts about this case.
After each fact you take from the record, add its source tag exactly as written in the record, in square brackets, for example [Order 12.03.2026], [Hearing 04.02.2026] or [Case details › Issues].
If the record does not contain what is asked, say so plainly and say what to add and where (for example "add the parties in Case details"). You may add general legal guidance, clearly marked as general guidance and not from the record.
For a hearing brief, cover: background, parties, stage, issues, last order, last hearing, points to press, what to expect from the other side, and missing documents.

CASE RECORD
${rec.text}` }, ...history, { role: "user", content: question }];
      } else {
        maxTokens = 5000;
        const kind = String(body.template ?? "document").slice(0, 80);
        messages = [{ role: "system", content: RULES + `
Draft a ${kind} for filing or sending in India, in the formal style used by Indian advocates, using the case record below.
Use only facts from the record and the instructions. For anything not known, write a placeholder in square brackets, such as [date of notice] or [amount]. Do not invent facts, amounts or dates.
Output only the document text, ready to edit: title, parties, body in numbered paragraphs where usual, prayer if applicable, place, date line and signature block for the advocate. No commentary before or after.

CASE RECORD
${rec.text}` }, { role: "user", content: question }];
      }
    }

    const used = await admin.rpc("ai_take_credit", { f: firmId, p_month: istMonth(), p_limit: limit });  // counted for this IST month
    if (used.error) throw used.error;
    if (used.data == null) throw new Fail(`Your firm has used all ${limit.toLocaleString("en-IN")} AI credits for this month on the ${plan} plan. Credits reset on the 1st, or upgrade for more.`, 402);
    const month = istMonth();
    let r;
    try { r = await complete(await groqKey(admin), messages, maxTokens); }
    catch (e) { await admin.rpc("ai_refund_credit", { f: firmId, p_month: month }); throw e; }
    if (!r.text) { await admin.rpc("ai_refund_credit", { f: firmId, p_month: month }); throw new Fail("The AI gave an empty answer. Please try again.", 502); }
    return json({ text: r.text, used: used.data, limit, model: r.model });
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message }, e.status);
    console.error(e); return json({ error: "The AI request failed. Please try again." }, 500);
  }
});
