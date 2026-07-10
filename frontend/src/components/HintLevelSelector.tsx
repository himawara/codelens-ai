import clsx from "clsx";
import { HintLevel } from "../api/client";

interface Props {
  value: HintLevel;
  onChange: (level: HintLevel) => void;
  disabled?: boolean;
}

const LEVELS: { value: HintLevel; label: string; desc: string; color: string }[] = [
  { value: "nudge", label: "Nudge", desc: "Point me in the right direction", color: "green" },
  { value: "approach", label: "Approach", desc: "Tell me the high-level strategy", color: "yellow" },
  { value: "pseudocode", label: "Pseudocode", desc: "Walk me through the steps", color: "orange" },
];

export function HintLevelSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex gap-2">
      {LEVELS.map((lvl) => (
        <button
          key={lvl.value}
          onClick={() => onChange(lvl.value)}
          disabled={disabled}
          title={lvl.desc}
          className={clsx(
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            value === lvl.value
              ? lvl.color === "green"
                ? "bg-green-900/50 border-green-500 text-green-300"
                : lvl.color === "yellow"
                ? "bg-yellow-900/50 border-yellow-500 text-yellow-300"
                : "bg-orange-900/50 border-orange-500 text-orange-300"
              : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
          )}
        >
          {lvl.label}
        </button>
      ))}
    </div>
  );
}
