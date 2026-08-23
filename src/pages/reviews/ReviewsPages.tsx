import { Link } from "react-router-dom";
import { ClockIcon, GlobeIcon, ThumbsUpIcon, WrenchIcon } from "../../components/icons";
import { Avatar, Card, EmptyState, ListRow, Pill, Stars } from "../../components/ui";
import { useReviewsInRange, useStore } from "../../data/store";
import { daysBetween, fmtDate, plural } from "../../lib/format";
import { ReviewListCard } from "./ReviewList";

const TILES = [
  { to: "/reviews/sent", icon: ClockIcon, tone: "amber", label: "Sent", text: "Diners we've asked. Waiting to hear back." },
  { to: "/reviews/good", icon: ThumbsUpIcon, tone: "green", label: "Good", text: "Happy diners with 4 or 5 stars." },
  { to: "/reviews/bad", icon: WrenchIcon, tone: "red", label: "Bad", text: "Unhappy diners. Things for your team to fix." },
  { to: "/reviews/google", icon: GlobeIcon, tone: "blue", label: "Google reviews", text: "Reviews the public can see on Google." },
] as const;

const tileTone: Record<string, string> = {
  green: "bg-goodsoft text-good",
  red: "bg-badsoft text-bad",
  amber: "bg-warnsoft text-warn",
  blue: "bg-accentsoft text-accent",
};

export function ReviewsHome() {
  const inRange = useReviewsInRange();
  return (
    <>
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        {TILES.map((t) => (
          <Link key={t.to} to={t.to} className="no-underline text-ink block h-full">
            <Card className="flex items-center gap-3 cursor-pointer hover:border-faint h-full">
              <div className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center ${tileTone[t.tone]}`}>
                <t.icon />
              </div>
              <div className="flex-1 min-w-0">
                <p className="m-0 text-[13.5px] font-bold">{t.label}</p>
                <p className="m-0 mt-0.5 text-xs text-sub leading-snug">{t.text}</p>
              </div>
              <span className="text-faint">›</span>
            </Card>
          </Link>
        ))}
      </div>
      <ReviewListCard
        items={inRange}
        emptyText="No reviews in these dates yet. Widen the date range above, or share a staff QR code after service."
      />
    </>
  );
}

export function SentPage() {
  const { reviewInvites, contacts, staff, range } = useStore();

  const contactName = (id: number) => contacts.find((c) => c.id === id)?.name ?? "Contact";
  const staffFirst = (id: number | null) => staff.find((s) => s.id === id)?.firstName ?? "the team";

  const inRange = reviewInvites.filter(
    (i) => i.sentAt >= range.from && i.sentAt <= range.to
  );

  const statusOf = (i: (typeof reviewInvites)[number]) => {
    if (i.reviewedAt) return { label: "Left a rating", tone: "green" as const };
    if (i.engagedAt) return { label: "Opened review link", tone: "green" as const };
    if (i.followUp2At) return { label: "Reminded twice", tone: "amber" as const };
    if (i.followUp1At) return { label: "Reminded once", tone: "amber" as const };
    return { label: "Waiting", tone: "blue" as const };
  };

  return (
    <>
      <div className="bg-accentsoft text-accent rounded-lg px-3.5 py-2.5 mb-4 text-[12.5px] leading-relaxed">
        Every review request you send lands here. We match the reply by phone number. If a diner
        does not give their name and number within 2 days we nudge them, and once more 2 days after
        that. Anyone who replies leaves the list.
      </div>
      <Card className="py-1 px-4">
        {inRange.length ? (
          inRange.map((inv, i) => {
            const st = statusOf(inv);
            const days = Math.max(0, daysBetween(inv.sentAt, range.to));
            const done = !!inv.engagedAt;
            return (
              <ListRow key={inv.id} first={i === 0} className="items-center">
                <div
                  className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center ${
                    done ? "bg-goodsoft text-good" : "bg-warnsoft text-warn"
                  }`}
                >
                  <ClockIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="m-0 text-[13px] font-semibold">
                    {contactName(inv.contactId)}{" "}
                    <span className="font-normal text-faint text-xs">
                      · {inv.staffId ? `${staffFirst(inv.staffId)}'s link` : "review link"}
                    </span>
                  </p>
                  <p className="m-0 mt-0.5 text-xs text-sub">
                    Sent {fmtDate(inv.sentAt)}.{" "}
                    {done
                      ? "They came back to us."
                      : `${plural(days, "day", "days")} waiting.`}
                  </p>
                </div>
                <Pill text={st.label} tone={st.tone} />
              </ListRow>
            );
          })
        ) : (
          <EmptyState>
            No review requests in these dates. Add a customer, then tap Send review to ask for one.
          </EmptyState>
        )}
      </Card>
    </>
  );
}

export function GoodPage() {
  const inRange = useReviewsInRange();
  return (
    <ReviewListCard
      items={inRange.filter((r) => r.route === "good")}
      emptyText="No happy reviews in these dates. Widen the date range above."
    />
  );
}

export function BadPage() {
  const inRange = useReviewsInRange();
  return (
    <ReviewListCard
      items={inRange.filter((r) => r.route === "bad")}
      emptyText="Nothing to fix. Nice work. Bad reviews land here for your team."
    />
  );
}

export function GooglePage() {
  const { googleReviews, range } = useStore();
  const inRange = googleReviews.filter((g) => g.postedAt >= range.from && g.postedAt <= range.to);
  return (
    <Card className="py-1 px-4">
      {inRange.length ? (
        inRange.slice(0, 15).map((g, i) => (
          <ListRow key={g.id} first={i === 0}>
            <Avatar name={g.author} tone="blue" />
            <div className="flex-1 min-w-0">
              <p className="m-0 text-[13px] font-semibold">
                {g.author}{" "}
                <span className="font-normal text-faint text-xs">· {fmtDate(g.postedAt)}</span>
              </p>
              <Stars n={g.stars} />
              <p className="m-0 mt-0.5 text-[13px] text-sub leading-relaxed">{g.text}</p>
            </div>
            <Pill text="On Google" tone="green" />
          </ListRow>
        ))
      ) : (
        <EmptyState>
          Nothing posted publicly in these dates yet. Happy diners get a Google invite after their
          review.
        </EmptyState>
      )}
      {inRange.length > 15 && (
        <p className="text-xs text-faint py-2.5">Showing 15 of {inRange.length} Google reviews in range.</p>
      )}
    </Card>
  );
}
