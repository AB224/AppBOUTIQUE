import { useEffect, useState } from "react";
import { api } from "../services/api";

export function StockPage() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [restock, setRestock] = useState({ productId: "", quantity: 1, note: "" });

  const load = async () => {
    const [productsData, movementsData] = await Promise.all([api("/products"), api("/stocks/movements")]);
    setProducts(productsData);
    setMovements(movementsData);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    await api("/stocks/restock", { method: "POST", body: restock });
    setRestock({ productId: "", quantity: 1, note: "" });
    load();
  };

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Stocks</h1>
        <p>Mise a jour manuelle et historique des mouvements.</p>
      </div>
      <section className="content-grid">
        <form className="card form-grid" onSubmit={submit}>
          <h2>Ajouter du stock</h2>
          <label>
            Produit
            <select value={restock.productId} onChange={(e) => setRestock({ ...restock, productId: e.target.value })} required>
              <option value="">Selectionner</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantite
            <input
              type="number"
              min="1"
              value={restock.quantity}
              onChange={(e) => setRestock({ ...restock, quantity: Number(e.target.value) })}
              required
            />
          </label>
          <label>
            Note
            <input value={restock.note} onChange={(e) => setRestock({ ...restock, note: e.target.value })} />
          </label>
          <button className="primary">Ajouter</button>
        </form>

        <div className="card">
          <h2>Mouvements</h2>
          <div className="list">
            {movements.map((movement) => (
              <div className="list-row" key={movement._id}>
                <div>
                  <strong>{movement.product?.name}</strong>
                  <div className="muted">{new Date(movement.createdAt).toLocaleString("fr-FR")}</div>
                </div>
                <span>{movement.type}</span>
                <strong className={movement.quantity < 0 ? "danger-text" : "success-text"}>{movement.quantity}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
