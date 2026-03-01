import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { TrendingUp, FileText, CheckCircle } from "lucide-react";
import styles from "./AdminDashboard.module.css";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalQuotes: 0,
    approved: 0,
    pending: 0,
  });
  const [recentQuotes, setRecentQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // ========================================================
  // 🚀 SILENT PRE-FETCHER: Loads 41k items invisibly on login
  // ========================================================
  useEffect(() => {
    async function prefetchItems() {
      try {
        const existingCache = localStorage.getItem("erp_master_items");
        if (existingCache) {
          console.log("✅ Items already in cache, skipping prefetch.");
          return;
        }

        console.log("⏳ Secretly downloading items in background...");
        const { count } = await supabase
          .from("items")
          .select("*", { count: "exact", head: true });

        if (!count) return;

        let allItems = [];
        const stepSize = 10000;
        const fetchPromises = [];

        for (let fromRow = 0; fromRow < count; fromRow += stepSize) {
          fetchPromises.push(
            supabase
              .from("items")
              .select("id, item_name, rate, item_code")
              .range(fromRow, fromRow + stepSize - 1),
          );
        }

        const results = await Promise.all(fetchPromises);
        results.forEach((res) => {
          if (res.data) allItems.push(...res.data);
        });

        const cleanedItems = [];
        for (let i = 0; i < allItems.length; i++) {
          const item = allItems[i];
          cleanedItems.push({
            ...item,
            item_code: item.item_code
              ? String(item.item_code)
                  .replace(/[\r\n\t]+/g, "")
                  .trim()
              : "",
            item_name: item.item_name
              ? String(item.item_name)
                  .replace(/[\r\n\t]+/g, "")
                  .trim()
              : "",
            rate: Number(item.rate) || 0,
          });
        }

        localStorage.setItem("erp_master_items", JSON.stringify(cleanedItems));
        console.log("🚀 BOOM! Items secretly cached and ready!");
      } catch (e) {
        console.warn("Silent prefetch failed: ", e);
      }
    }

    // Give the dashboard 1 second to render before starting the heavy download
    const timer = setTimeout(() => {
      prefetchItems();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // ========================================================
  // 📊 DASHBOARD STATS LOADER
  // ========================================================
  useEffect(() => {
    async function loadStats() {
      try {
        const { data: quotes, error } = await supabase.from("quotations")
          .select(`
            id, 
            total_amount, 
            status, 
            created_at, 
            company_id,
            companies ( company_name ), 
            employees ( full_name )
          `);

        if (error) throw error;

        if (quotes) {
          const totalRevenue = quotes.reduce(
            (sum, q) =>
              sum + (q.status === "APPROVED" ? Number(q.total_amount) : 0),
            0,
          );
          const totalQuotes = quotes.length;
          const approved = quotes.filter((q) => q.status === "APPROVED").length;
          const pending = quotes.filter(
            (q) => q.status === "DRAFT" || !q.status,
          ).length;

          setStats({ totalRevenue, totalQuotes, approved, pending });

          const recent = quotes
            .map((q) => ({
              id: q.id,
              companyName: q.companies?.company_name || "Unknown Company",
              createdBy: q.employees?.full_name || "Admin/System",
              amount: Number(q.total_amount) || 0,
              status: q.status || "DRAFT",
              createdAt: q.created_at,
            }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

          setRecentQuotes(recent);
        }
      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) return <div style={{ padding: "20px" }}>Loading stats...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Total Revenue (Approved)</span>
            <TrendingUp size={18} color="#475569" />
          </div>
          <div className={styles.bigNumber}>
            ₹ {stats.totalRevenue.toLocaleString("en-IN")}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Total Quotations</span>
            <FileText size={18} color="#475569" />
          </div>
          <div className={styles.bigNumber}>{stats.totalQuotes}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Approved</span>
            <CheckCircle size={18} color="#475569" />
          </div>
          <div className={styles.bigNumber}>{stats.approved}</div>
        </div>
      </div>

      {/* Recent Quotations Table */}
      <div className={styles.recentSection}>
        <h3>Recent Quotations</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Created By</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentQuotes.length > 0 ? (
              recentQuotes.map((q) => (
                <tr key={q.id}>
                  <td>
                    <b style={{ color: "#0f172a" }}>{q.companyName}</b>
                  </td>
                  <td>{q.createdBy}</td>
                  <td style={{ fontWeight: 700, color: "#0f172a" }}>
                    ₹ {q.amount.toLocaleString("en-IN")}
                  </td>
                  <td>
                    <span
                      style={{
                        background:
                          q.status === "APPROVED" ? "#0f172a" : "#f1f5f9",
                        color: q.status === "APPROVED" ? "#ffffff" : "#475569",
                        border:
                          q.status === "APPROVED"
                            ? "none"
                            : "1px solid #cbd5e1",
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: "600",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {q.status}
                    </span>
                  </td>
                  <td style={{ color: "#64748b" }}>
                    {new Date(q.createdAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="5"
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#64748b",
                  }}
                >
                  No quotations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
