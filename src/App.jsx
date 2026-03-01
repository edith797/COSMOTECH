  import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
  import AdminLogin from "./auth/AdminLogin";
  import useAuthInit from "./hooks/useAuthInit";
  import AuthRedirect from "./components/AuthRedirect";

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
  // ✅ IMPORT THE USER CREATE COMPONENT
  import CreateQuotationUser from "./app/users/CreateQuotationUser";

  export default function App() {
    useAuthInit();

    return (
      <BrowserRouter>
        <AuthRedirect />

        <Routes>
          {/* ================= ROOT ================= */}
          <Route path="/" element={<Navigate to="/admin/login" replace />} />

          {/* ================= AUTH ================= */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* ================= ADMIN AREA ================= */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="companies" element={<CompanyMaster />} />

            {/* Quotations */}
            <Route path="quotations" element={<AllQuotations />} />
            <Route path="quotations/new" element={<CreateQuotation />} />
            {/* ✅ ADDED EDIT ROUTE */}
            <Route path="quotations/edit/:id" element={<CreateQuotation />} />
            <Route path="quotations/:id" element={<QuotationPreview />} />

            {/* Settings & Users */}
          
            <Route path="users" element={<UserManagement />} />
          </Route>

          {/* ================= USER AREA ================= */}
          <Route path="/user" element={<UserLayout />}>
            <Route path="dashboard" element={<UserDashboard />} />
            <Route path="quotations" element={<MyQuotations />} />

            {/* ✅ FIXED: Use CreateQuotationUser here */}
            <Route path="quotations/new" element={<CreateQuotationUser />} />

            {/* ✅ ADDED EDIT ROUTE (Using User Component) */}
            <Route path="quotations/edit/:id" element={<CreateQuotationUser />} />

            <Route path="quotations/:id" element={<QuotationPreview />} />
          </Route>

          {/* ================= 404 ================= */}
          <Route path="*" element={<h2>Page Not Found</h2>} />
        </Routes>
      </BrowserRouter>
    );
  }
