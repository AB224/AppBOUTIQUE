import { useEffect, useMemo, useState } from "react";
import { api, downloadBlob } from "../services/api";
import { formatCurrency } from "../utils/currency";

const emptyForm = {
  name: "",
  category: "",
  purchasePrice: 0,
  salePrice: 0,
  stock: 0,
  barcode: "",
  lowStockAlert: 5
};

const productFields = [
  { key: "name", label: "Nom du produit", placeholder: "Ex: Sardine Abda" },
  { key: "category", label: "Categorie", placeholder: "Ex: Epicerie" },
  { key: "purchasePrice", label: "Prix d'achat", type: "number" },
  { key: "salePrice", label: "Prix de vente", type: "number" },
  { key: "stock", label: "Stock actuel", type: "number" },
  { key: "barcode", label: "Code-barres ou reference", placeholder: "Optionnel" },
  { key: "lowStockAlert", label: "Seuil d'alerte stock", type: "number" }
];

export function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");

  const load = () => api("/products").then(setProducts).catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      if (editingId) {
        await api(`/products/${editingId}`, { method: "PUT", body: form });
      } else {
        await api("/products", { method: "POST", body: form });
      }
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    await api(`/products/${id}`, { method: "DELETE" });
    load();
  };

  const exportExcel = async () => {
    setError("");
    setMessage("");
    try {
      const blob = await api("/products/export/excel");
      downloadBlob(blob, "produits-appboutique.xlsx");
    } catch (err) {
      setError(err.message);
    }
  };

  const importExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await api("/products/import/excel", { method: "POST", body: formData });
      await load();
      setMessage(`Import termine : ${result.created} cree(s), ${result.updated} mis a jour.`);
    } catch (err) {
      setError(err.message);
    } finally {
      event.target.value = "";
    }
  };

  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        [product.name, product.category, product.barcode]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [products, query]
  );

  const stockAlerts = products.filter((product) => product.stock <= product.lowStockAlert).length;
  const stockValue = products.reduce((sum, product) => sum + product.stock * product.purchasePrice, 0);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Produits</h1>
          <p>Ajout, modification, suppression et seuil de stock faible.</p>
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
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}
      <section className="product-summary-grid">
        <div className="card mini-stat">
          <span className="muted">Produits references</span>
          <strong>{products.length}</strong>
        </div>
        <div className="card mini-stat">
          <span className="muted">Alertes stock</span>
          <strong className={stockAlerts ? "danger-text" : "success-text"}>{stockAlerts}</strong>
        </div>
        <div className="card mini-stat">
          <span className="muted">Valeur du stock achat</span>
          <strong>{formatCurrency(stockValue)}</strong>
        </div>
      </section>

      <section className="product-layout">
        <form className="card form-grid product-form-card" onSubmit={handleSubmit}>
          <div className="section-title compact">
            <div>
              <span className="eyebrow">{editingId ? "Edition" : "Nouveau"}</span>
              <h2>{editingId ? "Modifier le produit" : "Ajouter un produit"}</h2>
            </div>
            {editingId ? (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setForm(emptyForm);
                  setEditingId(null);
                }}
              >
                Annuler
              </button>
            ) : null}
          </div>

          <div className="form-two-columns">
            {productFields.map((field) => (
              <label key={field.key} className={field.key === "barcode" ? "span-2" : ""}>
                {field.label}
                <input
                  value={form[field.key]}
                  type={field.type || "text"}
                  step={field.type === "number" ? "0.01" : undefined}
                  placeholder={field.placeholder}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      [field.key]: typeof emptyForm[field.key] === "number" ? Number(e.target.value) : e.target.value
                    }))
                  }
                  required={["name", "category"].includes(field.key)}
                />
              </label>
            ))}
          </div>

          <button className="primary xl">{editingId ? "Mettre a jour le produit" : "Enregistrer le produit"}</button>
        </form>

        <div className="card product-catalog-card">
          <div className="section-title compact">
            <div>
              <span className="eyebrow">Catalogue</span>
              <h2>{filteredProducts.length} produit(s)</h2>
            </div>
            <input
              className="catalog-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit, une categorie ou une reference..."
            />
          </div>
          <div className="table-wrap">
            <table className="product-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Categorie</th>
                  <th>Prix vente</th>
                  <th>Stock</th>
                  <th>Alerte</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product._id}>
                    <td>
                      <strong>{product.name}</strong>
                      {product.barcode ? <div className="muted">Ref: {product.barcode}</div> : null}
                    </td>
                    <td>
                      <span className="tag">{product.category}</span>
                    </td>
                    <td>{formatCurrency(product.salePrice)}</td>
                    <td>
                      <span className={product.stock <= product.lowStockAlert ? "stock-badge danger-badge" : "stock-badge"}>
                        {product.stock}
                      </span>
                    </td>
                    <td>{product.lowStockAlert}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          setForm({
                            name: product.name,
                            category: product.category,
                            purchasePrice: product.purchasePrice,
                            salePrice: product.salePrice,
                            stock: product.stock,
                            barcode: product.barcode || "",
                            lowStockAlert: product.lowStockAlert
                          });
                          setEditingId(product._id);
                        }}
                      >
                        Modifier
                      </button>
                      <button type="button" className="danger" onClick={() => handleDelete(product._id)}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredProducts.length ? <div className="empty-state">Aucun produit ne correspond a cette recherche.</div> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
