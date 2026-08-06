import { useEffect, useState } from "react";
import { api } from "../services/api";
import { StatCard } from "../components/StatCard";
import { formatCurrency } from "../utils/currency";

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [activePanel, setActivePanel] = useState("day");

  useEffect(() => {
    api("/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!data) return <div className="card">Chargement du tableau de bord...</div>;

  const netRevenue = data.netRevenue || data.revenue || {};
  const grossRevenue = data.grossRevenue || data.revenue || {};
  const refunds = data.refunds || {};

  const dashboardCards = [
    {
      id: "day",
      title: "CA net du jour",
      value: formatCurrency(netRevenue.day),
      accent: "green",
      hint: "Voir le detail du jour"
    },
    {
      id: "week",
      title: "CA net sur 7 jours",
      value: formatCurrency(netRevenue.week),
      accent: "orange",
      hint: "Voir les 7 derniers jours"
    },
    {
      id: "month",
      title: "CA net sur 30 jours",
      value: formatCurrency(netRevenue.month),
      accent: "blue",
      hint: "Voir le mois glissant"
    },
    {
      id: "refunds",
      title: "Decaissements jour",
      value: formatCurrency(refunds.day),
      accent: "red",
      hint: "Voir les retours"
    },
    {
      id: "alerts",
      title: "Alertes stock",
      value: data.stats.lowStockCount,
      accent: "red",
      hint: "Voir les produits faibles"
    }
  ];

  const periodLabels = {
    day: "aujourd'hui",
    week: "sur 7 jours",
    month: "sur 30 jours"
  };

  const renderRevenuePanel = (period) => (
    <div className="dashboard-detail-grid">
      <div className="detail-pill">
        <span className="muted">CA brut {periodLabels[period]}</span>
        <strong>{formatCurrency(grossRevenue[period])}</strong>
      </div>
      <div className="detail-pill">
        <span className="muted">Decaissements {periodLabels[period]}</span>
        <strong className="danger-text">-{formatCurrency(refunds[period])}</strong>
      </div>
      <div className="detail-pill">
        <span className="muted">CA net {periodLabels[period]}</span>
        <strong className="success-text">{formatCurrency(netRevenue[period])}</strong>
      </div>
    </div>
  );

  const renderActivePanel = () => {
    if (["day", "week", "month"].includes(activePanel)) {
      return renderRevenuePanel(activePanel);
    }

    if (activePanel === "refunds") {
      return (
        <div className="list">
          <div className="dashboard-detail-grid">
            <div className="detail-pill">
              <span className="muted">Jour</span>
              <strong>{formatCurrency(refunds.day)}</strong>
            </div>
            <div className="detail-pill">
              <span className="muted">7 jours</span>
              <strong>{formatCurrency(refunds.week)}</strong>
            </div>
            <div className="detail-pill">
              <span className="muted">30 jours</span>
              <strong>{formatCurrency(refunds.month)}</strong>
            </div>
          </div>
          {data.refundedProducts?.length ? (
            data.refundedProducts.slice(0, 4).map((item) => (
              <div key={item._id} className="list-row">
                <span>{item.productName}</span>
                <strong className="danger-text">-{formatCurrency(item.amount)}</strong>
              </div>
            ))
          ) : (
            <span className="muted">Aucun decaissement enregistre.</span>
          )}
        </div>
      );
    }

    return (
      <div className="list">
        {data.lowStockProducts?.length ? (
          data.lowStockProducts.map((product) => (
            <div key={product._id} className="list-row">
              <span>
                {product.name}
                <small className="muted block">{product.category || product.barcode || "Produit sans categorie"}</small>
              </span>
              <strong>
                {product.stock} / seuil {product.lowStockAlert}
              </strong>
            </div>
          ))
        ) : (
          <span className="muted">Aucune alerte de stock pour le moment.</span>
        )}
      </div>
    );
  };

  const activeCard = dashboardCards.find((card) => card.id === activePanel);

  return (
    <div className="stack">
      <section className="hero card">
        <div>
          <h1>Alimentation les Deux Frères</h1>
          <p>Pilotage interactif du chiffre d'affaires net, des decaissements et des alertes de stock.</p>
        </div>
      </section>

      <section className="stats-grid">
        {dashboardCards.map((card) => (
          <StatCard
            key={card.id}
            title={card.title}
            value={card.value}
            accent={card.accent}
            hint={card.hint}
            active={activePanel === card.id}
            onClick={() => setActivePanel(card.id)}
          />
        ))}
      </section>

      <section className="card dashboard-detail">
        <div className="section-title">
          <div>
            <span className="eyebrow">Detail instantane</span>
            <h2>{activeCard?.title}</h2>
          </div>
          <span className="detail-chip">Clique sur une carte pour changer</span>
        </div>
        {renderActivePanel()}
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
              <span>CA brut du jour</span>
              <strong>{formatCurrency(grossRevenue.day)}</strong>
            </div>
            <div className="list-row">
              <span>CA brut sur 30 jours</span>
              <strong>{formatCurrency(grossRevenue.month)}</strong>
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
              <strong>{formatCurrency(refunds.month)}</strong>
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
