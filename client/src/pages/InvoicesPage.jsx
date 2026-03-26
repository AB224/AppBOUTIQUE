import { useEffect, useState } from "react";
import { api } from "../services/api";

const emptyInvoice = {
  customer: "",
  dueDate: "",
  tax: 0,
  senderEmail: "baha3116@gmail.com",
  items: [{ description: "", quantity: 1, unitPrice: 0 }]
};

export function InvoicesPage() {
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState(emptyInvoice);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    const [customersData, invoicesData] = await Promise.all([api("/customers"), api("/invoices")]);
    setCustomers(customersData);
    setInvoices(invoicesData);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      items: form.items.filter((item) => item.description)
    };
    if (editingId) {
      await api(`/invoices/${editingId}`, { method: "PUT", body: payload });
    } else {
      await api("/invoices", { method: "POST", body: payload });
    }
    setForm(emptyInvoice);
    setEditingId(null);
    setMessage("Facture enregistree");
    load();
  };

  const openPdf = async (id) => {
    const blob = await api(`/invoices/${id}/pdf`);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const sendInvoice = async (id, senderEmail) => {
    await api(`/invoices/${id}/send`, { method: "POST", body: { senderEmail } });
    setMessage("Facture envoyee par email");
    load();
  };

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Factures</h1>
        <p>Creation, PDF professionnel et envoi par email.</p>
      </div>
      {message ? <div className="alert success">{message}</div> : null}
      <section className="content-grid">
        <form className="card form-grid" onSubmit={submit}>
          <h2>{editingId ? "Modifier la facture" : "Nouvelle facture"}</h2>
          <label>
            Client
            <select value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} required>
              <option value="">Selectionner</option>
              {customers.map((customer) => (
                <option key={customer._id} value={customer._id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Echeance
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </label>
          <label>
            Taxes
            <input
              type="number"
              value={form.tax}
              onChange={(e) => setForm({ ...form, tax: Number(e.target.value) })}
            />
          </label>
          <label>
            Email expediteur
            <input
              type="email"
              value={form.senderEmail}
              onChange={(e) => setForm({ ...form, senderEmail: e.target.value })}
            />
          </label>
          <div className="invoice-items">
            {form.items.map((item, index) => (
              <div key={index} className="invoice-row">
                <input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => {
                    const items = [...form.items];
                    items[index].description = e.target.value;
                    setForm({ ...form, items });
                  }}
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Qt"
                  value={item.quantity}
                  onChange={(e) => {
                    const items = [...form.items];
                    items[index].quantity = Number(e.target.value);
                    setForm({ ...form, items });
                  }}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Prix"
                  value={item.unitPrice}
                  onChange={(e) => {
                    const items = [...form.items];
                    items[index].unitPrice = Number(e.target.value);
                    setForm({ ...form, items });
                  }}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            className="ghost"
            onClick={() => setForm({ ...form, items: [...form.items, { description: "", quantity: 1, unitPrice: 0 }] })}
          >
            Ajouter une ligne
          </button>
          <button className="primary">{editingId ? "Mettre a jour" : "Creer la facture"}</button>
        </form>

        <div className="card">
          <h2>Liste des factures</h2>
          <div className="list">
            {invoices.map((invoice) => (
              <div key={invoice._id} className="list-row card-inline">
                <div>
                  <strong>{invoice.invoiceNumber}</strong>
                  <div className="muted">{invoice.customer?.name}</div>
                </div>
                <span>{invoice.total.toFixed(2)} EUR</span>
                <div className="actions">
                  <button type="button" className="ghost" onClick={() => openPdf(invoice._id)}>
                    PDF
                  </button>
                  <button type="button" className="ghost" onClick={() => sendInvoice(invoice._id, invoice.senderEmail)}>
                    Email
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setEditingId(invoice._id);
                      setForm({
                        customer: invoice.customer?._id || "",
                        dueDate: invoice.dueDate ? invoice.dueDate.slice(0, 10) : "",
                        tax: invoice.tax,
                        senderEmail: invoice.senderEmail || "baha3116@gmail.com",
                        items: invoice.items
                      });
                    }}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={async () => {
                      await api(`/invoices/${invoice._id}`, { method: "DELETE" });
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
    </div>
  );
}
