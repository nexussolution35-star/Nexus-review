// Sends a review request to a tenant's GoHighLevel webhook.
//
// Called from the dashboard "Send review" action. Runs server side because the
// browser cannot POST to GHL directly and the send must be scoped to the
// caller's tenant with the service role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = Deno.env.get("RAVE_SITE_URL") ?? "https://rave.nexussolution.cloud";
const RESTAURANT_FALLBACK = "The Fireside Grill";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// South African local number -> E.164 (+27XXXXXXXXX) so GHL can message it.
function toE164(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (raw.trim().startsWith("+")) return "+" + digits;
  if (digits.startsWith("27")) return "+" + digits;
  if (digits.startsWith("0")) return "+27" + digits.slice(1);
  if (digits.length === 9) return "+27" + digits;
  return "+" + digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Who is calling?
  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Not authenticated" }, 401);
  const uid = userData.user.id;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: profile } = await admin
    .from("app_users").select("tenant_id").eq("id", uid).maybeSingle();
  if (!profile) return json({ error: "No profile for this user" }, 403);
  const tenantId = profile.tenant_id as string;

  let payloadIn: { contactId?: string; campaignId?: string };
  try {
    payloadIn = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const { contactId, campaignId } = payloadIn;
  if (!contactId) return json({ error: "contactId is required" }, 400);

  const { data: contact } = await admin
    .from("contacts")
    .select("id, name, phone, tenant_id, opted_out")
    .eq("id", contactId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!contact) return json({ error: "Contact not found for this restaurant" }, 404);
  if (contact.opted_out) return json({ error: "This contact opted out of messages" }, 409);

  const campaignQuery = admin
    .from("campaigns").select("id, name, template, webhook_url, kind").eq("tenant_id", tenantId);
  const { data: campaign } = campaignId
    ? await campaignQuery.eq("id", campaignId).maybeSingle()
    : await campaignQuery.eq("kind", "review").order("created_at").limit(1).maybeSingle();
  if (!campaign) return json({ error: "No review campaign found" }, 404);

  const webhookUrl = (campaign.webhook_url ?? "").trim();
  if (!webhookUrl || !/^https?:\/\//i.test(webhookUrl)) {
    return json({ error: "This campaign has no valid webhook URL set" }, 422);
  }

  const { data: tenant } = await admin
    .from("tenants").select("name, review_slug").eq("id", tenantId).maybeSingle();
  const reviewLink = tenant?.review_slug ? `${SITE_URL}/r/${tenant.review_slug}` : `${SITE_URL}/`;
  const restaurant = tenant?.name ?? RESTAURANT_FALLBACK;
  const sentAt = new Date().toISOString();

  const outbound = {
    name: contact.name,
    phone: toE164(contact.phone),
    phone_local: contact.phone,
    review_link: reviewLink,
    restaurant,
    campaign: campaign.name,
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
    return json({ error: "Webhook rejected the request", status: webhookStatus, body: webhookBody, payload: outbound }, 502);
  }

  const { data: invite } = await admin
    .from("review_invites")
    .insert({ tenant_id: tenantId, contact_id: contact.id, phone: contact.phone, sent_at: sentAt })
    .select()
    .single();

  return json({ ok: true, invite, sent: outbound, webhookStatus });
});
