import { useEffect, useState } from "react";
import { api } from "../services/api";
import { formatCurrency } from "../utils/currency";

const emptyCustomer = { name: "", firstName: "", phone: "" };
const emptyCredit = { reference: "", description: "", amount: "" };

const formatDate = (value) => (value ? new Date(value).toLocaleDateString("fr-FR") : "-");
const formatCustomerName = (customer) => [customer?.name, customer?.firstName].filter(Boolean).join(" ");

export function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [history, setHistory] = useState([]);
  const [credits, setCredits] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyCustomer);
  const [creditForm, setCreditForm] = useState(emptyCredit);
  const [paymentByCredit, setPaymentByCredit] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = () => api("/customers").then(setCustomers).catch((err) => setError(err.message));

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
    try {
      setError("");
      setSelected(customer);
      const [historyData, creditData] = await Promise.all([
        api(`/customers/${customer._id}/history`),
        api(`/customers/credits/customer/${customer._id}`)
      ]);
      setHistory(historyData);
      setCredits(creditData);
      setCreditForm(emptyCredit);
    } catch (err) {
      setHistory([]);
      setCredits([]);
      setError(err.message);
    }
  };

  const refreshSelected = async () => {
    if (!selected) return;
    await openHistory(selected);
    await load();
  };

  const submitCredit = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setError("");
    setMessage("");
    const amount = Number(creditForm.amount);
    if (!amount || amount <= 0) {
      setError("Saisis un montant de creance superieur a 0 GNF.");
      return;
    }
    try {
      const credit = await api(`/customers/credits/customer/${selected._id}`, {
        method: "POST",
        body: { ...creditForm, amount }
      });
      setCreditForm(emptyCredit);
      await refreshSelected();
      setMessage(`Creance ajoutee. Prochain rappel le ${formatDate(credit.nextReminderAt)}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const markReminderDone = async (creditId) => {
    try {
      const credit = await api(`/customers/credits/${creditId}`, { method: "PATCH", body: { action: "reminder" } });
      await refreshSelected();
      setMessage(`Rappel note. Prochain rappel le ${formatDate(credit.nextReminderAt)}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const registerPayment = async (creditId) => {
    const paidAmount = Number(paymentByCredit[creditId] || 0);
    if (!paidAmount || paidAmount <= 0) {
      setError("Saisis un montant paye superieur a 0 GNF.");
      return;
    }
    try {
      const credit = await api(`/customers/credits/${creditId}`, { method: "PATCH", body: { action: "payment", paidAmount } });
      setPaymentByCredit((current) => ({ ...current, [creditId]: "" }));
      await refreshSelected();
      setMessage(credit.status === "paid" ? "Creance soldee." : `Paiement enregistre. Reste ${formatCurrency(credit.remainingAmount)}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const totalCredit = credits
    .filter((credit) => credit.status !== "paid")
    .reduce((sum, credit) => sum + Number(credit.remainingAmount || 0), 0);
  const dueCredits = credits.filter((credit) => credit.reminderDue);

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Clients</h1>
        <p>Fiches clients, historique d'achats et suivi des creances.</p>
      </div>
      {message ? <div className="alert success">{message}</div> : null}
      {error ? <div className="alert error">{error}</div> : null}
      <section className="content-grid">
        <form className="card form-grid" onSubmit={submit}>
          <h2>{editingId ? "Modifier le client" : "Ajouter un client"}</h2>
          <label>
            Nom
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Prénoms
            <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          </label>
          <label>
            Portable
            <input value={form.phone} type="tel" inputMode="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </label>
          <button className="primary">{editingId ? "Mettre a jour" : "Enregistrer"}</button>
        </form>

        <div className="card">
          <h2>Base clients</h2>
          <div className="list">
            {customers.map((customer) => (
              <div key={customer._id} className="list-row">
                <div>
                  <strong>{formatCustomerName(customer)}</strong>
                  <div className="muted">{customer.phone || "Sans numéro de portable"}</div>
                  {customer.creditSummary?.remainingAmount > 0 ? (
                    <div className={customer.creditSummary.dueCount ? "danger-text" : "muted"}>
                      Creance: {formatCurrency(customer.creditSummary.remainingAmount)}
                      {customer.creditSummary.dueCount ? ` - ${customer.creditSummary.dueCount} rappel(s)` : ""}
                    </div>
                  ) : null}
                </div>
                <div className="actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setForm({ name: customer.name || "", firstName: customer.firstName || "", phone: customer.phone || "" });
                      setEditingId(customer._id);
                    }}
                  >
                    Modifier
                  </button>
                  <button type="button" className="ghost" onClick={() => openHistory(customer)}>
                    Details
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
        <section className="stack">
          <div className="credit-hero card">
            <div>
              <h2>{formatCustomerName(selected)}</h2>
              <p>Creance restante: <strong>{formatCurrency(totalCredit)}</strong></p>
            </div>
            <div className={dueCredits.length ? "credit-badge danger-badge" : "credit-badge"}>
              {dueCredits.length ? `${dueCredits.length} rappel(s) a faire` : "Aucun rappel en retard"}
            </div>
          </div>

          <section className="content-grid">
            <form className="card form-grid" onSubmit={submitCredit}>
              <h2>Nouvel achat non paye</h2>
              <label>
                Reference
                <input
                  placeholder="Ticket, facture ou ref produit"
                  value={creditForm.reference}
                  onChange={(e) => setCreditForm({ ...creditForm, reference: e.target.value })}
                />
              </label>
              <label>
                Description
                <input
                  placeholder="Ex: courses du jour"
                  value={creditForm.description}
                  onChange={(e) => setCreditForm({ ...creditForm, description: e.target.value })}
                  required
                />
              </label>
              <label>
                Montant non paye
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={creditForm.amount}
                  placeholder="0.00"
                  onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })}
                  required
                />
              </label>
              <button className="primary" disabled={Number(creditForm.amount) <= 0}>
                Ajouter la creance
              </button>
            </form>

            <div className="card">
              <h2>Creances et rappels</h2>
              <div className="list">
                {credits.length ? (
                  credits.map((credit) => (
                    <div key={credit._id} className={`credit-row ${credit.reminderDue ? "credit-row-due" : ""}`}>
                      <div>
                        <strong>{credit.description}</strong>
                        <div className="muted">
                          {credit.reference || "Sans reference"} - saisi le {formatDate(credit.createdAt)}
                        </div>
                        <div className={credit.reminderDue ? "danger-text" : "muted"}>
                          Prochain rappel: {formatDate(credit.nextReminderAt)}
                        </div>
                      </div>
                      <div className="credit-actions">
                        <strong>{formatCurrency(credit.remainingAmount)}</strong>
                        <input
                          className="payment-input"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Paiement"
                          value={paymentByCredit[credit._id] || ""}
                          onChange={(e) => setPaymentByCredit({ ...paymentByCredit, [credit._id]: e.target.value })}
                          disabled={credit.status === "paid"}
                        />
                        <button type="button" className="ghost" disabled={credit.status === "paid"} onClick={() => registerPayment(credit._id)}>
                          Payer
                        </button>
                        <button type="button" className="ghost" disabled={credit.status === "paid"} onClick={() => markReminderDone(credit._id)}>
                          Rappel fait
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="muted">Aucune creance enregistree.</span>
                )}
              </div>
            </div>
          </section>

          <div className="card">
            <h2>Achats de {formatCustomerName(selected)}</h2>
            <div className="list">
              {history.length ? (
                history.map((sale) => (
                  <div key={sale._id} className="list-row">
                    <span>{new Date(sale.createdAt).toLocaleString("fr-FR")}</span>
                    <strong>{formatCurrency(sale.total)}</strong>
                  </div>
                ))
              ) : (
                <span className="muted">Aucun achat enregistre.</span>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
