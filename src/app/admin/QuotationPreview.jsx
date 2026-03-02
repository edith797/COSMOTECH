import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import html2pdf from "html2pdf.js";
import "./QuotationPreview.css";

// ✅ SAFE ITEM COUNT (Fits on Page 1 with Header + Bill To + Footer)
const ITEMS_PER_PAGE = 15;

export default function QuotationPreview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quotation, setQuotation] = useState(null);
  const [items, setItems] = useState([]);
  const [company, setCompany] = useState(null);
  const [settings, setSettings] = useState(null);
  const [signatory, setSignatory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function loadData() {
      try {
        setLoading(true);
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

        const { data: qi } = await supabase
          .from("quotation_items")
          .select("*")
          .eq("quotation_id", id)
          .order("id");
        setItems(qi || []);

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
      } catch (err) {
        console.error(err);
        alert("Error loading data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  // ✅ SPLIT ITEMS INTO PAGES
  const pages = useMemo(() => {
    if (!items || items.length === 0) return [];
    const chunks = [];
    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
      chunks.push(items.slice(i, i + ITEMS_PER_PAGE));
    }
    return chunks;
  }, [items]);

  // ✅ BULLETPROOF PDF GENERATION
  function downloadPDF() {
    const element = document.getElementById("quotation-container-full");
    const pagesList = element.querySelectorAll(".a4-page");

    // 1. Forcefully strip web margins, shadows, and lock height to prevent fractional pixel overflow
    pagesList.forEach((p) => {
      p.style.marginBottom = "0px";
      p.style.boxShadow = "none";
      p.style.border = "none";
      p.style.height = "296.5mm"; // Slightly under 297mm to guarantee it fits exactly on 1 page
      p.style.overflow = "hidden";
      p.style.pageBreakAfter = "always";
      p.style.pageBreakInside = "avoid";
    });

    // Remove the page break from the absolute last item so it doesn't push a blank page
    if (pagesList.length > 0) {
      pagesList[pagesList.length - 1].style.pageBreakAfter = "auto";
    }

    // 2. Wait 150ms for the browser to visually update the screen before snapping the picture
    setTimeout(() => {
      const options = {
        margin: 0,
        filename: `${quotation?.quotation_number || "Quote"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      };

      html2pdf()
        .set(options)
        .from(element)
        .save()
        .then(() => {
          // 3. RESTORE the web layout back to normal after downloading
          pagesList.forEach((p) => {
            p.style.marginBottom = "";
            p.style.boxShadow = "";
            p.style.border = "";
            p.style.height = "297mm";
            p.style.overflow = "";
            p.style.pageBreakAfter = "";
            p.style.pageBreakInside = "";
          });
        });
    }, 150);
  }

  // ✅ SMART BACK NAVIGATION
  function handleGoBack() {
    if (window.location.pathname.includes("/user/")) {
      navigate("/user/quotations"); // Redirects Users to their list
    } else {
      navigate("/admin/quotations"); // Redirects Admins to their list
    }
  }

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!quotation) return <div className="loading-screen">No Data Found</div>;

  return (
    <div className="quotation-body">
      <div className="action-bar">
        {/* ✅ UPDATED BACK BUTTON */}
        <button className="btn btn-back" onClick={handleGoBack}>
          ← Back
        </button>
        <button className="btn" onClick={downloadPDF}>
          Download PDF
        </button>
      </div>

      <div id="quotation-container-full">
        {pages.map((pageItems, pageIndex) => {
          const isLastPage = pageIndex === pages.length - 1;
          const isFirstPage = pageIndex === 0;

          return (
            <div className="a4-page" key={pageIndex}>
              {/* --- HEADER (On Every Page) --- */}
              <header className="page-header">
                <div className="header-top-grid">
                  {/* Left: Branding & Company Info */}
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

                  {/* Right: Document Type & Meta */}
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
                        {/* ✅ ADDED: Contact Number Row */}
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

                {/* ✅ CONDITIONAL: Bill To ONLY on Page 1 */}
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

              {/* --- ITEMS TABLE --- */}
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

              {/* --- FOOTER (ONLY LAST PAGE) --- */}
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
                    <div className="for-text">For {settings.company_name}</div>
                    <div className="sig-gap"></div>
                    <div className="auth-name">
                      {signatory?.full_name || "Authorised Signatory"}
                    </div>
                    <div className="auth-role">{signatory?.designation}</div>
                  </div>

                  <div className="dealers-footer">
                    <h4>AUTHORIZED DEALERS FOR</h4>
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
