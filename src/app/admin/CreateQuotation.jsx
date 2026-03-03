import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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

// Shared cache to prevent reloading 41k items if you navigate away and back
let globalItemsCache = null;

export default function CreateQuotation() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const isReviseMode = Boolean(id) && location.pathname.includes("/revise/");
  const isEditMode = Boolean(id) && location.pathname.includes("/edit/");

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

        if (!quote.is_latest && isEditMode) {
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
        console.error("Error loading quotation:", err);
        navigate("/admin/quotations");
      }
    },
    [navigate, isEditMode],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadInstantData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && isMounted) {
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

      if (isMounted) setCompanies(compData || []);

      const { data: empData } = await supabase
        .from("employees")
        .select("id, full_name, user_id")
        .eq("is_active", true)
        .order("full_name");

      if (isMounted) setEmployees(empData || []);

      if (!isEditMode && !isReviseMode && user && empData && isMounted) {
        const myEmployeeRecord = empData.find((emp) => emp.user_id === user.id);
        if (myEmployeeRecord) setSignatoryId(myEmployeeRecord.id);
      }

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
        console.warn("Local cache empty or invalid");
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
          // Silently ignore localStorage quota errors
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

    // SMART UPDATE: Checks BOTH code and name instantly
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
    updated[index].amount = qty * rate - (qty * rate * disc) / 100;
    setItems(updated);
  }

  async function saveQuotation() {
    if (!companyId) return alert("Select a company");
    if (!signatoryId) return alert("Please select an Authorised Signatory.");

    if (isReviseMode && userRole !== "ADMIN") {
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

      const creatorToSave =
        isEditMode || isReviseMode ? originalCreatorId || user.id : user.id;

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

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => navigate("/admin/quotations")}
            className={styles.cancelBtn}
          >
            Cancel
          </button>
          <button
            onClick={saveQuotation}
            disabled={saving || isLoadingItems}
            className={styles.saveBtn}
          >
            {saving ? <Loader2 className="spin-anim" /> : <Save size={18} />}
            {isEditMode ? "Update Changes" : "Save"}
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

        <div className={styles.fieldGroup} style={{ position: "relative" }}>
          <label className={styles.label}>
            <Building2 size={14} /> Company
          </label>
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
              {companies
                .filter((c) =>
                  c.company_name
                    .toLowerCase()
                    .includes(companySearch.toLowerCase()),
                )
                .map((comp) => (
                  <div
                    key={comp.id}
                    onClick={() => {
                      setCompanyId(comp.id);
                      setCompanySearch(comp.company_name);
                      setShowCompanyDropdown(false);
                    }}
                    className={styles.dropdownItem}
                  >
                    {comp.company_name}
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <User size={14} /> Attn
          </label>
          <input
            value={attn}
            onChange={(e) => setAttn(e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            Signatory <span style={{ color: "red" }}>*</span>
          </label>
          <select
            value={signatoryId}
            onChange={(e) => setSignatoryId(e.target.value)}
            className={styles.select}
          >
            <option value="">-- Select Signatory --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name}
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
          <label className={styles.label}>Date</label>
          <input
            type="date"
            value={quotationDate}
            onChange={(e) => setQuotationDate(e.target.value)}
            className={styles.input}
          />
        </div>
      </div>

      <div className={styles.fieldGroup} style={{ marginBottom: "24px" }}>
        <label className={styles.label}>Mode of Enquiry</label>
        <input
          value={modeOfEnquiry}
          onChange={(e) => setModeOfEnquiry(e.target.value)}
          className={styles.input}
          placeholder="e.g. Direct Visit"
        />
      </div>

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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              // ✅ CROSS-FILTER THE ENTIRE 41K DB *BEFORE* SLICING
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
                      list={`codes-${idx}`}
                      value={item.item_code || ""}
                      onChange={(e) =>
                        updateItem(idx, "item_code", e.target.value)
                      }
                      className={styles.tableInput}
                      disabled={isLoadingItems}
                    />
                    <datalist id={`codes-${idx}`}>
                      {matchingCodes.map((m) => (
                        <option key={m.id} value={m.item_code || m.item_name}>
                          {m.item_name || ""}
                        </option>
                      ))}
                    </datalist>
                  </td>
                  <td>
                    <input
                      list={`desc-${idx}`}
                      value={item.description || ""}
                      onChange={(e) =>
                        updateItem(idx, "description", e.target.value)
                      }
                      className={styles.tableInput}
                      disabled={isLoadingItems}
                    />
                    <datalist id={`desc-${idx}`}>
                      {matchingDesc.map((m) => (
                        <option key={m.id} value={m.item_name || m.item_code}>
                          {m.item_code || ""}
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
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.rate ?? ""}
                      onChange={(e) => updateItem(idx, "rate", e.target.value)}
                      className={styles.tableInput}
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
                    />
                  </td>
                  <td style={{ fontWeight: "600" }}>
                    ₹
                    {item.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td>
                    <button
                      onClick={() =>
                        setItems(items.filter((_, i) => i !== idx))
                      }
                      className={styles.deleteBtn}
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
          ])
        }
        className={styles.addItemBtn}
      >
        <Plus size={18} /> Add Row
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
          style={{ width: "100%", marginTop: "5px" }}
        />
      </div>

      <div className={styles.footer}>
        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span>Subtotal</span>
            <span>
              ₹
              {subTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className={styles.totalRow}>
            <span>Tax (18%)</span>
            <span>
              ₹
              {taxAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className={styles.grandTotal}>
            <span>Grand Total</span>
            <span>
              ₹
              {grandTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
