/**
 * Emits SQL to seed the Fireside Grill tenant from the same seed generator the
 * app used, so the demo data lives in the database. Run: npx tsx scripts/seed-fireside.ts > seed.sql
 * Tenant, staff, users and campaigns already exist (created via MCP); this fills
 * contacts, reviews, winback_state, review_invites and google_reviews.
 */
import { generateSeedData } from "../src/data/generate";

const TENANT = "11111111-1111-1111-1111-111111111111";
const STAFF_UUID: Record<number, string> = {
  1: "b2222222-2222-2222-2222-222222222222",
  2: "b3333333-3333-3333-3333-333333333333",
  3: "b4444444-4444-4444-4444-444444444444",
  4: "b5555555-5555-5555-5555-555555555555",
};

const data = generateSeedData(7);

const q = (v: string | null | undefined) =>
  v === null || v === undefined ? "null" : `'${v.replace(/'/g, "''")}'`;
const d = (v: string | null | undefined) => (v ? `'${v}'` : "null");
const staffRef = (id: number | null) => (id && STAFF_UUID[id] ? `'${STAFF_UUID[id]}'` : "null");

// stable uuid per seed contact id
const cUuid: Record<number, string> = {};
data.contacts.forEach((c) => (cUuid[c.id] = crypto.randomUUID()));

const lines: string[] = ["begin;"];

// contacts
data.contacts.forEach((c) => {
  lines.push(
    `insert into public.contacts (id, tenant_id, name, phone, added_by, consent_at, opted_out, last_activity_at, created_at) values (` +
      `'${cUuid[c.id]}','${TENANT}',${q(c.name)},${q(c.phone)},${q(c.addedBy)},${d(c.consentAt)},${c.optedOut},${d(c.lastActivityAt)},${d(c.createdAt)});`
  );
});

// reviews
data.reviews.forEach((r) => {
  const cid = r.contactId && cUuid[r.contactId] ? `'${cUuid[r.contactId]}'` : "null";
  lines.push(
    `insert into public.reviews (tenant_id, contact_id, diner_name, staff_id, staff_stars, staff_comment, overall_stars, route, issue_category, assigned_staff_id, status, google_status, created_at) values (` +
      `'${TENANT}',${cid},${q(r.dinerName)},${staffRef(r.staffId)},${r.staffStars},${q(r.staffComment)},${r.overallStars},${q(r.route)},${q(r.issueCategory)},${staffRef(r.assignedStaffId)},${q(r.status)},${q(r.googleStatus)},${d(r.createdAt)});`
  );
});

// winback_state
data.winbackEntries.forEach((e) => {
  const cid = cUuid[e.contactId] ? `'${cUuid[e.contactId]}'` : "null";
  lines.push(
    `insert into public.winback_state (tenant_id, contact_id, stage, entered_at, sent_at, offer_expires_at, claimed_at, expired_at, voided) values (` +
      `'${TENANT}',${cid},${e.stage},${d(e.enteredAt)},${d(e.sentAt)},${d(e.offerExpiresAt)},${d(e.claimedAt)},${d(e.expiredAt)},${e.voided});`
  );
});

// review_invites
data.reviewInvites.forEach((i) => {
  const cid = cUuid[i.contactId] ? `'${cUuid[i.contactId]}'` : "null";
  lines.push(
    `insert into public.review_invites (tenant_id, contact_id, phone, staff_id, sent_at, follow_up1_at, follow_up2_at, engaged_at, reviewed_at) values (` +
      `'${TENANT}',${cid},${q(i.phone)},${staffRef(i.staffId)},${d(i.sentAt)},${d(i.followUp1At)},${d(i.followUp2At)},${d(i.engagedAt)},${d(i.reviewedAt)});`
  );
});

// google_reviews
data.googleReviews.forEach((g) => {
  lines.push(
    `insert into public.google_reviews (tenant_id, author, stars, text, posted_at) values (` +
      `'${TENANT}',${q(g.author)},${g.stars},${q(g.text)},${d(g.postedAt)});`
  );
});

lines.push("commit;");
console.log(lines.join("\n"));
