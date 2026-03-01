
export async function getNextQuotationNumber(supabase) {
  // 1. Call the secure database function
  // This runs as "Admin" on the server, so it sees ALL quotes
  const { data, error } = await supabase.rpc("get_max_quotation_number");

  if (error) {
    console.error("Error fetching max quotation number:", error);
    return "QUTE001"; // Safety fallback
  }

  // 2. Logic: If null (no quotes yet), start at QUTE000
  const lastNumber = data || "QUTE000";
  
  // 3. Increment
  const nextNum = parseInt(lastNumber.replace("QUTE", ""), 10) + 1;

  // 4. Format (e.g., 5 -> QUTE005)
  return `QUTE${String(nextNum).padStart(3, "0")}`;
}