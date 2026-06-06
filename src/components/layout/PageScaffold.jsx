export default function PageScaffold({ header, body, footer, className = "" }) {
  const rootClassName = ["lb-page-scaffold", className].filter(Boolean).join(" ");

  return (
    <div className={rootClassName}>
      {header ? <header className="lb-page-header-slot">{header}</header> : null}
      <main className="lb-page-body-slot">{body}</main>
      {footer ? <footer className="lb-page-footer-slot">{footer}</footer> : null}
    </div>
  );
}
