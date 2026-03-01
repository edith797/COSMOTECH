import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import "./AdminLayout.css"; // ✅ Import the CSS file

export default function AdminLayout() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="admin-layout">
      {/* Sidebar Wrapper 
          - Desktop: Takes up 240px or 70px
          - Mobile: Takes up 0px (Handled by CSS)
      */}
      <div className={`sidebar-wrapper ${isOpen ? "open" : "closed"}`}>
        <Sidebar isOpen={isOpen} toggle={() => setIsOpen(!isOpen)} />
      </div>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
