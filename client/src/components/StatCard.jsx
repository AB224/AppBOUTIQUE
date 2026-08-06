export function StatCard({ title, value, accent = "default", active = false, hint = "", onClick }) {
  const className = `card stat-card accent-${accent} ${onClick ? "stat-card-button" : ""} ${active ? "active" : ""}`;

  const content = (
    <>
      <span className="muted">{title}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}
