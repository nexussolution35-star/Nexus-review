// Public: saves a diner's review submitted from the QR page. Runs without a
// login (verify_jwt = false) and uses the service role, since diners are
// anonymous. Resolves the staff member and tenant from the QR slug, dedupes the
// contact by phone, records the review, and closes any open review invite.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Normalize a phone to digits for dedupe matching.
const normPhone = (p: string) => p.replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let b: {
    slug?: string; name?: string; phone?: string;
    staffStars?: number; staffComment?: string | null; overallStars?: number;
  };
  try {
    b = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const slug = String(b.slug ?? "").trim();
  const name = String(b.name ?? "").trim();
  const phone = String(b.phone ?? "").trim();
  const staffStars = Number(b.staffStars ?? 0);
  const overallStars = Number(b.overallStars ?? 0);
  const staffComment = (b.staffComment ?? null) ? String(b.staffComment).trim() : null;

  if (!slug) return json({ error: "Missing slug" }, 400);
  if (!name || !phone) return json({ error: "Name and phone are required" }, 400);
  if (staffStars < 1 || staffStars > 5 || overallStars < 1 || overallStars > 5) {
    return json({ error: "Ratings must be between 1 and 5" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { data: staff } = await admin
    .from("staff")
    .select("id, first_name, surname, tenant_id")
    .eq("qr_slug", slug)
    .maybeSingle();
  if (!staff) return json({ error: "That review link is not valid" }, 404);
  const tenantId = staff.tenant_id as string;

  const { data: tenant } = await admin
    .from("tenants")
    .select("google_invite_min_combined")
    .eq("id", tenantId)
    .maybeSingle();
  const minCombined = tenant?.google_invite_min_combined ?? 7;

  const now = new Date().toISOString();

  // Dedupe the contact by phone within the tenant.
  const target = normPhone(phone);
  const { data: existingContacts } = await admin
    .from("contacts")
    .select("id, name, phone")
    .eq("tenant_id", tenantId);
  let contactId: string | null = null;
  for (const c of existingContacts ?? []) {
    if (normPhone(c.phone as string) === target) { contactId = c.id as string; break; }
  }
  if (contactId) {
    await admin.from("contacts").update({ last_activity_at: now }).eq("id", contactId);
  } else {
    const { data: created } = await admin
      .from("contacts")
      .insert({
        tenant_id: tenantId,
        name,
        phone,
        added_by: `${staff.first_name} ${staff.surname}`,
        consent_at: now,
        last_activity_at: now,
        opted_out: false,
      })
      .select("id")
      .single();
    contactId = created?.id ?? null;
  }

  const combined = staffStars + overallStars;
  const route = overallStars >= 4 ? "good" : "bad";
  const invite = route === "good" && combined >= minCombined;

  await admin.from("reviews").insert({
    tenant_id: tenantId,
    contact_id: contactId,
    diner_name: name,
    staff_id: staff.id,
    staff_stars: staffStars,
    staff_comment: staffComment,
    overall_stars: overallStars,
    route,
    issue_category: null,
    assigned_staff_id: route === "bad" ? staff.id : null,
    status: route === "bad" ? "new" : null,
    google_status: invite ? "invited" : null,
    created_at: now,
  });

  // Close any open review invite for this phone (they responded).
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
