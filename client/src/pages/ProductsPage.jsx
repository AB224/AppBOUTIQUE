import { useEffect, useState } from "react";
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

export function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
      <section className="content-grid">
        <form className="card form-grid" onSubmit={handleSubmit}>
          <h2>{editingId ? "Modifier le produit" : "Ajouter un produit"}</h2>
          {Object.entries(form).filter(([key]) => !key.startsWith("_")).map(([key, value]) => (
            <label key={key}>
              {key}
              <input
                value={value}
                type={typeof value === "number" ? "number" : "text"}
                step="0.01"
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    [key]: typeof emptyForm[key] === "number" ? Number(e.target.value) : e.target.value
                  }))
                }
              />
            </label>
          ))}
          <button className="primary">{editingId ? "Mettre a jour" : "Enregistrer"}</button>
        </form>

        <div className="card">
          <h2>Catalogue</h2>
          <div className="table-wrap">
            <table>
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
                {products.map((product) => (
                  <tr key={product._id}>
                    <td>{product.name}</td>
                    <td>{product.category}</td>
                    <td>{formatCurrency(product.salePrice)}</td>
                    <td className={product.stock <= product.lowStockAlert ? "danger-text" : ""}>{product.stock}</td>
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
          </div>
        </div>
      </section>
    </div>
  );
}
