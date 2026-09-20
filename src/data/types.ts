export type Route = "good" | "bad";
export type IssueStatus = "new" | "fixing" | "fixed";
export type GoogleStatus = "invited" | "clicked" | "posted" | null;

// All ids are Supabase UUIDs.

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
  staffComment: string | null; // the diner's free-text comment
  overallStars: number;
  route: Route;
  issueCategory: string | null;
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

export type CampaignKind = "review" | "review_followup1" | "review_followup2";

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

export interface GooglePublicReview {
  id: string;
  author: string;
  stars: number;
  text: string;
  postedAt: string; // ISO date
}
