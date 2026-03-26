import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Layout({ children }) {
  const { user, logout } = useAuth();

  const navItems = [
    { to: "/", label: "Dashboard" },
    { to: "/caisse", label: "Caisse" },
    { to: "/produits", label: "Produits" },
    { to: "/stocks", label: "Stocks" },
    { to: "/clients", label: "Clients" },
    { to: "/factures", label: "Factures" },
    { to: "/securite", label: "Securite" },
    ...(user?.role === "admin" ? [{ to: "/utilisateurs", label: "Utilisateurs" }] : [])
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <div className="brand">AppBoutique</div>
          <p className="muted">Gestion d'epicerie moderne</p>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="user-card">
          <strong>{user?.name}</strong>
          <span>{user?.role === "admin" ? "Administrateur" : "Employe"}</span>
          <button className="ghost" onClick={logout}>
            Deconnexion
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
