// Looks up a case by CNR through the court-data provider you configure.
// eCourts has no open public API, so this needs a provider account. Set these secrets:
//   COURT_API_URL     full URL with {cnr} where the CNR goes, e.g. https://provider.example/v1/cases/{cnr}
//   COURT_API_KEY     the provider's key
//   COURT_API_HEADER  header that carries the key (default: Authorization, sent as "Bearer <key>")
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Providers name fields differently; search the response for the usual ones.
function pick(obj: unknown, names: string[]): string {
  const want = names.map((n) => n.toLowerCase().replace(/[^a-z]/g, "")); let found = "";
  const walk = (o: any, depth: number) => { if (!o || typeof o !== "object" || depth > 4 || found) return;
    for (const [k, v] of Object.entries(o)) { if (found) return; const key = k.toLowerCase().replace(/[^a-z]/g, "");
      if (want.includes(key) && (typeof v === "string" || typeof v === "number") && String(v).trim()) { found = String(v).trim(); return; }
      if (typeof v === "object") walk(v, depth + 1); } };
  walk(obj, 0); return found;
}
function toIso(s: string): string {
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/.exec(s); if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(s); return isNaN(+d) ? "" : d.toISOString().slice(0, 10);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: "Sign in again." }, 401);
    const tpl = Deno.env.get("COURT_API_URL"), key = Deno.env.get("COURT_API_KEY");
    if (!tpl || !key) return json({ error: "No court-data provider is connected yet.", configured: false }, 501);
    const cnr = String((await req.json()).cnr ?? "").replace(/[\s-]/g, "").toUpperCase();
    if (!/^[A-Z]{4}\d{12}$/.test(cnr)) return json({ error: "A CNR has 4 letters followed by 12 digits." }, 400);
    const header = Deno.env.get("COURT_API_HEADER") ?? "Authorization";
    const r = await fetch(tpl.replace("{cnr}", encodeURIComponent(cnr)), { headers: { [header]: header.toLowerCase() === "authorization" ? "Bearer " + key : key, Accept: "application/json" } });
    if (!r.ok) return json({ error: `The court-data provider answered ${r.status}.` }, 502);
    const raw = await r.json();
    const next = pick(raw, ["next_hearing_date", "nextHearingDate", "next_date", "nextDate", "date_next_list"]);
    return json({ cnr, title: pick(raw, ["title", "case_title", "caseTitle", "cause_title"]), caseNo: pick(raw, ["case_number", "caseNumber", "case_no", "registration_number"]), court: pick(raw, ["court", "court_name", "courtName", "court_number_and_judge", "bench"]),
      status: pick(raw, ["status", "case_status", "caseStatus", "stage", "stage_of_case"]), nextDate: next ? toIso(next) : "", lastOrderDate: toIso(pick(raw, ["last_order_date", "lastOrderDate", "order_date"]) || ""), raw });
  } catch (e) { console.error(e); return json({ error: "Could not reach the court-data provider." }, 500); }
});
