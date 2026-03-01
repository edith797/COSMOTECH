import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  LayoutDashboard,
  Building2,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  Users,
  Menu, // Hamburger
  X, // Close
} from "lucide-react";
import "./Sidebar.css";

export default function Sidebar({ isOpen, toggle }) {
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
      {/* 📱 MOBILE TOGGLE BUTTON */}
      <button onClick={toggleMobile} className="mobile-toggle-btn">
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* 🌑 MOBILE OVERLAY */}
      {isMobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 🧊 SIDEBAR */}
      <aside
        className={`sidebar-container ${isMobileOpen ? "mobile-open" : ""}`}
        style={{
          width: isOpen ? "240px" : "70px",
        }}
      >
        {/* HEADER */}
        <div
          className={`sidebar-header ${!isOpen ? "collapsed" : ""}`}
          style={{ marginTop: isMobileOpen ? "40px" : "0" }}
        >
          {isOpen && (
            <div className="brand-zone">
              {/* ✅ LOGO WITH "APP ICON" STYLING */}
              <img
                src="/company-logo.png"
                alt="Cosmotech Logo"
                className="brand-logo"
                onError={(e) => (e.target.style.display = "none")}
              />
              <h2 className="brand-text">COSMOTECH</h2>
            </div>
          )}

          {/* Desktop Toggle Button */}
          <button onClick={toggle} className="desktop-toggle">
            {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {/* NAV */}
        <nav style={{ marginTop: "10px", flex: 1 }}>
          <SidebarLink
            to="/admin/dashboard"
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            isOpen={isOpen}
            active={isActive("/admin/dashboard")}
            onClick={() => setIsMobileOpen(false)}
          />
          <SidebarLink
            to="/admin/companies"
            icon={<Building2 size={20} />}
            label="Company Master"
            isOpen={isOpen}
            active={isActive("/admin/companies")}
            onClick={() => setIsMobileOpen(false)}
          />
          <SidebarLink
            to="/admin/users"
            icon={<Users size={20} />}
            label="User Management"
            isOpen={isOpen}
            active={isActive("/admin/users")}
            onClick={() => setIsMobileOpen(false)}
          />
          <SidebarLink
            to="/admin/quotations"
            icon={<FileText size={20} />}
            label="All Quotations"
            isOpen={isOpen}
            active={isActive("/admin/quotations")}
            onClick={() => setIsMobileOpen(false)}
          />
        </nav>

        {/* LOGOUT */}
        <div style={{ padding: "20px" }}>
          <button
            onClick={logout}
            className={`logout-btn ${isOpen ? "open" : "closed"}`}
          >
            <LogOut size={20} />
            {isOpen && <span style={{ marginLeft: "12px" }}>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

// Reusable Link Component
function SidebarLink({ to, icon, label, isOpen, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`sidebar-link ${active ? "active" : ""}`}
      style={{
        justifyContent: isOpen ? "flex-start" : "center",
      }}
    >
      <div style={{ minWidth: "20px" }}>{icon}</div>

      <span
        className="sidebar-label"
        style={{
          marginLeft: "12px",
          opacity: isOpen ? 1 : 0,
          display: isOpen ? "inline-block" : "none",
          transition: "opacity 0.2s",
        }}
      >
        {label}
      </span>
    </Link>
  );
}
