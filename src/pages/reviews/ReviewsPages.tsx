import { Link } from "react-router-dom";
import { ClockIcon, GlobeIcon, ThumbsUpIcon, WrenchIcon } from "../../components/icons";
import { Avatar, Card, EmptyState, ListRow, Pill, Stars } from "../../components/ui";
import { useReviewsInRange, useStore } from "../../data/store";
import { fmtDate } from "../../lib/format";
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
  const { pendingInvites } = useStore();
  return (
    <Card className="py-1 px-4">
      {pendingInvites.length ? (
        pendingInvites.map((p, i) => (
          <ListRow key={p.id} first={i === 0} className="items-center">
            <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center bg-warnsoft text-warn">
              <ClockIcon className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="m-0 text-[13px] font-semibold">
                {p.name} <span className="font-normal text-faint text-xs">· Table {p.table}</span>
              </p>
              <p className="m-0 mt-0.5 text-xs text-sub">
                Scanned {p.scannedAt}. The request sends at {p.sendsAt}.
              </p>
            </div>
            <Pill text={`Waiting. Sends ${p.sendsAt}`} tone="amber" />
          </ListRow>
        ))
      ) : (
        <EmptyState>
          No one is waiting right now. New diners appear here after they scan a staff QR code.
        </EmptyState>
      )}
    </Card>
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
