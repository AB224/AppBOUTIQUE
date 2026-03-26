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
import { UsersPage } from "./pages/UsersPage";
import { SecurityPage } from "./pages/SecurityPage";

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
        <Route path="/securite" element={<SecurityPage />} />
        <Route path="/utilisateurs" element={<UsersPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  const { token } = useAuth();
  return token ? <PrivateApp /> : <LoginPage />;
}
