import { Card } from "../components/ui";
import { useStore } from "../data/store";
import { TODAY } from "../data/generate";
import { addDays, plural } from "../lib/format";

/**
 * PRD §2.3: no KPI boxes here. A Summary section: a neat digest of what is
 * going on around the application right now, as short plain sentences
 * grouped under small labels.
 */
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

  const groups: { label: string; lines: string[] }[] = [
    {
      label: "Reviews",
      lines: [
        todayReviews.length
          ? `${plural(todayReviews.length, "new review", "new reviews")} today.`
          : "No new reviews yet today.",
        fixing
          ? `${plural(fixing, "issue is", "issues are")} being fixed.`
          : "No issues are being worked on right now.",
        newIssues ? `${plural(newIssues, "new issue needs", "new issues need")} an owner.` : "Every issue has an owner.",
      ],
    },
    {
      label: "Waiting",
      lines: [
        pendingInvites.length
          ? `${plural(pendingInvites.length, "diner is", "diners are")} in the review window right now.`
          : "No diners are in the review window right now.",
      ],
    },
    {
      label: "Google",
      lines: [
        googleThisWeek
          ? `${plural(googleThisWeek, "review", "reviews")} posted this week.`
          : "Nothing posted on Google yet this week.",
      ],
    },
    {
      label: "Win back",
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
      lines: [
        `${plural(newContactsThisWeek, "new contact", "new contacts")} added this week.`,
        `${plural(activeCampaigns, "campaign is", "campaigns are")} running.`,
      ],
    },
  ];

  return (
    <Card>
      <p className="text-[15px] font-semibold m-0 mb-3">Summary</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="text-[11px] text-faint tracking-wide uppercase mb-1.5">{g.label}</p>
            {g.lines.map((line) => (
              <p key={line} className="text-[13px] text-ink leading-relaxed m-0">
                {line}
              </p>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
