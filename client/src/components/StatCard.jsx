export function StatCard({ title, value, accent = "default" }) {
  return (
    <div className={`card stat-card accent-${accent}`}>
      <span className="muted">{title}</span>
      <strong>{value}</strong>
    </div>
  );
}
