/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { addDays, iso, normalizePhone } from "../lib/format";
import { generateSeedData, TODAY, DATA_START } from "./generate";
import type {
  Campaign,
  Contact,
  GooglePublicReview,
  PendingInvite,
  Review,
  StaffMember,
  WebhookSend,
  WinbackEntry,
} from "./types";

const SEED = generateSeedData(7);

export interface DateRange {
  from: string;
  to: string;
}

interface QrSubmission {
  name: string;
  phone: string;
  staffId: number;
  staffStars: number;
  staffComment: string | null;
  overallStars: number;
}

interface StoreValue {
  staff: StaffMember[];
  contacts: Contact[];
  reviews: Review[];
  pendingInvites: PendingInvite[];
  campaigns: Campaign[];
  winbackEntries: WinbackEntry[];
  googleReviews: GooglePublicReview[];
  webhookSends: WebhookSend[];
  range: DateRange;
  setRange: (r: DateRange) => void;
  resetRange: () => void;
  addContact: (name: string, phone: string, addedBy: string) => Contact;
  editContact: (id: number, name: string, phone: string) => void;
  deleteContact: (id: number) => void;
  addStaff: (firstName: string, surname: string, category: "Waiter", webhookUrl: string) => StaffMember;
  editStaff: (id: number, patch: Partial<Omit<StaffMember, "id">>) => void;
  saveCampaign: (patch: Omit<Campaign, "id"> & { id?: number }) => void;
  markClaimed: (entryId: number) => void;
  recordActivity: (contactId: number) => void;
  sendReviewRequest: (contactId: number, staffId: number | null) => void;
  submitQrReview: (s: QrSubmission) => { review: Review; contact: Contact };
  activeOfferFor: (contactId: number) => { entry: WinbackEntry; campaign: Campaign } | null;
}

const StoreContext = createContext<StoreValue | null>(null);

const FULL_RANGE: DateRange = { from: DATA_START, to: TODAY };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>(SEED.contacts);
  const [staff, setStaff] = useState<StaffMember[]>(SEED.staff);
  const [reviews, setReviews] = useState<Review[]>(SEED.reviews);
  const [pendingInvites] = useState<PendingInvite[]>(SEED.pendingInvites);
  const [campaigns, setCampaigns] = useState<Campaign[]>(SEED.campaigns);
  const [winbackEntries, setWinbackEntries] = useState<WinbackEntry[]>(SEED.winbackEntries);
  const [googleReviews] = useState<GooglePublicReview[]>(SEED.googleReviews);
  const [webhookSends, setWebhookSends] = useState<WebhookSend[]>([]);
  const [range, setRange] = useState<DateRange>(FULL_RANGE);

  const resetRange = useCallback(() => setRange(FULL_RANGE), []);

  const activeOfferFor = useCallback(
    (contactId: number) => {
      const entry = winbackEntries.find(
        (e) =>
          e.contactId === contactId &&
          !e.claimedAt &&
          !e.expiredAt &&
          e.offerExpiresAt >= TODAY
      );
      if (!entry) return null;
      const campaign = campaigns.find((c) => c.kind === `winback${entry.stage}`);
      return campaign ? { entry, campaign } : null;
    },
    [winbackEntries, campaigns]
  );

  /**
   * PRD §7 unclaimed return rule. Any detected activity (QR scan, review,
   * manual add or find) updates last_activity_at. If the contact holds an
   * active offer that was never marked claimed, the offer is voided to
   * Expired with that date, the contact exits the sequence back to Active,
   * and the 14 day inactivity clock restarts from this activity.
   */
  const recordActivity = useCallback((contactId: number) => {
    const today = iso(new Date());
    setContacts((cs) =>
      cs.map((c) => (c.id === contactId ? { ...c, lastActivityAt: today } : c))
    );
    setWinbackEntries((es) =>
      es.map((e) =>
        e.contactId === contactId && !e.claimedAt && !e.expiredAt
          ? { ...e, expiredAt: today, voided: true }
          : e
      )
    );
  }, []);

  const addContact = useCallback(
    (name: string, phone: string, addedBy: string): Contact => {
      const norm = normalizePhone(phone);
      const today = iso(new Date());
      const existing = contacts.find((c) => normalizePhone(c.phone) === norm);
      if (existing) {
        recordActivity(existing.id);
        return existing;
      }
      const contact: Contact = {
        id: Math.max(0, ...contacts.map((c) => c.id)) + 1,
        name: name.trim(),
        phone: phone.trim(),
        addedBy,
        createdAt: today,
        lastActivityAt: today,
        consentAt: today,
        optedOut: false,
      };
      setContacts((cs) => [contact, ...cs]);
      return contact;
    },
    [contacts, recordActivity]
  );

  const editContact = useCallback((id: number, name: string, phone: string) => {
    setContacts((cs) =>
      cs.map((c) => (c.id === id ? { ...c, name: name.trim(), phone: phone.trim() } : c))
    );
  }, []);

  const deleteContact = useCallback((id: number) => {
    setContacts((cs) => cs.filter((c) => c.id !== id));
  }, []);

  const addStaff = useCallback(
    (firstName: string, surname: string, category: "Waiter", webhookUrl: string): StaffMember => {
      const slugBase = `${firstName}-${surname}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const rand = Math.random().toString(36).slice(2, 6);
      const member: StaffMember = {
        id: Math.max(0, ...staff.map((s) => s.id)) + 1,
        firstName: firstName.trim(),
        surname: surname.trim(),
        category,
        webhookUrl: webhookUrl.trim(),
        qrSlug: `${slugBase}-${rand}`,
      };
      setStaff((ss) => [...ss, member]);
      return member;
    },
    [staff]
  );

  const editStaff = useCallback((id: number, patch: Partial<Omit<StaffMember, "id">>) => {
    setStaff((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const saveCampaign = useCallback((patch: Omit<Campaign, "id"> & { id?: number }) => {
    setCampaigns((cs) => {
      if (patch.id !== undefined) {
        return cs.map((c) => (c.id === patch.id ? { ...c, ...patch, id: c.id } : c));
      }
      const id = Math.max(0, ...cs.map((c) => c.id)) + 1;
      return [...cs, { ...patch, id }];
    });
  }, []);

  const markClaimed = useCallback((entryId: number) => {
    const today = iso(new Date());
    setWinbackEntries((es) =>
      es.map((e) => (e.id === entryId ? { ...e, claimedAt: today } : e))
    );
    const entry = winbackEntries.find((e) => e.id === entryId);
    if (entry) {
      setContacts((cs) =>
        cs.map((c) => (c.id === entry.contactId ? { ...c, lastActivityAt: today } : c))
      );
    }
  }, [winbackEntries]);

  const sendReviewRequest = useCallback(
    (contactId: number, staffId: number | null) => {
      const reviewCampaign = campaigns.find((c) => c.kind === "review");
      if (!reviewCampaign) return;
      setWebhookSends((ws) => [
        {
          id: ws.length + 1,
          campaignId: reviewCampaign.id,
          contactId,
          staffId,
          queuedAt: new Date().toISOString(),
        },
        ...ws,
      ]);
      recordActivity(contactId);
    },
    [campaigns, recordActivity]
  );

  const submitQrReview = useCallback(
    (s: QrSubmission): { review: Review; contact: Contact } => {
      const contact = addContact(s.name, s.phone, "QR scan");
      recordActivity(contact.id);
      const route = s.overallStars >= 4 ? "good" : "bad";
      const review: Review = {
        id: Math.max(0, ...reviews.map((r) => r.id)) + 1,
        contactId: contact.id,
        dinerName: contact.name,
        staffId: s.staffId,
        staffStars: s.staffStars,
        staffComment: s.staffComment,
        overallStars: s.overallStars,
        route,
        issueCategory: route === "bad" ? "New issue" : null,
        assignedStaffId: route === "bad" ? s.staffId : null,
        status: route === "bad" ? "new" : null,
        googleStatus: null,
        createdAt: iso(new Date()),
      };
      setReviews((rs) => [review, ...rs]);
      return { review, contact };
    },
    [addContact, recordActivity, reviews]
  );

  const value = useMemo<StoreValue>(
    () => ({
      staff,
      contacts,
      reviews,
      pendingInvites,
      campaigns,
      winbackEntries,
      googleReviews,
      webhookSends,
      range,
      setRange,
      resetRange,
      addContact,
      editContact,
      deleteContact,
      addStaff,
      editStaff,
      saveCampaign,
      markClaimed,
      recordActivity,
      sendReviewRequest,
      submitQrReview,
      activeOfferFor,
    }),
    [
      staff, contacts, reviews, pendingInvites, campaigns, winbackEntries,
      googleReviews, webhookSends, range, resetRange, addContact, editContact,
      deleteContact, addStaff, editStaff, saveCampaign, markClaimed,
      recordActivity, sendReviewRequest, submitQrReview, activeOfferFor,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/** Reviews inside the global date range, newest first. */
export function useReviewsInRange(): Review[] {
  const { reviews, range } = useStore();
  return useMemo(
    () => reviews.filter((r) => r.createdAt >= range.from && r.createdAt <= range.to),
    [reviews, range]
  );
}

export function addDaysIso(isoDate: string, days: number): string {
  return addDays(isoDate, days);
}
