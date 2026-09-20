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
} from "./types";

export interface DateRange {
  from: string;
  to: string;
}

interface StoreValue {
  loaded: boolean;
  contacts: Contact[];
  reviews: Review[];
  pendingInvites: PendingInvite[];
  campaigns: Campaign[];
  googleReviews: GooglePublicReview[];
  reviewInvites: ReviewInvite[];
  range: DateRange;
  setRange: (r: DateRange) => void;
  resetRange: () => void;
  addContact: (name: string, phone: string, addedBy: string) => Promise<Contact | null>;
  editContact: (id: string, name: string, phone: string) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  saveCampaign: (patch: Omit<Campaign, "id"> & { id?: string }) => Promise<void>;
  sendReviewRequest: (contactId: string, campaignId?: string) => Promise<{ error: string | null }>;
}

const StoreContext = createContext<StoreValue | null>(null);
const FULL_RANGE: DateRange = { from: DATA_START, to: TODAY };

const dstr = (v: unknown): string => (v ? String(v).slice(0, 10) : "");
const dnull = (v: unknown): string | null => (v ? String(v).slice(0, 10) : null);

/* ---------- row mappers (snake_case DB -> camelCase types) ---------- */
type Row = Record<string, unknown>;
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
  staffComment: (r.staff_comment as string) ?? null,
  overallStars: (r.overall_stars as number) ?? 0,
  route: (r.route as Review["route"]) ?? "good",
  issueCategory: (r.issue_category as string) ?? null,
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
const mapInvite = (r: Row): ReviewInvite => ({
  id: r.id as string,
  contactId: r.contact_id as string,
  phone: r.phone as string,
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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
      const [ct, rv, cp, ri, gr] = await Promise.all([
        supabase.from("contacts").select("*").order("created_at", { ascending: false }),
        supabase.from("reviews").select("*").order("created_at", { ascending: false }),
        supabase.from("campaigns").select("*"),
        supabase.from("review_invites").select("*").order("sent_at", { ascending: false }),
        supabase.from("google_reviews").select("*").order("posted_at", { ascending: false }),
      ]);
      if (!active) return;
      setContacts((ct.data ?? []).map(mapContact));
      setReviews((rv.data ?? []).map(mapReview));
      setCampaigns((cp.data ?? []).map(mapCampaign));
      setReviewInvites((ri.data ?? []).map(mapInvite));
      setGoogleReviews((gr.data ?? []).map(mapGoogle));
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [tenantId, session?.access_token]);

  const recordActivity = useCallback(async (contactId: string) => {
    const today = iso(new Date());
    await supabase.from("contacts").update({ last_activity_at: today }).eq("id", contactId);
    setContacts((cs) => cs.map((c) => (c.id === contactId ? { ...c, lastActivityAt: today } : c)));
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

  const sendReviewRequest = useCallback(
    async (contactId: string, campaignId?: string): Promise<{ error: string | null }> => {
      if (!tenantId) return { error: "Not signed in." };
      // The Edge Function POSTs to the campaign's GoHighLevel webhook (the
      // browser cannot call GHL directly) and records the send.
      const { data, error } = await supabase.functions.invoke("send-review-request", {
        body: { contactId, campaignId },
      });
      if (error) {
        let msg = "We could not send that review request. Please try again.";
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          }
        } catch {
          /* keep the generic message */
        }
        return { error: msg };
      }
      if (data?.invite) setReviewInvites((is) => [mapInvite(data.invite as Row), ...is]);
      return { error: null };
    },
    [tenantId]
  );

  const value = useMemo<StoreValue>(
    () => ({
      loaded, contacts, reviews, pendingInvites, campaigns, googleReviews, reviewInvites,
      range, setRange, resetRange, addContact, editContact, deleteContact, saveCampaign,
      sendReviewRequest,
    }),
    [
      loaded, contacts, reviews, campaigns, googleReviews, reviewInvites, range,
      resetRange, addContact, editContact, deleteContact, saveCampaign, sendReviewRequest,
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
