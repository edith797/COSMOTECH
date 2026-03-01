import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, AlertOctagon, Settings, ArrowRight } from "lucide-react";
import styles from "./AdminLogin.module.css";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  // Triggers the "system boot" mechanical sequence
  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) throw signInError;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else {
        navigate("/user/dashboard");
      }
    } catch (err) {
      await supabase.auth.signOut();
      setError(err.message || "Access denied. Check credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.millingPattern}></div>

      {/* The card seats heavily into place like a metal part in a vise */}
      <div className={`${styles.card} ${mounted ? styles.cardVisible : ""}`}>
        <div className={styles.header}>
          <div className={styles.logoWrapper}>
            <img
              src="/company-logo.png"
              alt="Cosmotech Logo"
              className={styles.logo}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
          <h1 className={styles.companyName}>COSMOTECH</h1>
          <div className={styles.divider}></div>
          <p className={styles.subtitle}>PRECISION TOOLING PORTAL</p>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          {/* Staggered mechanical drop-in */}
          <div className={styles.formGroup} style={{ animationDelay: "0.15s" }}>
            <label className={styles.label}>Authorized Email</label>
            <div className={styles.inputWrapper}>
              <Mail size={18} className={styles.icon} />
              <input
                type="email"
                placeholder="user@cosmotech.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.input}
              />
              {/* CNC Toolpath Animation Element */}
              <span className={styles.toolpath}></span>
            </div>
          </div>

          <div className={styles.formGroup} style={{ animationDelay: "0.3s" }}>
            <label className={styles.label}>Security Key</label>
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
              {/* CNC Toolpath Animation Element */}
              <span className={styles.toolpath}></span>
            </div>
          </div>

          <div
            className={styles.formGroup}
            style={{ animationDelay: "0.45s", marginTop: "32px" }}
          >
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? (
                <>
                  <Settings size={18} className={styles.spindleSpin} />
                  ...
                </>
              ) : (
                <>
                  LOGIN
                  <ArrowRight size={18} className={styles.btnIcon} />
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className={styles.error}>
            <AlertOctagon size={18} className={styles.errorPulse} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
