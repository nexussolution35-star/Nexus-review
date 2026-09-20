// Public: saves a diner's review from the QR page. Runs without a login
// (verify_jwt = false) with the service role. Keyed by the restaurant review
// slug (legacy staff qr_slug still resolves). One overall rating, no waiter.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const normPhone = (p: string) => p.replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let b: { slug?: string; name?: string; phone?: string; overallStars?: number; comment?: string | null };
  try {
    b = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const slug = String(b.slug ?? "").trim();
  const name = String(b.name ?? "").trim();
  const phone = String(b.phone ?? "").trim();
  const overallStars = Number(b.overallStars ?? 0);
  const comment = (b.comment ?? null) ? String(b.comment).trim() : null;

  if (!slug) return json({ error: "Missing slug" }, 400);
  if (!name || !phone) return json({ error: "Name and phone are required" }, 400);
  if (overallStars < 1 || overallStars > 5) return json({ error: "Rating must be between 1 and 5" }, 400);

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
  if (!tenantId) return json({ error: "That review link is not valid" }, 404);

  const { data: tenant } = await admin
    .from("tenants").select("google_invite_min_combined").eq("id", tenantId).maybeSingle();
  const minCombined = tenant?.google_invite_min_combined ?? 7;

  const now = new Date().toISOString();

  // Dedupe the contact by phone within the tenant.
  const target = normPhone(phone);
  const { data: existingContacts } = await admin
    .from("contacts").select("id, phone").eq("tenant_id", tenantId);
  let contactId: string | null = null;
  for (const c of existingContacts ?? []) {
    if (normPhone(c.phone as string) === target) { contactId = c.id as string; break; }
  }
  if (contactId) {
    await admin.from("contacts").update({ last_activity_at: now }).eq("id", contactId);
  } else {
    const { data: created } = await admin
      .from("contacts")
      .insert({ tenant_id: tenantId, name, phone, added_by: "Review QR", consent_at: now, last_activity_at: now, opted_out: false })
      .select("id")
      .single();
    contactId = created?.id ?? null;
  }

  const route = overallStars >= 4 ? "good" : "bad";
  // Without a separate waiter score, the Google invite uses the overall rating.
  const invite = route === "good" && overallStars * 2 >= minCombined;

  await admin.from("reviews").insert({
    tenant_id: tenantId,
    contact_id: contactId,
    diner_name: name,
    staff_comment: comment,
    overall_stars: overallStars,
    route,
    status: route === "bad" ? "new" : null,
    google_status: invite ? "invited" : null,
    created_at: now,
  });

  if (contactId) {
    await admin
      .from("review_invites")
      .update({ engaged_at: now, reviewed_at: now })
      .eq("tenant_id", tenantId)
      .eq("contact_id", contactId)
      .is("reviewed_at", null);
  }

  return json({ ok: true, invite });
});
