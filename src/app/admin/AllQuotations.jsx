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
  History,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FilePlus, // ✅ Added FilePlus for Revise
} from "lucide-react";
import styles from "./AllQuotations.module.css";

const ITEMS_PER_PAGE = 20;

export default function AllQuotations() {
  const [quotes, setQuotes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeLookup, setEmployeeLookup] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [filterUserName, setFilterUserName] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

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

  const getFinancialYear = (dateStr) => {
    if (!dateStr) return "Unknown";
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth();
    const startYear = month < 3 ? year - 1 : year;
    return `FY ${startYear}-${String(startYear + 1).slice(-2)}`;
  };

  const uniqueCompanies = useMemo(() => {
    const names = quotes.map((q) => q.companies?.company_name).filter(Boolean);
    return [...new Set(names)].sort();
  }, [quotes]);

  const uniqueYears = useMemo(() => {
    const years = quotes.map((q) => getFinancialYear(q.quotation_date));
    return [...new Set(years)].sort().reverse();
  }, [quotes]);

  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch = q.quotation_number
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesCompany = selectedCompany
      ? q.companies?.company_name
          ?.toLowerCase()
          .includes(selectedCompany.toLowerCase())
      : true;

    const empName = employeeLookup[q.created_by] || "Admin/System";
    const matchesUser = filterUserName
      ? empName.toLowerCase().includes(filterUserName.toLowerCase())
      : true;

    const matchesYear = filterYear
      ? getFinancialYear(q.quotation_date) === filterYear
      : true;

    return matchesSearch && matchesCompany && matchesUser && matchesYear;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCompany, filterUserName, filterYear]);

  const totalPages = Math.ceil(filteredQuotes.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentQuotes = filteredQuotes.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "APPROVED":
        return "#10B981";
      case "REJECTED":
        return "#EF4444";
      default:
        return "#F59E0B";
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
          <Calendar size={16} className={styles.filterIcon} />
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Years</option>
            {uniqueYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterWrapper}>
          <Building2 size={16} className={styles.filterIcon} />
          <input
            type="text"
            list="company-list"
            placeholder="Type Company..."
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className={styles.filterInput}
          />
          <datalist id="company-list">
            {uniqueCompanies.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className={styles.filterWrapper}>
          <User size={16} className={styles.filterIcon} />
          <input
            type="text"
            list="employee-list"
            placeholder="Type Employee..."
            value={filterUserName}
            onChange={(e) => setFilterUserName(e.target.value)}
            className={styles.filterInput}
          />
          <datalist id="employee-list">
            {employees.map((e) => (
              <option key={e.user_id} value={e.full_name} />
            ))}
            <option value="Admin/System" />
          </datalist>
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
        <>
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
                {currentQuotes.length > 0 ? (
                  currentQuotes.map((q) => (
                    <tr
                      key={q.id}
                      className={styles.tr}
                      onClick={() => navigate(`/admin/quotations/${q.id}`)}
                      style={{ opacity: q.is_latest ? 1 : 0.65 }}
                    >
                      <td className={styles.td}>
                        <div className={styles.cellContent}>
                          {q.is_latest ? (
                            <FileText size={16} color="#475569" />
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
                          {/* ✅ 1. NORMAL EDIT (Pencil - Updates same record) */}
                          {q.is_latest && (
                            <button
                              className={styles.actionBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/quotations/edit/${q.id}`);
                              }}
                              title="Edit Quotation"
                            >
                              <Edit size={16} color="#3b82f6" />
                            </button>
                          )}

                          {/* ✅ 2. CREATE REVISION (FilePlus - Creates new record, only if rev < 1) */}
                          {q.is_latest && q.revision_no < 1 && (
                            <button
                              className={styles.actionBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/quotations/revise/${q.id}`);
                              }}
                              title="Create New Revision"
                            >
                              <FilePlus size={16} color="#8b5cf6" />
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
