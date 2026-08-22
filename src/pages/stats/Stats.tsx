import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart,
  ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { ReactNode } from "react";
import { Card } from "../../components/ui";
import { useReviewsInRange, useStore } from "../../data/store";
import { fmtDateShort } from "../../lib/format";

const C = {
  text: "#0A2540", sub: "#425466", border: "#E3E8EE",
  green: "#217005", red: "#DF1B41", blue: "#635BFF", amber: "#C84801",
  greenSoft: "#D7F7C2",
};
const tipStyle = { fontSize: 12, borderRadius: 8, border: `1px solid ${C.border}` };
const grid2 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))", gap: 14 };

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Card>
      <p className="m-0 text-[15px] font-semibold">{title}</p>
      <p className="m-0 mt-0.5 mb-3.5 text-[12.5px] text-sub">{subtitle}</p>
      {children}
    </Card>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="!p-3.5">
      <p className="m-0 text-xs text-sub">{label}</p>
      <p className="m-0 mt-1 text-[26px] font-bold tracking-tight">{value}</p>
      {note && <p className="m-0 text-xs text-faint">{note}</p>}
    </Card>
  );
}

function useWeeklyRating() {
  const inRange = useReviewsInRange();
  return useMemo(() => {
    const byWeek: Record<string, { key: string; label: string; sum: number; n: number }> = {};
    [...inRange]
      .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
      .forEach((r) => {
        const d = new Date(r.createdAt + "T00:00:00");
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const key = monday.toISOString().slice(0, 10);
        byWeek[key] = byWeek[key] || { key, label: fmtDateShort(key), sum: 0, n: 0 };
        byWeek[key].sum += r.overallStars;
        byWeek[key].n++;
      });
    return Object.values(byWeek)
      .sort((a, b) => (a.key > b.key ? 1 : -1))
      .map((w) => ({ label: w.label, rating: +(w.sum / w.n).toFixed(2) }));
  }, [inRange]);
}

function useMonthly() {
  const inRange = useReviewsInRange();
  return useMemo(() => {
    const byMonth: Record<string, { key: string; month: string; good: number; bad: number; google: number }> = {};
    [...inRange]
      .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
      .forEach((r) => {
        const key = r.createdAt.slice(0, 7);
        const month = new Date(r.createdAt + "T00:00:00").toLocaleDateString("en-ZA", { month: "short" });
        byMonth[key] = byMonth[key] || { key, month, good: 0, bad: 0, google: 0 };
        if (r.route === "good") byMonth[key].good++;
        else byMonth[key].bad++;
        if (r.googleStatus === "posted") byMonth[key].google++;
      });
    return Object.values(byMonth).sort((a, b) => (a.key > b.key ? 1 : -1));
  }, [inRange]);
}

export function StatsOverview() {
  const inRange = useReviewsInRange();
  const { contacts, range } = useStore();
  const monthly = useMonthly();
  const good = inRange.filter((r) => r.route === "good").length;
  const bad = inRange.length - good;
  const googlePosts = inRange.filter((r) => r.googleStatus === "posted").length;
  const avg = inRange.length
    ? inRange.reduce((a, r) => a + r.overallStars, 0) / inRange.length
    : 0;
  const newContacts = contacts.filter(
    (c) => c.createdAt >= range.from && c.createdAt <= range.to
  ).length;

  return (
    <>
      <div className="grid gap-3 mb-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))" }}>
        <Kpi label="Reviews" value={inRange.length.toLocaleString()} note="in range" />
        <Kpi label="Average rating" value={avg ? avg.toFixed(1) + "★" : "None yet"} />
        <Kpi label="Happy diners" value={good.toLocaleString()} note="4 or 5 stars" />
        <Kpi label="Issues logged" value={bad.toLocaleString()} note="1 to 3 stars" />
        <Kpi label="Google posts" value={googlePosts.toLocaleString()} />
        <Kpi label="New contacts" value={newContacts.toLocaleString()} />
      </div>
      <div style={grid2}>
        <ChartCard title="Are reviews coming in?" subtitle="Good and bad reviews per month">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={monthly}>
              <CartesianGrid stroke={C.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.sub }} />
              <YAxis tick={{ fontSize: 11, fill: C.sub }} width={36} allowDecimals={false} />
              <Tooltip contentStyle={tipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="good" name="Good" stackId="s" fill={C.green} />
              <Bar dataKey="bad" name="Bad" stackId="s" fill={C.red} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="How many public reviews are we earning?" subtitle="Google posts per month from happy diners">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={monthly}>
              <CartesianGrid stroke={C.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.sub }} />
              <YAxis tick={{ fontSize: 11, fill: C.sub }} width={36} allowDecimals={false} />
              <Tooltip contentStyle={tipStyle} formatter={(v) => [v as number, "Google posts"]} />
              <Bar dataKey="google" fill={C.blue} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="google" position="top" style={{ fontSize: 11, fill: C.sub }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  );
}

export function StatsReviews() {
  const inRange = useReviewsInRange();
  const { staff } = useStore();
  const weekly = useWeeklyRating();
  const monthly = useMonthly();

  /* Top issues in this window: the top 5 issue categories derived from the
     reviews inside the selected date range. Computed from data, not a fixed list. */
  const topIssues = useMemo(() => {
    const counts: Record<string, number> = {};
    inRange
      .filter((r) => r.route === "bad" && r.issueCategory)
      .forEach((r) => {
        counts[r.issueCategory!] = (counts[r.issueCategory!] ?? 0) + 1;
      });
    return Object.entries(counts)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [inRange]);

  const staffTable = staff.map((s) => {
    const mine = inRange.filter((r) => r.staffId === s.id);
    const avg = mine.length ? mine.reduce((a, r) => a + r.staffStars, 0) / mine.length : 0;
    return { id: s.id, name: `${s.firstName} ${s.surname}`, ratings: mine.length, avg };
  });

  return (
    <div style={grid2}>
      <ChartCard title="Is guest experience improving?" subtitle="Average star rating per week, with the 4.5 star target band">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={weekly}>
            <CartesianGrid stroke={C.border} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.sub }} minTickGap={24} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: C.sub }} width={26} />
            <ReferenceArea y1={4.5} y2={5} fill={C.greenSoft} />
            <Tooltip contentStyle={tipStyle} formatter={(v) => [v + "★", "Average rating"]} />
            <Line dataKey="rating" stroke={C.amber} strokeWidth={2.4} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Is sentiment shifting?" subtitle="Good vs bad reviews per month">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthly}>
            <CartesianGrid stroke={C.border} vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.sub }} />
            <YAxis tick={{ fontSize: 11, fill: C.sub }} width={36} allowDecimals={false} />
            <Tooltip contentStyle={tipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="good" name="Good" stackId="s" fill={C.green} />
            <Bar dataKey="bad" name="Bad" stackId="s" fill={C.red} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Top issues in this window" subtitle="The five biggest issue categories from reviews in the selected dates">
        {topIssues.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topIssues} layout="vertical" margin={{ left: 20, right: 30 }}>
              <CartesianGrid stroke={C.border} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: C.sub }} allowDecimals={false} />
              <YAxis type="category" dataKey="issue" tick={{ fontSize: 11.5, fill: C.text }} width={110} />
              <Tooltip contentStyle={tipStyle} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {topIssues.map((d) => (
                  <Cell key={d.issue} fill={C.red} />
                ))}
                <LabelList dataKey="count" position="right" style={{ fontSize: 12, fill: C.sub }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[13px] text-faint py-4">
            No issues in these dates. Nice work.
          </p>
        )}
      </ChartCard>
      <ChartCard title="How is each server rated?" subtitle="Ratings collected and average stars per staff member in range">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-sub text-[11.5px] text-left">
              <th className="py-2 px-1.5 border-b border-line font-medium">Staff member</th>
              <th className="py-2 px-1.5 border-b border-line font-medium text-right">Ratings</th>
              <th className="py-2 px-1.5 border-b border-line font-medium text-right">Average</th>
            </tr>
          </thead>
          <tbody>
            {staffTable.map((sr) => (
              <tr key={sr.id}>
                <td className="py-2.5 px-1.5 border-b border-line">{sr.name}</td>
                <td className="py-2.5 px-1.5 border-b border-line text-right text-sub">{sr.ratings}</td>
                <td
                  className={`py-2.5 px-1.5 border-b border-line text-right font-semibold ${
                    sr.avg >= 4.5 ? "text-good" : "text-warn"
                  }`}
                >
                  {sr.ratings ? sr.avg.toFixed(1) + "★" : "None yet"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ChartCard>
    </div>
  );
}

export function StatsStaff() {
  const inRange = useReviewsInRange();
  const { staff } = useStore();

  /* PRD §2.5: staff statistics keep ONLY the per staff star distribution. */
  const dist = staff.map((s) => {
    const mine = inRange.filter((r) => r.staffId === s.id);
    return {
      name: s.firstName,
      "5★": mine.filter((r) => r.staffStars === 5).length,
      "4★": mine.filter((r) => r.staffStars === 4).length,
      "3★": mine.filter((r) => r.staffStars === 3).length,
      "2★": mine.filter((r) => r.staffStars === 2).length,
      "1★": mine.filter((r) => r.staffStars === 1).length,
    };
  });

  return (
    <div style={grid2}>
      <ChartCard title="How do each server's stars distribute?" subtitle="Count of 1 to 5 star ratings per staff member in range">
        <ResponsiveContainer width="100%" height={Math.max(230, staff.length * 52)}>
          <BarChart data={dist} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid stroke={C.border} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: C.sub }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: C.text }} width={70} />
            <Tooltip contentStyle={tipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="5★" stackId="d" fill={C.green} />
            <Bar dataKey="4★" stackId="d" fill="#A5D6A0" />
            <Bar dataKey="3★" stackId="d" fill={C.amber} />
            <Bar dataKey="2★" stackId="d" fill="#F0A08C" />
            <Bar dataKey="1★" stackId="d" fill={C.red} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
