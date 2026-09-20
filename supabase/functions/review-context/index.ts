// Public: returns what the diner review page needs, keyed by a restaurant's
// review slug. Runs without a login (verify_jwt = false) because diners are
// anonymous. Falls back to a legacy staff qr_slug so older links still resolve.

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
    slug = String((await req.json()).slug ?? "").trim();
  } catch {
    slug = "";
  }
  if (!slug) return json({ error: "Missing slug" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // Resolve the tenant: restaurant review slug first, then a legacy staff slug.
  let tenantId: string | null = null;
  const { data: byTenant } = await admin
    .from("tenants").select("id").eq("review_slug", slug).maybeSingle();
  if (byTenant) tenantId = byTenant.id as string;
  if (!tenantId) {
    const { data: staff } = await admin
      .from("staff").select("tenant_id").eq("qr_slug", slug).maybeSingle();
    if (staff) tenantId = staff.tenant_id as string;
  }
  if (!tenantId) return json({ found: false });

  const { data: tenant } = await admin
    .from("tenants")
    .select("name, gmb_url, place_id, google_invite_min_combined")
    .eq("id", tenantId)
    .maybeSingle();

  const placeUrl = tenant?.place_id
    ? `https://search.google.com/local/writereview?placeid=${tenant.place_id}`
    : null;

  return json({
    found: true,
    restaurant: tenant?.name ?? "our restaurant",
    googleInviteMinCombined: tenant?.google_invite_min_combined ?? 7,
    googleReviewUrl: tenant?.gmb_url ?? placeUrl ?? null,
  });
});
