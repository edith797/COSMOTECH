import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./auth/AdminLogin";
import useAuthInit from "./hooks/useAuthInit";
import AuthRedirect from "./components/AuthRedirect";
import ProtectedRoute from "./components/ProtectedRoute";

// ================= ADMIN =================
import AdminLayout from "./app/admin/AdminLayout";
import AdminDashboard from "./app/admin/AdminDashboard";
import CompanyMaster from "./app/admin/CompanyMaster";
import AllQuotations from "./app/admin/AllQuotations";
import CreateQuotation from "./app/admin/CreateQuotation";
import QuotationPreview from "./app/admin/QuotationPreview";
import SystemSettings from "./app/admin/SystemSettings";
import UserManagement from "./app/admin/UserManagement";

// ================= USER =================
import UserLayout from "./app/users/UserLayout";
import UserDashboard from "./app/users/UserDashboard";
import MyQuotations from "./app/users/MyQuotations";
import CreateQuotationUser from "./app/users/CreateQuotationUser";

export default function App() {
  useAuthInit();

  return (
    <BrowserRouter>
      <AuthRedirect />

      <Routes>
        {/* ================= ROOT ================= */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />

        {/* ================= AUTH (Public) ================= */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* ================= ADMIN AREA (Secured) ================= */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="companies" element={<CompanyMaster />} />

          {/* Quotations */}
          <Route path="quotations" element={<AllQuotations />} />
          <Route path="quotations/new" element={<CreateQuotation />} />
          <Route path="quotations/edit/:id" element={<CreateQuotation />} />
          {/* ✅ ADDED REVISE ROUTE */}
          <Route path="quotations/revise/:id" element={<CreateQuotation />} />
          <Route path="quotations/:id" element={<QuotationPreview />} />

          {/* Settings & Users */}
          <Route path="users" element={<UserManagement />} />
          <Route path="settings" element={<SystemSettings />} />
        </Route>

        {/* ================= USER AREA (Secured) ================= */}
        <Route
          path="/user"
          element={
            <ProtectedRoute allowedRoles={["USER", "ADMIN"]}>
              <UserLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="quotations" element={<MyQuotations />} />

          <Route path="quotations/new" element={<CreateQuotationUser />} />
          <Route path="quotations/edit/:id" element={<CreateQuotationUser />} />
          {/* ✅ ADDED REVISE ROUTE FOR USERS TOO */}
          <Route
            path="quotations/revise/:id"
            element={<CreateQuotationUser />}
          />
          <Route path="quotations/:id" element={<QuotationPreview />} />
        </Route>

        {/* ================= 404 ================= */}
        <Route path="*" element={<h2>Page Not Found</h2>} />
      </Routes>
    </BrowserRouter>
  );
}
