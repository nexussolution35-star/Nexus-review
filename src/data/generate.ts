import { iso, addDays } from "../lib/format";
import type {
  Campaign,
  Contact,
  GooglePublicReview,
  PendingInvite,
  Review,
  ReviewInvite,
  StaffMember,
  WinbackEntry,
  WinbackStage,
} from "./types";

/* One seeded source for every view. All demo data flows from generateSeedData(). */

export const RESTAURANT_NAME = "The Fireside Grill";
export const GOOGLE_REVIEW_URL = "https://g.page/r/fireside-grill/review";
export const GOOGLE_INVITE_MIN_COMBINED = 7;

export const TODAY = "2026-08-22";
export const DATA_START = "2026-03-01";

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ISSUES = [
  "Slow service",
  "Order accuracy",
  "Food quality",
  "Atmosphere",
  "Billing",
  "Cleanliness",
  "Drinks",
];

const GOOD_COMMENTS = [
  "was attentive and friendly all evening",
  "knew the menu inside out",
  "checked in at exactly the right moments",
  "made a great wine suggestion",
  "was quick with every course",
  "handled our big table with ease",
  "was so patient with the kids",
  "went the extra mile for our anniversary",
];
const BAD_COMMENTS = [
  "forgot our drinks order",
  "was slow to bring the bill",
  "seemed rushed and distracted",
  "mixed up two of our plates",
];

const GOOGLE_TEXTS = [
  "The ribs were incredible and service was spot on.",
  "Lovely Sunday lunch, the kids menu is a great touch.",
  "Best steak in the area, the wine pairing was perfect.",
  "They brought a birthday dessert unprompted. Class.",
  "Quick, friendly, and the calamari was excellent.",
  "The QR review was so easy. Food came out fast.",
  "Warm atmosphere and the waiter knew the menu cold.",
  "Portions are generous and everything arrived hot.",
];

const NAMES = [
  "Sipho Mabuza", "Thandi Nkosi", "Lerato Dlamini", "Johan van Wyk",
  "Zanele Mthembu", "Pieter Botha", "Bongani Sithole", "Nomsa Radebe",
  "Marius Coetzee", "Ayanda Zulu", "Karabo Mokoena", "Anele Khumalo",
  "Refilwe Molefe", "Willem Steyn", "Precious Ndlovu", "Sibusiso Mahlangu",
  "Elmarie du Plessis", "Tebogo Maluleke", "Lindiwe Shabangu", "Gert Venter",
  "Naledi Mokgadi", "Chris Barnard", "Palesa Tau", "Andre Fourie",
  "Busisiwe Cele", "Riaan Nel", "Kgomotso Pule", "Sarah Oliphant",
  "Thabo Modise", "Annelie Kruger", "Mandla Gumede", "Zinhle Buthelezi",
  "Dewald Prinsloo", "Nthabiseng Sello", "Vusi Twala", "Carla Smit",
  "Lwazi Mkhize", "Ronel Visagie", "Katlego Mabena", "Hannes Roux",
  "Nandi Ngema", "Francois Louw", "Dineo Rakgotho", "Trudie Bezuidenhout",
  "Sello Mashaba", "Yolandi Swart", "Mpho Lekota", "Jaco Erasmus",
  "Beauty Msimang", "Ruan Oosthuizen", "Tumelo Phiri", "Ilse Meyer",
  "Sizwe Dube", "Marlene Jacobs", "Kabelo Moroka", "Esti van Rensburg",
  "Nokuthula Zwane", "Wian Terblanche", "Lesego Kunene", "Amanda Pienaar",
];

export const DEFAULT_STAFF_TEMPLATE =
  "Hi {name}, thanks for visiting {Restaurant name} today. Could you tell us how we did? Tap the link below. It takes 30 seconds and helps us serve you better.";

export interface SeedData {
  staff: StaffMember[];
  contacts: Contact[];
  reviews: Review[];
  pendingInvites: PendingInvite[];
  campaigns: Campaign[];
  winbackEntries: WinbackEntry[];
  googleReviews: GooglePublicReview[];
  reviewInvites: ReviewInvite[];
}

export const REVIEW_FOLLOWUP_HOURS = 48;

export function generateSeedData(seed = 7): SeedData {
  const rnd = mulberry32(seed);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

  const staff: StaffMember[] = [
    { id: 1, firstName: "Tumi", surname: "Maseko", category: "Waiter", webhookUrl: "https://hooks.ghl.example/fireside/tumi", qrSlug: "tumi-maseko-7f3k" },
    { id: 2, firstName: "Dan", surname: "Pretorius", category: "Waiter", webhookUrl: "https://hooks.ghl.example/fireside/dan", qrSlug: "dan-pretorius-2m9q" },
    { id: 3, firstName: "Naledi", surname: "Khoza", category: "Waiter", webhookUrl: "https://hooks.ghl.example/fireside/naledi", qrSlug: "naledi-khoza-8b4x" },
    { id: 4, firstName: "Andile", surname: "Ngcobo", category: "Waiter", webhookUrl: "https://hooks.ghl.example/fireside/andile", qrSlug: "andile-ngcobo-5t1z" },
  ];
  // Base quality per staff member so their star distributions differ.
  const staffBase = [0.78, 0.6, 0.72, 0.75];

  /* ---- contacts ---- */
  const contacts: Contact[] = [];
  // Every contact is captured through a staff member's unique QR, so "added by"
  // is always the staff member's name.
  const addedBys = staff.map((s) => `${s.firstName} ${s.surname}`);
  const usedPhones = new Set<string>();
  for (let i = 0; i < NAMES.length; i++) {
    let phone = "";
    do {
      phone = `0${pick(["82", "83", "72", "73", "84", "79", "76"])} ${String(Math.floor(rnd() * 900) + 100)} ${String(Math.floor(rnd() * 9000) + 1000)}`;
    } while (usedPhones.has(phone));
    usedPhones.add(phone);
    const createdOffset = Math.floor(rnd() * 170); // spread across the window
    const createdAt = addDays(DATA_START, createdOffset);
    contacts.push({
      id: i + 1,
      name: NAMES[i],
      phone,
      addedBy: pick(addedBys),
      createdAt,
      lastActivityAt: createdAt,
      consentAt: rnd() < 0.9 ? createdAt : null,
      optedOut: rnd() < 0.04,
    });
  }

  /* ---- reviews: individual records per open day (Mondays closed) ---- */
  const reviews: Review[] = [];
  let rid = 1;
  let drift = 0;
  const start = new Date(DATA_START + "T00:00:00");
  const end = new Date(TODAY + "T00:00:00");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 1) continue; // closed Mondays
    drift += (rnd() - 0.48) * 0.01;
    const weekend = d.getDay() === 5 || d.getDay() === 6 || d.getDay() === 0;
    const count = Math.floor(rnd() * (weekend ? 5 : 3)) + (weekend ? 3 : 2);
    for (let k = 0; k < count; k++) {
      const si = Math.floor(rnd() * staff.length);
      const member = staff[si];
      const quality = Math.min(0.92, Math.max(0.4, staffBase[si] + drift + (rnd() - 0.5) * 0.1));
      const isGoodService = rnd() < quality;
      const staffStars = isGoodService ? (rnd() < 0.62 ? 5 : 4) : rnd() < 0.5 ? 3 : rnd() < 0.6 ? 2 : 1;
      let overallStars = staffStars + (rnd() < 0.28 ? (rnd() < 0.5 ? -1 : 1) : 0);
      overallStars = Math.max(1, Math.min(5, overallStars));
      const route = overallStars >= 4 ? "good" : "bad";
      const contact = contacts[Math.floor(rnd() * contacts.length)];
      const date = iso(d);
      const issue = route === "bad" ? pick(ISSUES) : null;
      const combined = staffStars + overallStars;
      let googleStatus: Review["googleStatus"] = null;
      if (route === "good" && combined >= GOOGLE_INVITE_MIN_COMBINED) {
        const r = rnd();
        googleStatus = r < 0.45 ? "posted" : r < 0.62 ? "clicked" : "invited";
      }
      const hasComment = rnd() < (isGoodService ? 0.6 : 0.85);
      reviews.push({
        id: rid++,
        contactId: contact.id,
        dinerName: contact.name,
        staffId: member.id,
        staffStars,
        staffComment: hasComment
          ? `${member.firstName} ${pick(isGoodService ? GOOD_COMMENTS : BAD_COMMENTS)}.`
          : null,
        overallStars,
        route,
        issueCategory: issue,
        assignedStaffId: route === "bad" ? staff[Math.floor(rnd() * staff.length)].id : null,
        status:
          route === "bad"
            ? date >= addDays(TODAY, -3)
              ? rnd() < 0.5
                ? "new"
                : "fixing"
              : rnd() < 0.85
                ? "fixed"
                : "fixing"
            : null,
        googleStatus,
        createdAt: date,
      });
      // Any review counts as activity for its contact.
      if (date > contact.lastActivityAt) contact.lastActivityAt = date;
      if (issue && route === "bad" && rnd() < 0.15) {
        // occasionally the same issue repeats on a busy day (keeps top issues realistic)
        reviews.push({ ...reviews[reviews.length - 1], id: rid++ });
      }
    }
  }
  reviews.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  /* ---- diners currently inside the review window ---- */
  const pendingInvites: PendingInvite[] = [
    { id: 1, name: "Anele Khumalo", table: 4, scannedAt: "19:42", sendsAt: "20:12" },
    { id: 2, name: "Pieter Botha", table: 12, scannedAt: "19:55", sendsAt: "20:25" },
  ];

  /* ---- campaigns: one review campaign + four win back campaigns ---- */
  const campaigns: Campaign[] = [
    {
      id: 1,
      kind: "review",
      name: "Table QR follow up",
      template:
        "Hi {name}, thanks for visiting {Restaurant name} today. Could you tell us how we did? Tap the link below. It takes 30 seconds and helps us serve you better.",
      webhookUrl: "https://hooks.ghl.example/fireside/review-campaign",
      offerText: null,
      expiryDays: null,
      status: "Active",
    },
    {
      id: 6,
      kind: "review_followup1",
      name: "Review follow up 1",
      template:
        "Hi {name}, we would still love to hear how your visit to {Restaurant name} went. It takes 30 seconds. Tap the link below.",
      webhookUrl: "https://hooks.ghl.example/fireside/review-followup-1",
      offerText: null,
      expiryDays: null,
      status: "Active",
    },
    {
      id: 7,
      kind: "review_followup2",
      name: "Review follow up 2",
      template:
        "Hi {name}, one last nudge from {Restaurant name}. Your feedback really helps us serve you better. Tap the link when you have a moment.",
      webhookUrl: "https://hooks.ghl.example/fireside/review-followup-2",
      offerText: null,
      expiryDays: null,
      status: "Active",
    },
    {
      id: 2,
      kind: "winback1",
      name: "Win back 1. We miss you",
      template:
        "Hi {name}, we miss you at {Restaurant name}! Come say hello this week and enjoy {offer}. It is valid for {days_left} more days.",
      webhookUrl: "https://hooks.ghl.example/fireside/winback-1",
      offerText: "a free dessert",
      expiryDays: 5,
      status: "Active",
    },
    {
      id: 3,
      kind: "winback2",
      name: "Win back 2. On the house",
      template:
        "Hi {name}, it has been a while! Your table at {Restaurant name} is waiting. Bring a friend and get {offer}. Valid for {days_left} more days.",
      webhookUrl: "https://hooks.ghl.example/fireside/winback-2",
      offerText: "a free starter",
      expiryDays: 5,
      status: "Active",
    },
    {
      id: 4,
      kind: "winback3",
      name: "Win back 3. Dinner for two",
      template:
        "Hi {name}, we would love to see you back at {Restaurant name}. Book a table for two and get {offer}. Valid for {days_left} more days.",
      webhookUrl: "https://hooks.ghl.example/fireside/winback-3",
      offerText: "25% off your bill",
      expiryDays: 7,
      status: "Active",
    },
    {
      id: 5,
      kind: "winback4",
      name: "Win back 4. One last treat",
      template:
        "Hi {name}, it has been a long time! We saved you something special at {Restaurant name}: {offer}. It is valid for {days_left} more days.",
      webhookUrl: "https://hooks.ghl.example/fireside/winback-4",
      offerText: "a free main course",
      expiryDays: 7,
      status: "Active",
    },
  ];

  /* ---- win back entries across all four stages ---- */
  const winbackEntries: WinbackEntry[] = [];
  let wid = 1;
  const usedContactIds = new Set<number>();
  const freshContact = (): Contact => {
    let c: Contact;
    do {
      c = contacts[Math.floor(rnd() * contacts.length)];
    } while (usedContactIds.has(c.id) || c.optedOut);
    usedContactIds.add(c.id);
    return c;
  };
  const stageCampaign = (stage: WinbackStage): Campaign =>
    campaigns.find((c) => c.kind === `winback${stage}`)!;

  // Guaranteed unclaimed-return example (PRD §7): Thandi Nkosi held a stage 2 offer,
  // came back and was captured at the POS without claiming it, so the offer was voided
  // to Expired on that date and she is Active again with the 14 day clock restarted.
  {
    const thandi = contacts.find((c) => c.name === "Thandi Nkosi")!;
    usedContactIds.add(thandi.id);
    const enteredAt = addDays(TODAY, -9);
    const cameBackAt = addDays(TODAY, -2);
    thandi.lastActivityAt = cameBackAt;
    winbackEntries.push({
      id: wid++,
      contactId: thandi.id,
      stage: 2,
      enteredAt,
      sentAt: enteredAt,
      offerExpiresAt: addDays(enteredAt, stageCampaign(2).expiryDays ?? 5),
      claimedAt: null,
      expiredAt: cameBackAt,
      voided: true,
    });
  }

  // Currently active offers per stage (with days left), plus claimed and expired history.
  const activeCounts: Record<WinbackStage, number> = { 1: 5, 2: 3, 3: 2, 4: 2 };
  ( [1, 2, 3, 4] as WinbackStage[] ).forEach((stage) => {
    const expiryDays = stageCampaign(stage).expiryDays ?? 5;
    for (let i = 0; i < activeCounts[stage]; i++) {
      const c = freshContact();
      const daysIn = Math.floor(rnd() * expiryDays); // 0..expiry-1 days into the window
      const enteredAt = addDays(TODAY, -daysIn);
      // Keep the contact genuinely inactive: activity older than the stage entry.
      c.lastActivityAt = addDays(enteredAt, -(14 + Math.floor(rnd() * 20)));
      winbackEntries.push({
        id: wid++,
        contactId: c.id,
        stage,
        enteredAt,
        sentAt: enteredAt,
        offerExpiresAt: addDays(enteredAt, expiryDays),
        claimedAt: null,
        expiredAt: null,
        voided: false,
      });
    }
    // claimed history
    for (let i = 0; i < 2 + Math.floor(rnd() * 3); i++) {
      const c = freshContact();
      const enteredAt = addDays(TODAY, -(10 + Math.floor(rnd() * 60)));
      const claimedAt = addDays(enteredAt, 1 + Math.floor(rnd() * (expiryDays - 1)));
      c.lastActivityAt = claimedAt > c.lastActivityAt ? claimedAt : c.lastActivityAt;
      winbackEntries.push({
        id: wid++,
        contactId: c.id,
        stage,
        enteredAt,
        sentAt: enteredAt,
        offerExpiresAt: addDays(enteredAt, expiryDays),
        claimedAt,
        expiredAt: null,
        voided: false,
      });
    }
    // expired history
    for (let i = 0; i < 1 + Math.floor(rnd() * 3); i++) {
      const c = freshContact();
      const enteredAt = addDays(TODAY, -(15 + Math.floor(rnd() * 70)));
      winbackEntries.push({
        id: wid++,
        contactId: c.id,
        stage,
        enteredAt,
        sentAt: enteredAt,
        offerExpiresAt: addDays(enteredAt, expiryDays),
        claimedAt: null,
        expiredAt: addDays(enteredAt, expiryDays),
        voided: rnd() < 0.25,
      });
    }
  });

  /* ---- Google public reviews (cache display) ---- */
  const googleReviews: GooglePublicReview[] = [];
  let gid = 1;
  reviews
    .filter((r) => r.googleStatus === "posted")
    .forEach((r) => {
      googleReviews.push({
        id: gid++,
        author: r.dinerName,
        stars: r.overallStars,
        text: pick(GOOGLE_TEXTS),
        postedAt: r.createdAt,
      });
    });

  /* ---- review invites: sent from the POS, tracked by phone (PRD §5) ---- */
  const reviewInvites: ReviewInvite[] = [];
  let iid = 1;
  const invitePool = contacts.filter((c) => !c.optedOut);
  let ip = 0;
  const nextInviteContact = () => invitePool[ip++ % invitePool.length];
  const addInvite = (
    hoursAgo: number,
    reach: "waiting" | "reminded1" | "reminded2" | "engaged" | "reviewed"
  ) => {
    const c = nextInviteContact();
    const sentAt = addDays(TODAY, -Math.ceil(hoursAgo / 24));
    const day = 24;
    reviewInvites.push({
      id: iid++,
      contactId: c.id,
      phone: c.phone,
      staffId: staff[Math.floor(rnd() * staff.length)].id,
      sentAt,
      followUp1At:
        reach === "reminded1" || reach === "reminded2"
          ? addDays(sentAt, Math.floor(REVIEW_FOLLOWUP_HOURS / day))
          : null,
      followUp2At:
        reach === "reminded2"
          ? addDays(sentAt, Math.floor((REVIEW_FOLLOWUP_HOURS * 2) / day))
          : null,
      engagedAt: reach === "engaged" || reach === "reviewed" ? addDays(sentAt, 1) : null,
      reviewedAt: reach === "reviewed" ? addDays(sentAt, 1) : null,
    });
  };
  // A spread across every state so the Sent tracker shows the whole funnel.
  addInvite(6, "waiting");
  addInvite(20, "waiting");
  addInvite(30, "waiting");
  addInvite(60, "reminded1");
  addInvite(70, "reminded1");
  addInvite(110, "reminded2");
  addInvite(3, "engaged");
  addInvite(28, "engaged");
  addInvite(50, "reviewed");
  addInvite(80, "reviewed");
  reviewInvites.sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1));

  return {
    staff,
    contacts,
    reviews,
    pendingInvites,
    campaigns,
    winbackEntries,
    googleReviews,
    reviewInvites,
  };
}
