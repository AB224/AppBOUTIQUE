import { useEffect, useState } from "react";
import { api } from "../services/api";
import { StatCard } from "../components/StatCard";
import { formatCurrency } from "../utils/currency";

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
        <StatCard title="CA du jour" value={formatCurrency(data.revenue.day)} accent="green" />
        <StatCard title="CA sur 7 jours" value={formatCurrency(data.revenue.week)} accent="orange" />
        <StatCard title="CA sur 30 jours" value={formatCurrency(data.revenue.month)} accent="blue" />
        <StatCard title="Decaissements jour" value={formatCurrency(data.refunds?.day)} accent="red" />
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
            <div className="list-row">
              <span>Retours/decaiss. sur 30 jours</span>
              <strong>{data.stats.refundCount}</strong>
            </div>
            <div className="list-row">
              <span>Total decaisse sur 30 jours</span>
              <strong>{formatCurrency(data.refunds?.month)}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Produits decaisses</h2>
        <div className="list">
          {data.refundedProducts?.length ? (
            data.refundedProducts.map((item) => (
              <div key={item._id} className="list-row card-inline">
                <div>
                  <strong>{item.productName}</strong>
                  <div className="muted">
                    {item.productReference ? `Ref: ${item.productReference} - ` : ""}
                    {new Date(item.createdAt).toLocaleString("fr-FR")}
                  </div>
                  <div className="muted">{item.reason}</div>
                </div>
                <span>Qt {item.quantity}</span>
                <strong className="danger-text">-{formatCurrency(item.amount)}</strong>
              </div>
            ))
          ) : (
            <span className="muted">Aucun produit decaisse pour le moment.</span>
          )}
        </div>
      </section>
    </div>
  );
}
