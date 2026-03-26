import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const printTicket = (sale) => {
  const ticketWindow = window.open("", "_blank", "width=360,height=640");
  if (!ticketWindow) return;

  const items = sale.items
    .map((item) => `<div style="display:flex;justify-content:space-between;margin:6px 0;"><span>${item.name} x${item.quantity}</span><strong>${item.total.toFixed(2)} EUR</strong></div>`)
    .join("");

  ticketWindow.document.write(`
    <html>
      <head><title>${sale.ticketNumber}</title></head>
      <body style="font-family:Arial;padding:20px;max-width:320px;margin:0 auto;">
        <h2 style="margin-bottom:8px;">Ticket de caisse</h2>
        <div>${sale.ticketNumber}</div>
        <div>${new Date(sale.createdAt).toLocaleString("fr-FR")}</div>
        <hr />
        ${items}
        <hr />
        <div style="display:flex;justify-content:space-between;font-size:18px;"><span>Total</span><strong>${sale.total.toFixed(2)} EUR</strong></div>
        <div style="margin-top:12px;">Paiement: ${sale.paymentMethod === "cash" ? "Especes" : "Carte"}</div>
        <div style="margin-top:18px;text-align:center;">Merci et a bientot</div>
      </body>
    </html>
  `);
  ticketWindow.document.close();
  ticketWindow.focus();
};

export function PosPage() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [query, setQuery] = useState("");
  const [customer, setCustomer] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState("");

  const load = async () => {
    const [productsData, salesData, customersData] = await Promise.all([api("/products"), api("/sales"), api("/customers")]);
    setProducts(productsData);
    setSales(salesData);
    setCustomers(customersData);
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
    setMessage(`Ticket ${sale.ticketNumber} genere pour ${sale.total.toFixed(2)} EUR`);
    printTicket(sale);
    setCart([]);
    setCustomer("");
    load();
  };

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Caisse</h1>
        <p>Interface tactile rapide avec recherche par nom ou code-barres.</p>
      </div>
      {message ? <div className="alert success">{message}</div> : null}
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
                <span>{product.salePrice.toFixed(2)} EUR</span>
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
                    <div className="muted">{item.price.toFixed(2)} EUR</div>
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
            <strong>{total.toFixed(2)} EUR</strong>
          </div>

          <button className="primary xl" disabled={!cart.length} onClick={checkout}>
            Encaisser
          </button>
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
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale._id}>
                  <td>{sale.ticketNumber}</td>
                  <td>{new Date(sale.createdAt).toLocaleString("fr-FR")}</td>
                  <td>{sale.customer?.name || "-"}</td>
                  <td>{sale.paymentMethod === "cash" ? "Especes" : "Carte"}</td>
                  <td>{sale.total.toFixed(2)} EUR</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
