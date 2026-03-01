import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function useAuthInit() {
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1️⃣ Get employee by email
      const { data: employee } = await supabase
        .from("employees")
        .select("id, full_name, user_id") // Fetch only what you need
        .eq("email", user.email)
        .maybeSingle();

      // 2️⃣ Ensure profile exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        await supabase.from("profiles").insert({
          id: user.id,
          role: "USER", // Or "ADMIN" if you want to check employee role here
          full_name: employee?.full_name || null,
        });
      }

      // 3️⃣ Link employee → auth user
      // Only update if employee exists AND isn't already linked
      if (employee && !employee.user_id) {
        const { error: linkError } = await supabase
          .from("employees")
          .update({ user_id: user.id })
          .eq("id", employee.id);
          
        if (linkError) console.error("Error linking employee:", linkError);
      }
    }

    // Run on mount
    init();

    // 🛑 CRITICAL ADDITION: Run when user logs in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        init();
      }
    });

    return () => subscription.unsubscribe();
  }, []);
}