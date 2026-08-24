/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { iso, normalizePhone } from "../lib/format";
import { supabase } from "../lib/supabase";
import { useAuth } from "./auth";
import { DATA_START, TODAY } from "./constants";
import type {
  Campaign,
  Contact,
  GooglePublicReview,
  PendingInvite,
  Review,
  ReviewInvite,
  StaffMember,
  WinbackEntry,
} from "./types";

export interface DateRange {
  from: string;
  to: string;
}

interface QrSubmission {
  name: string;
  phone: string;
  staffId: string;
  staffStars: number;
  staffComment: string | null;
  overallStars: number;
}

interface StoreValue {
  loaded: boolean;
  staff: StaffMember[];
  contacts: Contact[];
  reviews: Review[];
  pendingInvites: PendingInvite[];
  campaigns: Campaign[];
  winbackEntries: WinbackEntry[];
  googleReviews: GooglePublicReview[];
  reviewInvites: ReviewInvite[];
  range: DateRange;
  setRange: (r: DateRange) => void;
  resetRange: () => void;
  addContact: (name: string, phone: string, addedBy: string) => Promise<Contact | null>;
  editContact: (id: string, name: string, phone: string) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  addStaff: (firstName: string, surname: string, category: "Waiter", webhookUrl: string) => Promise<StaffMember | null>;
  editStaff: (id: string, patch: { firstName: string; surname: string; webhookUrl: string }) => Promise<void>;
  saveCampaign: (patch: Omit<Campaign, "id"> & { id?: string }) => Promise<void>;
  markClaimed: (entryId: string) => Promise<void>;
  recordActivity: (contactId: string) => Promise<void>;
  sendReviewRequest: (contactId: string, staffId: string | null) => Promise<void>;
  submitQrReview: (s: QrSubmission) => Promise<{ contact: Contact | null }>;
  activeOfferFor: (contactId: string) => { entry: WinbackEntry; campaign: Campaign } | null;
}

const StoreContext = createContext<StoreValue | null>(null);
const FULL_RANGE: DateRange = { from: DATA_START, to: TODAY };

const dstr = (v: unknown): string => (v ? String(v).slice(0, 10) : "");
const dnull = (v: unknown): string | null => (v ? String(v).slice(0, 10) : null);

/* ---------- row mappers (snake_case DB -> camelCase types) ---------- */
type Row = Record<string, unknown>;
const mapStaff = (r: Row): StaffMember => ({
  id: r.id as string,
  firstName: r.first_name as string,
  surname: r.surname as string,
  category: "Waiter",
  webhookUrl: (r.webhook_url as string) ?? "",
  qrSlug: r.qr_slug as string,
});
const mapContact = (r: Row): Contact => ({
  id: r.id as string,
  name: r.name as string,
  phone: r.phone as string,
  addedBy: (r.added_by as string) ?? "",
  createdAt: dstr(r.created_at),
  lastActivityAt: dstr(r.last_activity_at),
  consentAt: dnull(r.consent_at),
  optedOut: !!r.opted_out,
});
const mapReview = (r: Row): Review => ({
  id: r.id as string,
  contactId: (r.contact_id as string) ?? null,
  dinerName: (r.diner_name as string) ?? "",
  staffId: (r.staff_id as string) ?? null,
  staffStars: (r.staff_stars as number) ?? 0,
  staffComment: (r.staff_comment as string) ?? null,
  overallStars: (r.overall_stars as number) ?? 0,
  route: (r.route as Review["route"]) ?? "good",
  issueCategory: (r.issue_category as string) ?? null,
  assignedStaffId: (r.assigned_staff_id as string) ?? null,
  status: (r.status as Review["status"]) ?? null,
  googleStatus: (r.google_status as Review["googleStatus"]) ?? null,
  createdAt: dstr(r.created_at),
});
const mapCampaign = (r: Row): Campaign => ({
  id: r.id as string,
  kind: r.kind as Campaign["kind"],
  name: r.name as string,
  template: r.template as string,
  webhookUrl: (r.webhook_url as string) ?? "",
  offerText: (r.offer_text as string) ?? null,
  expiryDays: (r.expiry_days as number) ?? null,
  status: (r.status as Campaign["status"]) ?? "Active",
});
const mapWinback = (r: Row): WinbackEntry => ({
  id: r.id as string,
  contactId: r.contact_id as string,
  stage: r.stage as WinbackEntry["stage"],
  enteredAt: dstr(r.entered_at),
  sentAt: dnull(r.sent_at),
  offerExpiresAt: dstr(r.offer_expires_at),
  claimedAt: dnull(r.claimed_at),
  expiredAt: dnull(r.expired_at),
  voided: !!r.voided,
});
const mapInvite = (r: Row): ReviewInvite => ({
  id: r.id as string,
  contactId: r.contact_id as string,
  phone: r.phone as string,
  staffId: (r.staff_id as string) ?? null,
  sentAt: dstr(r.sent_at),
  followUp1At: dnull(r.follow_up1_at),
  followUp2At: dnull(r.follow_up2_at),
  engagedAt: dnull(r.engaged_at),
  reviewedAt: dnull(r.reviewed_at),
});
const mapGoogle = (r: Row): GooglePublicReview => ({
  id: r.id as string,
  author: (r.author as string) ?? "",
  stars: (r.stars as number) ?? 0,
  text: (r.text as string) ?? "",
  postedAt: dstr(r.posted_at),
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const { appUser, session } = useAuth();
  const tenantId = appUser?.tenantId ?? null;

  const [loaded, setLoaded] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [winbackEntries, setWinbackEntries] = useState<WinbackEntry[]>([]);
  const [googleReviews, setGoogleReviews] = useState<GooglePublicReview[]>([]);
  const [reviewInvites, setReviewInvites] = useState<ReviewInvite[]>([]);
  const [range, setRange] = useState<DateRange>(FULL_RANGE);
  const pendingInvites: PendingInvite[] = [];

  const resetRange = useCallback(() => setRange(FULL_RANGE), []);

  useEffect(() => {
    if (!tenantId) {
      setLoaded(false);
      return;
    }
    let active = true;
    (async () => {
      const [st, ct, rv, cp, wb, ri, gr] = await Promise.all([
        supabase.from("staff").select("*").order("first_name"),
        supabase.from("contacts").select("*").order("created_at", { ascending: false }),
        supabase.from("reviews").select("*").order("created_at", { ascending: false }),
        supabase.from("campaigns").select("*"),
        supabase.from("winback_state").select("*"),
        supabase.from("review_invites").select("*").order("sent_at", { ascending: false }),
        supabase.from("google_reviews").select("*").order("posted_at", { ascending: false }),
      ]);
      if (!active) return;
      setStaff((st.data ?? []).map(mapStaff));
      setContacts((ct.data ?? []).map(mapContact));
      setReviews((rv.data ?? []).map(mapReview));
      setCampaigns((cp.data ?? []).map(mapCampaign));
      setWinbackEntries((wb.data ?? []).map(mapWinback));
      setReviewInvites((ri.data ?? []).map(mapInvite));
      setGoogleReviews((gr.data ?? []).map(mapGoogle));
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [tenantId, session?.access_token]);

  const activeOfferFor = useCallback(
    (contactId: string) => {
      const entry = winbackEntries.find(
        (e) => e.contactId === contactId && !e.claimedAt && !e.expiredAt && e.offerExpiresAt >= TODAY
      );
      if (!entry) return null;
      const campaign = campaigns.find((c) => c.kind === `winback${entry.stage}`);
      return campaign ? { entry, campaign } : null;
    },
    [winbackEntries, campaigns]
  );

  const recordActivity = useCallback(async (contactId: string) => {
    const today = iso(new Date());
    await supabase.from("contacts").update({ last_activity_at: today }).eq("id", contactId);
    await supabase
      .from("winback_state")
      .update({ expired_at: today, voided: true })
      .eq("contact_id", contactId)
      .is("claimed_at", null)
      .is("expired_at", null);
    setContacts((cs) => cs.map((c) => (c.id === contactId ? { ...c, lastActivityAt: today } : c)));
    setWinbackEntries((es) =>
      es.map((e) =>
        e.contactId === contactId && !e.claimedAt && !e.expiredAt
          ? { ...e, expiredAt: today, voided: true }
          : e
      )
    );
  }, []);

  const addContact = useCallback(
    async (name: string, phone: string, addedBy: string): Promise<Contact | null> => {
      if (!tenantId) return null;
      const norm = normalizePhone(phone);
      const existing = contacts.find((c) => normalizePhone(c.phone) === norm);
      if (existing) {
        await recordActivity(existing.id);
        return existing;
      }
      const today = iso(new Date());
      const { data } = await supabase
        .from("contacts")
        .insert({
          tenant_id: tenantId,
          name: name.trim(),
          phone: phone.trim(),
          added_by: addedBy,
          created_at: today,
          last_activity_at: today,
          consent_at: today,
          opted_out: false,
        })
        .select()
        .single();
      if (!data) return null;
      const c = mapContact(data);
      setContacts((cs) => [c, ...cs]);
      return c;
    },
    [tenantId, contacts, recordActivity]
  );

  const editContact = useCallback(async (id: string, name: string, phone: string) => {
    await supabase.from("contacts").update({ name: name.trim(), phone: phone.trim() }).eq("id", id);
    setContacts((cs) => cs.map((c) => (c.id === id ? { ...c, name: name.trim(), phone: phone.trim() } : c)));
  }, []);

  const deleteContact = useCallback(async (id: string) => {
    await supabase.from("contacts").delete().eq("id", id);
    setContacts((cs) => cs.filter((c) => c.id !== id));
  }, []);

  const addStaff = useCallback(
    async (firstName: string, surname: string, category: "Waiter", webhookUrl: string) => {
      if (!tenantId) return null;
      const slug = `${firstName}-${surname}`.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
        "-" + Math.random().toString(36).slice(2, 6);
      const { data } = await supabase
        .from("staff")
        .insert({
          tenant_id: tenantId,
          first_name: firstName.trim(),
          surname: surname.trim(),
          category,
          webhook_url: webhookUrl.trim(),
          qr_slug: slug,
        })
        .select()
        .single();
      if (!data) return null;
      const m = mapStaff(data);
      setStaff((ss) => [...ss, m]);
      return m;
    },
    [tenantId]
  );

  const editStaff = useCallback(
    async (id: string, patch: { firstName: string; surname: string; webhookUrl: string }) => {
      await supabase
        .from("staff")
        .update({ first_name: patch.firstName, surname: patch.surname, webhook_url: patch.webhookUrl })
        .eq("id", id);
      setStaff((ss) =>
        ss.map((s) =>
          s.id === id
            ? { ...s, firstName: patch.firstName, surname: patch.surname, webhookUrl: patch.webhookUrl }
            : s
        )
      );
    },
    []
  );

  const saveCampaign = useCallback(
    async (patch: Omit<Campaign, "id"> & { id?: string }) => {
      if (!tenantId) return;
      const row = {
        kind: patch.kind,
        name: patch.name,
        template: patch.template,
        webhook_url: patch.webhookUrl,
        offer_text: patch.offerText,
        expiry_days: patch.expiryDays,
        status: patch.status,
      };
      if (patch.id) {
        await supabase.from("campaigns").update(row).eq("id", patch.id);
        setCampaigns((cs) => cs.map((c) => (c.id === patch.id ? { ...c, ...patch, id: c.id } : c)));
      } else {
        const { data } = await supabase
          .from("campaigns")
          .insert({ ...row, tenant_id: tenantId })
          .select()
          .single();
        if (data) setCampaigns((cs) => [...cs, mapCampaign(data)]);
      }
    },
    [tenantId]
  );

  const markClaimed = useCallback(async (entryId: string) => {
    const today = iso(new Date());
    await supabase.from("winback_state").update({ claimed_at: today }).eq("id", entryId);
    setWinbackEntries((es) => es.map((e) => (e.id === entryId ? { ...e, claimedAt: today } : e)));
    const entry = winbackEntries.find((e) => e.id === entryId);
    if (entry) {
      await supabase.from("contacts").update({ last_activity_at: today }).eq("id", entry.contactId);
      setContacts((cs) => cs.map((c) => (c.id === entry.contactId ? { ...c, lastActivityAt: today } : c)));
    }
  }, [winbackEntries]);

  const sendReviewRequest = useCallback(
    async (contactId: string, staffId: string | null) => {
      if (!tenantId) return;
      const contact = contacts.find((c) => c.id === contactId);
      const today = iso(new Date());
      const { data } = await supabase
        .from("review_invites")
        .insert({
          tenant_id: tenantId,
          contact_id: contactId,
          phone: contact?.phone ?? "",
          staff_id: staffId,
          sent_at: today,
        })
        .select()
        .single();
      if (data) setReviewInvites((is) => [mapInvite(data), ...is]);
    },
    [tenantId, contacts]
  );

  // The public QR flow writes through an Edge Function (unauthenticated diners
  // cannot pass RLS). Wired in the next step; kept as a safe no-op for now.
  const submitQrReview = useCallback(async (_s: QrSubmission) => {
    return { contact: null as Contact | null };
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      loaded, staff, contacts, reviews, pendingInvites, campaigns, winbackEntries,
      googleReviews, reviewInvites, range, setRange, resetRange, addContact, editContact,
      deleteContact, addStaff, editStaff, saveCampaign, markClaimed, recordActivity,
      sendReviewRequest, submitQrReview, activeOfferFor,
    }),
    [
      loaded, staff, contacts, reviews, campaigns, winbackEntries, googleReviews,
      reviewInvites, range, resetRange, addContact, editContact, deleteContact,
      addStaff, editStaff, saveCampaign, markClaimed, recordActivity, sendReviewRequest,
      submitQrReview, activeOfferFor,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export function useReviewsInRange(): Review[] {
  const { reviews, range } = useStore();
  return useMemo(
    () => reviews.filter((r) => r.createdAt >= range.from && r.createdAt <= range.to),
    [reviews, range]
  );
}
