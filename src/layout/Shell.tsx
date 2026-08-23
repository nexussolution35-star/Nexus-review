import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { DateRangeControl } from "../components/DateRangeControl";

interface NavChild {
  to: string;
  label: string;
}
interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  children?: NavChild[];
  /** A section whose header only toggles the dropdown, with no page of its own. */
  section?: boolean;
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", end: true },
  {
    to: "/reviews",
    label: "Reviews",
    children: [
      { to: "/reviews/sent", label: "Sent" },
      { to: "/reviews/good", label: "Good" },
      { to: "/reviews/bad", label: "Bad" },
      { to: "/reviews/google", label: "Google reviews" },
    ],
  },
  { to: "/customers", label: "Customers" },
  { to: "/staff", label: "Staff" },
  {
    to: "/campaigns",
    label: "Campaigns",
    section: true,
    children: [
      { to: "/review-campaign", label: "Review campaign" },
      { to: "/win-back", label: "Win back campaign" },
    ],
  },
  {
    to: "/statistics",
    label: "Statistics",
    section: true,
    children: [
      { to: "/statistics", label: "Overview" },
      { to: "/statistics/reviews", label: "Reviews" },
      { to: "/statistics/staff", label: "Staff" },
    ],
  },
];

const TITLES: Record<string, [string, string]> = {
  "/": ["Dashboard", "What is going on around your restaurant right now"],
  "/reviews": ["Reviews", "Everything your diners have said"],
  "/reviews/sent": ["Sent", "Diners we've asked. Waiting to hear back."],
  "/reviews/good": ["Good", "Happy diners with 4 or 5 stars"],
  "/reviews/bad": ["Bad", "Unhappy diners. Things for your team to fix."],
  "/reviews/google": ["Google reviews", "Reviews the public can see on Google"],
  "/customers": ["Customers", "Your contact list, ready for campaigns"],
  "/staff": ["Staff", "Your team and their personal QR codes"],
  "/review-campaign": ["Review campaign", "The WhatsApp flow that asks diners for a review"],
  "/win-back": ["Win back campaign", "Bring lapsed customers back with offers"],
  "/statistics": ["Statistics", "All charts, graphs and numbers in one place"],
  "/statistics/reviews": ["Statistics. Reviews", "All review analytics"],
  "/statistics/staff": ["Statistics. Staff", "How each server's stars distribute"],
};

export function Shell() {
  const { pathname } = useLocation();
  // Sections with children collapse; the one holding the current page opens
  // automatically, and a manual toggle overrides that until the route changes.
  const [toggled, setToggled] = useState<Record<string, boolean | undefined>>({});
  useEffect(() => setToggled({}), [pathname]);
  const hasActiveChild = (n: NavItem) =>
    pathname.startsWith(n.to) || !!n.children?.some((c) => pathname.startsWith(c.to));
  const isOpen = (n: NavItem) =>
    toggled[n.to] !== undefined ? !!toggled[n.to] : hasActiveChild(n);
  const titleKey = TITLES[pathname]
    ? pathname
    : Object.keys(TITLES)
        .filter((k) => k !== "/" && pathname.startsWith(k))
        .sort((a, b) => b.length - a.length)[0] ?? "/";
  const [title, subtitle] = TITLES[titleKey];

  const linkCls = (isActive: boolean, child: boolean) =>
    `block rounded-lg mb-0.5 cursor-pointer text-[13px] ${
      child ? "py-1.5 pl-7 pr-2.5" : "py-2 px-2.5"
    } ${
      isActive
        ? "bg-accentsoft text-accent font-semibold"
        : child
          ? "text-sub hover:bg-canvas"
          : "text-ink font-medium hover:bg-canvas"
    }`;

  return (
    <div className="flex min-h-screen">
      <aside className="w-52 shrink-0 bg-surface border-r border-line px-2.5 py-5 sticky top-0 h-screen overflow-y-auto">
        <div className="px-2.5 pb-4 mb-3 border-b border-line">
          <p className="text-sm font-bold m-0">Rave</p>
          <p className="text-[11px] text-faint mt-0.5">Powered by Nexus Solution</p>
        </div>
        {NAV.map((n) => {
          const chevron = n.children && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`w-3.5 h-3.5 text-faint transition-transform ${isOpen(n) ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          );
          const toggle = () => setToggled((t) => ({ ...t, [n.to]: !isOpen(n) }));
          return (
          <div key={n.to}>
            {n.section ? (
              <button
                type="button"
                onClick={toggle}
                className={`${linkCls(false, false)} flex items-center justify-between w-full text-left`}
              >
                {n.label}
                {chevron}
              </button>
            ) : (
              <NavLink
                to={n.to}
                end={n.end ?? !!n.children}
                onClick={() => n.children && toggle()}
                className={({ isActive }) =>
                  `${linkCls(isActive, false)} flex items-center justify-between`
                }
              >
                {n.label}
                {chevron}
              </NavLink>
            )}
            {n.children && isOpen(n) &&
              n.children.map((c) => (
                <NavLink
                  key={c.to}
                  to={c.to}
                  end={c.to === n.to}
                  className={({ isActive }) => linkCls(isActive, true)}
                >
                  {c.label}
                </NavLink>
              ))}
          </div>
          );
        })}
      </aside>

      <main className="flex-1 min-w-0 px-4 md:px-7 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <h1 className="text-[21px] font-bold m-0">{title}</h1>
            <p className="text-[13px] text-sub mt-0.5">{subtitle}</p>
          </div>
          <DateRangeControl />
        </div>
        <Outlet />
        <p className="text-xs text-faint text-center mt-6">
          Demo data. One seeded source across every page.
        </p>
      </main>
    </div>
  );
}
