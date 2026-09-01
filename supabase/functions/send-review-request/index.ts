// Sends a review request to a tenant's GoHighLevel webhook.
//
// Called from the dashboard "Send review" action. It runs server side because
// the browser cannot POST to GHL directly (cross origin) and because the send
// must be scoped to the caller's tenant with the service role.
//
// Flow:
//   1. Authenticate the caller from their JWT and read their tenant + role.
//   2. Load the contact (must belong to that tenant) and the active review
//      campaign to get the webhook URL.
//   3. Build the diner review link from a staff member's QR slug.
//   4. POST a clean JSON payload to the campaign webhook (GHL fires the
//      WhatsApp message from the template mapped to these fields).
//   5. Record the send as a review_invites row so the Sent tracker sees it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = Deno.env.get("RAVE_SITE_URL") ?? "https://rave.nexussolution.cloud";
const RESTAURANT_FALLBACK = "The Fireside Grill";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

// Convert a South African phone number to E.164 (+27XXXXXXXXX). Leaves numbers
// that already look international untouched.
function toE164(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (raw.trim().startsWith("+")) return "+" + digits;
  if (digits.startsWith("27")) return "+" + digits;
  if (digits.startsWith("0")) return "+27" + digits.slice(1);
  if (digits.length === 9) return "+27" + digits; // 9 digits, missing the leading 0
  return "+" + digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1. Who is calling? Resolve the user from their JWT.
  const authHeader = req.headers.get("Authorization") ?? "";
  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Not authenticated" }, 401);
  const uid = userData.user.id;

  // Service-role client for tenant-scoped reads/writes.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: profile } = await admin
    .from("app_users")
    .select("tenant_id, role")
    .eq("id", uid)
    .maybeSingle();
  if (!profile) return json({ error: "No profile for this user" }, 403);
  const tenantId = profile.tenant_id as string;

  // 2. Parse the request.
  let payloadIn: { contactId?: string; staffId?: string | null; campaignId?: string };
  try {
    payloadIn = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const { contactId, staffId = null, campaignId } = payloadIn;
  if (!contactId) return json({ error: "contactId is required" }, 400);

  // Contact must belong to the caller's tenant.
  const { data: contact } = await admin
    .from("contacts")
    .select("id, name, phone, tenant_id, opted_out")
    .eq("id", contactId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!contact) return json({ error: "Contact not found for this restaurant" }, 404);
  if (contact.opted_out) return json({ error: "This contact opted out of messages" }, 409);

  // Active review campaign (or a specific one) for the webhook URL + template.
  const campaignQuery = admin
    .from("campaigns")
    .select("id, name, template, webhook_url, kind")
    .eq("tenant_id", tenantId);
  const { data: campaign } = campaignId
    ? await campaignQuery.eq("id", campaignId).maybeSingle()
    : await campaignQuery.eq("kind", "review").order("created_at").limit(1).maybeSingle();

  if (!campaign) return json({ error: "No review campaign found" }, 404);
  const webhookUrl = (campaign.webhook_url ?? "").trim();
  if (!webhookUrl || !/^https?:\/\//i.test(webhookUrl)) {
    return json({ error: "This campaign has no valid webhook URL set" }, 422);
  }

  // 3. Build the diner review link from a staff QR slug. Priority:
  //    a) an explicitly chosen staff member,
  //    b) the logged-in staff member (so Dan's send uses Dan's link),
  //    c) any staff member, as a last resort (e.g. a manager with none chosen).
  let staff: { id: string; first_name: string; surname: string; qr_slug: string } | null = null;
  const staffCols = "id, first_name, surname, qr_slug";
  if (staffId) {
    const { data } = await admin
      .from("staff").select(staffCols).eq("tenant_id", tenantId).eq("id", staffId).maybeSingle();
    staff = data;
  }
  if (!staff) {
    // The caller's own staff record, if they are a staff member.
    const { data } = await admin
      .from("staff").select(staffCols).eq("tenant_id", tenantId).eq("user_id", uid).maybeSingle();
    staff = data;
  }
  if (!staff) {
    const { data } = await admin
      .from("staff").select(staffCols).eq("tenant_id", tenantId).order("first_name").limit(1).maybeSingle();
    staff = data;
  }
  const reviewLink = staff ? `${SITE_URL}/r/${staff.qr_slug}` : `${SITE_URL}/`;
  const restaurant = RESTAURANT_FALLBACK;
  const sentAt = new Date().toISOString();

  // WhatsApp needs the number in international (E.164) format. South African
  // numbers are stored locally as 0XX XXX XXXX; convert to +27XXXXXXXXX so GHL
  // can actually message the contact.
  const phoneE164 = toE164(contact.phone);

  // 4. POST to the GHL webhook.
  const outbound = {
    name: contact.name,
    phone: phoneE164,
    phone_local: contact.phone,
    review_link: reviewLink,
    restaurant,
    campaign: campaign.name,
    staff_name: staff ? `${staff.first_name} ${staff.surname}` : null,
    sent_at: sentAt,
  };

  let webhookOk = false;
  let webhookStatus = 0;
  let webhookBody = "";
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(outbound),
    });
    webhookOk = res.ok;
    webhookStatus = res.status;
    webhookBody = (await res.text()).slice(0, 500);
  } catch (e) {
    return json({ error: "Could not reach the webhook", detail: String(e) }, 502);
  }
  if (!webhookOk) {
    return json(
      { error: "Webhook rejected the request", status: webhookStatus, body: webhookBody, payload: outbound },
      502
    );
  }

  // 5. Record the send.
  const { data: invite } = await admin
    .from("review_invites")
    .insert({
      tenant_id: tenantId,
      contact_id: contact.id,
      phone: contact.phone,
      staff_id: staff?.id ?? null,
      sent_at: sentAt,
    })
    .select()
    .single();

  return json({ ok: true, invite, sent: outbound, webhookStatus });
});
