import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  User,
  Mail,
  Briefcase,
  Plus,
  Loader2,
  Search,
  Phone,
} from "lucide-react"; // ✅ Added Phone icon
import styles from "./UserManagement.module.css";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [contactNumber, setContactNumber] = useState(""); // ✅ Added Contact state

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from("employees")
        // ✅ Added contact_number to the fetch list
        .select(
          "id, email, full_name, designation, contact_number, user_id, is_active",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function createEmployee() {
    if (!email || !fullName) {
      alert("Email & name required");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("employees").insert({
        email,
        full_name: fullName,
        designation,
        contact_number: contactNumber, // ✅ Sending contact number to DB
        is_active: true,
      });

      if (error) throw error;

      // Clear the form
      setEmail("");
      setFullName("");
      setDesignation("");
      setContactNumber(""); // ✅ Clear contact field
      fetchUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Employee Management</h1>
          <p className={styles.subtitle}>
            Manage system access and employee details
          </p>
        </div>
      </div>

      {/* --- ADD EMPLOYEE FORM --- */}
      <div className={styles.formCard}>
        <h3 className={styles.cardTitle}>Add New Employee</h3>

        <div className={styles.formGrid}>
          {/* Full Name */}
          <div className={styles.inputWrapper}>
            <User className={styles.icon} size={18} />
            <input
              className={styles.input}
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          {/* Email */}
          <div className={styles.inputWrapper}>
            <Mail className={styles.icon} size={18} />
            <input
              className={styles.input}
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Designation */}
          <div className={styles.inputWrapper}>
            <Briefcase className={styles.icon} size={18} />
            <input
              className={styles.input}
              placeholder="Designation (e.g. Sales Manager)"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
          </div>

          {/* ✅ Contact Number */}
          <div className={styles.inputWrapper}>
            <Phone className={styles.icon} size={18} />
            <input
              className={styles.input}
              placeholder="Contact Number (e.g. +91 9876543210)"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <button
            className={styles.addButton}
            onClick={createEmployee}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="spin-anim" size={18} />
            ) : (
              <Plus size={18} />
            )}
            {loading ? "Saving..." : "Add"}
          </button>
        </div>
      </div>

      {/* --- EMPLOYEES LIST --- */}
      <div className={styles.tableCard}>
        {fetching ? (
          <p className={styles.loadingText}>Loading employees...</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Contact</th> {/* ✅ New Header */}
                  <th>Designation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className={styles.nameCell}>
                      <div className={styles.avatar}>
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                      {u.full_name}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      {/* ✅ Display Contact Number */}
                      {u.contact_number || (
                        <span className={styles.muted}>-</span>
                      )}
                    </td>
                    <td>
                      {u.designation || <span className={styles.muted}>-</span>}
                    </td>
                    <td>
                      <span
                        className={
                          u.is_active ? styles.badgeActive : styles.badgePending
                        }
                      >
                        {u.is_active ? "Active" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" className={styles.emptyState}>
                      No employees found. Add one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
