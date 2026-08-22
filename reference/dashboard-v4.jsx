import { useState, useMemo, useEffect } from "react";
import {
  ResponsiveContainer, ComposedChart, BarChart, LineChart, AreaChart, PieChart,
  Bar, Line, Area, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceArea, LabelList
} from "recharts";

/* ================= design tokens ================= */
const C = {
  text: "#0A2540", sub: "#425466", faint: "#8792A2", border: "#E3E8EE",
  surface: "#ffffff", bg: "#F6F9FC", sidebar: "#FFFFFF",
  green: "#217005", greenSoft: "#D7F7C2",
  red: "#DF1B41", redSoft: "#FFE7EB",
  blue: "#635BFF", blueSoft: "#EEEDFF",
  amber: "#C84801", amberSoft: "#FCEDB9",
  slate: "#425466",
};
const fmtR = (v) => "R" + Math.round(v).toLocaleString("en-ZA");
const fmtRk = (v) => (Math.abs(v) >= 1e6 ? "R" + (v / 1e6).toFixed(1) + "m" : Math.abs(v) >= 1000 ? "R" + Math.round(v / 1000) + "k" : "R" + Math.round(v));
const fmtPct = (v) => v.toFixed(1) + "%";
const fmtDate = (d) => d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
const iso = (d) => d.toISOString().slice(0, 10);

/* ================= seeded data ================= */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ISSUES = ["Slow service", "Order accuracy", "Food quality", "Ambience", "Billing"];
const STAFF = [
  { name: "Tumi Maseko", role: "Waiter", handles: ["Slow service", "Order accuracy"] },
  { name: "Dan Pretorius", role: "Waiter", handles: ["Slow service", "Order accuracy"] },
  { name: "Naledi Khoza", role: "Host / Manager", handles: ["Ambience", "Billing", "Slow service"] },
  { name: "Chef Andile Ngcobo", role: "Head chef", handles: ["Food quality", "Order accuracy"] },
];
const NAMES = ["Sipho Mabuza", "Thandi Nkosi", "Lerato Dlamini", "Johan van Wyk", "Zanele Mthembu", "Pieter Botha", "Bongani Sithole", "Nomsa Radebe", "Marius Coetzee", "Ayanda Zulu", "Karabo Mokoena", "Anele Khumalo", "Refilwe Molefe", "Willem Steyn", "Precious Ndlovu", "Sibusiso Mahlangu", "Elmarie du Plessis", "Tebogo Maluleke", "Lindiwe Shabangu", "Gert Venter"];
const GOOD_TEXTS = ["The ribs were incredible and service was spot on.", "Lovely Sunday lunch, the kids menu is a great touch.", "Best steak in the area — wine pairing was perfect.", "They brought a birthday dessert unprompted. Class.", "Quick, friendly, and the calamari was excellent.", "The QR review was so easy. Food came out fast.", "Warm atmosphere and the waiter knew the menu cold.", "Portions are generous and everything arrived hot."];
const BAD_TEXTS = { "Slow service": "Waited over 40 minutes for mains.", "Order accuracy": "Order came out wrong twice.", "Food quality": "Steak was overdone and lukewarm.", "Ambience": "Music too loud to hold a conversation.", "Billing": "Bill had items we didn't order." };

const START = new Date("2026-03-01T00:00:00");
const END = new Date("2026-08-16T00:00:00");

function generateData(seed = 7) {
  const rnd = mulberry32(seed);
  const days = [];
  const records = [];
  let drift = 0, rid = 0;
  for (let d = new Date(START), i = 0; d <= END; d.setDate(d.getDate() + 1), i++) {
    const dow = d.getDay();
    const closed = dow === 1;
    drift += (rnd() - 0.46) * 0.4;
    const weekendBoost = dow === 5 || dow === 6 ? 1.55 : dow === 0 ? 1.3 : 1;
    const covers = closed ? 0 : Math.round((95 + rnd() * 60 + drift) * weekendBoost);
    const avgSpend = closed ? 0 : 380 + rnd() * 90 + i * 0.28;
    const revenue = covers * avgSpend;
    const bShare = Math.max(0.12, Math.min(0.22, 0.15 + rnd() * 0.05 + ((dow === 6 || dow === 0) ? 0.04 : 0)));
    let lShare = 0.30 + rnd() * 0.08 - ((dow === 5 || dow === 6) ? 0.03 : 0);
    const dShare = 1 - bShare - lShare;
    const dineShare = 0.78 + rnd() * 0.06;
    const cosPct = 0.32 + rnd() * 0.04, labPct = 0.24 + rnd() * 0.04, otherPct = 0.09 + rnd() * 0.03;
    const scans = closed ? 0 : Math.round(covers * (0.28 + rnd() * 0.1));
    const reviews = Math.round(scans * (0.6 + rnd() * 0.1));
    const good = Math.round(reviews * (0.74 + rnd() * 0.08));
    const bad = Math.min(reviews - good, Math.round(reviews * (0.07 + rnd() * 0.05)));
    const googlePosted = Math.round(good * (0.66 + rnd() * 0.1));
    const rating = reviews ? Math.min(4.85, 4.15 + rnd() * 0.55 + drift * 0.004) : 0;
    const newDiners = Math.round(scans * (0.55 + rnd() * 0.15));
    const badIssues = {};
    ISSUES.forEach((iss) => (badIssues[iss] = 0));
    for (let b = 0; b < bad; b++) {
      const r = rnd();
      const issName = r < 0.38 ? "Slow service" : r < 0.6 ? "Order accuracy" : r < 0.78 ? "Food quality" : r < 0.9 ? "Ambience" : "Billing";
      badIssues[issName]++;
    }
    /* sample individual records (~1 good + occasional bad per open day) */
    if (!closed) {
      if (rnd() < 0.85) {
        const posted = rnd() < 0.7;
        records.push({ id: rid++, name: NAMES[Math.floor(rnd() * NAMES.length)], table: 1 + Math.floor(rnd() * 14), stars: rnd() < 0.6 ? 5 : 4, text: GOOD_TEXTS[Math.floor(rnd() * GOOD_TEXTS.length)], date: iso(d), type: "good", googleStatus: posted ? "posted" : "link_sent" });
      }
      if (rnd() < 0.28) {
        const issName = ISSUES[Math.floor(rnd() * ISSUES.length)];
        const st = rnd();
        records.push({ id: rid++, name: NAMES[Math.floor(rnd() * NAMES.length)], table: 1 + Math.floor(rnd() * 14), stars: rnd() < 0.5 ? 2 : rnd() < 0.5 ? 1 : 3, text: BAD_TEXTS[issName], date: iso(d), type: "bad", issue: issName, assigned: STAFF.find((s) => s.handles.includes(issName)).name, status: st < 0.55 ? "Resolved" : st < 0.85 ? "In progress" : "New" });
      }
    }
    days.push({
      date: new Date(d), dow, closed, covers, avgSpend, revenue, bShare, lShare, dShare, dineShare,
      breakfastRevenue: revenue * bShare, lunchRevenue: revenue * lShare, dinnerRevenue: revenue * dShare,
      costOfSales: revenue * cosPct, labour: revenue * labPct, other: revenue * otherPct,
      netProfit: revenue * (1 - cosPct - labPct - otherPct),
      scans, reviews, good, bad, googlePosted, rating, newDiners, badIssues,
    });
  }
  return { days, records: records.sort((a, b) => (a.date < b.date ? 1 : -1)) };
}
const DATA = generateData(7);
const ALL_DAYS = DATA.days;
const RECORDS = DATA.records;
const PENDING = [
  { name: "Anele Khumalo", table: 4, scanned: "19:42", sendsAt: "20:12", minsLeft: 14 },
  { name: "Pieter Botha", table: 12, scanned: "19:55", sendsAt: "20:25", minsLeft: 27 },
  { name: "Walk-in guest", table: 8, scanned: "20:03", sendsAt: "20:33", minsLeft: 35 },
];

/* ---- staff rating records (per-staff QR scans, two ratings per scan) ---- */
const STAFF_COMMENT_POOL = {
  good: ["was attentive and friendly all evening", "knew the menu inside out", "checked in at exactly the right moments", "made a great wine suggestion", "was quick with every course", "handled our big table with ease", "was so patient with the kids", "went the extra mile for our anniversary"],
  bad: ["forgot our drinks order", "was slow to bring the bill", "seemed rushed and distracted", "mixed up two of our plates"],
};
function generateStaffRatings(seed = 11) {
  const rnd = mulberry32(seed);
  const out = []; let id = 0;
  const base = [4.8, 4.2, 4.6, 4.7];
  for (let d = new Date(START); d <= END; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 1) continue;
    STAFF.forEach((s, si) => {
      if (rnd() < 0.45) {
        const goodBias = (base[si] - 4) * 0.5;
        const isGood = rnd() < 0.68 + goodBias;
        const staffStars = isGood ? (rnd() < 0.6 ? 5 : 4) : (rnd() < 0.55 ? 3 : 2);
        const pool = isGood ? STAFF_COMMENT_POOL.good : STAFF_COMMENT_POOL.bad;
        const first = NAMES[Math.floor(rnd() * NAMES.length)].split(" ")[0];
        let bizStars = staffStars + (rnd() < 0.3 ? (rnd() < 0.5 ? -1 : 1) : 0);
        bizStars = Math.max(1, Math.min(5, bizStars));
        out.push({ id: id++, staffIdx: si, staff: s.name, diner: first, date: iso(d), staffStars, comment: `${s.name.split(" ")[0]} ${pool[Math.floor(rnd() * pool.length)]}.`, bizStars, recommend: bizStars >= 4 ? rnd() < 0.9 : rnd() < 0.3 });
      }
    });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}
const STAFF_RATINGS = generateStaffRatings(11);

/* ================= UI atoms ================= */
const cardStyle = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 };
const tipStyle = { fontSize: 12, borderRadius: 8, border: `1px solid ${C.border}` };
const grid2 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))", gap: 14 };
const kpiGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 12, marginBottom: 14 };
const inputStyle = { width: "100%", boxSizing: "border-box", fontSize: 13, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, fontFamily: "inherit" };

function ChartCard({ title, subtitle, children }) {
  return (
    <div style={cardStyle}>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{title}</p>
      <p style={{ margin: "2px 0 14px", fontSize: 12.5, color: C.sub }}>{subtitle}</p>
      {children}
    </div>
  );
}
function Kpi({ label, value, delta, note }) {
  return (
    <div style={{ ...cardStyle, padding: 14 }}>
      <p style={{ margin: 0, fontSize: 12, color: C.sub }}>{label}</p>
      <p style={{ margin: "4px 0 2px", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>{value}</p>
      {delta !== undefined ? (
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: delta >= 0 ? C.green : C.red }}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%<span style={{ color: C.faint, fontWeight: 400 }}> vs prev period</span>
        </p>
      ) : note ? <p style={{ margin: 0, fontSize: 12, color: C.faint }}>{note}</p> : null}
    </div>
  );
}
function Pill({ text, tone }) {
  const bg = { green: C.greenSoft, red: C.redSoft, amber: C.amberSoft, blue: C.blueSoft }[tone];
  const tx = { green: C.green, red: C.red, amber: C.amber, blue: C.blue }[tone];
  return <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: bg, color: tx, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>{text}</span>;
}
function InsightCards({ items }) {
  const bg = { green: C.greenSoft, red: C.redSoft, amber: C.amberSoft };
  const tx = { green: C.green, red: C.red, amber: C.amber };
  return (
    <div style={{ ...cardStyle, marginBottom: 14 }}>
      <p style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>What this data is telling you</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
        {items.map((ins, i) => (
          <div key={i} style={{ background: bg[ins.tone], borderRadius: 10, padding: "12px 14px" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: tx[ins.tone] }}>{ins.tone === "green" ? "●" : ins.tone === "amber" ? "▲" : "■"} {ins.title}</p>
            <p style={{ margin: "5px 0 0", fontSize: 12.5, lineHeight: 1.45 }}>{ins.body}</p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: tx[ins.tone], fontWeight: 600 }}>→ {ins.action}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
function Stars({ n }) {
  return <span style={{ letterSpacing: 1 }}>{[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ color: i < n ? C.amber : C.border, fontSize: 12 }}>★</span>)}</span>;
}
function QrTile({ seedNum, size = 46 }) {
  const rnd = mulberry32(seedNum * 97 + 13);
  const cells = Array.from({ length: 49 }, () => rnd() > 0.5);
  return (
    <div style={{ width: size, height: size, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", border: `2px solid ${C.text}`, padding: 3, borderRadius: 6, background: "#fff", flexShrink: 0, boxSizing: "border-box" }}>
      {cells.map((f, i) => <div key={i} style={{ background: f ? C.text : "transparent" }} />)}
    </div>
  );
}
function ReviewList({ items, showRoute, emptyText, googleMode }) {
  const plainIssue = { "Slow service": "Slow service", "Order accuracy": "Order mix-up", "Food quality": "Kitchen issue", "Ambience": "Atmosphere issue", "Billing": "Billing issue" };
  return (
    <div style={{ ...cardStyle, padding: "4px 16px" }}>
      {items.length ? items.slice(0, 12).map((r, i) => (
        <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 0", borderTop: i ? `1px solid ${C.border}` : "none" }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: r.type === "good" ? C.greenSoft : C.redSoft, color: r.type === "good" ? C.green : C.red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>
            {r.name.split(" ").map((p) => p[0]).join("")}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{r.name} <span style={{ fontWeight: 400, color: C.faint, fontSize: 12 }}>· Table {r.table} · {fmtDate(new Date(r.date))}</span></p>
            <Stars n={r.stars} />
            <p style={{ margin: "2px 0 0", fontSize: 13, color: C.sub, lineHeight: 1.45 }}>{r.text || "Left a rating only"}</p>
            {r.type === "bad" && <p style={{ margin: "4px 0 0", fontSize: 12.5, color: C.sub }}>{plainIssue[r.issue] || r.issue} — {r.status === "Resolved" ? `${r.assigned.split(" ")[0]} fixed it.` : `${r.assigned.split(" ")[0]} is on it.`}</p>}
          </div>
          {showRoute && (googleMode
            ? <Pill text="On Google" tone="green" />
            : r.type === "good"
              ? <Pill text={r.googleStatus === "posted" ? "Posted on Google" : "Invited to Google"} tone={r.googleStatus === "posted" ? "green" : "blue"} />
              : <Pill text={r.status === "Resolved" ? "Fixed" : r.status === "In progress" ? "Being fixed" : "New"} tone={r.status === "Resolved" ? "green" : r.status === "In progress" ? "amber" : "red"} />)}
        </div>
      )) : <p style={{ fontSize: 13, color: C.faint, padding: "16px 0" }}>{emptyText || "No reviews in this date range."}</p>}
      {items.length > 12 && <p style={{ fontSize: 12, color: C.faint, padding: "10px 0" }}>Showing 12 of {items.length} reviews in range.</p>}
    </div>
  );
}

/* ================= main ================= */
export default function FiresideExecutiveDashboard() {
  const N = ALL_DAYS.length;
  const [view, setView] = useState("overview");
  const [fromIdx, setFromIdx] = useState(0);
  const [toIdx, setToIdx] = useState(N - 1);
  const [service, setService] = useState("All");
  const [dayFilter, setDayFilter] = useState("All days");
  const [dineCtx, setDineCtx] = useState("All");
  const [issueFilter, setIssueFilter] = useState(null);
  const [campaigns, setCampaigns] = useState([
    { id: 1, name: "Table QR follow-up", template: "Hi {{name}}, thanks for dining with us tonight! Tap the link to tell us how it was.", workflow: "Send 30 minutes after QR scan", gbLink: "https://g.page/r/fireside-grill/review", status: "Active", sent: 214, responses: 133 },
  ]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ name: "", template: "", workflow: "Send 30 minutes after QR scan", gbLink: "" });
  const [formErr, setFormErr] = useState("");
  const [contacts, setContacts] = useState([
    { id: 1, name: "Sipho Mabuza", phone: "082 456 7890", addedBy: "QR scan · Table 7", date: "2026-08-12" },
    { id: 2, name: "Thandi Nkosi", phone: "073 210 9876", addedBy: "QR scan · Table 3", date: "2026-08-07" },
    { id: 3, name: "Johan van Wyk", phone: "084 998 1122", addedBy: "CSV import", date: "2026-07-30" },
    { id: 4, name: "Lerato Dlamini", phone: "079 335 6677", addedBy: "Tumi (Waiter)", date: "2026-07-11" },
  ]);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [contactDraft, setContactDraft] = useState({ name: "", phone: "" });
  const [contactErr, setContactErr] = useState("");
  const [csvNote, setCsvNote] = useState("");
  const saveContact = () => {
    if (!contactDraft.name.trim()) { setContactErr("Enter the diner's name."); return; }
    if (!contactDraft.phone.trim()) { setContactErr("Enter a phone number."); return; }
    setContacts((cs) => [{ id: Date.now(), name: contactDraft.name.trim(), phone: contactDraft.phone.trim(), addedBy: "You", date: iso(END) }, ...cs]);
    setContactDraft({ name: "", phone: "" }); setContactErr(""); setContactFormOpen(false);
  };

  const setPreset = (days) => {
    if (days === "ALL") { setFromIdx(0); setToIdx(N - 1); return; }
    setToIdx(N - 1); setFromIdx(Math.max(0, N - 1 - days));
  };

  /* ---- one memoised filtered dataset ---- */
  const F = useMemo(() => {
    const lo = Math.min(fromIdx, toIdx), hi = Math.max(fromIdx, toIdx);
    const range = ALL_DAYS.slice(lo, hi + 1);
    const dowKeep = (dw) => dayFilter === "All days" ? true : dayFilter === "Weekends" ? (dw === 0 || dw === 6) : (dw >= 1 && dw <= 5);
    const svcShare = (d) => (service === "All" ? 1 : service === "Breakfast" ? d.bShare : service === "Lunch" ? d.lShare : d.dShare);
    const dineF = (d) => (dineCtx === "All" ? 1 : dineCtx === "Dine-in" ? d.dineShare : 1 - d.dineShare);
    const reviewsF = dineCtx === "Takeaway" ? 0 : 1;
    const days = range.filter((d) => dowKeep(d.dow)).map((d) => {
      const f = svcShare(d) * dineF(d);
      return {
        ...d,
        scans: d.scans * reviewsF, reviews: d.reviews * reviewsF, good: d.good * reviewsF, bad: d.bad * reviewsF, googlePosted: d.googlePosted * reviewsF, newDiners: d.newDiners * reviewsF,
        fRevenue: d.revenue * f, fCovers: Math.round(d.covers * f),
        fProfit: d.netProfit * f, fCos: d.costOfSales * f, fLab: d.labour * f, fOther: d.other * f,
      };
    });
    const sum = (k) => days.reduce((a, d) => a + d[k], 0);
    const revenue = sum("fRevenue"), profit = sum("fProfit"), covers = sum("fCovers");
    const openDays = days.filter((d) => !d.closed);
    const scans = sum("scans"), reviews = sum("reviews"), good = sum("good"), bad = sum("bad"), gPosted = sum("googlePosted"), newDiners = sum("newDiners");
    const rating = openDays.length ? openDays.reduce((a, d) => a + d.rating, 0) / openDays.length : 0;
    const issueTotals = {};
    ISSUES.forEach((i) => (issueTotals[i] = days.reduce((a, d) => a + d.badIssues[i], 0) * reviewsF));
    const len = days.length;
    const prev = ALL_DAYS.slice(Math.max(0, lo - len), lo).filter((d) => dowKeep(d.dow));
    const p = (fn, fb = 1) => prev.reduce((a, d) => a + fn(d), 0) || fb;
    const pRevenue = p((d) => d.revenue * svcShare(d) * dineF(d));
    const pCovers = p((d) => d.covers), pProfit = p((d) => d.netProfit), pReviews = p((d) => d.reviews);

    const byMonth = {};
    days.forEach((d) => {
      const m = d.date.toLocaleDateString("en-ZA", { month: "short" });
      byMonth[m] = byMonth[m] || { month: m, revenue: 0, profit: 0, cos: 0, labour: 0, other: 0, lunch: 0, dinner: 0, good: 0, bad: 0, scans: 0, reviews: 0, gPosted: 0, newDiners: 0 };
      const t = byMonth[m];
      t.revenue += d.fRevenue; t.profit += d.fProfit; t.cos += d.fCos; t.labour += d.fLab; t.other += d.fOther;
      t.breakfast = (t.breakfast || 0) + d.breakfastRevenue * dineF(d); t.lunch += d.lunchRevenue * dineF(d); t.dinner += d.dinnerRevenue * dineF(d); t.good += d.good; t.bad += d.bad;
      t.scans += d.scans; t.reviews += d.reviews; t.gPosted += d.googlePosted; t.newDiners += d.newDiners;
    });
    const monthly = Object.values(byMonth).map((m) => ({ ...m, margin: m.revenue ? (m.profit / m.revenue) * 100 : 0, respRate: m.scans ? Math.round((m.reviews / m.scans) * 100) : 0 }));

    const byWeek = {};
    days.forEach((d) => {
      if (d.closed) return;
      const w = Math.floor((d.date - ALL_DAYS[0].date) / (7 * 864e5));
      byWeek[w] = byWeek[w] || { label: d.date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }), sum: 0, n: 0 };
      byWeek[w].sum += d.rating; byWeek[w].n++;
    });
    const weeklyRating = Object.values(byWeek).map((w) => ({ label: w.label, rating: +(w.sum / w.n).toFixed(2) }));

    const daily = days.map((d, i) => {
      const win = days.slice(Math.max(0, i - 6), i + 1).filter((x) => !x.closed);
      return { label: d.date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }), covers: d.fCovers, spend: d.closed ? null : Math.round(d.avgSpend), ma: win.length ? Math.round(win.reduce((a, x) => a + x.fCovers, 0) / win.length) : 0 };
    });

    const loDate = iso(ALL_DAYS[lo].date), hiDate = iso(ALL_DAYS[hi].date);
    const recs = dineCtx === "Takeaway" ? [] : RECORDS.filter((r) => r.date >= loDate && r.date <= hiDate && dowKeep(new Date(r.date + "T00:00:00").getDay()));

    return { days, daily, monthly, weeklyRating, recs, revenue, profit, covers, avgSpend: covers ? revenue / covers : 0, rating, scans, reviews, good, bad, gPosted, newDiners, issueTotals, margin: revenue ? (profit / revenue) * 100 : 0, dRevenue: ((revenue - pRevenue) / pRevenue) * 100, dCovers: ((covers - pCovers) / pCovers) * 100, dProfit: ((profit - pProfit) / pProfit) * 100, dReviews: ((reviews - pReviews) / pReviews) * 100 };
  }, [fromIdx, toIdx, service, dayFilter, dineCtx]);

  /* ---- computed insights ---- */
  const insights = useMemo(() => {
    const half = Math.floor(F.days.length / 2);
    const h = (arr, k) => { const r = arr.reduce((a, d) => a + d.fRevenue, 0); return r ? (arr.reduce((a, d) => a + d[k], 0) / r) * 100 : 0; };
    const m1 = h(F.days.slice(0, half), "fProfit"), m2 = h(F.days.slice(half), "fProfit");
    const topIssue = ISSUES.reduce((a, b) => (F.issueTotals[a] >= F.issueTotals[b] ? a : b));
    const issueShare = F.bad ? Math.round((F.issueTotals[topIssue] / F.bad) * 100) : 0;
    const conv = F.good ? Math.round((F.gPosted / F.good) * 100) : 0;
    const respRate = F.scans ? Math.round((F.reviews / F.scans) * 100) : 0;
    const revenueIns = [
      m2 - m1 < -0.8
        ? { tone: "red", title: `Net margin fell ${Math.abs(m2 - m1).toFixed(1)} points`, body: `Second half ran at ${m2.toFixed(1)}% vs ${m1.toFixed(1)}% earlier.`, action: "Review rostering on quiet weekdays before adding shifts." }
        : { tone: "green", title: `Margin held at ${F.margin.toFixed(1)}%`, body: `Profitability stayed ${F.margin >= 15 ? "above" : "near"} the 15% target.`, action: "Keep the current cost controls in place." },
      F.dRevenue >= 0
        ? { tone: "green", title: `Revenue up ${F.dRevenue.toFixed(0)}% vs previous period`, body: `${fmtRk(F.revenue)} across ${F.covers.toLocaleString()} covers.`, action: "Protect weekend capacity — consider a second seating." }
        : { tone: "amber", title: `Revenue down ${Math.abs(F.dRevenue).toFixed(0)}%`, body: "Takings softened vs the prior equal window.", action: "Test a midweek special to lift Tue–Thu volume." },
      { tone: "amber", title: `Avg spend at ${fmtR(F.avgSpend)} per head`, body: "Spend per diner is drifting upward with menu mix.", action: "Push dessert and wine pairings — highest-margin lines." },
    ];
    const reviewIns = [
      F.bad > 0 ? { tone: "red", title: `${topIssue} drives ${issueShare}% of bad reviews`, body: `${F.issueTotals[topIssue]} of ${F.bad} negative reviews name ${topIssue.toLowerCase()}.`, action: topIssue === "Slow service" ? "Add a runner on Friday and Saturday dinner service." : "Brief the responsible station at pre-shift this week." } : { tone: "green", title: "No bad reviews in range", body: "Every response was 4★ or higher.", action: "Celebrate it with the team at pre-shift." },
      { tone: F.rating >= 4.5 ? "green" : "amber", title: `Average rating ${F.rating.toFixed(1)}★`, body: `${F.reviews.toLocaleString()} reviews from ${F.scans.toLocaleString()} scans.`, action: F.rating >= 4.5 ? "Feature recent reviews on socials." : "Focus resolution on the top issue category." },
      { tone: "green", title: `${conv}% of happy diners posted on Google`, body: `${F.gPosted} public reviews from ${F.good} positive responses.`, action: "Keep the Google link in the thank-you message." },
    ];
    const campaignIns = [
      { tone: respRate >= 60 ? "green" : "amber", title: `${respRate}% scan-to-review conversion`, body: `${F.reviews.toLocaleString()} reviews from ${F.scans.toLocaleString()} QR scans.`, action: respRate >= 60 ? "Conversion is healthy — leave the 30-min timing as is." : "Test a 45-minute delay so the request lands after dessert." },
      { tone: "green", title: `${F.gPosted} Google reviews generated`, body: `The campaign converted ${conv}% of happy diners into public posts.`, action: "Add a monthly Google-post target to the ops scorecard." },
      { tone: F.dReviews >= 0 ? "green" : "amber", title: `Review volume ${F.dReviews >= 0 ? "up" : "down"} ${Math.abs(F.dReviews).toFixed(0)}%`, body: "Compared with the previous equal period.", action: F.dReviews >= 0 ? "Volume is compounding — keep table QR placement." : "Check QR visibility on tables and bill folders." },
    ];
    const customerIns = [
      { tone: "green", title: `${F.newDiners.toLocaleString()} new diners captured`, body: "Contacts added via QR scans in the selected range.", action: "Route them into the win-back campaign after 45 days inactive." },
      { tone: F.dCovers >= 0 ? "green" : "amber", title: `Covers ${F.dCovers >= 0 ? "up" : "down"} ${Math.abs(F.dCovers).toFixed(0)}%`, body: `${F.covers.toLocaleString()} diners served vs previous equal period.`, action: F.dCovers >= 0 ? "Watch kitchen pass times as volume grows." : "Run the lapsed-diner WhatsApp campaign." },
      { tone: "amber", title: "41% repeat-diner rate", body: "Roughly two in five diners have visited more than once.", action: "Introduce a visit-3 reward to push repeat rate past 50%." },
    ];
    const dowNames = { 0: "Sunday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday" };
    const combos = [];
    Object.entries(dowNames).forEach(([dw, nm]) => {
      [["Breakfast", "bShare"], ["Lunch", "lShare"], ["Dinner", "dShare"]].forEach(([svcName, key]) => {
        const rev = F.days.filter((d) => d.dow === +dw).reduce((a, d) => a + d.revenue * d[key], 0);
        if (rev > 0) combos.push({ name: nm + " " + svcName.toLowerCase(), rev });
      });
    });
    const totalRaw = Math.max(1, F.days.reduce((a, d) => a + d.revenue, 0));
    let comboIns = null;
    if (combos.length > 1) {
      const best = combos.reduce((a, b) => (a.rev > b.rev ? a : b));
      const worst = combos.reduce((a, b) => (a.rev < b.rev ? a : b));
      comboIns = { tone: "green", title: `${best.name.charAt(0).toUpperCase() + best.name.slice(1)} is your engine`, body: `It brings in ${Math.round((best.rev / totalRaw) * 100)}% of revenue in this range. ${worst.name.charAt(0).toUpperCase() + worst.name.slice(1)} is your quietest service.`, action: `Protect ${best.name} staffing; test a special to lift ${worst.name}.` };
    }
    return { overview: comboIns ? [revenueIns[0], reviewIns[0], campaignIns[0], customerIns[0], comboIns] : [revenueIns[0], reviewIns[0], campaignIns[0], customerIns[0]], revenue: revenueIns, reviews: reviewIns, campaign: campaignIns, customers: customerIns };
  }, [F]);

  const staffRows = useMemo(() => {
    const totalBad = Math.max(1, F.bad);
    return STAFF.map((s, i) => ({
      ...s,
      tables: s.role === "Head chef" ? 0 : Math.round(F.covers / (s.role === "Host / Manager" ? 2.4 : 3.6) / 4) + i * 7,
      rating: [4.8, 4.2, 4.6, 4.7][i],
      resolved: (issueFilter && !s.handles.includes(issueFilter)) ? 0 : Math.round((issueFilter ? F.issueTotals[issueFilter] || 0 : totalBad) * [0.2, 0.12, 0.4, 0.28][i]),
      dimmed: issueFilter && !s.handles.includes(issueFilter),
    }));
  }, [F, issueFilter]);

  /* ---- campaign CRUD ---- */
  const openCreate = () => { setForm({ name: "", template: "", workflow: "Send 30 minutes after QR scan", gbLink: "" }); setEditId(null); setFormErr(""); setFormOpen(true); };
  const openEdit = (c) => { setForm({ name: c.name, template: c.template, workflow: c.workflow, gbLink: c.gbLink || "" }); setEditId(c.id); setFormErr(""); setFormOpen(true); };
  const saveCampaign = () => {
    if (!form.name.trim()) { setFormErr("Enter a campaign name."); return; }
    if (!form.template.trim()) { setFormErr("Enter the WhatsApp template message."); return; }
    if (editId !== null) {
      setCampaigns((cs) => cs.map((c) => (c.id === editId ? { ...c, ...form } : c)));
    } else {
      setCampaigns((cs) => [{ id: Date.now(), ...form, status: "Active", sent: 0, responses: 0 }, ...cs]);
    }
    setFormOpen(false); setEditId(null);
  };
  const deleteCampaign = (id) => { setCampaigns((cs) => cs.filter((c) => c.id !== id)); setConfirmDelete(null); if (openCampaign === id) setOpenCampaign(null); };

  /* ---- campaign detail + send queue ---- */
  const [openCampaign, setOpenCampaign] = useState(null);
  const [openStaff, setOpenStaff] = useState(null);
  const [campTab, setCampTab] = useState("view");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [queues, setQueues] = useState({});

  useEffect(() => {
    const t = setInterval(() => {
      setQueues((qs) => {
        const next = {}; const increments = {}; let changed = false;
        Object.entries(qs).forEach(([cid, q]) => {
          if (q.pending.length) {
            changed = true;
            const batch = q.pending.slice(0, 10);
            increments[cid] = batch.length;
            next[cid] = { ...q, pending: q.pending.slice(10), sentPhones: [...q.sentPhones, ...batch], batchesDone: q.batchesDone + 1 };
          } else next[cid] = q;
        });
        if (changed) {
          setTimeout(() => setCampaigns((cs) => cs.map((c) => (increments[c.id] ? { ...c, sent: c.sent + increments[c.id], responses: c.responses + Math.round(increments[c.id] * 0.55) } : c))), 0);
          return next;
        }
        return qs;
      });
    }, 6000); /* demo: 1 batch every 6s simulates 10 contacts per minute */
    return () => clearInterval(t);
  }, []);

  const queueForSending = () => {
    const cid = openCampaign;
    const chosen = contacts.filter((c) => selected.includes(c.id));
    setQueues((qs) => {
      const q = qs[cid] || { pending: [], sentPhones: [], batchesDone: 0, totalQueued: 0 };
      const existing = new Set([...q.pending, ...q.sentPhones]);
      const fresh = chosen.map((c) => c.phone).filter((p) => !existing.has(p));
      return { ...qs, [cid]: { ...q, pending: [...q.pending, ...fresh], totalQueued: q.totalQueued + fresh.length } };
    });
    setSelected([]); setPickerOpen(false); setPickerSearch("");
  };

  /* ---- shared chart data ---- */
  const funnelData = [
    { stage: "QR scans", value: F.scans, fill: C.blue },
    { stage: "Reviews received", value: F.reviews, fill: "#3F3D9E" },
    { stage: "Good (4–5★)", value: F.good, fill: C.green },
    { stage: "Posted on Google", value: F.gPosted, fill: "#1C5B0A" },
    { stage: "Routed internally", value: F.bad, fill: C.red },
  ];
  const issueData = ISSUES.map((i) => ({ issue: i, count: F.issueTotals[i] })).sort((a, b) => b.count - a.count);
  const catMix = [
    { name: "Food", value: Math.round(F.revenue * 0.62), fill: C.blue },
    { name: "Drinks", value: Math.round(F.revenue * 0.27), fill: "#0A2540" },
    { name: "Desserts", value: Math.round(F.revenue * 0.11), fill: C.amber },
  ];
  const spendTrend = F.daily.filter((d) => d.spend);
  const goodRecs = F.recs.filter((r) => r.type === "good");
  const badRecs = F.recs.filter((r) => r.type === "bad");
  const googleRecs = goodRecs.filter((r) => r.googleStatus === "posted");
  const fromLabel = ALL_DAYS[Math.min(fromIdx, toIdx)].date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
  const toLabel = ALL_DAYS[Math.max(fromIdx, toIdx)].date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
  const btn = (active) => ({ fontSize: 12, padding: "5px 12px", borderRadius: 8, border: `1px solid ${active ? C.blue : C.border}`, background: active ? C.blueSoft : C.surface, color: active ? C.blue : C.sub, cursor: "pointer", fontWeight: active ? 600 : 400 });
  const primaryBtn = { fontSize: 13, padding: "8px 14px", borderRadius: 8, border: "none", background: C.blue, color: "#fff", cursor: "pointer", fontWeight: 600 };

  const FunnelChart = (
    <ChartCard title="Where do we lose people in the flow?" subtitle="QR scan → 30-min wait → review → routing">
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={funnelData} layout="vertical" margin={{ left: 30 }}>
          <CartesianGrid stroke={C.border} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: C.sub }} />
          <YAxis type="category" dataKey="stage" tick={{ fontSize: 11.5, fill: C.text }} width={130} />
          <Tooltip contentStyle={tipStyle} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {funnelData.map((f) => <Cell key={f.stage} fill={f.fill} />)}
            <LabelList dataKey="value" position="right" style={{ fontSize: 12, fill: C.sub }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
  const RevenueProfitChart = (
    <ChartCard title="Are we growing profitably?" subtitle="Monthly revenue (bars) against net profit (line)">
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={F.monthly}>
          <CartesianGrid stroke={C.border} vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.sub }} />
          <YAxis tickFormatter={fmtRk} tick={{ fontSize: 11, fill: C.sub }} width={52} />
          <Tooltip contentStyle={tipStyle} formatter={(v, n) => [fmtR(v), n === "revenue" ? "Revenue" : "Net profit"]} />
          <Bar dataKey="revenue" fill={C.blueSoft} stroke={C.blue} radius={[4, 4, 0, 0]} />
          <Line dataKey="profit" stroke={C.green} strokeWidth={2.4} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  /* ================= sections ================= */
  const StatsLink = ({ to }) => (
    <p onClick={() => { setView(to); setOpenStaff(null); setOpenCampaign(null); }} style={{ margin: "16px 0 0", fontSize: 13, fontWeight: 600, color: C.blue, cursor: "pointer" }}>View full statistics →</p>
  );

  function Overview() {
    return (
      <>
        <InsightCards items={insights.overview} />
        <StatsLink to="st-overview" />
      </>
    );
  }

  function ReviewsAll() {
    const tiles = [
      { to: "sent", icon: "◷", tone: "amber", label: "Sent", text: "Diners we've asked — waiting to hear back." },
      { to: "good", icon: "👍", tone: "green", label: "Good", text: "Happy diners (4–5 stars)." },
      { to: "bad", icon: "🔧", tone: "red", label: "Bad", text: "Unhappy diners — things for your team to fix." },
      { to: "google", icon: "G", tone: "blue", label: "Google reviews", text: "Reviews the public can see on Google." },
    ];
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 16 }}>
          {tiles.map((t) => (
            <div key={t.to} onClick={() => setView(t.to)} style={{ ...cardStyle, padding: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, background: t.tone === "green" ? C.greenSoft : t.tone === "red" ? C.redSoft : t.tone === "amber" ? C.amberSoft : C.blueSoft, color: t.tone === "green" ? C.green : t.tone === "red" ? C.red : t.tone === "amber" ? C.amber : C.blue }}>{t.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{t.label}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: C.sub, lineHeight: 1.4 }}>{t.text}</p>
              </div>
              <span style={{ color: C.faint, fontSize: 16 }}>›</span>
            </div>
          ))}
        </div>
        <ReviewList items={F.recs} showRoute />
        <StatsLink to="st-reviews" />
      </>
    );
  }

  function SentPage() {
    return (
      <>

        <div style={{ ...cardStyle, padding: "4px 16px" }}>
          {PENDING.length === 0 && <p style={{ fontSize: 13, color: C.faint, padding: "16px 0" }}>No one is waiting right now. New diners appear here after they scan a table QR.</p>}
          {PENDING.map((p, i) => (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderTop: i ? `1px solid ${C.border}` : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: C.amberSoft, color: C.amber, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>◷</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{p.name} <span style={{ fontWeight: 400, color: C.faint, fontSize: 12 }}>· Table {p.table}</span></p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: C.sub }}>Scanned {p.scanned} · request sends at {p.sendsAt}</p>
              </div>
              <Pill text={"Waiting · sends " + p.sendsAt} tone="amber" />
            </div>
          ))}
        </div>
        <StatsLink to="st-reviews" />
      </>
    );
  }

  function GoodPage() {
    const posted = goodRecs.filter((r) => r.googleStatus === "posted").length;
    return (
      <>
        <ReviewList items={goodRecs} showRoute emptyText="No happy reviews in these dates. Widen the date range above." />
        <StatsLink to="st-reviews" />
      </>
    );
  }

  function BadPage() {
    const resolved = badRecs.filter((r) => r.status === "Resolved").length;
    return (
      <>
        <ReviewList items={badRecs} showRoute emptyText="Nothing to fix — nice work. Bad reviews land here for your team." />
        <StatsLink to="st-reviews" />
      </>
    );
  }

  function GooglePage() {
    return (
      <>
        <ReviewList items={googleRecs} showRoute googleMode emptyText="Nothing posted publicly in these dates yet." />
        <StatsLink to="st-reviews" />
      </>
    );
  }

  function RevenuePage() {
    return (
      <>
        <div style={kpiGrid}>
          <Kpi label="Revenue" value={fmtRk(F.revenue)} delta={F.dRevenue} />
          <Kpi label="Net profit" value={fmtRk(F.profit)} delta={F.dProfit} />
          <Kpi label="Net margin" value={fmtPct(F.margin)} note="target 15%" />
          <Kpi label="Avg spend / head" value={fmtR(F.avgSpend)} />
        </div>
        <InsightCards items={insights.revenue} />
        <div style={grid2}>
          {RevenueProfitChart}
          <ChartCard title="Is profitability healthy vs target?" subtitle="Net margin % per month, 15% target band">
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={F.monthly}>
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.sub }} />
                <YAxis domain={[0, 25]} tickFormatter={(v) => v + "%"} tick={{ fontSize: 11, fill: C.sub }} width={40} />
                <ReferenceArea y1={14} y2={16} fill={C.greenSoft} />
                <Tooltip contentStyle={tipStyle} formatter={(v) => [fmtPct(v), "Net margin"]} />
                <Line dataKey="margin" stroke={C.green} strokeWidth={2.4} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Where does each rand go?" subtitle="Cost of sales, labour, other, profit">
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={F.monthly} stackOffset="expand">
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.sub }} />
                <YAxis tickFormatter={(v) => Math.round(v * 100) + "%"} tick={{ fontSize: 11, fill: C.sub }} width={40} />
                <Tooltip contentStyle={tipStyle} formatter={(v, n) => [fmtR(v), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area dataKey="cos" name="Cost of sales" stackId="1" stroke={C.red} fill={C.redSoft} />
                <Area dataKey="labour" name="Labour" stackId="1" stroke={C.amber} fill={C.amberSoft} />
                <Area dataKey="other" name="Other" stackId="1" stroke={C.slate} fill="#E3E8EE" />
                <Area dataKey="profit" name="Profit" stackId="1" stroke={C.green} fill={C.greenSoft} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Which service drives the business?" subtitle="Breakfast, lunch and dinner revenue by month">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={F.monthly}>
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.sub }} />
                <YAxis tickFormatter={fmtRk} tick={{ fontSize: 11, fill: C.sub }} width={52} />
                <Tooltip contentStyle={tipStyle} formatter={(v, n) => [fmtR(v), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="breakfast" name="Breakfast" fill={C.amber} radius={[4, 4, 0, 0]} />
                <Bar dataKey="lunch" name="Lunch" fill="#A5A0FF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="dinner" name="Dinner" fill={C.blue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Which days earn the most?" subtitle="Revenue by day of week in the selected range (Mondays closed)">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={["Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((lbl, k) => ({ day: lbl, revenue: F.days.filter((d) => d.dow === [2, 3, 4, 5, 6, 0][k]).reduce((a, d) => a + d.fRevenue, 0) }))}>
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.sub }} />
                <YAxis tickFormatter={fmtRk} tick={{ fontSize: 11, fill: C.sub }} width={52} />
                <Tooltip contentStyle={tipStyle} formatter={(v) => [fmtR(v), "Revenue"]} />
                <Bar dataKey="revenue" fill={C.blue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="What's our sales mix?" subtitle="Revenue by category in the selected range">
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Tooltip contentStyle={tipStyle} formatter={(v, n) => [fmtR(v), n]} />
                <Pie data={catMix} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>
                  {catMix.map((c) => <Cell key={c.name} fill={c.fill} />)}
                  <LabelList dataKey="name" position="outside" style={{ fontSize: 12, fill: C.sub }} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Are diners spending more per visit?" subtitle="Average spend per head, daily">
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={spendTrend}>
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.sub }} minTickGap={28} />
                <YAxis domain={["dataMin - 20", "dataMax + 20"]} tickFormatter={(v) => "R" + v} tick={{ fontSize: 11, fill: C.sub }} width={46} />
                <Tooltip contentStyle={tipStyle} formatter={(v) => [fmtR(v), "Avg spend"]} />
                <Line dataKey="spend" stroke={C.slate} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </>
    );
  }

  function CustomersPage() {
    const dinerGrowth = F.monthly.map((m) => ({ month: m.month, newDiners: m.newDiners, returning: Math.round(m.newDiners * 0.68) }));
    return (
      <>
        <p style={{ fontSize: 12, color: C.faint, margin: "14px 0 8px", letterSpacing: ".03em" }}>DINER CONTACT LIST</p>
        <div style={{ ...cardStyle, padding: "4px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.2fr 1.2fr 1fr", gap: 8, padding: "12px 0 8px", fontSize: 11.5, color: C.faint, letterSpacing: ".03em", borderBottom: `1px solid ${C.border}` }}>
            <span>NAME</span><span>PHONE</span><span>ADDED BY</span><span>DATE</span>
          </div>
          {contacts.map((c) => (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 1.2fr 1.2fr 1fr", gap: 8, padding: "12px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13, alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>{c.name}</span>
              <span style={{ color: C.sub }}>{c.phone}</span>
              <span style={{ color: C.sub }}>{c.addedBy}</span>
              <span style={{ color: C.sub }}>{fmtDate(new Date(c.date))}</span>
            </div>
          ))}
        </div>
        <StatsLink to="st-customers" />
      </>
    );
  }

  function StaffPage() {
    const lo = Math.min(fromIdx, toIdx), hi = Math.max(fromIdx, toIdx);
    const loDate = iso(ALL_DAYS[lo].date), hiDate = iso(ALL_DAYS[hi].date);
    const inR = dineCtx === "Takeaway" ? [] : STAFF_RATINGS.filter((r) => { const dw = new Date(r.date + "T00:00:00").getDay(); const keep = dayFilter === "All days" ? true : dayFilter === "Weekends" ? (dw === 0 || dw === 6) : (dw >= 1 && dw <= 5); return keep && r.date >= loDate && r.date <= hiDate; });
    const len = hi - lo + 1;
    const pLo = Math.max(0, lo - len);
    const prevR = STAFF_RATINGS.filter((r) => r.date >= iso(ALL_DAYS[pLo].date) && r.date < loDate);
    const avg = (arr, k) => (arr.length ? arr.reduce((a, r) => a + r[k], 0) / arr.length : 0);
    const recRate = inR.length ? Math.round((inR.filter((r) => r.recommend).length / inR.length) * 100) : 0;

    const weeklyFor = (arr) => {
      const byWeek = {};
      arr.forEach((r) => {
        const w = Math.floor((new Date(r.date + "T00:00:00") - ALL_DAYS[0].date) / (7 * 864e5));
        byWeek[w] = byWeek[w] || { w, sum: 0, n: 0 };
        byWeek[w].sum += r.staffStars; byWeek[w].n++;
      });
      return Object.values(byWeek).sort((a, b) => a.w - b.w).map((x) => ({ w: "W" + x.w, rating: +(x.sum / x.n).toFixed(2) }));
    };

    if (openStaff !== null) {
      const s = STAFF[openStaff];
      const mine = inR.filter((r) => r.staffIdx === openStaff);
      const myAvg = avg(mine, "staffStars");
      const myRec = mine.length ? Math.round((mine.filter((r) => r.recommend).length / mine.length) * 100) : 0;
      const dist = [5, 4, 3, 2, 1].map((st) => ({ star: st + "★", count: mine.filter((r) => r.staffStars === st).length }));
      const diff = myRec - recRate;
      return (
        <>
          <button onClick={() => setOpenStaff(null)} style={{ ...btn(false), marginBottom: 12 }}>← Back to staff</button>
          <div style={{ ...cardStyle, marginBottom: 14, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <QrTile seedNum={openStaff + 1} size={56} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{s.name}</p>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: C.sub }}>{s.role} · {mine.length} rating{mine.length === 1 ? "" : "s"} in range · avg {myAvg.toFixed(1)}★ · {myRec}% would recommend</p>
            </div>
            <button style={btn(false)}>⇩ Download QR</button>
          </div>
          <InsightCards items={[{ tone: diff >= 0 ? "green" : "amber", title: `Diners served by ${s.name.split(" ")[0]} answer "would recommend" ${Math.abs(diff)} point${Math.abs(diff) === 1 ? "" : "s"} ${diff >= 0 ? "above" : "below"} the restaurant average`, body: `${myRec}% of ${s.name.split(" ")[0]}'s diners would recommend the restaurant, vs ${recRate}% overall.`, action: diff >= 0 ? `${s.name.split(" ")[0]}'s tables are converting goodwill — consider them for training new hires.` : `Pair ${s.name.split(" ")[0]} with a strong shift lead and review the recent comments below.` }]} />
          <p style={{ fontSize: 12, color: C.faint, margin: "0 0 8px", letterSpacing: ".03em" }}>ALL COMMENTS ABOUT {s.name.split(" ")[0].toUpperCase()} IN RANGE</p>
          <div style={{ ...cardStyle, padding: "4px 16px" }}>
            {mine.length ? mine.map((r, i) => (
              <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 0", borderTop: i ? `1px solid ${C.border}` : "none", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{r.diner} <span style={{ fontWeight: 400, color: C.faint, fontSize: 12 }}>· {fmtDate(new Date(r.date))}</span></p>
                  <Stars n={r.staffStars} />
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: C.sub, lineHeight: 1.45 }}>"{r.comment}"</p>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <Pill text={`Business ${r.bizStars}★`} tone={r.bizStars >= 4 ? "green" : "red"} />
                  <Pill text={r.recommend ? "Would recommend" : "Would not recommend"} tone={r.recommend ? "green" : "red"} />
                </div>
              </div>
            )) : <p style={{ fontSize: 13, color: C.faint, padding: "16px 0" }}>No ratings in this date range.</p>}
          </div>
          <StatsLink to="st-staff" />
        </>
      );
    }

    return (
      <>
        <div style={{ background: C.blueSoft, borderRadius: 10, padding: "9px 14px", marginBottom: 14, fontSize: 12.5, color: C.blue }}>
          Each staff member has a personal QR code presented with the bill. One scan captures two ratings: the server (1–5★ + comment) and the overall business (1–5★ + "Would you recommend us to a friend?"). Staff ratings never post to Google — internal coaching data only.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))", gap: 14 }}>
          {STAFF.map((s, si) => {
            const mine = inR.filter((r) => r.staffIdx === si);
            const prevMine = prevR.filter((r) => r.staffIdx === si);
            const a = avg(mine, "staffStars"), pa = avg(prevMine, "staffStars");
            const delta = pa ? a - pa : 0;
            return (
              <div key={s.name} onClick={() => setOpenStaff(si)} style={{ ...cardStyle, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <QrTile seedNum={si + 1} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{s.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: C.sub }}>{s.role} · {mine.length} rating{mine.length === 1 ? "" : "s"} in range</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{mine.length ? a.toFixed(1) : "—"}<span style={{ fontSize: 13, color: C.amber }}>★</span></p>
                    {mine.length > 0 && pa > 0 && <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: delta >= 0 ? C.green : C.red }}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}</p>}
                  </div>
                </div>
                {mine.slice(0, 2).map((r) => (
                  <p key={r.id} style={{ margin: "6px 0 0", fontSize: 12.5, color: C.sub, lineHeight: 1.45 }}>
                    <Stars n={r.staffStars} /> "{r.comment}" <span style={{ color: C.faint }}>— {r.diner}, {fmtDate(new Date(r.date))}</span>
                  </p>
                ))}
                <p style={{ margin: "10px 0 0", fontSize: 12, color: C.blue, fontWeight: 600 }}>View all comments →</p>
              </div>
            );
          })}
        </div>
        <StatsLink to="st-staff" />
      </>
    );
  }

  function SparkKpi({ label, value, delta, dataKey, color }) {
    return (
      <div style={{ ...cardStyle, padding: 14 }}>
        <p style={{ margin: 0, fontSize: 12, color: C.sub }}>{label}</p>
        <p style={{ margin: "4px 0 2px", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>{value}</p>
        {delta !== undefined && <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: delta >= 0 ? C.green : C.red }}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%<span style={{ color: C.faint, fontWeight: 400 }}> vs prev period</span></p>}
        <ResponsiveContainer width="100%" height={32}>
          <LineChart data={F.days.filter((d) => !d.closed).slice(-30)} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.6} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  function StatsOverview() {
    return (
      <>
        <div style={kpiGrid}>
          <SparkKpi label="Revenue" value={fmtRk(F.revenue)} delta={F.dRevenue} dataKey="fRevenue" color={C.blue} />
          <SparkKpi label="Net profit" value={fmtRk(F.profit)} delta={F.dProfit} dataKey="fProfit" color={C.green} />
          <SparkKpi label="Net margin" value={fmtPct(F.margin)} dataKey="fProfit" color={C.green} />
          <SparkKpi label="Covers" value={F.covers.toLocaleString()} delta={F.dCovers} dataKey="fCovers" color={C.blue} />
          <SparkKpi label="Google rating" value={F.rating.toFixed(1) + "★"} dataKey="rating" color={C.amber} />
          <SparkKpi label="Reviews" value={F.reviews.toLocaleString()} delta={F.dReviews} dataKey="reviews" color={C.slate} />
        </div>
        <InsightCards items={insights.overview} />
        <div style={grid2}>{RevenueProfitChart}{FunnelChart}</div>
      </>
    );
  }

  function StatsReviews() {
    return (
      <>
        <InsightCards items={insights.reviews} />
        <div style={grid2}>
          <ChartCard title="Is guest experience improving?" subtitle="Average star rating per week (4.5★ target band)">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={F.weeklyRating}>
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.sub }} minTickGap={24} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: C.sub }} width={26} />
                <ReferenceArea y1={4.5} y2={5} fill={C.greenSoft} />
                <Tooltip contentStyle={tipStyle} formatter={(v) => [v + "★", "Avg rating"]} />
                <Line dataKey="rating" stroke={C.amber} strokeWidth={2.4} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Is sentiment shifting?" subtitle="Good vs bad reviews per month">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={F.monthly}>
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.sub }} />
                <YAxis tick={{ fontSize: 11, fill: C.sub }} width={36} />
                <Tooltip contentStyle={tipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="good" name="Good (4–5★)" stackId="s" fill={C.green} />
                <Bar dataKey="bad" name="Bad (1–3★)" stackId="s" fill={C.red} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="What should ops fix first?" subtitle="Click a bar to filter the staff table">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={issueData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke={C.border} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: C.sub }} allowDecimals={false} />
                <YAxis type="category" dataKey="issue" tick={{ fontSize: 11.5, fill: C.text }} width={110} />
                <Tooltip contentStyle={tipStyle} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} onClick={(d) => setIssueFilter(issueFilter === d.issue ? null : d.issue)} cursor="pointer">
                  {issueData.map((d) => <Cell key={d.issue} fill={issueFilter && issueFilter !== d.issue ? "#FFD3DC" : C.red} />)}
                  <LabelList dataKey="count" position="right" style={{ fontSize: 12, fill: C.sub }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {issueFilter && <p style={{ margin: "6px 0 0", fontSize: 12, color: C.sub }}>Filtering staff by <b style={{ color: C.red }}>{issueFilter}</b> — click again to clear.</p>}
          </ChartCard>
          <ChartCard title="Who needs coaching, who deserves credit?" subtitle={issueFilter ? `Staff responsible for "${issueFilter}"` : "Tables, rating and issues resolved"}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: C.sub, fontSize: 11.5, textAlign: "left" }}>
                  <th style={{ padding: "8px 6px", borderBottom: `1px solid ${C.border}`, fontWeight: 500 }}>Staff member</th>
                  <th style={{ padding: "8px 6px", borderBottom: `1px solid ${C.border}`, fontWeight: 500, textAlign: "right" }}>Tables</th>
                  <th style={{ padding: "8px 6px", borderBottom: `1px solid ${C.border}`, fontWeight: 500, textAlign: "right" }}>Rating</th>
                  <th style={{ padding: "8px 6px", borderBottom: `1px solid ${C.border}`, fontWeight: 500, textAlign: "right" }}>Resolved</th>
                </tr>
              </thead>
              <tbody>
                {staffRows.map((sr) => (
                  <tr key={sr.name} style={{ opacity: sr.dimmed ? 0.35 : 1 }}>
                    <td style={{ padding: "10px 6px", borderBottom: `1px solid ${C.border}` }}>{sr.name} <span style={{ color: C.faint, fontSize: 12 }}>· {sr.role}</span></td>
                    <td style={{ padding: "10px 6px", borderBottom: `1px solid ${C.border}`, textAlign: "right", color: C.sub }}>{sr.tables || "—"}</td>
                    <td style={{ padding: "10px 6px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: 600, color: sr.rating >= 4.5 ? C.green : C.amber }}>{sr.rating.toFixed(1)}★</td>
                    <td style={{ padding: "10px 6px", borderBottom: `1px solid ${C.border}`, textAlign: "right", color: C.sub }}>{sr.resolved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ChartCard>
          {FunnelChart}
        </div>
      </>
    );
  }

  function StatsStaff() {
    const lo = Math.min(fromIdx, toIdx), hi = Math.max(fromIdx, toIdx);
    const loDate = iso(ALL_DAYS[lo].date), hiDate = iso(ALL_DAYS[hi].date);
    const inR = dineCtx === "Takeaway" ? [] : STAFF_RATINGS.filter((r) => { const dw = new Date(r.date + "T00:00:00").getDay(); const keep = dayFilter === "All days" ? true : dayFilter === "Weekends" ? (dw === 0 || dw === 6) : (dw >= 1 && dw <= 5); return keep && r.date >= loDate && r.date <= hiDate; });
    const avg = (arr, k) => (arr.length ? arr.reduce((a, r) => a + r[k], 0) / arr.length : 0);
    const recRate = inR.length ? Math.round((inR.filter((r) => r.recommend).length / inR.length) * 100) : 0;
    const weeks = {};
    inR.forEach((r) => {
      const w = Math.floor((new Date(r.date + "T00:00:00") - ALL_DAYS[0].date) / (7 * 864e5));
      weeks[w] = weeks[w] || { w, label: "W" + w };
      const key = "s" + r.staffIdx;
      weeks[w][key + "_sum"] = (weeks[w][key + "_sum"] || 0) + r.staffStars;
      weeks[w][key + "_n"] = (weeks[w][key + "_n"] || 0) + 1;
    });
    const trend = Object.values(weeks).sort((a, b) => a.w - b.w).map((wk) => {
      const row = { label: wk.label };
      STAFF.forEach((st, si) => { const n = wk["s" + si + "_n"]; if (n) row[st.name.split(" ")[0]] = +((wk["s" + si + "_sum"] / n).toFixed(2)); });
      return row;
    });
    const distByStaff = STAFF.map((st, si) => {
      const mine = inR.filter((r) => r.staffIdx === si);
      return { name: st.name.split(" ")[0], "5★": mine.filter((r) => r.staffStars === 5).length, "4★": mine.filter((r) => r.staffStars === 4).length, "3★": mine.filter((r) => r.staffStars === 3).length, "2★": mine.filter((r) => r.staffStars === 2).length, "1★": mine.filter((r) => r.staffStars === 1).length };
    });
    const recCompare = STAFF.map((st, si) => {
      const mine = inR.filter((r) => r.staffIdx === si);
      return { name: st.name.split(" ")[0], rec: mine.length ? Math.round((mine.filter((r) => r.recommend).length / mine.length) * 100) : 0 };
    });
    const lineColors = [C.blue, C.red, C.amber, C.green];
    return (
      <>
        <div style={kpiGrid}>
          <Kpi label="Team avg staff rating" value={avg(inR, "staffStars").toFixed(1) + "★"} />
          <Kpi label="Staff ratings collected" value={inR.length.toLocaleString()} note="in range" />
          <Kpi label="Avg business rating" value={avg(inR, "bizStars").toFixed(1) + "★"} note="from follow-up" />
          <Kpi label="Would-recommend rate" value={recRate + "%"} />
        </div>
        <div style={grid2}>
          <ChartCard title="How is each server trending?" subtitle="Weekly average staff rating per person">
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={trend}>
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.sub }} minTickGap={20} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: C.sub }} width={26} />
                <Tooltip contentStyle={tipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {STAFF.map((st, si) => <Line key={st.name} dataKey={st.name.split(" ")[0]} stroke={lineColors[si]} strokeWidth={2} dot={false} connectNulls />)}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="How do each server's stars distribute?" subtitle="Count of 1–5★ ratings per staff member in range">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={distByStaff} layout="vertical" margin={{ left: 8 }}>
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
          <ChartCard title="Whose tables convert goodwill?" subtitle='"Would you recommend us?" — % Yes per server'>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={recCompare} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke={C.border} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => v + "%"} tick={{ fontSize: 11, fill: C.sub }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: C.text }} width={70} />
                <Tooltip contentStyle={tipStyle} formatter={(v) => [v + "%", "Would recommend"]} />
                <Bar dataKey="rec" fill={C.green} radius={[0, 6, 6, 0]}>
                  <LabelList dataKey="rec" position="right" formatter={(v) => v + "%"} style={{ fontSize: 12, fill: C.sub }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </>
    );
  }

  function StatsCustomers() {
    const dinerGrowth = F.monthly.map((m) => ({ month: m.month, newDiners: m.newDiners, returning: Math.round(m.newDiners * 0.68) }));
    const wk = {};
    F.days.forEach((d) => {
      if (d.closed) return;
      const w = Math.floor((d.date - ALL_DAYS[0].date) / (7 * 864e5));
      wk[w] = wk[w] || { w, label: d.date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }), Breakfast: 0, Lunch: 0, Dinner: 0 };
      wk[w].Breakfast += Math.round(d.fCovers * d.bShare);
      wk[w].Lunch += Math.round(d.fCovers * d.lShare);
      wk[w].Dinner += Math.round(d.fCovers * d.dShare);
    });
    const coversByService = Object.values(wk).sort((a, b) => a.w - b.w);
    const dineIn = Math.round(F.days.reduce((a, d) => a + d.covers * d.dineShare, 0));
    const takeaway = Math.round(F.days.reduce((a, d) => a + d.covers * (1 - d.dineShare), 0));
    const dineSplit = [
      { name: "Dine-in", value: dineIn, fill: C.blue },
      { name: "Takeaway", value: takeaway, fill: C.amber },
    ];
    return (
      <>
        <div style={kpiGrid}>
          <Kpi label="Covers" value={F.covers.toLocaleString()} delta={F.dCovers} />
          <Kpi label="Repeat rate" value="41%" />
          <Kpi label="Avg spend / head" value={fmtR(F.avgSpend)} />
        </div>
        <InsightCards items={insights.customers} />
        <div style={grid2}>
          <ChartCard title="Is footfall growing?" subtitle="Covers per day, 7-day moving average (Mondays closed)">
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={F.daily}>
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.sub }} minTickGap={28} />
                <YAxis tick={{ fontSize: 11, fill: C.sub }} width={36} />
                <Tooltip contentStyle={tipStyle} />
                <Bar dataKey="covers" name="Covers" fill={C.blueSoft} stroke="#A5A0FF" />
                <Line dataKey="ma" name="7-day avg" stroke={C.blue} strokeWidth={2.2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="When do diners actually come?" subtitle="Covers by service per week">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={coversByService}>
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.sub }} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: C.sub }} width={40} />
                <Tooltip contentStyle={tipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Breakfast" stackId="c" fill={C.amber} />
                <Bar dataKey="Lunch" stackId="c" fill="#A5A0FF" />
                <Bar dataKey="Dinner" stackId="c" fill={C.blue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="How much of our trade is takeaway?" subtitle="Dine-in vs takeaway covers in the selected range">
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Tooltip contentStyle={tipStyle} formatter={(v, n) => [v.toLocaleString() + " covers", n]} />
                <Pie data={dineSplit} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>
                  {dineSplit.map((c) => <Cell key={c.name} fill={c.fill} />)}
                  <LabelList dataKey="name" position="outside" style={{ fontSize: 12, fill: C.sub }} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Is the diner database growing?" subtitle="New vs returning diners per month">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={dinerGrowth}>
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.sub }} />
                <YAxis tick={{ fontSize: 11, fill: C.sub }} width={36} />
                <Tooltip contentStyle={tipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="newDiners" name="New diners" fill={C.blue} radius={[4, 4, 0, 0]} />
                <Bar dataKey="returning" name="Returning" fill="#A5A0FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </>
    );
  }

  function StatsCampaign() {
    const respRate = F.scans ? Math.round((F.reviews / F.scans) * 100) : 0;
    const conv = F.good ? Math.round((F.gPosted / F.good) * 100) : 0;
    return (
      <>
        <div style={kpiGrid}>
          <Kpi label="QR scans" value={F.scans.toLocaleString()} />
          <Kpi label="Scan → review rate" value={respRate + "%"} />
          <Kpi label="Google posts" value={F.gPosted.toLocaleString()} />
          <Kpi label="Good → Google rate" value={conv + "%"} />
        </div>
        <InsightCards items={insights.campaign} />
        <div style={grid2}>
          {FunnelChart}
          <ChartCard title="Is the campaign converting month to month?" subtitle="Scan-to-review conversion per month">
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={F.monthly}>
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.sub }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => v + "%"} tick={{ fontSize: 11, fill: C.sub }} width={40} />
                <Tooltip contentStyle={tipStyle} formatter={(v) => [v + "%", "Conversion"]} />
                <Line dataKey="respRate" stroke={C.blue} strokeWidth={2.4} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="How many public reviews is it generating?" subtitle="Google posts per month from the QR flow">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={F.monthly}>
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.sub }} />
                <YAxis tick={{ fontSize: 11, fill: C.sub }} width={36} />
                <Tooltip contentStyle={tipStyle} formatter={(v) => [v, "Google posts"]} />
                <Bar dataKey="gPosted" fill={C.green} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="gPosted" position="top" style={{ fontSize: 11, fill: C.sub }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </>
    );
  }

  function CampaignDetail() {
    const c = campaigns.find((x) => x.id === openCampaign);
    if (!c) { setOpenCampaign(null); return null; }
    const q = queues[c.id];
    const queuedSet = new Set(q ? [...q.pending, ...q.sentPhones] : []);
    const filteredContacts = contacts.filter((ct) => (ct.name + " " + ct.phone).toLowerCase().includes(pickerSearch.toLowerCase()));
    const selectable = filteredContacts.filter((ct) => !queuedSet.has(ct.phone));
    const allSelected = selectable.length > 0 && selectable.every((ct) => selected.includes(ct.id));
    const toggleAll = () => setSelected(allSelected ? selected.filter((id) => !selectable.some((ct) => ct.id === id)) : [...new Set([...selected, ...selectable.map((ct) => ct.id)])]);
    const respRate = c.sent ? Math.round((c.responses / c.sent) * 100) : 0;
    const tabBtn = (id, label) => (
      <button key={id} onClick={() => { setCampTab(id); if (id === "edit") { setForm({ name: c.name, template: c.template, workflow: c.workflow, gbLink: c.gbLink || "" }); setFormErr(""); } }}
        style={{ fontSize: 13, padding: "7px 14px", border: "none", borderBottom: campTab === id ? `2px solid ${C.blue}` : "2px solid transparent", background: "transparent", color: campTab === id ? C.blue : C.sub, cursor: "pointer", fontWeight: campTab === id ? 600 : 400 }}>{label}</button>
    );
    return (
      <>
        <button onClick={() => setOpenCampaign(null)} style={{ ...btn(false), marginBottom: 12 }}>← Back to campaigns</button>
        <div style={{ ...cardStyle, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{c.name}</p>
            <Pill text={c.status} tone={c.status === "Active" ? "green" : "amber"} />
          </div>
          <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.border}`, margin: "12px 0 16px" }}>
            {tabBtn("view", "View")}{tabBtn("edit", "Edit campaign")}{tabBtn("perf", "Campaign performance")}
          </div>

          {campTab === "view" && (
            <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
              <div><p style={{ margin: 0, fontSize: 12, color: C.faint }}>WhatsApp template</p><p style={{ margin: "3px 0 0", color: C.sub, lineHeight: 1.5 }}>{c.template}</p></div>
              <div><p style={{ margin: 0, fontSize: 12, color: C.faint }}>Workflow trigger</p><p style={{ margin: "3px 0 0", color: C.sub }}>{c.workflow}</p></div>
              <div><p style={{ margin: 0, fontSize: 12, color: C.faint }}>Google review link</p><p style={{ margin: "3px 0 0", color: c.gbLink ? C.green : C.faint, fontWeight: c.gbLink ? 600 : 400 }}>{c.gbLink ? "Attached — sent to 4–5★ reviewers" : "Not attached"}</p></div>
              <div><p style={{ margin: 0, fontSize: 12, color: C.faint }}>Totals</p><p style={{ margin: "3px 0 0", color: C.sub }}>{c.sent} sent · {c.responses} responses</p></div>
            </div>
          )}

          {campTab === "edit" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: C.sub, display: "block", marginBottom: 4 }}>Review campaign name</label>
                <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormErr(""); }} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.sub, display: "block", marginBottom: 4 }}>WhatsApp template <span style={{ color: C.faint }}>({form.template.length} chars)</span></label>
                <textarea value={form.template} onChange={(e) => { setForm({ ...form, template: e.target.value }); setFormErr(""); }} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.sub, display: "block", marginBottom: 4 }}>Workflow</label>
                <select value={form.workflow} onChange={(e) => setForm({ ...form, workflow: e.target.value })} style={inputStyle}>
                  {["Send 30 minutes after QR scan", "Send 1 hour after bill is paid", "Send the morning after the visit", "Send immediately when diner is added"].map((w) => <option key={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.sub, display: "block", marginBottom: 4 }}>Google Business review link <span style={{ color: C.faint }}>(optional)</span></label>
                <input value={form.gbLink} onChange={(e) => setForm({ ...form, gbLink: e.target.value })} style={inputStyle} />
              </div>
              {formErr && <p style={{ margin: 0, fontSize: 13, color: C.red, fontWeight: 600 }}>{formErr}</p>}
              <div>
                <button onClick={() => {
                  if (!form.name.trim()) { setFormErr("Enter a campaign name."); return; }
                  if (!form.template.trim()) { setFormErr("Enter the WhatsApp template message."); return; }
                  setCampaigns((cs) => cs.map((x) => (x.id === c.id ? { ...x, ...form } : x)));
                  setCampTab("view");
                }} style={primaryBtn}>Save changes</button>
              </div>
            </div>
          )}

          {campTab === "perf" && (
            <>
              <StatsLink to="st-campaign" />
            </>
          )}
        </div>

        {/* Send section */}
        <div style={{ ...cardStyle, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Send</p>
            <button onClick={() => { setPickerOpen(true); setSelected([]); setPickerSearch(""); }} style={primaryBtn}>+ Add contacts to send</button>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 12.5, color: C.sub }}>Queued contacts are fired into this campaign's workflow in batches of 10 per minute.</p>

          {q && q.totalQueued > 0 && (
            <div style={{ background: C.blueSoft, borderRadius: 10, padding: "12px 14px", marginBottom: pickerOpen ? 14 : 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.blue }}>
                {q.totalQueued} contact{q.totalQueued === 1 ? "" : "s"} queued · {Math.ceil(q.totalQueued / 10)} batch{Math.ceil(q.totalQueued / 10) === 1 ? "" : "es"} · {q.pending.length ? `~${Math.ceil(q.pending.length / 10)} min remaining` : "complete"}
              </p>
              <div style={{ height: 8, background: "#D6D3FF", borderRadius: 999, marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.round((q.sentPhones.length / q.totalQueued) * 100)}%`, background: C.blue, borderRadius: 999, transition: "width .6s" }} />
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: C.blue }}>{q.sentPhones.length} sent · {q.pending.length} waiting · batch {q.batchesDone} of {Math.ceil(q.totalQueued / 10)} done <span style={{ color: C.faint }}>(demo runs 1 batch every 6s to simulate 10/min)</span></p>
            </div>
          )}

          {pickerOpen && (
            <div style={{ border: `1px solid ${C.blue}`, borderRadius: 10, padding: 14, marginTop: 12 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <input value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder="Search contacts by name or phone…" style={{ ...inputStyle, flex: "1 1 220px" }} />
                <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 600, color: C.blue }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} /> Select all
                </label>
                <span style={{ fontSize: 12, color: C.sub }}>{selected.length} contact{selected.length === 1 ? "" : "s"} selected</span>
              </div>
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {filteredContacts.length ? filteredContacts.map((ct) => {
                  const already = queuedSet.has(ct.phone);
                  return (
                    <label key={ct.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderTop: `1px solid ${C.border}`, fontSize: 13, cursor: already ? "default" : "pointer", opacity: already ? 0.45 : 1 }}>
                      <input type="checkbox" disabled={already} checked={selected.includes(ct.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, ct.id] : selected.filter((id) => id !== ct.id))} />
                      <span style={{ fontWeight: 600, flex: 1 }}>{ct.name}</span>
                      <span style={{ color: C.sub }}>{ct.phone}</span>
                      {already && <Pill text={q.sentPhones.includes(ct.phone) ? "Sent" : "Queued"} tone={q.sentPhones.includes(ct.phone) ? "green" : "amber"} />}
                    </label>
                  );
                }) : <p style={{ fontSize: 13, color: C.faint, padding: "12px 4px" }}>No contacts match that search.</p>}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => { setPickerOpen(false); setSelected([]); }} style={{ ...btn(false), padding: "8px 14px", fontSize: 13 }}>Cancel</button>
                <button onClick={queueForSending} disabled={!selected.length} style={{ ...primaryBtn, opacity: selected.length ? 1 : 0.5, cursor: selected.length ? "pointer" : "default" }}>Queue for sending{selected.length ? ` (${selected.length})` : ""}</button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  function CampaignPage() {
    if (openCampaign !== null) return <CampaignDetail />;
    const respRate = F.scans ? Math.round((F.reviews / F.scans) * 100) : 0;
    const conv = F.good ? Math.round((F.gPosted / F.good) * 100) : 0;
    return (
      <>
        {formOpen && (
          <div style={{ ...cardStyle, border: `1px solid ${C.blue}`, marginBottom: 14 }}>
            <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600, color: C.blue }}>{editId !== null ? "Edit review campaign" : "New review campaign"}</p>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: C.sub, display: "block", marginBottom: 4 }}>Review campaign name</label>
                <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormErr(""); }} placeholder="Table QR follow-up" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.sub, display: "block", marginBottom: 4 }}>WhatsApp template <span style={{ color: C.faint }}>({form.template.length} chars · supports {"{{name}}"})</span></label>
                <textarea value={form.template} onChange={(e) => { setForm({ ...form, template: e.target.value }); setFormErr(""); }} rows={3} placeholder={"Hi {{name}}, thanks for dining with us tonight! Tap the link to tell us how it was."} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.sub, display: "block", marginBottom: 4 }}>Workflow</label>
                <select value={form.workflow} onChange={(e) => setForm({ ...form, workflow: e.target.value })} style={inputStyle}>
                  {["Send 30 minutes after QR scan", "Send 1 hour after bill is paid", "Send the morning after the visit", "Send immediately when diner is added"].map((w) => <option key={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.sub, display: "block", marginBottom: 4 }}>Google Business review link <span style={{ color: C.faint }}>(optional — sent to 4–5 star reviewers)</span></label>
                <input value={form.gbLink} onChange={(e) => setForm({ ...form, gbLink: e.target.value })} placeholder="https://g.page/r/your-restaurant/review" style={inputStyle} />
              </div>
              {formErr && <p style={{ margin: 0, fontSize: 13, color: C.red, fontWeight: 600 }}>{formErr}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveCampaign} style={primaryBtn}>{editId !== null ? "Save changes" : "Save campaign"}</button>
                <button onClick={() => { setFormOpen(false); setEditId(null); }} style={{ ...btn(false), padding: "8px 14px", fontSize: 13 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        <p style={{ fontSize: 12, color: C.faint, margin: "0 0 8px", letterSpacing: ".03em" }}>CAMPAIGNS</p>
        <div style={{ ...cardStyle, padding: "4px 16px", marginBottom: 14 }}>
          {campaigns.length ? campaigns.map((c, i) => (
            <div key={c.id} onClick={() => { setOpenCampaign(c.id); setCampTab("view"); setPickerOpen(false); setSelected([]); }} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 0", borderTop: i ? `1px solid ${C.border}` : "none", flexWrap: "wrap", cursor: "pointer" }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: C.blueSoft, color: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>▷</div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{c.name}</p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: C.sub, lineHeight: 1.5 }}>{c.template}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: C.faint }}>{c.workflow}{c.gbLink ? " · Google link attached" : ""}{c.sent ? ` · ${c.sent} sent · ${c.responses} responses` : ""}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                <Pill text={c.status} tone={c.status === "Active" ? "green" : "amber"} />
                <button onClick={() => openEdit(c)} style={{ ...btn(false), padding: "4px 10px" }}>Edit</button>
                {confirmDelete === c.id ? (
                  <>
                    <button onClick={() => deleteCampaign(c.id)} style={{ ...btn(false), padding: "4px 10px", borderColor: C.red, color: C.red, fontWeight: 600 }}>Confirm delete</button>
                    <button onClick={() => setConfirmDelete(null)} style={{ ...btn(false), padding: "4px 10px" }}>Keep</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDelete(c.id)} style={{ ...btn(false), padding: "4px 10px", color: C.red }}>Delete</button>
                )}
              </div>
            </div>
          )) : <p style={{ fontSize: 13, color: C.faint, padding: "16px 0" }}>No campaigns yet. Create your first review campaign to start the QR flow.</p>}
        </div>

        <StatsLink to="st-campaign" />
      </>
    );
  }

  /* ================= navigation + shell ================= */
  const NAV = [
    { id: "overview", label: "Dashboard" },
    { id: "reviews", label: "Reviews", children: [
      { id: "sent", label: "Sent" }, { id: "good", label: "Good" }, { id: "bad", label: "Bad" }, { id: "google", label: "Google reviews" },
    ]},
    { id: "customers", label: "Customers" },
    { id: "staff", label: "Staff" },
    { id: "campaign", label: "Review campaign" },
    { id: "st-overview", label: "Statistics", children: [
      { id: "st-revenue", label: "Revenue" }, { id: "st-reviews", label: "Reviews" }, { id: "st-staff", label: "Staff" }, { id: "st-customers", label: "Customers" }, { id: "st-campaign", label: "Campaign" },
    ]},
  ];
  const titles = { overview: ["Dashboard", "Executive overview"], reviews: ["Reviews", "Everything your diners have said"], sent: ["Sent", "Diners we've asked — waiting to hear back"], good: ["Good", "Happy diners (4–5 stars)"], bad: ["Bad", "Unhappy diners (1–3 stars) — things for your team to fix"], google: ["Google reviews", "Reviews the public can see on Google"], revenue: ["Revenue", "Financial performance"], customers: ["Customers", "Diner base and footfall"], staff: ["Staff", "Per-server ratings from personal QR codes"], campaign: ["Review campaign", "Create and manage QR review flows"], "st-overview": ["Statistics", "All charts, graphs and numbers in one place"], "st-revenue": ["Statistics · Revenue", "All financial charts"], "st-reviews": ["Statistics · Reviews", "All review analytics"], "st-staff": ["Statistics · Staff", "All staff-rating analytics"], "st-customers": ["Statistics · Customers", "All diner-base analytics"], "st-campaign": ["Statistics · Campaign", "All campaign analytics"] };
  const sections = { overview: Overview, reviews: ReviewsAll, sent: SentPage, good: GoodPage, bad: BadPage, google: GooglePage, customers: CustomersPage, staff: StaffPage, campaign: CampaignPage, "st-overview": StatsOverview, "st-revenue": RevenuePage, "st-reviews": StatsReviews, "st-staff": StatsStaff, "st-customers": StatsCustomers, "st-campaign": StatsCampaign };
  const Section = sections[view];

  const navItem = (n, isChild) => (
    <div key={n.id} onClick={() => { setView(n.id); setOpenStaff(null); setOpenCampaign(null); }}
      style={{ padding: isChild ? "7px 10px 7px 28px" : "9px 10px", marginBottom: 2, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: view === n.id ? 600 : isChild ? 400 : 500, background: view === n.id ? C.blueSoft : "transparent", color: view === n.id ? C.blue : isChild ? C.sub : C.text }}>
      {n.label}
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "ui-sans-serif, system-ui, sans-serif", color: C.text, fontVariantNumeric: "tabular-nums", display: "flex" }}>
      {/* sidebar */}
      <div style={{ width: 200, flexShrink: 0, background: C.sidebar, borderRight: `1px solid ${C.border}`, padding: "20px 10px", position: "sticky", top: 0, height: "100vh", boxSizing: "border-box", overflowY: "auto" }}>
        <div style={{ padding: "0 10px 16px", borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>The Fireside Grill</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: C.faint }}>Executive dashboard</p>
        </div>
        {NAV.map((n) => (
          <div key={n.id}>
            {navItem(n, false)}
            {n.children && n.children.map((c) => navItem(c, true))}
          </div>
        ))}
      </div>

      {/* main */}
      <div style={{ flex: 1, minWidth: 0, padding: "22px clamp(14px, 3vw, 30px)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>{titles[view][0]}</h1>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: C.sub }}>{titles[view][1]} · {fromLabel} – {toLabel}{service !== "All" ? " · " + service : ""}{dayFilter !== "All days" ? " · " + dayFilter : ""}{dineCtx !== "All" ? " · " + dineCtx : ""}</p>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {view === "campaign" && openCampaign === null && <button onClick={openCreate} style={primaryBtn}>+ Create review campaign</button>}
            {(view === "customers" || view === "overview") && (
              <>
                <button onClick={() => { setContactFormOpen(true); setCsvNote(""); }} style={primaryBtn}>+ Add contact</button>
                <button onClick={() => setCsvNote("Upload CSV — opens a file picker with column mapping (name, phone) and duplicate checks on phone number in the real build.")} style={{ ...btn(false), padding: "8px 14px", fontSize: 13, fontWeight: 600 }}>⇧ Upload CSV</button>
              </>
            )}
            {["7D", "30D", "90D", "All"].map((p) => (
              <button key={p} style={btn(false)} onClick={() => setPreset(p === "7D" ? 7 : p === "30D" ? 30 : p === "90D" ? 90 : "ALL")}>{p}</button>
            ))}
          </div>
        </div>

        {/* global filters */}
        <div style={{ ...cardStyle, display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", padding: "12px 18px", marginBottom: 14 }}>
          <div style={{ flex: "1 1 320px", minWidth: 260 }}>
            <p style={{ margin: "0 0 6px", fontSize: 11.5, color: C.sub, letterSpacing: ".03em" }}>DATE RANGE</p>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.blue }}>From</span>
              <input type="date" min={iso(ALL_DAYS[0].date)} max={iso(ALL_DAYS[N - 1].date)} value={iso(ALL_DAYS[Math.min(fromIdx, toIdx)].date)} onChange={(e) => { const v = e.target.value; let best = 0, diff = Infinity; ALL_DAYS.forEach((d, i) => { const dd = Math.abs(d.date - new Date(v + "T00:00:00")); if (dd < diff) { diff = dd; best = i; } }); setFromIdx(Math.min(best, toIdx)); }} style={{ ...inputStyle, width: 150 }} aria-label="From date" />
              <span style={{ fontSize: 12, fontWeight: 600, color: C.blue }}>To</span>
              <input type="date" min={iso(ALL_DAYS[0].date)} max={iso(ALL_DAYS[N - 1].date)} value={iso(ALL_DAYS[Math.max(fromIdx, toIdx)].date)} onChange={(e) => { const v = e.target.value; let best = 0, diff = Infinity; ALL_DAYS.forEach((d, i) => { const dd = Math.abs(d.date - new Date(v + "T00:00:00")); if (dd < diff) { diff = dd; best = i; } }); setToIdx(Math.max(best, fromIdx)); }} style={{ ...inputStyle, width: 150 }} aria-label="To date" />
              <button onClick={() => { setFromIdx(0); setToIdx(N - 1); }} style={{ fontSize: 12, padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.blue}`, background: C.surface, color: C.blue, cursor: "pointer", fontWeight: 600 }}>From inception</button>
            </div>
          </div>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 11.5, color: C.sub, letterSpacing: ".03em" }}>SERVICE</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{["All", "Breakfast", "Lunch", "Dinner"].map((sv) => <button key={sv} style={btn(service === sv)} onClick={() => setService(sv)}>{sv}</button>)}</div>
          </div>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 11.5, color: C.sub, letterSpacing: ".03em" }}>DAYS</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{["All days", "Weekdays", "Weekends"].map((dv) => <button key={dv} style={btn(dayFilter === dv)} onClick={() => setDayFilter(dv)}>{dv}</button>)}</div>
          </div>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 11.5, color: C.sub, letterSpacing: ".03em" }}>DINE CONTEXT</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{["All", "Dine-in", "Takeaway"].map((dc) => <button key={dc} style={btn(dineCtx === dc)} onClick={() => setDineCtx(dc)}>{dc}</button>)}</div>
          </div>
          {(service !== "All" || dayFilter !== "All days" || dineCtx !== "All") && (
            <button onClick={() => { setService("All"); setDayFilter("All days"); setDineCtx("All"); }} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "none", background: "transparent", color: C.blue, cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}>Clear filters</button>
          )}
        </div>

        {contactFormOpen && (view === "customers" || view === "overview") && (
          <div style={{ ...cardStyle, border: `1px solid ${C.blue}`, marginBottom: 14 }}>
            <p style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: C.blue }}>Add contact</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 200px" }}>
                <label style={{ fontSize: 12, color: C.sub, display: "block", marginBottom: 4 }}>Name</label>
                <input value={contactDraft.name} onChange={(e) => { setContactDraft({ ...contactDraft, name: e.target.value }); setContactErr(""); }} placeholder="Diner name" style={inputStyle} />
              </div>
              <div style={{ flex: "1 1 180px" }}>
                <label style={{ fontSize: 12, color: C.sub, display: "block", marginBottom: 4 }}>Phone</label>
                <input value={contactDraft.phone} onChange={(e) => { setContactDraft({ ...contactDraft, phone: e.target.value }); setContactErr(""); }} placeholder="082 000 0000" style={inputStyle} />
              </div>
              <button onClick={saveContact} style={primaryBtn}>Save contact</button>
              <button onClick={() => { setContactFormOpen(false); setContactErr(""); }} style={{ ...btn(false), padding: "8px 14px", fontSize: 13 }}>Cancel</button>
            </div>
            {contactErr && <p style={{ margin: "8px 0 0", fontSize: 13, color: C.red, fontWeight: 600 }}>{contactErr}</p>}
          </div>
        )}
        {csvNote && (view === "customers" || view === "overview") && (
          <div style={{ background: C.blueSoft, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.blue, fontWeight: 500 }}>{csvNote}</div>
        )}

        <Section />

        <p style={{ margin: "18px 0 0", fontSize: 12, color: C.faint, textAlign: "center" }}>
          Demo data · one seeded source across every page · global filters apply everywhere
        </p>
      </div>
    </div>
  );
}
