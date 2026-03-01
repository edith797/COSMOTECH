import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function SystemSettings() {
  const [settings, setSettings] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("system_settings")
      .select("*")
      .single()
      .then(({ data, error }) => {
        if (!error) setSettings(data);
      });
  }, []);

  async function uploadLogo(file) {
    if (!file) return;

    setUploading(true);
    setError("");

    const filePath = "logo/company-logo.png";

    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from("company-assets")
      .getPublicUrl(filePath);

    const { error: dbError } = await supabase
      .from("system_settings")
      .update({ company_logo_url: data.publicUrl })
      .eq("id", settings.id);

    if (dbError) {
      setError(dbError.message);
      setUploading(false);
      return;
    }

    setSettings({ ...settings, company_logo_url: data.publicUrl });
    setUploading(false);
  }

  if (!settings) return null;

  return (
    <div>
      <h1>System Settings</h1>

      <label>Company Logo</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => uploadLogo(e.target.files[0])}
      />

      {uploading && <p>Uploading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {settings.company_logo_url && (
        <img
          src={settings.company_logo_url}
          alt="Company Logo"
          style={{ marginTop: 20, height: 80 }}
        />
      )}
    </div>
  );
}
