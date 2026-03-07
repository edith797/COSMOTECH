import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./QuotationPreview.css";

const ITEMS_PER_PAGE = 15;

export default function QuotationPreview({
  draftData,
  onConfirmSave,
  onCancelPreview,
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  // Detect if we are previewing before saving
  const isPreviewMode = Boolean(draftData);

  const [quotation, setQuotation] = useState(null);
  const [items, setItems] = useState([]);
  const [company, setCompany] = useState(null);
  const [settings, setSettings] = useState(null);
  const [signatory, setSignatory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const { data: s } = await supabase
          .from("system_settings")
          .select("*")
          .maybeSingle();
        setSettings(
          s || {
            company_name: "COSMOTECH ENGINEERS & TRADELINES",
            address: "Address Line Here",
            phone: "Phone Number",
            email: "Email Address",
          },
        );

        if (isPreviewMode) {
          setQuotation(draftData.quotation);
          setItems(draftData.items);

          const { data: c } = await supabase
            .from("companies")
            .select("*")
            .eq("id", draftData.quotation.company_id)
            .single();
          setCompany(c);

          if (draftData.quotation.authorised_signatory_id) {
            const { data: emp } = await supabase
              .from("employees")
              .select("*")
              .eq("id", draftData.quotation.authorised_signatory_id)
              .single();
            setSignatory(emp);
          }
        } else if (id) {
          const { data: q, error: qErr } = await supabase
            .from("quotations")
            .select("*")
            .eq("id", id)
            .single();
          if (qErr) throw qErr;
          setQuotation(q);

          const { data: c } = await supabase
            .from("companies")
            .select("*")
            .eq("id", q.company_id)
            .single();
          setCompany(c);

          if (q.authorised_signatory_id) {
            const { data: emp } = await supabase
              .from("employees")
              .select("*")
              .eq("id", q.authorised_signatory_id)
              .single();
            setSignatory(emp);
          }

          // ✅ Guaranteed correct item order
          const { data: qi } = await supabase
            .from("quotation_items")
            .select("*")
            .eq("quotation_id", id)
            .order("id", { ascending: true });
          setItems(qi || []);
        }
      } catch (err) {
        console.error(err);
        alert("Error loading data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, draftData, isPreviewMode]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const pages = useMemo(() => {
    if (!items || items.length === 0) return [];
    const chunks = [];
    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
      chunks.push(items.slice(i, i + ITEMS_PER_PAGE));
    }
    return chunks;
  }, [items]);

  // ✅ PERFECT NATIVE PRINT (COPYABLE TEXT)
  function downloadPDF() {
    const originalTitle = document.title;
    document.title = `${quotation?.quotation_number || "Quotation"}`;
    window.print();
    document.title = originalTitle;
  }

  function handleGoBack() {
    if (window.location.pathname.includes("/user/")) {
      navigate("/user/quotations");
    } else {
      navigate("/admin/quotations");
    }
  }

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!quotation) return <div className="loading-screen">No Data Found</div>;

  return (
    <div className={`quotation-body ${isPreviewMode ? "preview-mode" : ""}`}>
      <div className="action-bar hide-on-print">
        {isPreviewMode ? (
          <>
            <div style={{ fontWeight: "bold", color: "#B45309" }}>
              👀 PREVIEW MODE
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn btn-back"
                onClick={(e) => {
                  e.preventDefault();
                  onCancelPreview();
                }}
              >
                ✎ Go Back & Edit
              </button>
              <button
                className="btn"
                onClick={onConfirmSave}
                style={{ backgroundColor: "#10B981" }}
              >
                ✓ Confirm & Save
              </button>
            </div>
          </>
        ) : (
          <>
            <button className="btn btn-back" onClick={handleGoBack}>
              ← Back
            </button>
            <button className="btn" onClick={downloadPDF}>
              Download PDF
            </button>
          </>
        )}
      </div>

      <div id="quotation-container-full">
        {pages.map((pageItems, pageIndex) => {
          const isLastPage = pageIndex === pages.length - 1;
          const isFirstPage = pageIndex === 0;

          return (
            <div className="a4-page" key={pageIndex}>
              <header className="page-header">
                <div className="header-top-grid">
                  <div className="header-brand">
                    <div className="logo-box">
                      {settings.company_logo_url ? (
                        <img src={settings.company_logo_url} alt="Logo" />
                      ) : (
                        <span className="no-logo">LOGO</span>
                      )}
                    </div>
                    <div className="company-details">
                      <h1 className="company-title">
                        {settings.company_name ||
                          "COSMOTECH ENGINEERS & TRADELINES"}
                      </h1>
                      <p>{settings.company_address || "Address Line Here"}</p>
                      <p>
                        Phone: {settings.phone} | Email: {settings.email}
                      </p>
                    </div>
                  </div>

                  <div className="header-meta">
                    <h2 className="doc-title">QUOTATION</h2>
                    {isFirstPage && (
                      <div className="quote-meta-box">
                        <div className="meta-row">
                          <span className="meta-lbl">Quote No:</span>
                          <span className="meta-val bold">
                            {quotation.quotation_number}
                            {quotation.revision_no > 0 &&
                              ` (Rev-${quotation.revision_no})`}
                          </span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-lbl">Date:</span>
                          <span className="meta-val">
                            {new Date(
                              quotation.quotation_date,
                            ).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-lbl">Enquiry Mode:</span>
                          <span className="meta-val">
                            {quotation.mode_of_enquiry}
                          </span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-lbl">Contact:</span>
                          <span className="meta-val">
                            {signatory?.contact_number || "Not Provided"}
                          </span>
                        </div>
                      </div>
                    )}
                    {!isFirstPage && (
                      <div className="quote-meta-box minimal">
                        <div className="meta-row">
                          <span className="meta-lbl">Quote No:</span>
                          <span className="meta-val">
                            {quotation.quotation_number}
                          </span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-lbl">Page:</span>
                          <span className="meta-val">
                            {pageIndex + 1} of {pages.length}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isFirstPage && (
                  <div className="bill-to-section">
                    <div className="bill-to-label">BILL TO</div>
                    <div className="client-name">{company?.company_name}</div>
                    <div className="client-addr">{company?.address}</div>
                    {quotation.attn_person_name && (
                      <div className="client-attn">
                        Attn: {quotation.attn_person_name}
                      </div>
                    )}
                  </div>
                )}
              </header>

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "5%" }}>#</th>
                      <th style={{ width: "18%" }}>CODE</th>
                      <th style={{ width: "32%" }}>DESCRIPTION</th>
                      <th style={{ width: "12%" }} className="right">
                        RATE
                      </th>
                      <th style={{ width: "8%" }} className="center">
                        QTY
                      </th>
                      <th style={{ width: "10%" }} className="center">
                        DISC%
                      </th>
                      <th style={{ width: "15%" }} className="right">
                        AMOUNT
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>{pageIndex * ITEMS_PER_PAGE + idx + 1}</td>
                        <td>{item.item_code}</td>
                        <td className="desc-cell">{item.description}</td>
                        <td className="right">{formatCurrency(item.rate)}</td>
                        <td className="center">{item.quantity}</td>
                        <td className="center">
                          {item.discount > 0 ? item.discount : "-"}
                        </td>
                        <td className="right bold">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isLastPage ? (
                <div className="footer-wrapper">
                  <div className="summary-split">
                    <div className="terms-left">
                      <h4>PAYMENT & DELIVERY TERMS</h4>
                      <ul>
                        <li>
                          <strong>Delivery:</strong> {quotation.delivery_time}
                        </li>
                        <li>
                          <strong>Payment:</strong> {quotation.payment_terms}
                        </li>
                        <li>
                          <strong>Validity:</strong> {quotation.valid_for}
                        </li>
                      </ul>
                      <div className="declaration">
                        <strong>Notes / Declaration:</strong>
                        <br />
                        {quotation.notes ||
                          "We hope the above quotation meets your requirements. Thank you for being our privileged customer."}
                      </div>
                    </div>

                    <div className="totals-right">
                      <div className="t-row">
                        <span>Subtotal</span>
                        <span>{formatCurrency(quotation.subtotal)}</span>
                      </div>
                      {quotation.igst_amount > 0 ? (
                        <div className="t-row">
                          <span>IGST (18%)</span>
                          <span>{formatCurrency(quotation.igst_amount)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="t-row">
                            <span>CGST (9%)</span>
                            <span>{formatCurrency(quotation.cgst_amount)}</span>
                          </div>
                          <div className="t-row">
                            <span>SGST (9%)</span>
                            <span>{formatCurrency(quotation.sgst_amount)}</span>
                          </div>
                        </>
                      )}
                      <div className="t-row total">
                        <span>Grand Total</span>
                        <span>₹ {formatCurrency(quotation.total_amount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="auth-signature">
                    <div className="for-text">For {settings?.company_name}</div>
                    <div className="sig-gap"></div>
                    <div className="auth-name">
                      {signatory?.full_name || "Authorised Signatory"}
                    </div>
                    <div className="auth-role">{signatory?.designation}</div>
                  </div>

                  <div className="dealers-footer">
                    <h4>AUTHORIZED DISTRIBUTORS FOR</h4>
                    <div className="logos-line">
                      <img
                        src="/logos/brand1.png"
                        alt=""
                        onError={(e) => (e.target.style.display = "none")}
                      />
                      <img
                        src="/logos/brand2.png"
                        alt=""
                        onError={(e) => (e.target.style.display = "none")}
                      />
                      <img
                        src="/logos/brand3.png"
                        alt=""
                        onError={(e) => (e.target.style.display = "none")}
                      />
                      <img
                        src="/logos/brand4.png"
                        alt=""
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="page-spacer">
                  <p className="continued-text">Continued on next page...</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
