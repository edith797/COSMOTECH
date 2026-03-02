export async function getNextQuotationNumber(supabase) {
  // Call our new super-smart Database Function!
  const { data, error } = await supabase.rpc("get_next_quote_number");

  if (error) {
    console.error("Error fetching next quotation number:", error);
    // Absolute worst-case safety fallback
    const fallbackYear = String(new Date().getFullYear()).slice(-2);
    return `CET-001/${fallbackYear}`;
  }

  return data; // e.g., "CET-256/26" or "CET-001/27"
}
