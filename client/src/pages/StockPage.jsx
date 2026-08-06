import { useEffect, useState } from "react";
import { api, downloadBlob } from "../services/api";

export function StockPage() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [restock, setRestock] = useState({ productId: "", quantity: 1, note: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [productsData, movementsData] = await Promise.all([api("/products"), api("/stocks/movements")]);
      setProducts(productsData);
      setMovements(movementsData);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      setError("");
      setMessage("");
      await api("/stocks/restock", { method: "POST", body: restock });
      setRestock({ productId: "", quantity: 1, note: "" });
      setMessage("Stock ajoute avec succes.");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const exportExcel = async () => {
    try {
      setError("");
      const blob = await api("/stocks/export/excel");
      downloadBlob(blob, "stock-appboutique.xlsx");
    } catch (err) {
      setError(err.message);
    }
  };

  const importExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setError("");
      setMessage("");
      const formData = new FormData();
      formData.append("file", file);
      const result = await api("/stocks/import/excel", { method: "POST", body: formData });
      setMessage(`Import termine : ${result.imported} mouvement(s), ${result.skipped} ligne(s) ignoree(s).`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Stocks</h1>
          <p>Mise a jour manuelle, import/export Excel et historique des mouvements.</p>
        </div>
        <div className="actions">
          <label className="ghost file-action">
            Importer Excel
            <input type="file" accept=".xlsx,.xls" onChange={importExcel} />
          </label>
          <button type="button" className="primary" onClick={exportExcel}>
            Exporter Excel
          </button>
        </div>
      </div>
      {message ? <div className="alert success">{message}</div> : null}
      {error ? <div className="alert error">{error}</div> : null}
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
