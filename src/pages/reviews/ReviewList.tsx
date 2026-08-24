import { Avatar, Card, EmptyState, ListRow, Pill, Stars } from "../../components/ui";
import { useStore } from "../../data/store";
import type { Review } from "../../data/types";
import { fmtDate } from "../../lib/format";

const PLAIN_ISSUE: Record<string, string> = {
  "Slow service": "Slow service",
  "Order accuracy": "Order mix up",
  "Food quality": "Kitchen issue",
  Atmosphere: "Atmosphere issue",
  Billing: "Billing issue",
  Cleanliness: "Cleanliness issue",
  Drinks: "Drinks issue",
};

export function issueLine(r: Review, staffName: string): string {
  const plain = r.issueCategory ? (PLAIN_ISSUE[r.issueCategory] ?? r.issueCategory) : "Issue";
  if (r.status === "fixed") return `${plain}. ${staffName} fixed it.`;
  return `${plain}. ${staffName} is on it.`;
}

export function ReviewListCard({
  items,
  emptyText,
  googleMode = false,
  limit = 12,
}: {
  items: Review[];
  emptyText: string;
  googleMode?: boolean;
  limit?: number;
}) {
  const { staff } = useStore();
  const staffFirst = (id: string | null) =>
    staff.find((s) => s.id === id)?.firstName ?? "The team";

  return (
    <Card className="py-1 px-4">
      {items.length ? (
        items.slice(0, limit).map((r, i) => (
          <ListRow key={r.id} first={i === 0}>
            <Avatar name={r.dinerName} tone={r.route === "good" ? "green" : "red"} />
            <div className="flex-1 min-w-0">
              <p className="m-0 text-[13px] font-semibold">
                {r.dinerName}{" "}
                <span className="font-normal text-faint text-xs">
                  · {fmtDate(r.createdAt)}
                </span>
              </p>
              <Stars n={r.overallStars} />
              <p className="m-0 mt-0.5 text-[13px] text-sub leading-relaxed">
                {r.staffComment ?? "Left a rating only."}
              </p>
              {r.route === "bad" && (
                <p className="m-0 mt-1 text-[12.5px] text-sub">
                  {issueLine(r, staffFirst(r.assignedStaffId))}
                </p>
              )}
            </div>
            {googleMode || r.googleStatus === "posted" ? (
              <Pill text="Posted on Google" tone="green" />
            ) : (
              <Pill text={`Review given to ${staffFirst(r.staffId)}`} tone="blue" />
            )}
          </ListRow>
        ))
      ) : (
        <EmptyState>{emptyText}</EmptyState>
      )}
      {items.length > limit && (
        <p className="text-xs text-faint py-2.5">
          Showing {limit} of {items.length} reviews in range.
        </p>
      )}
    </Card>
  );
}
