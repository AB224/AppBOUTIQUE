import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { formatCurrency } from "../utils/currency";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const printTicket = (sale) => {
  const ticketWindow = window.open("", "_blank", "width=360,height=640");
  if (!ticketWindow) return false;

  const items = sale.items
    .map(
      (item) =>
        `<div style="margin:8px 0;"><div style="display:flex;justify-content:space-between;gap:12px;"><span>${escapeHtml(item.name)}</span><strong>${formatCurrency(item.total)}</strong></div><small>${item.quantity} x ${formatCurrency(item.price)}</small></div>`
    )
    .join("");

  ticketWindow.onload = () => {
    ticketWindow.focus();
    ticketWindow.print();
  };

  ticketWindow.document.write(`
    <html>
      <head>
        <title>${escapeHtml(sale.ticketNumber)}</title>
        <style>@page { margin: 8mm; } body { color:#111; } small { color:#555; }</style>
      </head>
      <body style="font-family:Arial,sans-serif;padding:20px;max-width:320px;margin:0 auto;">
        <h2 style="margin:0 0 8px;text-align:center;">Les Deux Freres Alimentation</h2>
        <div style="text-align:center;font-weight:bold;">Ticket de caisse</div>
        <div style="margin-top:12px;">${escapeHtml(sale.ticketNumber)}</div>
        <div>${new Date(sale.createdAt).toLocaleString("fr-FR")}</div>
        <hr />
        ${items}
        <hr />
        <div style="display:flex;justify-content:space-between;font-size:18px;"><span>Total</span><strong>${formatCurrency(sale.total)}</strong></div>
        <div style="margin-top:12px;">Paiement: ${sale.paymentMethod === "cash" ? "Especes" : "Carte"}</div>
        <div style="margin-top:18px;text-align:center;">Merci et a bientot</div>
      </body>
    </html>
  `);
  ticketWindow.document.close();
  return true;
};

export function PosPage() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [cashMovements, setCashMovements] = useState([]);
  const [query, setQuery] = useState("");
  const [customer, setCustomer] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cart, setCart] = useState([]);
  const [lastSale, setLastSale] = useState(null);
  const [message, setMessage] = useState("");
  const [refundForm, setRefundForm] = useState({
    productId: "",
    productReference: "",
    quantity: 1,
    amount: 0,
    paymentMethod: "cash",
    reason: "Produit defectueux",
    note: "",
    restock: false
  });

  const load = async () => {
    const [productsData, salesData, customersData, cashData] = await Promise.all([
      api("/products"),
      api("/sales"),
      api("/customers"),
      api("/cash/movements")
    ]);
    setProducts(productsData);
    setSales(salesData);
    setCustomers(customersData);
    setCashMovements(cashData);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        [product.name, product.category, product.barcode].join(" ").toLowerCase().includes(query.toLowerCase())
      ),
    [products, query]
  );

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.product === product._id);
      if (existing) {
        return current.map((item) =>
          item.product === product._id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item
        );
      }
      return [...current, { product: product._id, name: product.name, quantity: 1, price: product.salePrice }];
    });
  };

  const total = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const checkout = async () => {
    const payload = {
      customer: customer || null,
      paymentMethod,
      items: cart.map((item) => ({ product: item.product, quantity: item.quantity }))
    };
    const sale = await api("/sales", { method: "POST", body: payload });
    setLastSale(sale);
    setMessage(`Vente ${sale.ticketNumber} enregistree pour ${formatCurrency(sale.total)}. Vous pouvez imprimer le ticket ci-dessous.`);
    setCart([]);
    setCustomer("");
    load();
  };

  const selectedRefundProduct = products.find((product) => product._id === refundForm.productId);

  const submitRefund = async (event) => {
    event.preventDefault();
    const movement = await api("/cash/returns", { method: "POST", body: refundForm });
    setMessage(`Decaissement retour enregistre : ${formatCurrency(movement.amount)}`);
    setRefundForm({
      productId: "",
      productReference: "",
      quantity: 1,
      amount: 0,
      paymentMethod: "cash",
      reason: "Produit defectueux",
      note: "",
      restock: false
    });
    load();
  };

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Caisse</h1>
        <p>Interface tactile rapide avec recherche par nom ou code-barres.</p>
      </div>
      {message ? <div className="alert success">{message}</div> : null}
      {lastSale ? (
        <div className="card actions">
          <div>
            <strong>Dernier ticket : {lastSale.ticketNumber}</strong>
            <div className="muted">Imprimez-le maintenant ou retrouvez-le dans l'historique pour le reediter.</div>
          </div>
          <button type="button" className="primary" onClick={() => printTicket(lastSale)}>
            Imprimer le ticket
          </button>
        </div>
      ) : null}
      <section className="pos-layout">
        <div className="card">
          <div className="toolbar">
            <input
              className="search"
              placeholder="Scanner ou rechercher un produit"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <button
                type="button"
                key={product._id}
                className="product-tile"
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
              >
                <strong>{product.name}</strong>
                <span>{formatCurrency(product.salePrice)}</span>
                <small>Stock {product.stock}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Panier</h2>
          <div className="list">
            {cart.length ? (
              cart.map((item) => (
                <div className="list-row" key={item.product}>
                  <div>
                    <strong>{item.name}</strong>
                    <div className="muted">{formatCurrency(item.price)}</div>
                  </div>
                  <input
                    className="qty-input"
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      setCart((current) =>
                        current.map((line) =>
                          line.product === item.product ? { ...line, quantity: Number(e.target.value) } : line
                        )
                      )
                    }
                  />
                </div>
              ))
            ) : (
              <span className="muted">Aucun article dans le panier.</span>
            )}
          </div>

          <label>
            Client
            <select value={customer} onChange={(e) => setCustomer(e.target.value)}>
              <option value="">Vente sans client</option>
              {customers.map((entry) => (
                <option key={entry._id} value={entry._id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>

          <div className="payment-toggle">
            <button type="button" className={paymentMethod === "cash" ? "primary" : "ghost"} onClick={() => setPaymentMethod("cash")}>
              Especes
            </button>
            <button type="button" className={paymentMethod === "card" ? "primary" : "ghost"} onClick={() => setPaymentMethod("card")}>
              Carte
            </button>
          </div>

          <div className="total-box">
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>

          <button className="primary xl" disabled={!cart.length} onClick={checkout}>
            Encaisser
          </button>
        </div>
      </section>

      <section className="content-grid">
        <form className="card form-grid" onSubmit={submitRefund}>
          <h2>Decaissement retour defectueux</h2>
          <label>
            Produit retourne
            <select
              value={refundForm.productId}
              onChange={(e) => {
                const product = products.find((entry) => entry._id === e.target.value);
                setRefundForm((current) => ({
                  ...current,
                  productId: e.target.value,
                  amount: product ? product.salePrice * current.quantity : current.amount
                }));
              }}
            >
              <option value="">Sans produit reference</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ref. produit retournee
            <input
              placeholder="Reference, code-barres ou numero du ticket"
              value={refundForm.productReference}
              onChange={(e) => setRefundForm((current) => ({ ...current, productReference: e.target.value }))}
            />
          </label>
          <div className="invoice-row">
            <label>
              Quantite
              <input
                type="number"
                min="1"
                value={refundForm.quantity}
                onChange={(e) => {
                  const quantity = Number(e.target.value);
                  setRefundForm((current) => ({
                    ...current,
                    quantity,
                    amount: selectedRefundProduct ? selectedRefundProduct.salePrice * quantity : current.amount
                  }));
                }}
              />
            </label>
            <label>
              Montant
              <input
                type="number"
                min="0"
                step="0.01"
                value={refundForm.amount}
                onChange={(e) => setRefundForm((current) => ({ ...current, amount: Number(e.target.value) }))}
                required
              />
            </label>
            <label>
              Sortie
              <select
                value={refundForm.paymentMethod}
                onChange={(e) => setRefundForm((current) => ({ ...current, paymentMethod: e.target.value }))}
              >
                <option value="cash">Especes</option>
                <option value="card">Carte</option>
              </select>
            </label>
          </div>
          <label>
            Motif
            <input
              value={refundForm.reason}
              onChange={(e) => setRefundForm((current) => ({ ...current, reason: e.target.value }))}
              required
            />
          </label>
          <label>
            Note
            <input
              placeholder="Ex: emballage ouvert, produit casse..."
              value={refundForm.note}
              onChange={(e) => setRefundForm((current) => ({ ...current, note: e.target.value }))}
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={refundForm.restock}
              onChange={(e) => setRefundForm((current) => ({ ...current, restock: e.target.checked }))}
            />
            Remettre le produit en stock
          </label>
          <button className="danger">Valider le decaissement</button>
        </form>

        <div className="card">
          <h2>Historique des decaissements</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Produit</th>
                  <th>Motif</th>
                  <th>Montant</th>
                </tr>
              </thead>
              <tbody>
                {cashMovements.map((movement) => (
                  <tr key={movement._id}>
                    <td>{new Date(movement.createdAt).toLocaleString("fr-FR")}</td>
                    <td>
                      {movement.product?.name || movement.productName || "-"}
                      {movement.productReference ? <div className="muted">Ref: {movement.productReference}</div> : null}
                    </td>
                    <td>{movement.reason}</td>
                    <td className="danger-text">-{formatCurrency(movement.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Historique des ventes</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Date</th>
                <th>Client</th>
                <th>Paiement</th>
                <th>Total</th>
                <th>Ticket</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale._id}>
                  <td>{sale.ticketNumber}</td>
                  <td>{new Date(sale.createdAt).toLocaleString("fr-FR")}</td>
                  <td>{sale.customer?.name || "-"}</td>
                  <td>{sale.paymentMethod === "cash" ? "Especes" : "Carte"}</td>
                  <td>{formatCurrency(sale.total)}</td>
                  <td>
                    <button type="button" className="ghost" onClick={() => printTicket(sale)}>
                      Reimprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
