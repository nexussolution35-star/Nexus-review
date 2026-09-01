// Public: returns everything the diner review page needs, keyed by a staff
// member's QR slug. Runs without a login (verify_jwt = false) because diners
// are anonymous and cannot pass RLS. Uses the service role for the lookups.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  let slug = "";
  try {
    const body = await req.json();
    slug = String(body.slug ?? "").trim();
  } catch {
    slug = "";
  }
  if (!slug) return json({ error: "Missing slug" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { data: staff } = await admin
    .from("staff")
    .select("id, first_name, surname, tenant_id, qr_slug")
    .eq("qr_slug", slug)
    .maybeSingle();
  if (!staff) return json({ found: false });

  const { data: tenant } = await admin
    .from("tenants")
    .select("name, gmb_url, place_id, google_invite_min_combined")
    .eq("id", staff.tenant_id)
    .maybeSingle();

  const placeUrl = tenant?.place_id
    ? `https://search.google.com/local/writereview?placeid=${tenant.place_id}`
    : null;

  return json({
    found: true,
    staffId: staff.id,
    staffFirstName: staff.first_name,
    restaurant: tenant?.name ?? "our restaurant",
    googleInviteMinCombined: tenant?.google_invite_min_combined ?? 7,
    googleReviewUrl: tenant?.gmb_url ?? placeUrl ?? null,
  });
});
