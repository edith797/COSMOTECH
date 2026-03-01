import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function redirect() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      // If profile is missing (race condition), we can't redirect yet. 
      // useAuthInit will create it, and the next render/event might catch it.
      if (!profile) return;

      if (profile.role === "ADMIN" && !location.pathname.startsWith("/admin")) {
        navigate("/admin/dashboard", { replace: true });
      }

      if (profile.role === "USER" && !location.pathname.startsWith("/user")) {
        navigate("/user/dashboard", { replace: true });
      }
    }

    // Run on mount
    redirect();

    // Run whenever auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Give useAuthInit a tiny moment to create the profile first
        setTimeout(redirect, 500); 
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return null;
}