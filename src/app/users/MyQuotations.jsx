import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  Plus,
  FileText,
  Search,
  Eye,
  History,
  Edit,
  FilePlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import styles from "../admin/AllQuotations.module.css";

const ITEMS_PER_PAGE = 20;

export default function MyQuotations() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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

  // ✅ Reset to page 1 when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // ✅ Pagination Logic
  const totalPages = Math.ceil(filteredQuotes.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentQuotes = filteredQuotes.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const getStatusColor = (status) => {
    if (status === "APPROVED") return "#10B981";
    if (status === "REJECTED") return "#EF4444";
    return "#F59E0B";
  };

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
        <>
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
                {currentQuotes.length > 0 ? (
                  currentQuotes.map((q) => (
                    <tr
                      key={q.id}
                      className={styles.tr}
                      onClick={() => navigate(`/user/quotations/${q.id}`)}
                      // Dim old history items slightly
                      style={{
                        cursor: "pointer",
                        opacity: q.is_latest ? 1 : 0.6,
                      }}
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
                            <FileText size={16} color="#475569" />
                          ) : (
                            <History size={16} color="#94a3b8" />
                          )}

                          <span style={{ fontWeight: 600, color: "#0f172a" }}>
                            {q.quotation_number}
                          </span>

                          {/* Revision Badge */}
                          {q.revision_no > 0 && (
                            <span
                              style={{
                                fontSize: "10px",
                                backgroundColor: "#f1f5f9",
                                padding: "3px 6px",
                                borderRadius: "4px",
                                color: "#475569",
                                fontWeight: "700",
                                border: "1px solid #e2e8f0",
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
                                backgroundColor: "#fffbeb",
                                color: "#d97706",
                                padding: "3px 6px",
                                borderRadius: "4px",
                                border: "1px solid #fde68a",
                                fontWeight: "700",
                                letterSpacing: "0.5px",
                              }}
                            >
                              HISTORY
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={styles.td} style={{ color: "#64748b" }}>
                        {new Date(q.quotation_date).toLocaleDateString("en-IN")}
                      </td>
                      <td className={styles.td}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "700",
                            backgroundColor: `${getStatusColor(q.status)}15`,
                            color: getStatusColor(q.status),
                          }}
                        >
                          {q.status || "DRAFT"}
                        </span>
                      </td>
                      <td
                        className={styles.td}
                        style={{ fontWeight: 700, color: "#0f172a" }}
                      >
                        ₹ {Number(q.total_amount).toLocaleString("en-IN")}
                      </td>
                      <td className={styles.td}>
                        <div
                          className={styles.actionsCell}
                          style={{ justifyContent: "flex-end" }}
                        >
                          {/* 1. VIEW BUTTON */}
                          <button
                            title="View Quotation"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/user/quotations/${q.id}`);
                            }}
                            className={styles.actionBtn}
                          >
                            <Eye size={16} color="#6B7280" />
                          </button>

                          {/* ✅ 2. NORMAL EDIT (Pencil - Updates same record) */}
                          {q.is_latest && (
                            <button
                              className={styles.actionBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/user/quotations/edit/${q.id}`);
                              }}
                              title="Edit Quotation"
                            >
                              <Edit size={16} color="#3b82f6" />
                            </button>
                          )}

                          {/* ✅ 3. CREATE REVISION (FilePlus - Creates new record, only if rev < 1) */}
                          {q.is_latest && q.revision_no < 1 && (
                            <button
                              className={styles.actionBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/user/quotations/revise/${q.id}`);
                              }}
                              title="Create New Revision"
                            >
                              <FilePlus size={16} color="#8b5cf6" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">
                      <div className={styles.emptyState}>
                        No quotations found.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ✅ PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className={styles.paginationContainer}>
              <button
                className={styles.pageButton}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} /> Previous
              </button>

              <span className={styles.pageText}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                className={styles.pageButton}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
