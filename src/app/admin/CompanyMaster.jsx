import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Plus, X, Building2, MapPin, Search } from "lucide-react";
import styles from "./CompanyMaster.module.css";

export default function CompanyMaster() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("company_name", { ascending: true });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching companies:", error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) =>
      c.company_name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [companies, searchTerm]);

  async function addCompany(e) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("companies")
      .insert([{ company_name: companyName, address, gst_type: "INTRA" }]);

    if (!error) {
      setCompanyName("");
      setAddress("");
      fetchCompanies();
      setIsModalOpen(false);
    } else {
      alert("Error adding company: " + error.message);
    }
    setSaving(false);
  }

  return (
    <div className={styles.container}>
      {/* --- TOP ROW: Title Left | Button Right --- */}
      <div className={styles.topRow}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Company Master</h1>
          <p className={styles.subtitle}>Manage your client database</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className={styles.addButton}
        >
          <Plus size={18} style={{ marginRight: "8px" }} />
          Add Company
        </button>
      </div>

      {/* --- SEARCH ROW --- */}
      <div className={styles.searchRow}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* --- DATA TABLE --- */}
      {loading ? (
        <p>Loading companies...</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <colgroup>
              <col style={{ width: "35%" }} />
              <col style={{ width: "65%" }} />
            </colgroup>
            <thead>
              <tr>
                <th className={styles.th}>Company Name</th>
                <th className={styles.th}>Address</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((c) => (
                <tr key={c.id} className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.cellContent}>
                      <div className={styles.iconCircle}>
                        <Building2 size={18} />
                      </div>
                      <span
                        className={styles.companyNameText}
                        title={c.company_name}
                      >
                        {c.company_name}
                      </span>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.cellContent}>
                      <MapPin
                        size={16}
                        className={styles.textGray}
                        style={{ flexShrink: 0 }}
                      />
                      <span className={styles.addressText} title={c.address}>
                        {c.address}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan="2" className={styles.emptyState}>
                    No companies match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add New Company</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className={styles.closeBtn}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={addCompany} className={styles.modalForm}>
              <label className={styles.label}>Company Name</label>
              <input
                placeholder="Ex. Stark Industries"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className={styles.input}
              />
              <label className={styles.label}>Billing Address</label>
              <textarea
                placeholder="Full address here..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className={`${styles.input} ${styles.textarea}`}
              />
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={styles.saveBtn}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
