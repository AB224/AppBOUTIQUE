import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PosPage } from "./pages/PosPage";
import { ProductsPage } from "./pages/ProductsPage";
import { StockPage } from "./pages/StockPage";
import { CustomersPage } from "./pages/CustomersPage";
import { InvoicesPage } from "./pages/InvoicesPage";

function PrivateApp() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/caisse" element={<PosPage />} />
        <Route path="/produits" element={<ProductsPage />} />
        <Route path="/stocks" element={<StockPage />} />
        <Route path="/clients" element={<CustomersPage />} />
        <Route path="/factures" element={<InvoicesPage />} />
        <Route path="/securite" element={<Navigate to="/" replace />} />
        <Route path="/utilisateurs" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  const { token, authReady } = useAuth();
  if (!authReady) {
    return (
      <div className="login-screen">
        <div className="login-panel">Verification de la session...</div>
      </div>
    );
  }
  return token ? <PrivateApp /> : <LoginPage />;
}
