// "Delete my account": removes the signed-in person's sign-in, their personal data and, if they are the only member of a firm,
// that firm's records and stored files. Refuses (and changes nothing) while they own a firm with colleagues or have partner earnings
// still being settled. Payment, order and commission records are kept: the books require them and they hold no practice data.
// Request: { action: "delete", confirm: "<your email>" }. Deploy with JWT verification off; it checks the caller itself.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

/** Every stored file under a firm's folder in a bucket, two levels deep (firm/doc/file), in pages. */
async function filesUnder(admin: any, bucket: string, firm: string) {
  const out: string[] = [], st = admin.storage.from(bucket);
  const list = async (pre: string) => { const all: any[] = []; for (let off = 0; ; off += 1000) { const { data, error } = await st.list(pre, { limit: 1000, offset: off }); if (error) throw error; all.push(...(data ?? [])); if ((data ?? []).length < 1000) return all; } };
  for (const f of await list(firm)) {
    if (f.id) out.push(`${firm}/${f.name}`);
    else for (const g of await list(`${firm}/${f.name}`)) { if (g.id) out.push(`${firm}/${f.name}/${g.name}`); }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sign in first." }, 401);
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u?.user) return json({ error: "Sign in first." }, 401);
    const user = u.user, body = await req.json().catch(() => ({}));
    if (body.action !== "delete") return json({ error: "Unknown action." }, 400);
    if (!user.email || String(body.confirm ?? "").trim().toLowerCase() !== user.email.toLowerCase()) return json({ error: "Type your account email to confirm." }, 400);

    // 1. database: refuses with a plain message when the account cannot be closed yet
    const { data, error } = await admin.rpc("erase_user_account", { u: user.id });
    if (error) return json({ error: error.code === "P0001" ? error.message : "Could not delete the account. Nothing was changed." }, error.code === "P0001" ? 409 : 500);

    // 2. files of firms that were erased (documents + team chat)
    let removed = 0;
    for (const firm of (data?.firms ?? []) as string[]) {
      for (const bucket of ["documents", "chat"]) {
        const paths = await filesUnder(admin, bucket, firm).catch(() => [] as string[]);
        for (let i = 0; i < paths.length; i += 100) { const { error: re } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100)); if (!re) removed += Math.min(100, paths.length - i); }
      }
    }

    // 3. the sign-in itself, last
    const { error: de } = await admin.auth.admin.deleteUser(user.id);
    if (de) return json({ error: "Your data was erased but the sign-in could not be removed. Contact support." }, 500);
    return json({ ok: true, files_removed: removed });
  } catch (e) {
    return json({ error: "Could not delete the account." }, 500);
  }
});
