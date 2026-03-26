import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const GOOGLE_SCRIPT_ID = "google-identity-service";

export function LoginPage() {
  const { login, requestGoogleCode, verifyGoogleCode } = useAuth();
  const googleButtonRef = useRef(null);
  const [email, setEmail] = useState("devjsfullstrack@gmail.com");
  const [password, setPassword] = useState("Admin123!");
  const [totpCode, setTotpCode] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [googleRequestId, setGoogleRequestId] = useState("");
  const [googleEmail, setGoogleEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const googleClientId = useMemo(() => import.meta.env.VITE_GOOGLE_CLIENT_ID || "", []);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) {
      return;
    }

    const renderGoogleButton = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          setLoading(true);
          setError("");
          setMessage("");
          try {
            const data = await requestGoogleCode(response.credential);
            setGoogleRequestId(data.requestId);
            setGoogleEmail(data.email);
            setMessage(data.message);
          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        }
      });
      googleButtonRef.current.innerHTML = "";
      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "pill",
        width: 320
      });
    };

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) {
      renderGoogleButton();
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.body.appendChild(script);
  }, [googleClientId, requestGoogleCode]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await login(email, password, totpCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleVerify = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await verifyGoogleCode(googleRequestId, emailCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-panel login-wide">
        <h1>Boutique alimentaire</h1>
        <p>Connexion Google puis validation par code envoye par email.</p>

        <div className="login-grid">
          <section className="card login-card">
            <h2>Connexion Google</h2>
            <p className="muted">Utilisez ton compte Google puis saisis le code recu sur ta boite mail.</p>
            {googleClientId ? <div ref={googleButtonRef} className="google-button-wrap" /> : <div className="alert error">VITE_GOOGLE_CLIENT_ID n'est pas configure.</div>}
            {googleRequestId ? (
              <form onSubmit={handleGoogleVerify} className="form-grid top-gap">
                <label>
                  Email de verification
                  <input value={googleEmail} readOnly />
                </label>
                <label>
                  Code recu par email
                  <input value={emailCode} onChange={(e) => setEmailCode(e.target.value)} inputMode="numeric" required />
                </label>
                <button type="submit" className="primary" disabled={loading}>
                  {loading ? "Verification..." : "Valider le code email"}
                </button>
              </form>
            ) : null}
          </section>

          <section className="card login-card">
            <h2>Connexion locale</h2>
            <p className="muted">Conservee comme solution de secours pour l'administration.</p>
            <form onSubmit={handleSubmit} className="form-grid">
              <label>
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
              </label>
              <label>
                Mot de passe
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
              </label>
              <label>
                Code TOTP
                <input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} inputMode="numeric" placeholder="Optionnel si non active" />
              </label>
              <button type="submit" className="ghost" disabled={loading}>
                {loading ? "Connexion..." : "Connexion locale"}
              </button>
            </form>
          </section>
        </div>

        {message ? <div className="alert success top-gap">{message}</div> : null}
        {error ? <div className="alert error top-gap">{error}</div> : null}
      </div>
    </div>
  );
}
