import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const emptyUser = { name: "", email: "", password: "", role: "employee" };

export function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyUser);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    api("/auth/users")
      .then(setUsers)
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    if (user?.role === "admin") {
      load();
    }
  }, [user]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api("/auth/users", { method: "POST", body: form });
      setForm(emptyUser);
      setMessage("Utilisateur ajoute");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (user?.role !== "admin") {
    return <div className="card">Cette section est reservee a l'administrateur.</div>;
  }

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Utilisateurs</h1>
        <p>Creation des comptes admin et employe.</p>
      </div>
      {message ? <div className="alert success">{message}</div> : null}
      {error ? <div className="alert error">{error}</div> : null}
      <section className="content-grid">
        <form className="card form-grid" onSubmit={submit}>
          <h2>Nouveau compte</h2>
          <label>
            Nom
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>
            Mot de passe
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          <label>
            Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="employee">Employe</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button className="primary">Ajouter</button>
        </form>

        <div className="card">
          <h2>Comptes actifs</h2>
          <div className="list">
            {users.map((entry) => (
              <div key={entry._id} className="list-row">
                <div>
                  <strong>{entry.name}</strong>
                  <div className="muted">{entry.email}</div>
                </div>
                <span>{entry.role === "admin" ? "Admin" : "Employe"}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
