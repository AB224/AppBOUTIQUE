import { useEffect, useState } from "react";
import { api } from "../services/api";
import { StatCard } from "../components/StatCard";

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!data) return <div className="card">Chargement du tableau de bord...</div>;

  return (
    <div className="stack">
      <section className="hero card">
        <div>
          <h1>Pilotage de la boutique</h1>
          <p>Vue rapide du chiffre d'affaires, des meilleures ventes et des alertes de stock.</p>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard title="CA du jour" value={`${data.revenue.day.toFixed(2)} EUR`} accent="green" />
        <StatCard title="CA sur 7 jours" value={`${data.revenue.week.toFixed(2)} EUR`} accent="orange" />
        <StatCard title="CA sur 30 jours" value={`${data.revenue.month.toFixed(2)} EUR`} accent="blue" />
        <StatCard title="Alertes stock" value={data.stats.lowStockCount} accent="red" />
      </section>

      <section className="content-grid">
        <div className="card">
          <h2>Produits les plus vendus</h2>
          <div className="list">
            {data.topProducts.map((item) => (
              <div key={item.name} className="list-row">
                <span>{item.name}</span>
                <strong>{item.quantity}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>Statistiques</h2>
          <div className="list">
            <div className="list-row">
              <span>Nombre de ventes</span>
              <strong>{data.stats.salesCount}</strong>
            </div>
            <div className="list-row">
              <span>Produits references</span>
              <strong>{data.stats.productsCount}</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
