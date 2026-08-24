import { useStore } from "../data/store";
import { DATA_START, TODAY } from "../data/constants";

/** The ONE global date control: From and To calendar pickers. */
export function DateRangeControl() {
  const { range, setRange } = useStore();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-accent">From</span>
      <input
        type="date"
        aria-label="From date"
        min={DATA_START}
        max={TODAY}
        value={range.from}
        onChange={(e) =>
          e.target.value &&
          setRange({ from: e.target.value, to: e.target.value > range.to ? e.target.value : range.to })
        }
        className="text-[13px] px-2.5 py-1.5 rounded-lg border border-line bg-surface"
      />
      <span className="text-xs font-semibold text-accent">To</span>
      <input
        type="date"
        aria-label="To date"
        min={DATA_START}
        max={TODAY}
        value={range.to}
        onChange={(e) =>
          e.target.value &&
          setRange({ from: e.target.value < range.from ? e.target.value : range.from, to: e.target.value })
        }
        className="text-[13px] px-2.5 py-1.5 rounded-lg border border-line bg-surface"
      />
    </div>
  );
}
