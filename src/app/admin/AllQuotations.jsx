import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  Plus,
  FileText,
  Search,
  Building2,
  Trash2,
  Edit,
  User,
  Loader2,
  History, // ✅ Icon for old versions
} from "lucide-react";
import styles from "./AllQuotations.module.css";

export default function AllQuotations() {
  const [quotes, setQuotes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeLookup, setEmployeeLookup] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [filterUser, setFilterUser] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);

        const { data: empData } = await supabase
          .from("employees")
          .select("user_id, full_name")
          .not("user_id", "is", null);

        const lookup = {};
        const empList = empData || [];
        empList.forEach((e) => {
          if (e.user_id) lookup[e.user_id] = e.full_name;
        });
        setEmployees(empList);
        setEmployeeLookup(lookup);

        const { data, error } = await supabase
          .from("quotations")
          .select(
            `
            id,
            quotation_number,
            quotation_date,
            total_amount,
            status,
            created_by,
            revision_no,
            is_latest,
            companies ( company_name )
          `,
          )
          // ✅ SHOWS EVERYTHING (History + Latest)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setQuotes(data || []);
      } catch (error) {
        console.error("Error loading data:", error.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!window.confirm("Delete this quotation?")) return;
    const { error } = await supabase.from("quotations").delete().eq("id", id);
    if (!error) setQuotes(quotes.filter((q) => q.id !== id));
  }

  async function handleStatusChange(e, id, newStatus) {
    e.stopPropagation();
    setUpdating(id);
    const { error } = await supabase
      .from("quotations")
      .update({ status: newStatus })
      .eq("id", id);
    if (!error) {
      setQuotes(
        quotes.map((q) => (q.id === id ? { ...q, status: newStatus } : q)),
      );
    }
    setUpdating(null);
  }

  const uniqueCompanies = useMemo(() => {
    const names = quotes.map((q) => q.companies?.company_name).filter(Boolean);
    return [...new Set(names)].sort();
  }, [quotes]);

  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch = q.quotation_number
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCompany = selectedCompany
      ? q.companies?.company_name === selectedCompany
      : true;
    const matchesUser = filterUser ? q.created_by === filterUser : true;

    return matchesSearch && matchesCompany && matchesUser;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "APPROVED":
        return "#10B981"; // Emerald
      case "REJECTED":
        return "#EF4444"; // Red
      default:
        return "#F59E0B"; // Amber
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>All Quotations</h1>
          <p className={styles.subtitle}>
            View and manage all sales quotations (History included)
          </p>
        </div>
      </div>

      <div className={styles.actionsBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search Quote..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterWrapper}>
          <Building2 size={16} className={styles.filterIcon} />
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Companies</option>
            {uniqueCompanies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterWrapper}>
          <User size={16} className={styles.filterIcon} />
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Employees</option>
            {employees.map((e) => (
              <option key={e.user_id} value={e.user_id}>
                {e.full_name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => navigate("/admin/quotations/new")}
          className={styles.createButton}
        >
          <Plus size={18} style={{ marginRight: "8px" }} /> Create New
        </button>
      </div>

      {loading ? (
        <div className={styles.emptyState}>
          <Loader2
            className="spin-anim"
            size={32}
            color="#f59e0b"
            style={{ margin: "0 auto 10px auto", display: "block" }}
          />
          <p>Loading Quotations...</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Quote No</th>
                <th className={styles.th}>Created By</th>
                <th className={styles.th}>Company</th>
                <th className={styles.th}>Date</th>
                <th className={styles.th}>Total</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th} style={{ textAlign: "right" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.length > 0 ? (
                filteredQuotes.map((q) => (
                  <tr
                    key={q.id}
                    className={styles.tr}
                    onClick={() => navigate(`/admin/quotations/${q.id}`)}
                    style={{ opacity: q.is_latest ? 1 : 0.65 }}
                  >
                    <td className={styles.td}>
                      <div className={styles.cellContent}>
                        {q.is_latest ? (
                          <FileText
                            size={16}
                            color="#475569"
                          /> /* Premium Slate instead of Blue */
                        ) : (
                          <History size={16} color="#94a3b8" />
                        )}

                        <span
                          style={{
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "#0f172a",
                          }}
                        >
                          {q.quotation_number}

                          {/* ✅ Revision Badge */}
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

                          {/* ✅ "OLD" Label for non-latest */}
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
                        </span>
                      </div>
                    </td>

                    <td className={styles.td}>
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#475569",
                          fontWeight: "500",
                        }}
                      >
                        {employeeLookup[q.created_by] || "Admin/System"}
                      </span>
                    </td>

                    <td
                      className={styles.td}
                      style={{ color: "#334155", fontWeight: "500" }}
                    >
                      {q.companies?.company_name || "Unknown"}
                    </td>
                    <td className={styles.td} style={{ color: "#64748b" }}>
                      {new Date(q.quotation_date).toLocaleDateString("en-IN")}
                    </td>
                    <td
                      className={styles.td}
                      style={{ fontWeight: 700, color: "#0f172a" }}
                    >
                      ₹ {Number(q.total_amount).toLocaleString("en-IN")}
                    </td>

                    <td
                      className={styles.td}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {updating === q.id ? (
                        <Loader2
                          className="spin-anim"
                          size={16}
                          color="#64748b"
                        />
                      ) : (
                        <select
                          value={q.status || "DRAFT"}
                          onChange={(e) =>
                            handleStatusChange(e, q.id, e.target.value)
                          }
                          disabled={!q.is_latest}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "20px",
                            border: q.is_latest
                              ? `1px solid ${getStatusColor(q.status)}40`
                              : "1px solid #e2e8f0",
                            fontSize: "11px",
                            fontWeight: "700",
                            letterSpacing: "0.5px",
                            color: q.is_latest
                              ? getStatusColor(q.status)
                              : "#94a3b8",
                            backgroundColor: q.is_latest
                              ? `${getStatusColor(q.status)}15`
                              : "#f8fafc",
                            cursor: q.is_latest ? "pointer" : "not-allowed",
                            outline: "none",
                            appearance: "none",
                            textAlign: "center",
                          }}
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="APPROVED">APPROVED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      )}
                    </td>

                    <td className={styles.td}>
                      <div
                        className={styles.actionsCell}
                        style={{ justifyContent: "flex-end" }}
                      >
                        {/* Only show EDIT button if it is the LATEST version */}
                        {q.is_latest && (
                          <button
                            className={styles.actionBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/quotations/edit/${q.id}`);
                            }}
                            title="Create New Revision"
                          >
                            <Edit size={16} color="#475569" />
                          </button>
                        )}

                        <button
                          className={styles.actionBtn}
                          onClick={(e) => handleDelete(e, q.id)}
                          title="Delete Quotation"
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
                    <div className={styles.emptyState}>
                      No quotations found matching your search.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
