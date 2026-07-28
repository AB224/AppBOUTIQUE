import { useEffect, useState } from "react";
import { api, downloadBlob } from "../services/api";

const emptyInvoice = {
  type: "sale",
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

  const exportExcel = async (type) => {
    const blob = await api(`/invoices/export/excel?type=${type}`);
    downloadBlob(blob, `factures-${type === "purchase" ? "achats" : "ventes"}-appboutique.xlsx`);
  };

  const importExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await api("/invoices/import/excel", { method: "POST", body: formData });
      setMessage(`Import termine : ${result.imported} facture(s), ${result.lines} ligne(s).`);
      await load();
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Factures</h1>
          <p>Creation, PDF professionnel et envoi par email.</p>
        </div>
        <div className="actions">
          <label className="ghost file-action">
            Importer Excel
            <input type="file" accept=".xlsx,.xls" onChange={importExcel} />
          </label>
          <button type="button" className="primary" onClick={() => exportExcel("sale")}>
            Export ventes
          </button>
          <button type="button" className="primary" onClick={() => exportExcel("purchase")}>
            Export achats
          </button>
        </div>
      </div>
      {message ? <div className="alert success">{message}</div> : null}
      <section className="content-grid">
        <form className="card form-grid" onSubmit={submit}>
          <h2>{editingId ? "Modifier la facture" : "Nouvelle facture"}</h2>
          <label>
            Type
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="sale">Vente</option>
              <option value="purchase">Achat</option>
            </select>
          </label>
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
                  <div className="muted">
                    {invoice.type === "purchase" ? "Achat" : "Vente"} - {invoice.customer?.name}
                  </div>
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
                        type: invoice.type || "sale",
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
