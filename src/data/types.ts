export type Route = "good" | "bad";
export type IssueStatus = "new" | "fixing" | "fixed";
export type GoogleStatus = "invited" | "clicked" | "posted" | null;
export type StaffCategory = "Waiter";

export interface StaffMember {
  id: number;
  firstName: string;
  surname: string;
  category: StaffCategory;
  webhookUrl: string;
  qrSlug: string;
}

export interface Contact {
  id: number;
  name: string;
  phone: string;
  addedBy: string;
  createdAt: string; // ISO date
  lastActivityAt: string; // ISO date
  consentAt: string | null;
  optedOut: boolean;
}

export interface Review {
  id: number;
  contactId: number | null;
  dinerName: string;
  staffId: number;
  staffStars: number;
  staffComment: string | null;
  overallStars: number;
  route: Route;
  issueCategory: string | null;
  assignedStaffId: number | null;
  status: IssueStatus | null;
  googleStatus: GoogleStatus;
  createdAt: string; // ISO date
}

/** A diner inside the review window: asked, waiting to hear back. */
export interface PendingInvite {
  id: number;
  name: string;
  table: number;
  scannedAt: string; // HH:mm
  sendsAt: string; // HH:mm
}

export type CampaignKind = "review" | "winback1" | "winback2" | "winback3" | "winback4";

export interface Campaign {
  id: number;
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
  id: number;
  contactId: number;
  stage: WinbackStage;
  enteredAt: string; // ISO date the contact entered this stage
  sentAt: string | null; // when the WhatsApp message went out
  offerExpiresAt: string; // ISO date
  claimedAt: string | null;
  expiredAt: string | null;
  voided: boolean; // true when the diner came back without wanting the offer
}

export interface GooglePublicReview {
  id: number;
  author: string;
  stars: number;
  text: string;
  postedAt: string; // ISO date
}

export interface WebhookSend {
  id: number;
  campaignId: number;
  contactId: number;
  staffId: number | null;
  queuedAt: string;
}
