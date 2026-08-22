# RAVE — PRD v1 (Claude Code handoff)

**Rave** — the reputation and guest win-back system for restaurants, by Nexus Solutions.
Tagline: "Get raves. Keep regulars."
(Rave is the product; **The Fireside Grill** remains the demo tenant used in all sample
data and screens.)

This document is the single source of truth for the build. It supersedes the Fireside
master prompts v1–v3 and the earlier fireside-prd-v4 (same content, renamed product). The file `fireside-grill-executive-dashboard-v4.jsx` is the visual/UX reference
implementation of an EARLIER revision — where this PRD differs from that file, THIS PRD
WINS. Palette, layout patterns, component style and data-consistency approach in the .jsx
remain correct.

---

## 1. PRODUCT IN ONE PARAGRAPH

Rave is a multi-tenant, WhatsApp-first review and customer-reactivation system for restaurants.
Staff share personal QR codes with diners after service; diners rate the staff member and
the restaurant; happy diners are invited to post on Google; unhappy reviews become internal
issues for the team to fix. Contacts captured through the flow (or added manually at the
POS) feed review campaigns and a 4-stage win-back engine driven by GHL webhooks. A manager
dashboard shows clean operational pages and a lean Statistics section.

## 2. DELTA FROM v3 (apply all of these)

1. **Filters**: the ONLY global filter is the From/To calendar date range (with "From
   inception" reset). REMOVE the Days (weekdays/weekends) and Dine context (dine-in/
   takeaway) filters everywhere — every page, every stats view. Service filter
   (Breakfast/Lunch/Dinner) also removed from the UI for now; keep service split in the
   data model for future use.
2. **Copy rule — no dashes**: remove the "—"/"-" construction from ALL UI copy. Rewrite as
   two sentences or a comma. Examples:
   - "Diners we've asked. Waiting to hear back."
   - "Unhappy diners. Things for your team to fix."
   - Bad-review line: "Kitchen issue. Andile is on it." / "Slow service. Naledi fixed it."
3. **Dashboard**: keep the date range. REPLACE the "What this data is telling you" insight
   cards with a **Summary** section: a neat, organised digest of what is going on around
   the application right now. Grouped, short plain sentences, e.g.:
   - Reviews: "3 new reviews today. 1 issue is being fixed."
   - Waiting: "2 diners are in the review window right now."
   - Google: "5 reviews posted this week."
   - Win-back: "12 customers in win-back. 3 offers expire in 2 days."
   No numbers-heavy KPI boxes; sentences only, grouped under small labels.
4. **Customers**:
   - Rename list title to **"Contact list"** (not "Diner contact list").
   - Columns: Name, Phone, Added by, Date, **Actions** (Edit inline, Delete with confirm).
   - Header buttons: **Add contact** and a new **Send review** button (see §5).
5. **Statistics — prune hard**:
   - REMOVE the Revenue, Customers and Campaign statistics menus entirely.
   - Statistics subheadings are now: **Overview, Reviews, Staff** only.
   - Kill the funnel chart ("Where do we lose people in the flow").
   - Reviews stats: keep rating trend + good/bad sentiment; the issues chart becomes
     **"Top issues in this window"**: the system derives the TOP 5 issue categories from
     the reviews inside the selected date range (computed from data, not a fixed list).
     Staff table: REMOVE the "Resolved" column.
   - Staff stats: keep ONLY the per-staff star distribution. Kill "How is each server
     trending", "Whose tables convert goodwill", and the would-recommend card.
6. **New sidebar item: Win back campaign** (see §7).

## 3. NAVIGATION (final)

Dashboard · Reviews (Sent, Good, Bad, Google reviews) · Customers · Staff ·
Review campaign · Win back campaign · Statistics (Overview, Reviews, Staff)

Role-based access (see §9): staff logins see a reduced sidebar.

## 4. STAFF QR FLOW (customer-facing, mobile web page)

Each staff member has an auto-generated unique QR code / link. Flow when scanned:

- **Step 1 — capture**: asks for Name and WhatsApp number (creates/dedupes the contact in
  the tenant's database by phone).
- **Step 2 — two ratings**:
  - "How would you rate {staff first name}'s service to you today?" → empty 5-star row +
    an optional comment box.
  - "How would you rate the overall experience today at {Restaurant name}?" → empty
    5-star row, NO comment box.
- **Step 3 — Google invite (conditional)**: shown ONLY if the COMBINED score meets the
  threshold. The combined score = staff stars + overall stars (each out of 5, so combined
  is out of 10). Default threshold: **7 of 10** (e.g. 3 staff + 4 overall = 7 →
  qualifies). Stored per tenant as `google_invite_min_combined` (default 7). Step 3
  content: one very short thank-you line, then: "Could you give us a
  Google review? It helps us grow and serve you better." and a prominent button
  "Give us a Google review" that opens the tenant's official Google review URL.
- Below threshold: warm thank-you, no Google step.
- Routing note: the good/bad pipeline still keys off the OVERALL stars (4–5 = good,
  1–3 = bad issue ticket); the combined score gates ONLY the Google invite. A diner can
  rate staff 5 and overall 2: combined 7 would qualify for Google, but overall 2 is a
  bad review — in that conflict the bad route wins and no Google invite is shown.

## 5. SEND REVIEW (manual routing from the POS)

Purpose: when a diner has no mobile data, staff write down name + number on paper and
capture them at the POS.

- Customers page header: **Send review** button beside Add contact.
- Opens a card titled **"Send review"** with copy: "Tap one of your recent adds, or find
  the customer by WhatsApp number."
- Section **"Your recent adds"**: the 3 most recently added contacts, tappable to select.
- Below: a search bar (name or number) with a **Find** button; results render below and
  are selectable.
- Bottom: **Send review** button → posts the selected contact to the tenant's review
  campaign webhook (GHL), which sends the WhatsApp message containing the staff QR link /
  review link. Include the capturing staff member if known so the right staff link is sent.

## 6. STAFF MANAGEMENT

- **Add staff** button on the Staff page. Form: First name, Surname, Job category
  (Waiter for v1; keep the field a select for future roles), **Webhook URL** (the GHL
  workflow that messages this staff member's diners with their unique review link).
- On save: system auto-generates the staff member's QR code + link. Staff row supports
  Edit, and **Copy link / Download QR** (for printing or pasting into WhatsApp templates).
- Default WhatsApp template copy (editable per tenant, keep it simple and warm, no dashes):
  "Hi {name}, thanks for visiting {Restaurant name} today. Could you tell us how we did?
  Tap the link below. It takes 30 seconds and helps us serve you better."

## 7. WIN BACK CAMPAIGNS (customer reactivation engine)

Sidebar item **"Win back campaign"**. Four campaigns, each created like a review campaign:
name, WhatsApp template, and a **webhook URL** (its GHL workflow). Templates support
{name}, {Restaurant name}, {offer}, {days_left}.

**Activity signal (no POS integration, by design)**: `last_activity_at` per contact,
updated by ANY of: staff QR scan, review submitted, Google link click, or a staff member
manually adding/finding the contact (Add contact / Send review search). Capturing name +
number at every touchpoint is exactly what makes this work: when a returning customer is
captured, the system matches them by phone and knows whether they hold an active offer.

**State machine** (evaluated daily by a scheduled job):
- Active → **Win back 1**: fires when 14 days pass with no activity. Offer valid 5 days
  (expiry length configurable per campaign).
- WB1 not claimed and still no activity 14 days after WB1 → **Win back 2**.
- Same rule 14 days after WB2 → **Win back 3**.
- **Win back 4**: fires 60 days after WB3 if still no claim/activity.
- ANY activity at any point resets the contact to Active and exits the sequence.
- A contact can never be in two win-back stages at once; never re-fire the same stage.

**Tracking UI per campaign** (lists, not stat boxes, per the clean-pages rule):
- Currently in this campaign (with days left until each offer expires)
- Claimed offers (with claim date)
- Expired offers (with expiry date)
- Waiting (sent, not yet claimed, not yet expired)

**Claiming (explicit only)**: an offer is CLAIMED only when a staff member presses
**Mark as claimed** on it. Nothing claims automatically. When staff add or find a contact
(Add contact / Send review search), any active offer must surface plainly on the result,
e.g. "Has an active offer: free ice cream. 3 days left." with a **Mark as claimed**
button right there, so it can be honoured and recorded on the spot.

**Unclaimed return rule**: if the system detects activity for a contact (QR scan, review,
manual add/find) while they hold an active offer that is NOT marked claimed, they came
back without wanting the offer — the offer is VOIDED (moved to Expired with that date),
the contact exits the win-back sequence, returns to Active, and the 14-day inactivity
clock restarts from that activity. If the 5-day window simply lapses with no activity at
all, the offer expires normally and the sequence continues to the next stage on schedule.

**Compliance (South Africa)**: marketing messages need consent under POPIA and WhatsApp
template approval in GHL. Capture consent at Step 1 of the QR flow ("We may WhatsApp you
about your visit and occasional offers") and honour opt-outs (STOP keyword) by excluding
the contact from all win-back sends.

## 8. GOOGLE REVIEWS POPULATION

Requirement: the Google reviews menu shows the tenant's FULL, auto-updating review
history. DECIDED: build on the **Google Business Profile API with per-tenant OAuth
consent** (tenant connects their Google Business account during onboarding). Sync on a
schedule into `google_reviews_cache`. While approval is pending, use the Places API
(place ID only, 5 most recent reviews) as a temporary display.

**Getting GBP API access (what Nexus must do once, as the software provider):**
1. Google Cloud project + note its Project Number; create an Organization account.
2. Have a complete, verified, active Google Business Profile for the applying business,
   tied to a credible website, and apply from an email that is an owner/manager on it.
3. Submit the GBP API contact form, "Application for Basic API Access", with a SPECIFIC
   use case (e.g. "Sync reviews for authorized client restaurant locations into their
   dashboards, with per-client OAuth consent"), project number and expected volume.
4. Wait for manual review. Typical: about 5–10 business days; can stretch to weeks.
   Quota is the approval signal: 0 QPM = not approved, ~300 QPM = approved.
5. The API only works with OAuth 2.0 (business.manage scope) — API keys are rejected —
   so the OAuth consent screen must also pass Google's app verification (privacy policy,
   homepage, branding) before real tenants can connect.

**Common rejection causes to avoid**: vague use case wording, incomplete form answers,
an unverified/inactive Business Profile, no credible website, applying from an email not
on the profile, or asking for more scope than the use case justifies. Also note: Google's
review policies prohibit review gating — describe the product to Google as review
collection and reputation dashboards, and settle the still-open gating question before
applying, since a gating-centred description risks rejection and policy action.
Store per tenant: Google review URL (for the invite button) and place ID (for display).
⚠ Honest constraint: Google does not reveal WHICH customer posted a review, so
"invited → posted" can only ever be inferred (click tracked + review count increased),
never proven per person.

## 9. MULTI-TENANT ONBOARDING & ROLES

**Compulsory at signup**: Restaurant name · Logo (renders top-left) · Manager full name ·
Manager email + password.

**Optional at signup, always editable later in the Manager area**: brand colors (theme
tokens derived from them, falling back to the Fintech Trust palette) · Google review URL +
place ID · review campaign template (auto-creates the first campaign) · staff members
(name, surname, category, webhook, login email+password each) · win back campaigns 1–4
(name, template, offer, expiry days, webhook) · WhatsApp/GHL location ID · timezone ·
currency (default ZAR) · `google_invite_min_combined` (default 7 of 10).

**Roles**:
- Manager: everything.
- Staff: Dashboard summary (their own), their own QR/link, their own ratings and comments,
  Customers add/Send review. NOT visible: Statistics, Review/Win-back campaign management,
  other staff members' ratings, tenant settings.
All tables carry `tenant_id`; Supabase RLS enforces tenant + role isolation.

## 10. DATA MODEL (Supabase, minimum)

tenants(id, name, logo_url, colors, gmb_url, place_id, ghl_location_id,
  google_invite_min_combined, timezone, currency)
users(id, tenant_id, role manager|staff, name, email)
staff(id, tenant_id, user_id, first_name, surname, category, webhook_url, qr_slug)
contacts(id, tenant_id, name, phone UNIQUE per tenant, added_by, consent_at, opted_out,
  last_activity_at, created_at)
reviews(id, tenant_id, contact_id, staff_id, staff_stars, staff_comment, overall_stars,
  route good|bad, issue_category, assigned_staff_id, status new|fixing|fixed, created_at)
google_click_events(id, tenant_id, contact_id, clicked_at)
google_reviews_cache(tenant_id, payload, fetched_at)
campaigns(id, tenant_id, kind review|winback1..4, name, template, webhook_url, offer_text,
  expiry_days, status)
campaign_sends(id, tenant_id, campaign_id, contact_id, queued_at, sent_at, batch_no)
winback_state(contact_id, tenant_id, stage, entered_at, offer_expires_at,
  claimed_at, expired_at)
Rules: sends batch at 10/minute; dedupe on phone; daily cron evaluates winback_state.

## 11. NON-NEGOTIABLE UI RULES CARRIED FORWARD

Fintech Trust palette (tenant colors may override accents) · clean pages: charts and stat
boxes ONLY under Statistics · one global date control · one status chip per list item ·
plain language, Grade 6, NO dashes in copy · identical title/sentence/list pattern on all
Reviews screens · friendly empty states with a next action.

## 12. OPEN QUESTIONS FOR THE CLIENT

RESOLVED with the client:
1. Google-invite threshold = combined staff + overall stars ≥ 7 of 10 (configurable).
2. No POS integration; offers claim automatically on detected activity in the window.
3. Google reviews via Business Profile API + per-tenant OAuth (Places API as interim).
4. Per-staff webhooks confirmed (unique link per staff template).

STILL OPEN:
1. Review gating: the combined-score gate still means only happier diners are invited to
   Google. Google policy prohibits selective solicitation; the compliant variant invites
   everyone and additionally opens an internal ticket for low ratings. Decision owner:
   the client.
