import { useEffect, useState } from "react";
import { api } from "../services/api";

const emptyCustomer = { name: "", phone: "", email: "" };

export function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyCustomer);
  const [editingId, setEditingId] = useState(null);

  const load = () => api("/customers").then(setCustomers);

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (editingId) {
      await api(`/customers/${editingId}`, { method: "PUT", body: form });
    } else {
      await api("/customers", { method: "POST", body: form });
    }
    setForm(emptyCustomer);
    setEditingId(null);
    load();
  };

  const openHistory = async (customer) => {
    setSelected(customer);
    const data = await api(`/customers/${customer._id}/history`);
    setHistory(data);
  };

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Clients</h1>
        <p>Fiches clients et historique d'achats.</p>
      </div>
      <section className="content-grid">
        <form className="card form-grid" onSubmit={submit}>
          <h2>{editingId ? "Modifier le client" : "Ajouter un client"}</h2>
          <label>
            Nom
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Telephone
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            Email
            <input value={form.email} type="email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <button className="primary">{editingId ? "Mettre a jour" : "Enregistrer"}</button>
        </form>

        <div className="card">
          <h2>Base clients</h2>
          <div className="list">
            {customers.map((customer) => (
              <div key={customer._id} className="list-row">
                <div>
                  <strong>{customer.name}</strong>
                  <div className="muted">{customer.phone || customer.email || "Sans coordonnees"}</div>
                </div>
                <div className="actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setForm(customer);
                      setEditingId(customer._id);
                    }}
                  >
                    Modifier
                  </button>
                  <button type="button" className="ghost" onClick={() => openHistory(customer)}>
                    Historique
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={async () => {
                      await api(`/customers/${customer._id}`, { method: "DELETE" });
                      load();
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {selected ? (
        <section className="card">
          <h2>Achats de {selected.name}</h2>
          <div className="list">
            {history.length ? (
              history.map((sale) => (
                <div key={sale._id} className="list-row">
                  <span>{new Date(sale.createdAt).toLocaleString("fr-FR")}</span>
                  <strong>{sale.total.toFixed(2)} EUR</strong>
                </div>
              ))
            ) : (
              <span className="muted">Aucun achat enregistre.</span>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
