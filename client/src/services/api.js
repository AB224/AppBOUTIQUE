const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const isFormData = options.body instanceof FormData;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method || "GET",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      },
      body: options.body ? (isFormData ? options.body : JSON.stringify(options.body)) : undefined
    });
  } catch (error) {
    throw new Error("Le serveur est inaccessible. Verifiez que l'API et la base MongoDB sont bien demarrees.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Erreur reseau" }));
    const isLoginRequest = path === "/auth/login" || path.startsWith("/auth/google/") || path.startsWith("/auth/local/");
    if (response.status === 401 && !isLoginRequest) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("appboutique:auth-expired"));
      throw new Error("Session expiree ou invalide. Reconnecte-toi puis reessaie.");
    }
    throw new Error(error.message || "Erreur inconnue");
  }

  const contentType = response.headers.get("content-type") || "";
  if (
    contentType.includes("application/pdf") ||
    contentType.includes("spreadsheetml") ||
    contentType.includes("application/octet-stream")
  ) {
    return response.blob();
  }
  return response.json();
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
