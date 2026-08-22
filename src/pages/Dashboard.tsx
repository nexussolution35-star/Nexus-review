import { Link } from "react-router-dom";
import type { ComponentType } from "react";
import { ClockIcon, GlobeIcon, RotateIcon, StarIcon, UsersIcon } from "../components/icons";
import { Card } from "../components/ui";
import { useStore } from "../data/store";
import { TODAY } from "../data/generate";
import { addDays, plural } from "../lib/format";

/**
 * PRD §2.3: no KPI boxes here. A Summary section: a neat digest of what is
 * going on around the application right now, as short plain sentences
 * grouped under small labels.
 */

const toneCls: Record<string, string> = {
  green: "bg-goodsoft text-good",
  red: "bg-badsoft text-bad",
  amber: "bg-warnsoft text-warn",
  blue: "bg-accentsoft text-accent",
};

/** Renders a sentence with the numbers gently emphasised. Still a sentence, not a stat box. */
function Line({ text }: { text: string }) {
  return (
    <p className="m-0 text-[13px] text-sub leading-relaxed">
      {text.split(/(\d+)/).map((part, i) =>
        /^\d+$/.test(part) ? (
          <span key={i} className="font-semibold text-ink">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </p>
  );
}

export function Dashboard() {
  const { reviews, pendingInvites, googleReviews, winbackEntries, contacts, campaigns } =
    useStore();

  const weekAgo = addDays(TODAY, -7);
  const todayReviews = reviews.filter((r) => r.createdAt === TODAY);
  const fixing = reviews.filter((r) => r.status === "fixing").length;
  const newIssues = reviews.filter((r) => r.status === "new").length;
  const googleThisWeek = googleReviews.filter((g) => g.postedAt >= weekAgo).length;
  const activeOffers = winbackEntries.filter(
    (e) => !e.claimedAt && !e.expiredAt && e.offerExpiresAt >= TODAY
  );
  const expiringSoon = activeOffers.filter((e) => e.offerExpiresAt <= addDays(TODAY, 2)).length;
  const claimedThisWeek = winbackEntries.filter(
    (e) => e.claimedAt && e.claimedAt >= weekAgo
  ).length;
  const newContactsThisWeek = contacts.filter((c) => c.createdAt >= weekAgo).length;
  const activeCampaigns = campaigns.filter((c) => c.status === "Active").length;

  const groups: {
    label: string;
    icon: ComponentType<{ className?: string }>;
    tone: string;
    to: string;
    action: string;
    lines: string[];
  }[] = [
    {
      label: "Reviews",
      icon: StarIcon,
      tone: "amber",
      to: "/reviews",
      action: "See all reviews",
      lines: [
        todayReviews.length
          ? `${plural(todayReviews.length, "new review", "new reviews")} today.`
          : "No new reviews yet today.",
        fixing
          ? `${plural(fixing, "issue is", "issues are")} being fixed.`
          : "No issues are being worked on right now.",
        newIssues
          ? `${plural(newIssues, "new issue needs", "new issues need")} an owner.`
          : "Every issue has an owner.",
      ],
    },
    {
      label: "Waiting",
      icon: ClockIcon,
      tone: "blue",
      to: "/reviews/sent",
      action: "See who is waiting",
      lines: [
        pendingInvites.length
          ? `${plural(pendingInvites.length, "diner is", "diners are")} in the review window right now.`
          : "No diners are in the review window right now.",
      ],
    },
    {
      label: "Google",
      icon: GlobeIcon,
      tone: "green",
      to: "/reviews/google",
      action: "See Google reviews",
      lines: [
        googleThisWeek
          ? `${plural(googleThisWeek, "review", "reviews")} posted this week.`
          : "Nothing posted on Google yet this week.",
      ],
    },
    {
      label: "Win back",
      icon: RotateIcon,
      tone: "red",
      to: "/win-back",
      action: "Open win back",
      lines: [
        `${plural(activeOffers.length, "customer is", "customers are")} in win back.`,
        expiringSoon
          ? `${plural(expiringSoon, "offer expires", "offers expire")} in the next 2 days.`
          : "No offers expire in the next 2 days.",
        claimedThisWeek
          ? `${plural(claimedThisWeek, "offer was", "offers were")} claimed this week.`
          : "No offers were claimed this week.",
      ],
    },
    {
      label: "Contacts",
      icon: UsersIcon,
      tone: "blue",
      to: "/customers",
      action: "Open contact list",
      lines: [
        `${plural(newContactsThisWeek, "new contact", "new contacts")} added this week.`,
        `${plural(activeCampaigns, "campaign is", "campaigns are")} running.`,
      ],
    },
  ];

  return (
    <>
      <p className="text-xs text-faint tracking-wide uppercase mb-2">Summary</p>
      <div
        className="grid gap-3.5"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))" }}
      >
        {groups.map((g) => (
          <Link key={g.label} to={g.to} className="no-underline">
            <Card className="h-full flex flex-col hover:border-faint transition-colors">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div
                  className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${toneCls[g.tone]}`}
                >
                  <g.icon className="w-4 h-4" />
                </div>
                <p className="m-0 text-[13.5px] font-bold text-ink">{g.label}</p>
              </div>
              <div className="grid gap-1 flex-1">
                {g.lines.map((line) => (
                  <Line key={line} text={line} />
                ))}
              </div>
              <p className="m-0 mt-3 text-xs text-accent font-semibold">{g.action} →</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
