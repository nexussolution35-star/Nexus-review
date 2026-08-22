import type { ReactNode } from "react";
import { initials } from "../lib/format";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface border border-line rounded-xl p-4 ${className}`}>
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs text-faint tracking-wide uppercase mt-4 mb-2">{children}</p>
  );
}

export type PillTone = "green" | "red" | "amber" | "blue";

const pillBg: Record<PillTone, string> = {
  green: "bg-goodsoft text-good",
  red: "bg-badsoft text-bad",
  amber: "bg-warnsoft text-warn",
  blue: "bg-accentsoft text-accent",
};

export function Pill({ text, tone }: { text: string; tone: PillTone }) {
  return (
    <span
      className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap shrink-0 ${pillBg[tone]}`}
    >
      {text}
    </span>
  );
}

export function Stars({ n, size = "text-xs" }: { n: number; size?: string }) {
  return (
    <span className="tracking-wider">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={`${size} ${i < n ? "text-warn" : "text-line"}`}>
          ★
        </span>
      ))}
    </span>
  );
}

export function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onClick={() => onChange(n)}
          className={`text-3xl leading-none transition-colors ${
            n <= value ? "text-warn" : "text-line hover:text-faint"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, tone }: { name: string; tone: PillTone }) {
  return (
    <div
      className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold ${pillBg[tone]}`}
    >
      {initials(name)}
    </div>
  );
}

export const inputCls =
  "w-full box-border text-[13px] px-2.5 py-2 rounded-lg border border-line bg-surface focus:outline-none focus:border-accent";

export const primaryBtnCls =
  "text-[13px] px-3.5 py-2 rounded-lg bg-accent text-white font-semibold hover:opacity-90 disabled:opacity-50";

export const ghostBtnCls =
  "text-[13px] px-3.5 py-2 rounded-lg border border-line bg-surface text-sub hover:border-faint";

export const dangerBtnCls =
  "text-[13px] px-3.5 py-2 rounded-lg border border-bad bg-surface text-bad font-semibold";

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-[13px] text-faint py-4">{children}</p>;
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="block text-xs text-sub mb-1">{children}</label>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="text-[13px] text-bad font-semibold mt-2">{children}</p>;
}

/** List row divider wrapper: identical list pattern on all screens. */
export function ListRow({
  children,
  first,
  className = "",
}: {
  children: ReactNode;
  first: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 py-3 ${first ? "" : "border-t border-line"} ${className}`}
    >
      {children}
    </div>
  );
}
