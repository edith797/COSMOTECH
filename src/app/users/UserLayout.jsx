import UserSidebar from "../../components/UserSidebar";
import { Outlet } from "react-router-dom";

export default function UserLayout() {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar stays fixed */}
      <UserSidebar />

      {/* ✅ FIX: Add overflowY: "auto" so only this part scrolls */}
      <main 
        style={{ 
          flex: 1, 
          padding: "24px", 
          background: "#f9fafb", 
          overflowY: "auto", // Enables vertical scrolling for content
          height: "100%"     // Ensures it fills the container
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}