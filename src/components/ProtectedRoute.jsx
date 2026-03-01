import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient"; // adjust path if needed

export default function ProtectedRoute({ children, allowedRoles }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasRole, setHasRole] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      // 1. Check if user is logged into Supabase
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAuthenticated(false);
        setLoading(false);
        return; // Kick them out
      }

      setIsAuthenticated(true);

      // 2. Check if this route requires a specific role (like "ADMIN")
      if (allowedRoles && allowedRoles.length > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile && allowedRoles.includes(profile.role)) {
          setHasRole(true);
        } else {
          setHasRole(false);
        }
      } else {
        // If no specific roles are required, just let them in
        setHasRole(true);
      }

      setLoading(false);
    }

    checkAuth();
  }, [allowedRoles]);

  if (loading) {
    // ✅ Returns absolutely nothing, keeping the transition silent and instant
    return null;
  }

  // If not logged in, send to login page (change "/" to your login route if different)
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If logged in, but wrong role (e.g., User trying to access Admin page)
  if (!hasRole) {
    alert("Access Denied: You do not have permission to view this page.");
    return <Navigate to="/user/dashboard" replace />; // Send normal users to their dashboard
  }

  // If they pass all checks, let them in!
  return children;
}
