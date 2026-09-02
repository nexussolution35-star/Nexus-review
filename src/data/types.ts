export type Route = "good" | "bad";
export type IssueStatus = "new" | "fixing" | "fixed";
export type GoogleStatus = "invited" | "clicked" | "posted" | null;
export type StaffCategory = "Waiter";

// All ids are Supabase UUIDs.

export interface StaffMember {
  id: string;
  firstName: string;
  surname: string;
  category: StaffCategory;
  webhookUrl: string;
  qrSlug: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  addedBy: string;
  createdAt: string; // ISO date
  lastActivityAt: string; // ISO date
  consentAt: string | null;
  optedOut: boolean;
}

export interface Review {
  id: string;
  contactId: string | null;
  dinerName: string;
  staffId: string | null;
  staffStars: number;
  staffComment: string | null;
  overallStars: number;
  route: Route;
  issueCategory: string | null;
  assignedStaffId: string | null;
  status: IssueStatus | null;
  googleStatus: GoogleStatus;
  createdAt: string; // ISO date
}

/** A diner inside the review window: asked, waiting to hear back. */
export interface PendingInvite {
  id: string;
  name: string;
  table: number;
  scannedAt: string; // HH:mm
  sendsAt: string; // HH:mm
}

export type CampaignKind =
  | "review"
  | "review_followup1"
  | "review_followup2"
  | "winback1"
  | "winback2"
  | "winback3"
  | "winback4";

export type ReviewInviteStatus =
  | "waiting"
  | "reminded1"
  | "reminded2"
  | "engaged"
  | "reviewed";

export interface ReviewInvite {
  id: string;
  contactId: string;
  phone: string; // the match key
  staffId: string | null;
  sentAt: string;
  followUp1At: string | null;
  followUp2At: string | null;
  engagedAt: string | null;
  reviewedAt: string | null;
}

export interface Campaign {
  id: string;
  kind: CampaignKind;
  name: string;
  template: string;
  webhookUrl: string;
  offerText: string | null;
  expiryDays: number | null;
  status: "Active" | "Paused";
}

export type WinbackStage = 1 | 2 | 3 | 4;

export interface WinbackEntry {
  id: string;
  contactId: string;
  stage: WinbackStage;
  enteredAt: string;
  sentAt: string | null;
  offerExpiresAt: string;
  claimedAt: string | null;
  expiredAt: string | null;
  voided: boolean;
  scheduledSendAt: string | null; // when the win-back message is due to fire
  messageSentAt: string | null; // when the webhook actually fired (null = not yet)
}

export interface GooglePublicReview {
  id: string;
  author: string;
  stars: number;
  text: string;
  postedAt: string; // ISO date
}

export interface WebhookSend {
  id: string;
  campaignId: string;
  contactId: string;
  staffId: string | null;
  queuedAt: string;
}
