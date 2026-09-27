/** A tap-by-tap path through an app or site, e.g. Activity → Share → Copy. */
export default function StepPath({ label, steps, note }: { label?: string; steps: string[]; note?: string }) {
  return (
    <p className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-navy">
      {label && <span className="opacity-60 mr-0.5">{label}</span>}
      {steps.map((step, i) => (
        <span key={`${i}-${step}`} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden="true" className="opacity-50">→</span>}
          <span className="bg-sky/20 border border-sky/50 text-navy rounded px-1.5 py-0.5">{step}</span>
        </span>
      ))}
      {note && <span className="basis-full opacity-60 font-normal mt-0.5">{note}</span>}
    </p>
  );
}
