import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import styles from "./AdminLogin.module.css";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Authenticate with Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      const userId = data.user.id;

      // 2. Fetch role from profiles table
      // Using maybeSingle() to avoid 406 errors if the profile row doesn't exist yet
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      // 3. Logic: Redirect based on role
      if (profile?.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else {
        // If they are a USER (or if profile is null/missing), send to user dashboard.
        // Your useAuthInit hook will handle creating the profile row if it's missing.
        navigate("/user/dashboard");
      }

    } catch (err) {
      // If the login failed (e.g. wrong password), sign out and show error
      await supabase.auth.signOut();
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        
        {/* Header */}
        <div className={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
            <div style={{ padding: '10px', background: '#fff7ed', borderRadius: '50%', color: '#F59E0B' }}>
               <ShieldCheck size={32} />
            </div>
          </div>
          <h2 className={styles.title}>Portal Login</h2>
          <p className={styles.subtitle}>Sign in to access your dashboard</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <div className={styles.inputWrapper}>
              <Mail size={18} className={styles.icon} />
              <input
                type="email"
                placeholder="user@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.icon} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={styles.input}
              />
            </div>
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="spin-anim" style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                Verifying...
              </>
            ) : (
              "Login Securely"
            )}
          </button>

        </form>

        {/* Error Display */}
        {error && (
          <div className={styles.error}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Inline style for spinner */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}