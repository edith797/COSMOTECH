import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import "./UserSidebar.css";

export default function UserSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    navigate("/admin/login");
  }

  const isActive = (path) => location.pathname === path;
  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

  return (
    <>
      {/* 📱 Mobile Toggle Button */}
      <button onClick={toggleMobile} className="mobile-toggle-btn">
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* 🌑 Overlay (Click to close) */}
      {isMobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 🧊 Sidebar */}
      <aside className={`sidebar-container ${isMobileOpen ? "open" : ""}`}>
        {/* Header */}
        <div
          style={{ padding: "20px", marginTop: isMobileOpen ? "40px" : "0" }}
        >
          <h2
            style={{
              color: "#ffffff",
              margin: 0,
              fontSize: "20px",
              fontWeight: "800",
              letterSpacing: "1px",
            }}
          >
            COSMOTECH
          </h2>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, marginTop: "10px" }}>
          <SidebarLink
            to="/user/dashboard"
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            active={isActive("/user/dashboard")}
            onClick={() => setIsMobileOpen(false)}
          />

          <SidebarLink
            to="/user/quotations"
            icon={<FileText size={20} />}
            label="My Quotations"
            active={isActive("/user/quotations")}
            onClick={() => setIsMobileOpen(false)}
          />

          <SidebarLink
            to="/user/quotations/new"
            icon={<PlusCircle size={20} />}
            label="Create Quotation"
            active={isActive("/user/quotations/new")}
            onClick={() => setIsMobileOpen(false)}
          />
        </nav>

        {/* Logout */}
        <div style={{ padding: "20px" }}>
          <button
            onClick={logout}
            style={{
              display: "flex",
              alignItems: "center",
              background: "transparent",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "500",
              width: "100%",
              transition: "color 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#ef4444")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#9ca3af")}
          >
            <LogOut size={20} />
            <span style={{ marginLeft: "12px" }}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

/* Reusable Link Component */
function SidebarLink({ to, icon, label, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "12px 20px",
        textDecoration: "none",
        fontWeight: active ? "600" : "500",
        color: active ? "#ffffff" : "#9ca3af",
        background: active ? "rgba(255, 255, 255, 0.06)" : "transparent",
        borderLeft: active ? "3px solid #ffffff" : "3px solid transparent",
        transition: "all 0.2s ease-in-out",
      }}
    >
      {icon}
      <span style={{ marginLeft: "12px" }}>{label}</span>
    </Link>
  );
}
