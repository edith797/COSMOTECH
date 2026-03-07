import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { getNextQuotationNumber } from "../../components/quotationUtils";
import {
  Save,
  Loader2,
  Hash,
  Calendar,
  Building2,
  User,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";
import styles from "../users/CreateQuotation.module.css"; // Reuse shared CSS

const CGST_PERCENT = 9;
const SGST_PERCENT = 9;
const IGST_PERCENT = 18;

// ✅ Shared cache prevents 41k fetch freeze when users navigate back and forth
let globalItemsCache = null;

export default function CreateQuotationUser() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  // ✅ Detect Edit vs Revise Mode
  const isReviseMode = Boolean(id) && location.pathname.includes("/revise/");
  const isEditMode = Boolean(id) && location.pathname.includes("/edit/");

  const [quoteNo, setQuoteNo] = useState("");
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [attn, setAttn] = useState("");
  const [modeOfEnquiry, setModeOfEnquiry] = useState("");

  const [saving, setSaving] = useState(false);
  const [itemsMaster, setItemsMaster] = useState([]);
  const [validFor, setValidFor] = useState("ONE MONTH");
  const [deliveryTime, setDeliveryTime] = useState("1-2 WEEKS");
  const [paymentTerms, setPaymentTerms] = useState("15 DAYS");
  const [quotationDate, setQuotationDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState(
    "THANK YOU FOR BEING OUR PRIVILEGED CUSTOMER",
  );

  const [isLoadingItems, setIsLoadingItems] = useState(true);
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

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (quote.created_by !== user.id) {
          alert("Unauthorized access. You can only view your own quotes.");
          navigate("/user/dashboard");
          return;
        }

        // ✅ If it's old, block Editing but ALLOW Revising
        if (!quote.is_latest && isEditMode) {
          alert("This is an old revision and cannot be edited.");
          navigate("/user/dashboard");
          return;
        }

        if (quote.status === "APPROVED" && isEditMode) {
          alert("This quotation is already Approved and cannot be edited.");
          navigate("/user/dashboard");
          return;
        }

        setQuoteNo(quote.quotation_number);
        setCompanyId(quote.company_id);
        setAttn(quote.attn_person_name || "");
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

        if (qItems && qItems.length > 0) {
          setItems(qItems.map((i) => ({ ...i })));
        }
      } catch (err) {
        console.error(err);
        alert("Error loading data.");
        navigate("/user/dashboard");
      }
    },
    [navigate, isEditMode],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadInstantData() {
      const { data: compData } = await supabase
        .from("companies")
        .select("id, company_name")
        .order("company_name");

      if (isMounted) setCompanies(compData || []);

      if ((isEditMode || isReviseMode) && isMounted) {
        await loadQuotationForEdit(id);
      } else if (isMounted) {
        const quotationNo = await getNextQuotationNumber(supabase);
        setQuoteNo(quotationNo);
      }
    }

    async function loadMassiveItemDatabase() {
      if (!isMounted) return;
      setIsLoadingItems(true);

      if (globalItemsCache) {
        setItemsMaster(globalItemsCache);
        setIsLoadingItems(false);
        return;
      }

      try {
        const savedCache = localStorage.getItem("erp_master_items");
        if (savedCache) {
          const parsedCache = JSON.parse(savedCache);
          globalItemsCache = parsedCache;
          if (isMounted) {
            setItemsMaster(parsedCache);
            setIsLoadingItems(false);
          }
        }
      } catch {
        console.warn("Local cache empty");
      }

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

        const cleanedItems = allItems.map((item) => ({
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
        }));

        globalItemsCache = cleanedItems;
        if (isMounted) {
          setItemsMaster(cleanedItems);
          setIsLoadingItems(false);
        }

        try {
          localStorage.setItem(
            "erp_master_items",
            JSON.stringify(cleanedItems),
          );
        } catch {
          // ignore quota limits
        }
      } catch (err) {
        console.error("Background fetch failed", err);
      }
    }

    loadInstantData();
    const deferTimer = setTimeout(() => {
      loadMassiveItemDatabase();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(deferTimer);
    };
  }, [id, isEditMode, isReviseMode, loadQuotationForEdit]);

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

    // ✅ SMART UPDATE: Check both Code and Name instantly
    if (field === "item_code" && safeValue) {
      const matched = itemsMaster.find(
        (m) =>
          (m.item_code && m.item_code.toLowerCase() === safeValue) ||
          (m.item_name && m.item_name.toLowerCase() === safeValue),
      );
      if (matched) {
        updated[index].item_code = matched.item_code || "";
        updated[index].description = matched.item_name || "";
        updated[index].rate = matched.rate || 0;
      }
    }

    if (field === "description" && safeValue) {
      const matched = itemsMaster.find(
        (m) =>
          (m.item_name && m.item_name.toLowerCase() === safeValue) ||
          (m.item_code && m.item_code.toLowerCase() === safeValue),
      );
      if (matched) {
        updated[index].item_code = matched.item_code || "";
        updated[index].description = matched.item_name || "";
        updated[index].rate = matched.rate || 0;
      }
    }

    const qty = Number(updated[index].quantity) || 0;
    const rate = Number(updated[index].rate) || 0;
    const disc = Number(updated[index].discount) || 0;
    updated[index].amount = Math.max(qty * rate - (qty * rate * disc) / 100, 0);
    setItems(updated);
  }

  function addItemRow() {
    setItems([
      ...items,
      {
        description: "",
        item_code: "",
        quantity: null,
        rate: null,
        discount: null,
        amount: 0,
      },
    ]);
  }

  function removeItemRow(index) {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  }

  async function saveQuotation() {
    if (!companyId) return alert("Please select a company");
    if (isLoadingItems)
      return alert("Please wait for items to load completely.");

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Automatically attach user's employee record
      const { data: employeeRecord, error: empErr } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (empErr || !employeeRecord) {
        alert("Error: You are not registered as an Employee.");
        setSaving(false);
        return;
      }

      // Handle new custom items
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

      const { data: selectedComp } = await supabase
        .from("companies")
        .select("gst_type")
        .eq("id", companyId)
        .single();

      let cgst = 0,
        sgst = 0,
        igst = 0;
      if (selectedComp?.gst_type === "INTER") {
        igst = (subTotal * IGST_PERCENT) / 100;
      } else {
        cgst = (subTotal * CGST_PERCENT) / 100;
        sgst = (subTotal * SGST_PERCENT) / 100;
      }
      const finalTotal = subTotal + cgst + sgst + igst;

      const creatorToSave =
        isEditMode || isReviseMode ? originalCreatorId || user.id : user.id;

      const quoteData = {
        quotation_number: quoteNo,
        quotation_date: quotationDate,
        company_id: companyId,
        attn_person_name: attn,
        authorised_signatory_id: employeeRecord.id,
        created_by: creatorToSave,
        valid_for: validFor,
        delivery_time: deliveryTime,
        payment_terms: paymentTerms,
        mode_of_enquiry: modeOfEnquiry,
        subtotal: subTotal,
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: igst,
        total_amount: finalTotal,
        notes: notes,
        is_latest: true,
      };

      let finalId = null;

      // ✅ REVISE VS EDIT LOGIC
      if (isReviseMode) {
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
      } else if (isEditMode) {
        const { error } = await supabase
          .from("quotations")
          .update(quoteData)
          .eq("id", id);
        if (error) throw error;
        finalId = id;

        await supabase.from("quotation_items").delete().eq("quotation_id", id);
      } else {
        const { data, error } = await supabase
          .from("quotations")
          .insert([{ ...quoteData, revision_no: 0 }])
          .select()
          .single();
        if (error) throw error;
        finalId = data.id;
      }

      const itemsToInsert = items.map((item) => ({
        quotation_id: finalId,
        item_code: item.item_code || null,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        amount: item.amount,
      }));

      const { error: itemError } = await supabase
        .from("quotation_items")
        .insert(itemsToInsert);
      if (itemError) throw itemError;

      navigate(`/user/quotations/${finalId}`);
    } catch (err) {
      console.error(err);
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
        <div>
          <h1 className={styles.title}>
            {isReviseMode
              ? "Create Revision"
              : isEditMode
                ? "Edit Quotation"
                : "New Quotation"}
          </h1>
          <span
            style={{
              color: isLoadingItems ? "#d97706" : "#16a34a",
              fontWeight: "bold",
              fontSize: "13px",
              marginTop: "4px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {isLoadingItems ? (
              <>
                <Loader2 className="spin-anim" size={14} /> Fetching 41K Item
                DB...
              </>
            ) : (
              `✅ Ready: ${itemsMaster.length} items loaded`
            )}
          </span>
        </div>
        <div className={styles.actions}>
          <button
            onClick={() => navigate("/user/dashboard")}
            className={styles.backBtn}
          >
            Cancel
          </button>
          <button
            onClick={saveQuotation}
            disabled={saving || isLoadingItems}
            className={styles.saveBtn}
            style={{
              opacity: saving || isLoadingItems ? 0.5 : 1,
              cursor: saving || isLoadingItems ? "not-allowed" : "pointer",
            }}
          >
            {saving ? <Loader2 className="spin-anim" /> : <Save size={18} />}{" "}
            {isEditMode ? "Update" : "Save"}
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <Hash size={14} /> Quote No
          </label>
          <input value={quoteNo} readOnly className={styles.input} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <Calendar size={14} /> Date
          </label>
          <input
            type="date"
            value={quotationDate}
            onChange={(e) => setQuotationDate(e.target.value)}
            className={styles.input}
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
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  backgroundColor: "#fff",
                  border: "1px solid #d1d5db",
                  borderTop: "none",
                  borderRadius: "0 0 8px 8px",
                  maxHeight: "200px",
                  overflowY: "auto",
                  zIndex: 10,
                }}
              >
                {filteredCompanies.length > 0 ? (
                  filteredCompanies.map((comp) => (
                    <div
                      key={comp.id}
                      onClick={() => selectCompany(comp)}
                      style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f3f4f6",
                        transition: "background-color 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f9fafb")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#fff")
                      }
                    >
                      {comp.company_name}
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      padding: "10px 12px",
                      color: "#9ca3af",
                      textAlign: "center",
                    }}
                  >
                    No companies found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <User size={14} /> Attn
          </label>
          <input
            value={attn}
            onChange={(e) => setAttn(e.target.value)}
            className={styles.input}
            placeholder="e.g. Mr. John Doe"
          />
        </div>

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
            placeholder="e.g., Email, Phone, Walk-in..."
            value={modeOfEnquiry}
            onChange={(e) => setModeOfEnquiry(e.target.value)}
            className={styles.input}
          />
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: "20%" }}>Code</th>
              <th style={{ width: "35%" }}>Description</th>
              <th style={{ width: "10%" }}>Qty</th>
              <th style={{ width: "15%" }}>Rate</th>
              <th style={{ width: "10%" }}>Disc%</th>
              <th style={{ width: "15%" }}>Amount</th>
              <th style={{ width: "5%" }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              // ✅ 3. SMART SEARCH BEFORE SLICING
              const searchCode = item.item_code
                ? item.item_code.toLowerCase()
                : "";
              const matchingCodes = searchCode
                ? itemsMaster
                    .filter(
                      (m) =>
                        (m.item_code &&
                          m.item_code.toLowerCase().includes(searchCode)) ||
                        (m.item_name &&
                          m.item_name.toLowerCase().includes(searchCode)),
                    )
                    .slice(0, 50)
                : itemsMaster.slice(0, 50);

              const searchDesc = item.description
                ? item.description.toLowerCase()
                : "";
              const matchingDesc = searchDesc
                ? itemsMaster
                    .filter(
                      (m) =>
                        (m.item_name &&
                          m.item_name.toLowerCase().includes(searchDesc)) ||
                        (m.item_code &&
                          m.item_code.toLowerCase().includes(searchDesc)),
                    )
                    .slice(0, 50)
                : itemsMaster.slice(0, 50);

              return (
                <tr key={idx}>
                  <td>
                    <input
                      list={`codes-list-user-${idx}`}
                      type="text"
                      placeholder="Code"
                      value={item.item_code || ""}
                      onChange={(e) =>
                        updateItem(idx, "item_code", e.target.value)
                      }
                      className={styles.tableInput}
                      disabled={isLoadingItems}
                    />
                    <datalist id={`codes-list-user-${idx}`}>
                      {matchingCodes.map((m) => (
                        <option
                          key={`code-${m.id}`}
                          value={m.item_code || m.item_name}
                        >
                          {m.item_name || ""}
                        </option>
                      ))}
                    </datalist>
                  </td>
                  <td>
                    <input
                      list={`items-list-user-${idx}`}
                      placeholder="Type item name"
                      value={item.description || ""}
                      onChange={(e) =>
                        updateItem(idx, "description", e.target.value)
                      }
                      className={styles.tableInput}
                      disabled={isLoadingItems}
                    />
                    <datalist id={`items-list-user-${idx}`}>
                      {matchingDesc.map((m) => (
                        <option
                          key={`desc-${m.id}`}
                          value={m.item_name || m.item_code}
                        >
                          {m.item_code || ""}
                        </option>
                      ))}
                    </datalist>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity ?? ""}
                      onChange={(e) =>
                        updateItem(idx, "quantity", e.target.value)
                      }
                      className={styles.tableInput}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={item.rate ?? ""}
                      onChange={(e) => updateItem(idx, "rate", e.target.value)}
                      className={styles.tableInput}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discount ?? ""}
                      onChange={(e) =>
                        updateItem(idx, "discount", e.target.value)
                      }
                      className={styles.tableInput}
                    />
                  </td>
                  <td style={{ fontWeight: 600, padding: "10px" }}>
                    ₹ {item.amount.toFixed(2)}
                  </td>
                  <td>
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItemRow(idx)}
                        className={styles.deleteBtn}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button onClick={addItemRow} className={styles.addItemBtn}>
        <Plus size={18} /> Add New Item
      </button>

      <div style={{ marginTop: "20px" }}>
        <label
          className={styles.label}
          style={{ display: "flex", alignItems: "center", gap: "5px" }}
        >
          <FileText size={14} /> Notes / Declaration
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={styles.input}
          style={{ width: "100%", marginTop: "5px" }}
        />
      </div>

      <div className={styles.footer}>
        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span>Subtotal</span>
            <span>₹ {subTotal.toFixed(2)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>Tax (Approx 18%)</span>
            <span>₹ {taxAmount.toFixed(2)}</span>
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
