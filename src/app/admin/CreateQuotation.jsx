import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { getNextQuotationNumber } from "../../components/quotationUtils";
import {
  Save,
  Loader2,
  Hash,
  Building2,
  User,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";
import styles from "./CreateQuotation.module.css";

const CGST_PERCENT = 9;
const SGST_PERCENT = 9;
const IGST_PERCENT = 18;

// ✅ GLOBAL MEMORY CACHE (Survives when you click around the app)
let globalItemsCache = null;

export default function CreateQuotation() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [userRole, setUserRole] = useState(null);
  const [quoteNo, setQuoteNo] = useState("");
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [attn, setAttn] = useState("");
  const [modeOfEnquiry, setModeOfEnquiry] = useState("");

  const [saving, setSaving] = useState(false);
  const [itemsMaster, setItemsMaster] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [isLoadingItems, setIsLoadingItems] = useState(true);

  const [signatoryId, setSignatoryId] = useState("");

  const [validFor, setValidFor] = useState("ONE MONTH");
  const [deliveryTime, setDeliveryTime] = useState("1-2 WEEKS");
  const [paymentTerms, setPaymentTerms] = useState("15 DAYS");
  const [quotationDate, setQuotationDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState(
    "THANK YOU FOR BEING OUR PRIVILEGED CUSTOMER",
  );

  const [originalCreatorId, setOriginalCreatorId] = useState(null);

  const [items, setItems] = useState([
    {
      description: "",
      item_code: "",
      quantity: null,
      rate: null,
      discount: null,
      amount: 0,
    },
  ]);

  const loadQuotationForEdit = useCallback(
    async (quoteId) => {
      try {
        const { data: quote, error: qError } = await supabase
          .from("quotations")
          .select("*")
          .eq("id", quoteId)
          .single();

        if (qError) throw qError;

        if (!quote.is_latest) {
          alert("This is an old revision and cannot be edited.");
          navigate("/admin/quotations");
          return;
        }

        setQuoteNo(quote.quotation_number);
        setCompanyId(quote.company_id);
        setAttn(quote.attn_person_name || "");
        setSignatoryId(quote.authorised_signatory_id || "");
        setValidFor(quote.valid_for || "");
        setDeliveryTime(quote.delivery_time || "");
        setPaymentTerms(quote.payment_terms || "");
        setModeOfEnquiry(quote.mode_of_enquiry || "");
        setQuotationDate(
          quote.quotation_date || new Date().toISOString().split("T")[0],
        );
        if (quote.notes) setNotes(quote.notes);

        setOriginalCreatorId(quote.created_by);

        const { data: qItems, error: iError } = await supabase
          .from("quotation_items")
          .select("*")
          .eq("quotation_id", quoteId);

        if (iError) throw iError;
        if (qItems) setItems(qItems.map((i) => ({ ...i })));
      } catch (err) {
        console.error(err);
        navigate("/admin/quotations");
      }
    },
    [navigate],
  );

  useEffect(() => {
    // ==========================================
    // 1. FAST LOAD: Get the basic form ready instantly (0.01s)
    // ==========================================
    async function loadInstantData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setUserRole(profile?.role);
      }

      const { data: compData } = await supabase
        .from("companies")
        .select("id, company_name")
        .order("company_name");
      setCompanies(compData || []);

      const { data: empData } = await supabase
        .from("employees")
        .select("id, full_name, user_id")
        .eq("is_active", true)
        .order("full_name");
      setEmployees(empData || []);

      if (!isEditMode && user && empData) {
        const myEmployeeRecord = empData.find((e) => e.user_id === user.id);
        if (myEmployeeRecord) {
          setSignatoryId(myEmployeeRecord.id);
        }
      }

      if (isEditMode) {
        await loadQuotationForEdit(id);
      } else {
        const quotationNo = await getNextQuotationNumber(supabase);
        setQuoteNo(quotationNo);
      }
    }

    // ==========================================
    // 2. HEAVY LOAD: Process 41k items invisibly
    // ==========================================
    async function loadMassiveItemDatabase() {
      setIsLoadingItems(true);

      // Try instant memory first (Fastest - 0.001s)
      if (globalItemsCache) {
        setItemsMaster(globalItemsCache);
        setIsLoadingItems(false);
        return; // Exit early since we have the data!
      }

      // Try local hard drive cache second (Instant - 0.05s)
      try {
        const savedCache = localStorage.getItem("erp_master_items");
        if (savedCache) {
          const parsedCache = JSON.parse(savedCache);
          globalItemsCache = parsedCache;
          setItemsMaster(parsedCache);
          setIsLoadingItems(false); // Screen turns green instantly!
        }
      } catch (e) {
        console.warn("Local cache empty or invalid:", e);
      }

      // Fetch fresh updates from Supabase silently in parallel
      try {
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

        // Optimize array mapping to prevent UI freezing (Standard For-Loop is faster)
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

        // Update cache for next time
        globalItemsCache = cleanedItems;
        setItemsMaster(cleanedItems);
        setIsLoadingItems(false);

        try {
          localStorage.setItem(
            "erp_master_items",
            JSON.stringify(cleanedItems),
          );
        } catch (e) {
          // If browser storage is completely full, just log it
          console.warn("Local storage might be full: ", e);
        }
      } catch (err) {
        console.error("Background fetch failed", err);
      }
    }

    // 🚀 EXECUTION ORDER
    loadInstantData(); // 1. Fire the instant UI load

    // 2. Wait 300ms for the UI to perfectly render, THEN trigger the heavy database lifting
    const deferTimer = setTimeout(() => {
      loadMassiveItemDatabase();
    }, 300);

    return () => clearTimeout(deferTimer); // Cleanup if user leaves page instantly
  }, [id, isEditMode, loadQuotationForEdit]);

  const subTotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [items],
  );
  const taxAmount = useMemo(() => subTotal * 0.18, [subTotal]);
  const grandTotal = useMemo(() => subTotal + taxAmount, [subTotal, taxAmount]);

  function updateItem(index, field, value) {
    const updated = [...items];
    updated[index][field] = value;

    const safeValue = value ? String(value).trim().toLowerCase() : "";

    if (field === "item_code" && safeValue) {
      const matched = itemsMaster.find(
        (m) => m.item_code && m.item_code.toLowerCase() === safeValue,
      );
      if (matched) {
        updated[index].item_code = matched.item_code;
        updated[index].description = matched.item_name;
        updated[index].rate = matched.rate;
      } else {
        const isOldDesc = itemsMaster.some(
          (m) => m.item_name === updated[index].description,
        );
        if (isOldDesc) {
          updated[index].description = "";
          updated[index].rate = "";
        }
      }
    }

    if (field === "description" && safeValue) {
      const matched = itemsMaster.find(
        (m) => m.item_name && m.item_name.toLowerCase() === safeValue,
      );
      if (matched) {
        updated[index].rate = matched.rate;
        if (!updated[index].item_code) {
          updated[index].item_code = matched.item_code;
        }
      }
    }

    const qty = Number(updated[index].quantity) || 0;
    const rate = Number(updated[index].rate) || 0;
    const disc = Number(updated[index].discount) || 0;
    updated[index].amount = qty * rate - (qty * rate * disc) / 100;
    setItems(updated);
  }

  async function saveQuotation() {
    if (!companyId) return alert("Select a company");
    if (!signatoryId) {
      return alert("Please select an Authorised Signatory from the dropdown.");
    }

    if (isEditMode && userRole !== "ADMIN") {
      alert("Permission Denied: Only Admins can create revisions.");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: comp } = await supabase
        .from("companies")
        .select("gst_type")
        .eq("id", companyId)
        .single();

      let cgst = 0,
        sgst = 0,
        igst = 0;
      if (comp?.gst_type === "INTER") {
        igst = subTotal * 0.18;
      } else {
        cgst = subTotal * 0.09;
        sgst = subTotal * 0.09;
      }

      const newItemsToSave = [];
      items.forEach((row) => {
        if (!row.description.trim()) return;
        const exists = itemsMaster.some((m) => {
          if (row.item_code && row.item_code.trim() !== "")
            return m.item_code === row.item_code;
          return m.item_name.toLowerCase() === row.description.toLowerCase();
        });
        if (!exists) {
          newItemsToSave.push({
            item_name: row.description,
            rate: row.rate,
            item_code: row.item_code || null,
          });
        }
      });
      if (newItemsToSave.length > 0)
        await supabase.from("items").insert(newItemsToSave);

      const creatorToSave = isEditMode ? originalCreatorId || user.id : user.id;

      const quoteData = {
        quotation_number: quoteNo,
        quotation_date: quotationDate,
        company_id: companyId,
        attn_person_name: attn,
        authorised_signatory_id: signatoryId,
        created_by: creatorToSave,
        valid_for: validFor,
        delivery_time: deliveryTime,
        payment_terms: paymentTerms,
        mode_of_enquiry: modeOfEnquiry,
        subtotal: subTotal,
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: igst,
        total_amount: subTotal + cgst + sgst + igst,
        notes: notes,
        is_latest: true,
      };

      let finalId = null;

      if (isEditMode) {
        const { data: oldQuote } = await supabase
          .from("quotations")
          .select("revision_no, parent_quotation_id, id, created_by")
          .eq("id", id)
          .single();

        await supabase
          .from("quotations")
          .update({ is_latest: false })
          .eq("id", id);

        const { data: newQuote, error } = await supabase
          .from("quotations")
          .insert([
            {
              ...quoteData,
              revision_no: (oldQuote.revision_no || 0) + 1,
              parent_quotation_id: oldQuote.parent_quotation_id || oldQuote.id,
              created_by: oldQuote.created_by,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        finalId = newQuote.id;
      } else {
        const { data: newQ, error } = await supabase
          .from("quotations")
          .insert([{ ...quoteData, revision_no: 0 }])
          .select()
          .single();

        if (error) throw error;
        finalId = newQ.id;
      }

      const itemRows = items.map((item) => ({
        quotation_id: finalId,
        item_code: item.item_code,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        amount: item.amount,
      }));
      await supabase.from("quotation_items").insert(itemRows);

      navigate(`/admin/quotations/${finalId}`);
    } catch (err) {
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies;
    return companies.filter((c) =>
      c.company_name.toLowerCase().includes(companySearch.toLowerCase()),
    );
  }, [companies, companySearch]);

  function selectCompany(comp) {
    setCompanyId(comp.id);
    setCompanySearch(comp.company_name);
    setShowCompanyDropdown(false);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h1 className={styles.title}>
            {isEditMode ? "Revised Quotation" : "New Quotation"}
          </h1>
          <span
            style={{
              color: isLoadingItems ? "#d97706" : "#059669",
              fontWeight: "600",
              fontSize: "13px",
              marginTop: "4px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {isLoadingItems ? (
              <>
                <Loader2 className="spin-anim" size={14} /> Fetching database...
              </>
            ) : (
              `✅ Ready: ${itemsMaster.length.toLocaleString()} items loaded`
            )}
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => navigate("/admin/quotations")}
            disabled={saving}
            className={styles.cancelBtn}
          >
            Cancel
          </button>

          <button
            onClick={saveQuotation}
            disabled={
              saving || (isEditMode && userRole !== "ADMIN") || isLoadingItems
            }
            className={styles.saveBtn}
            style={{
              opacity:
                (isEditMode && userRole !== "ADMIN") || isLoadingItems
                  ? 0.6
                  : 1,
              cursor:
                (isEditMode && userRole !== "ADMIN") || isLoadingItems
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {saving ? <Loader2 className="spin-anim" /> : <Save size={18} />}{" "}
            Save Quotation
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <Hash size={14} /> Quote No
          </label>
          <input
            value={quoteNo}
            readOnly
            className={`${styles.input} ${styles.readOnly}`}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <Building2 size={14} /> Company
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search company..."
              value={companySearch}
              onChange={(e) => {
                setCompanySearch(e.target.value);
                setShowCompanyDropdown(true);
              }}
              onFocus={() => setShowCompanyDropdown(true)}
              className={styles.input}
            />
            {showCompanyDropdown && (
              <div className={styles.dropdownMenu}>
                {filteredCompanies.length > 0 ? (
                  filteredCompanies.map((comp) => (
                    <div
                      key={comp.id}
                      onClick={() => selectCompany(comp)}
                      className={styles.dropdownItem}
                    >
                      {comp.company_name}
                    </div>
                  ))
                ) : (
                  <div className={styles.dropdownEmpty}>No companies found</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <User size={14} /> Attn Person
          </label>
          <input
            value={attn}
            onChange={(e) => setAttn(e.target.value)}
            className={styles.input}
            placeholder="e.g. John Doe"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            Signatory{" "}
            <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
          </label>
          <select
            value={signatoryId}
            onChange={(e) => setSignatoryId(e.target.value)}
            className={styles.select}
            style={{ borderColor: !signatoryId ? "#fca5a5" : "" }}
          >
            <option value="">-- Select Signatory --</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Valid For</label>
          <input
            value={validFor}
            onChange={(e) => setValidFor(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Delivery Time</label>
          <input
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Payment Terms</label>
          <input
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Mode of Enquiry</label>
          <input
            type="text"
            placeholder="e.g. Email, Phone..."
            value={modeOfEnquiry}
            onChange={(e) => setModeOfEnquiry(e.target.value)}
            className={styles.input}
          />
        </div>
      </div>

      {/* ✅ FIXED: Wrapped table in tableWrapper for horizontal scroll safety */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Disc%</th>
              <th>Total</th>
              <th style={{ width: "40px", textAlign: "center" }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const matchingCodes = item.item_code
                ? itemsMaster
                    .filter(
                      (m) =>
                        m.item_code &&
                        m.item_code
                          .toLowerCase()
                          .includes(item.item_code.toLowerCase()),
                    )
                    .slice(0, 50)
                : itemsMaster.slice(0, 50);

              const matchingDesc = item.description
                ? itemsMaster
                    .filter(
                      (m) =>
                        m.item_name &&
                        m.item_name
                          .toLowerCase()
                          .includes(item.description.toLowerCase()),
                    )
                    .slice(0, 50)
                : itemsMaster.slice(0, 50);

              return (
                <tr key={idx}>
                  <td>
                    <input
                      list={`codes-list-${idx}`}
                      value={item.item_code || ""}
                      onChange={(e) =>
                        updateItem(idx, "item_code", e.target.value)
                      }
                      className={styles.tableInput}
                      placeholder="Enter Code"
                      disabled={isLoadingItems}
                    />
                    <datalist id={`codes-list-${idx}`}>
                      {matchingCodes.map((m) => (
                        <option key={`code-${m.id}`} value={m.item_code}>
                          {m.item_name}
                        </option>
                      ))}
                    </datalist>
                  </td>
                  <td>
                    <input
                      list={`items-list-${idx}`}
                      value={item.description}
                      onChange={(e) =>
                        updateItem(idx, "description", e.target.value)
                      }
                      className={styles.tableInput}
                      placeholder="Enter Item Description"
                      disabled={isLoadingItems}
                    />
                    <datalist id={`items-list-${idx}`}>
                      {matchingDesc.map((m) => (
                        <option key={`desc-${m.id}`} value={m.item_name}>
                          {m.item_code}
                        </option>
                      ))}
                    </datalist>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.quantity ?? ""}
                      onChange={(e) =>
                        updateItem(idx, "quantity", e.target.value)
                      }
                      className={styles.tableInput}
                      placeholder="0"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.rate ?? ""}
                      onChange={(e) => updateItem(idx, "rate", e.target.value)}
                      className={styles.tableInput}
                      placeholder="0.00"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.discount ?? ""}
                      onChange={(e) =>
                        updateItem(idx, "discount", e.target.value)
                      }
                      className={styles.tableInput}
                      placeholder="%"
                    />
                  </td>
                  <td
                    style={{
                      verticalAlign: "middle",
                      fontWeight: "600",
                      color: "#111827",
                    }}
                  >
                    ₹{item.amount.toFixed(2)}
                  </td>
                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                    <button
                      onClick={() =>
                        setItems(items.filter((_, i) => i !== idx))
                      }
                      className={styles.deleteBtn}
                      title="Remove Item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        onClick={() =>
          setItems([...items, { description: "", item_code: "", amount: 0 }])
        }
        className={styles.addItemBtn}
      >
        <Plus size={18} /> Add New Row
      </button>

      <div style={{ marginTop: "20px" }}>
        <label className={styles.label}>
          <FileText size={14} /> Notes / Declaration
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={styles.input}
          style={{ width: "100%", marginTop: "5px", resize: "vertical" }}
        />
      </div>

      <div className={styles.footer}>
        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span>Subtotal</span>
            <span style={{ fontWeight: "600" }}>₹ {subTotal.toFixed(2)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>Tax (Approx 18%)</span>
            <span style={{ fontWeight: "600" }}>₹ {taxAmount.toFixed(2)}</span>
          </div>
          <div className={styles.grandTotal}>
            <span>Grand Total</span>
            <span>₹ {grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
