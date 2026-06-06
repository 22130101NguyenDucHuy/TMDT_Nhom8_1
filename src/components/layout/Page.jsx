export default function Page({ eyebrow, heading, description, actions, children }) {
  return (
    <div className="flex flex-col gap-6 py-4">
      {(heading || eyebrow || actions) && (
        <header className="flex flex-wrap items-end justify-between gap-6 pb-2">
          <div className="w-full lg:w-2/3">
            {eyebrow && <span className="text-sm font-bold tracking-wider text-teal-700 uppercase mb-1 block">{eyebrow}</span>}
            {heading && <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-tight">{heading}</h1>}
            {description && <p className="mt-2 text-slate-500">{description}</p>}
          </div>
          {actions && <div className="w-full lg:w-auto flex flex-wrap gap-3 justify-end">{actions}</div>}
        </header>
      )}
      <section>{children}</section>
    </div>
  );
}
