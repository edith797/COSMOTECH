import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { Plus, FileText, Search, Eye, History } from "lucide-react";
import styles from "../admin/AllQuotations.module.css";

export default function MyQuotations() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchQuotations() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // ✅ FETCH EVERYTHING (No 'is_latest' filter)
        const { data, error } = await supabase
          .from("quotations")
          .select(
            "id, quotation_number, quotation_date, total_amount, status, is_latest, revision_no",
          )
          .eq("created_by", user.id) // Only your quotes
          .order("created_at", { ascending: false }); // Newest first

        if (error) throw error;
        setQuotes(data || []);
      } catch (error) {
        console.error("Error:", error.message);
      } finally {
        setLoading(false);
      }
    }
    fetchQuotations();
  }, []);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) =>
      q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [quotes, searchTerm]);

  const getStatusColor = (status) => {
    if (status === "APPROVED") return "#10B981";
    if (status === "REJECTED") return "#EF4444";
    return "#F59E0B";
  };

  // ✅ handleDelete function removed - Users cannot delete quotes anymore!

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Quotations</h1>
        </div>
      </div>

      <div className={styles.actionsBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <button
          onClick={() => navigate("/user/quotations/new")}
          className={styles.createButton}
        >
          <Plus size={18} style={{ marginRight: "8px" }} /> Create New
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Quote No</th>
                <th className={styles.th}>Date</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Total</th>
                <th className={styles.th} style={{ textAlign: "right" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((q) => (
                <tr
                  key={q.id}
                  className={styles.tr}
                  onClick={() => navigate(`/user/quotations/${q.id}`)}
                  // Dim old history items slightly
                  style={{ cursor: "pointer", opacity: q.is_latest ? 1 : 0.6 }}
                >
                  <td className={styles.td}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {/* Icon changes based on if it's latest or history */}
                      {q.is_latest ? (
                        <FileText size={16} color="#3B82F6" />
                      ) : (
                        <History size={16} color="#6B7280" />
                      )}

                      <b>{q.quotation_number}</b>

                      {/* Revision Badge */}
                      {q.revision_no > 0 && (
                        <span
                          style={{
                            fontSize: "10px",
                            background: "#eee",
                            padding: "2px 4px",
                            borderRadius: "4px",
                          }}
                        >
                          Rev-{q.revision_no}
                        </span>
                      )}

                      {/* History Badge */}
                      {!q.is_latest && (
                        <span
                          style={{
                            fontSize: "9px",
                            border: "1px solid #FCD34D",
                            color: "#B45309",
                            backgroundColor: "#FEF3C7",
                            padding: "1px 4px",
                            borderRadius: "3px",
                          }}
                        >
                          HISTORY
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={styles.td}>
                    {new Date(q.quotation_date).toLocaleDateString("en-IN")}
                  </td>
                  <td className={styles.td}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        backgroundColor: `${getStatusColor(q.status)}20`,
                        color: getStatusColor(q.status),
                      }}
                    >
                      {q.status || "DRAFT"}
                    </span>
                  </td>
                  <td className={styles.td}>
                    ₹ {Number(q.total_amount).toLocaleString("en-IN")}
                  </td>
                  <td className={styles.td} style={{ textAlign: "right" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        justifyContent: "flex-end",
                      }}
                    >
                      {/* View Button */}
                      <button
                        title="View Quotation"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/user/quotations/${q.id}`);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <Eye size={18} color="#6B7280" />
                      </button>

                      {/* ✅ Trash icon successfully removed */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
