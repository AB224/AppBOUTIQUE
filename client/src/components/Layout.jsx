import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Layout({ children }) {
  const { user, logout } = useAuth();

  const navItems = [
    { to: "/", label: "Tableau de bord", icon: "▦" },
    { to: "/caisse", label: "Caisse", icon: "⌁" },
    { to: "/produits", label: "Produits", icon: "□" },
    { to: "/stocks", label: "Stocks", icon: "≡" },
    { to: "/clients", label: "Clients", icon: "◉" },
    { to: "/factures", label: "Factures", icon: "▤" }
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">2F</span>
          <div>
            <div className="brand">Les Deux Frères</div>
            <p className="brand-subtitle">Alimentation · Gestion</p>
          </div>
        </div>
        <nav className="nav" aria-label="Navigation principale">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="user-card">
          <div className="user-identity">
            <span className="user-avatar" aria-hidden="true">{user?.name?.slice(0, 1)?.toUpperCase() || "A"}</span>
            <span>
              <strong>{user?.name}</strong>
              <small>{user?.role === "admin" ? "Administrateur" : "Employé"}</small>
            </span>
          </div>
          <button type="button" className="logout-button" onClick={logout} aria-label="Se déconnecter">
            ↗
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
