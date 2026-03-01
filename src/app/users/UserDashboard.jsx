import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { TrendingUp, FileText, CheckCircle, Clock } from "lucide-react";
import styles from "./UserDashboard.module.css";

export default function UserDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalQuotes: 0,
    approved: 0,
    pending: 0,
  });
  const [recentQuotes, setRecentQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("User");

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
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: employee } = await supabase
          .from("employees")
          .select("full_name")
          .eq("user_id", user.id)
          .single();

        if (employee) {
          setUserName(employee.full_name);
        }

        const { data, error } = await supabase
          .from("quotations")
          .select(
            "id, total_amount, status, quotation_number, companies(company_name), created_at",
          )
          .eq("created_by", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const totalRevenue = data.reduce(
          (sum, q) =>
            sum + (q.status === "APPROVED" ? Number(q.total_amount) : 0),
          0,
        );
        const totalQuotes = data.length;
        const approved = data.filter((q) => q.status === "APPROVED").length;
        const pending = data.filter(
          (q) => q.status === "DRAFT" || !q.status,
        ).length;

        setStats({ totalRevenue, totalQuotes, approved, pending });
        setRecentQuotes(data.slice(0, 5));
      } catch (error) {
        console.error("Error loading user dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading)
    return <div style={{ padding: "40px" }}>Loading Dashboard...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        Welcome, <span style={{ color: "#2563eb" }}>{userName}</span> 👋
      </h1>

      {/* STAT CARDS */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>My Revenue (Approved)</span>
            <TrendingUp color="#10B981" size={20} />
          </div>
          <div className={styles.bigNumber}>
            ₹ {stats.totalRevenue.toLocaleString("en-IN")}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>My Quotations</span>
            <FileText color="#3B82F6" size={20} />
          </div>
          <div className={styles.bigNumber}>{stats.totalQuotes}</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Approved</span>
            <CheckCircle color="#10B981" size={20} />
          </div>
          <div className={styles.bigNumber}>{stats.approved}</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Pending / Draft</span>
            <Clock color="#F59E0B" size={20} />
          </div>
          <div className={styles.bigNumber}>{stats.pending}</div>
        </div>
      </div>

      {/* RECENT ACTIVITY TABLE */}
      <div className={styles.recentSection}>
        <h3>Recent Activity</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Quote No</th>
              <th>Company</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentQuotes.map((q) => (
              <tr key={q.id}>
                <td style={{ fontWeight: 500 }}>{q.quotation_number}</td>
                <td>{q.companies?.company_name || "Unknown"}</td>
                <td>₹ {Number(q.total_amount).toLocaleString("en-IN")}</td>
                <td>
                  <span className={styles[q.status || "DRAFT"]}>
                    {q.status || "DRAFT"}
                  </span>
                </td>
              </tr>
            ))}
            {recentQuotes.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", color: "#999" }}>
                  You haven't created any quotations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
