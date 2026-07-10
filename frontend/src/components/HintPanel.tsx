import clsx from "clsx";

interface Props {
  hint: string;
  streaming: boolean;
  error: string | null;
}

export function HintPanel({ hint, streaming, error }: Props) {
  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 text-red-400 text-sm">
        ⚠️ {error}
      </div>
    );
  }

  if (!hint && !streaming) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-slate-500 text-sm">
        <p className="text-2xl mb-2">🔍</p>
        <p>Select a hint level and click <strong className="text-slate-400">Get Hint</strong></p>
        <p className="mt-1 text-xs">You'll get guidance — never the answer.</p>
      </div>
    );
  }

  return (
    <div className={clsx(
      "rounded-lg border border-slate-700 bg-slate-900 p-5 text-sm leading-relaxed text-slate-200",
      "min-h-[120px] whitespace-pre-wrap"
    )}>
      {hint}
      {streaming && (
        <span className="inline-block w-2 h-4 bg-brand-500 ml-0.5 animate-pulse align-middle" />
      )}
    </div>
  );
}
