// Encrypted storage in each user's own Google Drive.
// Files go into the Drive's hidden app-data folder (scope drive.appdata): they do not appear in the user's Drive and
// only Legal Staff can read them. Every file is encrypted here first with AES-256-GCM, using a key per firm derived
// (HKDF) from a master key kept in Vault (migration 0007), so Google only ever holds ciphertext.
// Callers: a signed-in user (actions below), or the nightly job ({ action: "backup_all" } with x-cron-secret).
// Secrets: GOOGLE_CLIENT_SECRET (required), GOOGLE_CLIENT_ID (defaults to the site's client ID). Deploy with JWT verification off.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
class Fail extends Error { constructor(msg: string, public status = 400) { super(msg); } }

const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "548334921913-me654lnfe1mn7q8rsrn5hsj01u0sj91t.apps.googleusercontent.com";
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
const KEEP_BACKUPS = 30;
const KINDS: Record<string, string> = { case: "cases", client: "clients", hearing: "hearings", order: "orders", task: "tasks", doc: "docs", invoice: "invoices", deadline: "deadlines", limitation: "lims", watch: "watch", log: "log" };

// ---------- encryption ----------
const te = new TextEncoder(), td = new TextDecoder();
const MAGIC = te.encode("LSE1");
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64 = (u: Uint8Array) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const concat = (...parts: Uint8Array[]) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
let baseKey: CryptoKey | null = null;
async function keyFor(admin: any, label: string) {
  if (!baseKey) {
    const { data, error } = await admin.rpc("drive_master_key");
    if (error || !data) throw new Fail("Encrypted storage is not set up on the server (migration 0007).", 501);
    baseKey = await crypto.subtle.importKey("raw", fromB64(data), "HKDF", false, ["deriveKey"]);
  }
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: te.encode("legal-staff-drive-v1"), info: te.encode(label) }, baseKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function seal(key: CryptoKey, data: Uint8Array) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return concat(MAGIC, iv, new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data)));
}
async function unseal(key: CryptoKey, data: Uint8Array) {
  if (data.length < 16 || td.decode(data.subarray(0, 4)) !== "LSE1") throw new Fail("That file is not a Legal Staff encrypted file.");
  try { return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: data.subarray(4, 16) }, key, data.subarray(16))); }
  catch { throw new Fail("The file could not be decrypted. It may be damaged."); }
}
const firmKey = (admin: any, firmId: string) => keyFor(admin, "firm:" + firmId);

// ---------- Google ----------
async function google(url: string, init: RequestInit, what: string) {
  const r = await fetch(url, init);
  if (!r.ok) { const t = (await r.text()).slice(0, 300); throw new Fail(`${what} failed (${r.status}): ${t}`, 502); }
  return r;
}
async function tokenRequest(params: Record<string, string>) {
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...params }) });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, j };
}
const tokens = new Map<string, string>();
/** A fresh access token for a connected user. */
async function accessToken(admin: any, userId: string) {
  if (tokens.has(userId)) return tokens.get(userId)!;
  const { data: acct } = await admin.from("drive_accounts").select("refresh_token_enc,email").eq("user_id", userId).maybeSingle();
  if (!acct) throw new Fail("The Google Drive that holds this file is no longer connected to Legal Staff.", 409);
  const refresh = td.decode(await unseal(await keyFor(admin, "tokens"), fromB64(acct.refresh_token_enc)));
  const { ok, j } = await tokenRequest({ grant_type: "refresh_token", refresh_token: refresh });
  if (!ok) {
    await admin.from("drive_accounts").update({ last_error: "Google refused access: " + (j.error_description ?? j.error ?? "unknown") }).eq("user_id", userId);
    throw new Fail(`Google refused access to ${acct.email || "the connected Drive"}. Reconnect Google Drive in Settings.`, 409);
  }
  tokens.set(userId, j.access_token); return j.access_token as string;
}
const auth = (t: string) => ({ Authorization: "Bearer " + t });
async function driveUpload(token: string, name: string, bytes: Uint8Array, props: Record<string, string>) {
  const boundary = "ls" + crypto.randomUUID().replace(/-/g, "");
  const meta = JSON.stringify({ name, parents: ["appDataFolder"], appProperties: props, mimeType: "application/octet-stream" });
  const body = concat(te.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`), bytes, te.encode(`\r\n--${boundary}--`));
  const r = await google("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", { method: "POST", headers: { ...auth(token), "Content-Type": `multipart/related; boundary=${boundary}` }, body }, "Saving to Google Drive");
  return (await r.json()).id as string;
}
async function driveProps(token: string, id: string) {
  const r = await google(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=id,appProperties`, { headers: auth(token) }, "Reading from Google Drive");
  return ((await r.json()).appProperties ?? {}) as Record<string, string>;
}
async function driveGet(token: string, id: string) {
  const r = await google(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`, { headers: auth(token) }, "Reading from Google Drive");
  return new Uint8Array(await r.arrayBuffer());
}
async function driveDelete(token: string, id: string) {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}`, { method: "DELETE", headers: auth(token) });
  if (!r.ok && r.status !== 404) throw new Fail(`Deleting from Google Drive failed (${r.status}).`, 502);
}
async function driveList(token: string, props: Record<string, string>) {
  const q = Object.entries(props).map(([k, v]) => `appProperties has { key='${k}' and value='${v.replace(/'/g, "")}' }`).join(" and ");
  const u = new URL("https://www.googleapis.com/drive/v3/files");
  u.search = new URLSearchParams({ spaces: "appDataFolder", q, fields: "files(id,name,createdTime,size,appProperties)", orderBy: "createdTime desc", pageSize: "200" }).toString();
  const r = await google(u.toString(), { headers: auth(token) }, "Listing Google Drive");
  return ((await r.json()).files ?? []) as any[];
}

// ---------- backups ----------
async function pages(q: () => any) {
  const out: any[] = [];
  for (let from = 0; ;) { const { data, error } = await q().range(from, from + 999); if (error) throw error; if (!data?.length) return out; out.push(...data); from += data.length; }
}
/** The firm's data in the same shape as the app's own JSON backup (Settings › Back up), so it can be restored. */
async function firmSnapshot(admin: any, firmId: string) {
  const { data: f } = await admin.from("firms").select("*").eq("id", firmId).single();
  const recs = await pages(() => admin.from("records").select("kind,id,data").eq("firm_id", firmId).order("kind").order("id"));
  const { data: members } = await admin.from("members").select("id,name,title,role,email,status").eq("firm_id", firmId).order("created_at");
  const out: any = { v: 2, source: "google-drive-backup", exportedAt: new Date().toISOString(), firm: { name: f.name, city: f.city, address: f.address, gstin: f.gstin },
    team: (members ?? []).map((m: any) => ({ id: m.id, name: m.name, title: m.title, role: m.role, email: m.email, status: m.status })), lim: f.state?.lim ?? null };
  if (Array.isArray(f.state?.agents)) out.agents = f.state.agents;
  for (const k of Object.values(KINDS)) out[k] = [];
  for (const r of recs) if (KINDS[r.kind]) out[KINDS[r.kind]].push({ ...r.data, id: r.id });
  return { name: f.name as string, data: out };
}
/** Backs up every firm the user is an active member of into their Drive; keeps one file per firm per day and the newest 30. */
async function backupUser(admin: any, userId: string) {
  const token = await accessToken(admin, userId);
  const { data: ms } = await admin.from("members").select("firm_id").eq("user_id", userId).eq("status", "Active");
  const day = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  let n = 0;
  for (const m of ms ?? []) {
    const snap = await firmSnapshot(admin, m.firm_id);
    const sealed = await seal(await firmKey(admin, m.firm_id), te.encode(JSON.stringify(snap.data)));
    const id = await driveUpload(token, `backup-${day}-${crypto.randomUUID().slice(0, 8)}.lse`, sealed, { kind: "backup", firm: m.firm_id, date: day, firmName: snap.name.slice(0, 100) });
    const old = (await driveList(token, { kind: "backup", firm: m.firm_id })).filter((x) => x.id !== id);
    const drop = [...old.filter((x) => x.appProperties?.date === day), ...old.filter((x) => x.appProperties?.date !== day).slice(KEEP_BACKUPS - 1)];
    for (const x of drop) await driveDelete(token, x.id);
    n++;
  }
  await admin.from("drive_accounts").update({ last_backup_at: new Date().toISOString(), last_error: null }).eq("user_id", userId);
  return n;
}

// ---------- requests ----------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const q = new URL(req.url).searchParams;
    const isJson = (req.headers.get("content-type") ?? "").includes("application/json");
    const body: any = isJson ? await req.json().catch(() => ({})) : {};
    const action = q.get("action") ?? body.action ?? "";

    // Nightly job.
    const hdr = req.headers.get("x-cron-secret");
    if (hdr && action === "backup_all") {
      const { data: okSecret } = await admin.rpc("cron_secret_ok", { s: hdr });
      if (okSecret !== true) return json({ error: "Not allowed." }, 403);
      if (!CLIENT_SECRET) return json({ skipped: "Google Drive is not configured." });
      const { data: accts } = await admin.from("drive_accounts").select("user_id");
      let ok = 0, failed = 0;
      for (const a of accts ?? []) {
        try { await backupUser(admin, a.user_id); ok++; }
        catch (e) { failed++; await admin.from("drive_accounts").update({ last_error: String((e as Error).message).slice(0, 300) }).eq("user_id", a.user_id); }
      }
      return json({ ok, failed });
    }

    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: "Sign in again." }, 401);
    const firmId = q.get("firm_id") ?? body.firm_id ?? "";
    const member = async () => { const { data } = await asUser.rpc("is_member", { f: firmId }); if (!data) throw new Fail("You are not a member of this firm.", 403); };

    if (action === "status") {
      const { data: a } = await admin.from("drive_accounts").select("email,connected_at,last_backup_at,last_error").eq("user_id", user.id).maybeSingle();
      return json({ configured: !!CLIENT_SECRET, clientId: CLIENT_ID, connected: !!a, email: a?.email ?? "", lastBackup: a?.last_backup_at ?? null, lastError: a?.last_error ?? null });
    }
    if (!CLIENT_SECRET) throw new Fail("Google Drive storage is not set up yet. The GOOGLE_CLIENT_SECRET function secret is missing.", 501);

    if (action === "connect") {
      if (!body.code) throw new Fail("Missing the Google authorisation code.");
      const { ok, j } = await tokenRequest({ grant_type: "authorization_code", code: body.code, redirect_uri: "postmessage" });
      if (!ok) throw new Fail("Google did not accept the sign-in: " + (j.error_description ?? j.error ?? "unknown error"));
      if (!String(j.scope ?? "").includes("drive.appdata")) throw new Fail("Google Drive access was not granted. Tick the Google Drive box when Google asks, then try again.");
      if (!j.refresh_token) throw new Fail("Google did not grant lasting access. Remove Legal Staff under your Google Account › Security › Third-party access, then connect again.");
      let email = "";
      try { email = JSON.parse(atob(String(j.id_token).split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).email ?? ""; } catch { /* id_token is optional */ }
      const enc = toB64(await seal(await keyFor(admin, "tokens"), te.encode(j.refresh_token)));
      const { error } = await admin.from("drive_accounts").upsert({ user_id: user.id, email, refresh_token_enc: enc, connected_at: new Date().toISOString(), last_error: null });
      if (error) throw new Fail("Could not save the connection.", 500);
      return json({ connected: true, email });
    }
    if (action === "disconnect") {
      const { data: a } = await admin.from("drive_accounts").select("refresh_token_enc").eq("user_id", user.id).maybeSingle();
      if (a) {
        try { const refresh = td.decode(await unseal(await keyFor(admin, "tokens"), fromB64(a.refresh_token_enc))); await fetch("https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(refresh), { method: "POST" }); } catch { /* still remove it here */ }
        await admin.from("drive_accounts").delete().eq("user_id", user.id);
      }
      return json({ connected: false });
    }
    if (action === "upload") {
      await member();
      const { data: access } = await asUser.rpc("firm_access", { f: firmId });
      if (!access) throw new Fail("Your plan has ended. Subscribe to upload files.", 402);
      const docId = q.get("doc_id") ?? "";
      if (!/^[\w-]{1,80}$/.test(docId)) throw new Fail("Missing document id.");
      const bytes = new Uint8Array(await req.arrayBuffer());
      if (!bytes.length) throw new Fail("The file is empty.");
      if (bytes.length > 25 * 1048576) throw new Fail("Files can be up to 25 MB.");
      const token = await accessToken(admin, user.id);
      const id = await driveUpload(token, crypto.randomUUID() + ".lse", await seal(await firmKey(admin, firmId), bytes), { kind: "doc", firm: firmId, doc: docId });
      const { data: a } = await admin.from("drive_accounts").select("email").eq("user_id", user.id).maybeSingle();
      return json({ drive: { id, user: user.id, email: a?.email ?? "" } });
    }
    if (action === "download" || action === "delete") {
      await member();
      const d = body.drive ?? {};
      if (!d.id || !d.user) throw new Fail("This record has no Google Drive file.");
      const token = await accessToken(admin, d.user);
      const props = await driveProps(token, d.id);
      if (props.firm !== firmId) throw new Fail("That file belongs to another firm.", 403);
      if (action === "delete") { await driveDelete(token, d.id); return json({ deleted: true }); }
      const plain = await unseal(await firmKey(admin, firmId), await driveGet(token, d.id));
      return new Response(plain, { headers: { ...cors, "Content-Type": "application/octet-stream" } });
    }
    if (action === "backup_now") {
      const n = await backupUser(admin, user.id);
      return json({ firms: n });
    }
    if (action === "backups") {
      await member();
      const token = await accessToken(admin, user.id);
      const files = await driveList(token, { kind: "backup", firm: firmId });
      return json({ backups: files.map((f) => ({ id: f.id, date: f.appProperties?.date ?? "", created: f.createdTime, size: Number(f.size ?? 0) })) });
    }
    if (action === "restore") {
      const { data: owner } = await asUser.rpc("is_owner", { f: firmId });
      if (!owner) throw new Fail("Only the firm owner can restore a backup.", 403);
      const token = await accessToken(admin, user.id);
      if ((await driveProps(token, body.file_id)).firm !== firmId) throw new Fail("That backup belongs to another firm.", 403);
      const plain = await unseal(await firmKey(admin, firmId), await driveGet(token, body.file_id));
      return new Response(plain, { headers: { ...cors, "Content-Type": "application/json" } });
    }
    throw new Fail("Unknown action.");
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message }, e.status);
    console.error(e); return json({ error: "Something went wrong with Google Drive storage." }, 500);
  }
});
