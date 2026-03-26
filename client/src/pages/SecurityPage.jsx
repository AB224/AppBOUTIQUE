import { useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function SecurityPage() {
  const { user, refreshUser, setUser } = useAuth();
  const [setup, setSetup] = useState(null);
  const [totpCode, setTotpCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const data = await api("/auth/totp/setup");
      setSetup(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await api("/auth/totp/verify", { method: "POST", body: { totpCode } });
      setUser(response.user);
      await refreshUser();
      setMessage("TOTP active avec succes.");
      setSetup(null);
      setTotpCode("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const disableTotp = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await api("/auth/totp/disable", {
        method: "POST",
        body: { password: disablePassword, totpCode: disableCode }
      });
      setUser(response.user);
      await refreshUser();
      setDisablePassword("");
      setDisableCode("");
      setMessage("TOTP desactive.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Securite</h1>
        <p>Activez une verification TOTP avec Google Authenticator, Authy ou Microsoft Authenticator.</p>
      </div>
      {message ? <div className="alert success">{message}</div> : null}
      {error ? <div className="alert error">{error}</div> : null}

      <section className="content-grid">
        <div className="card form-grid">
          <h2>Etat de la connexion</h2>
          <div className="list-row">
            <span>Utilisateur</span>
            <strong>{user?.email}</strong>
          </div>
          <div className="list-row">
            <span>Fournisseur</span>
            <strong>{user?.authProvider === "google" ? "Google" : "Local"}</strong>
          </div>
          <div className="list-row">
            <span>TOTP</span>
            <strong>{user?.totpEnabled ? "Active" : "Desactive"}</strong>
          </div>
          {!user?.totpEnabled ? (
            <button className="primary" type="button" onClick={startSetup} disabled={loading}>
              {loading ? "Preparation..." : "Activer le TOTP"}
            </button>
          ) : null}
        </div>

        <div className="card form-grid">
          <h2>Desactiver le TOTP</h2>
          <form className="form-grid" onSubmit={disableTotp}>
            {user?.authProvider === "local" ? (
              <label>
                Mot de passe
                <input type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} required />
              </label>
            ) : (
              <div className="muted">Pour un compte Google, seul le code TOTP actuel est requis.</div>
            )}
            <label>
              Code TOTP
              <input value={disableCode} onChange={(e) => setDisableCode(e.target.value)} inputMode="numeric" required />
            </label>
            <button className="danger" disabled={!user?.totpEnabled || loading}>
              Desactiver
            </button>
          </form>
        </div>
      </section>

      {setup ? (
        <section className="content-grid">
          <div className="card form-grid">
            <h2>Etape 1</h2>
            <p>Scannez ce QR code avec votre application d'authentification.</p>
            <img src={setup.qrCodeDataUrl} alt="QR code TOTP" className="qr-image" />
            <label>
              Cle manuelle
              <input value={setup.secret} readOnly />
            </label>
          </div>

          <div className="card form-grid">
            <h2>Etape 2</h2>
            <form className="form-grid" onSubmit={verifySetup}>
              <label>
                Code genere par l'application
                <input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} inputMode="numeric" required />
              </label>
              <button className="primary" disabled={loading}>
                Confirmer l'activation
              </button>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
