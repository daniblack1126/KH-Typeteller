"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window { tf?: any; }
}

const SPACE_ID = process.env.NEXT_PUBLIC_SPACE_ID || "daniblack1/Hair-Trainer-2025";
const TYPEFORM_ID = process.env.NEXT_PUBLIC_TYPEFORM_ID || "01K4T4CR7PWM5WCCH8KKPW1K5F";
const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || 8);

const DESCRIPTIONS: Record<string, string> = {
  "Type 1: Straight": "Smooth strands with minimal bend; can look shiny and may resist curls. Use lightweight wash/conditioner and a weightless volumizer.",
  "Type 2: Wavy":     "Loose S-shaped pattern; can frizz or fall flat if products are heavy. Use light mousse or texturizing spray.",
  "Type 3: Curly":    "Defined, springy curls and volume; frizz-prone. Use moisture-rich wash, curl cream + gel; leave-in helps.",
  "Type 4: Kinky":    "Tight coils/zig-zags; very delicate and dry by nature. Use rich creams/butters and oils; coil-defining styler."
};

// ---- Load Gradio client at runtime from CDN (avoids webpack bundling issues)
async function loadGradioClient(): Promise<(space: string) => Promise<any>> {
  const mod: any = await import("https://cdn.jsdelivr.net/npm/@gradio/client/+esm");
  return mod.client;
}

function parseGradioOutput(out: any): { label: string; conf: number } {
  if (out && typeof out === "object" && "label" in out && Array.isArray(out.confidences)) {
    const label = out.label as string;
    const m = out.confidences.find((x: any) => x.label === label);
    const conf = m ? Number(m.confidence) : 0;
    return { label, conf };
  }
  if (out && typeof out === "object" && !Array.isArray(out)) {
    const entries = Object.entries(out).filter(([, v]) => typeof v === "number") as [string, number][];
    if (!entries.length) throw new Error("Empty prediction dict");
    entries.sort((a, b) => b[1] - a[1]);
    const [label, conf] = entries[0];
    return { label, conf };
  }
  if (Array.isArray(out) && out.length && Array.isArray(out[0])) {
    const entries = [...out].sort((a, b) => b[1] - a[1]) as [string, number][];
    const [label, conf] = entries[0];
    return { label, conf };
  }
  throw new Error("Unexpected model output format");
}

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [ageOk, setAgeOk] = useState(false);
  const [storeOk, setStoreOk] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [label, setLabel] = useState<string>("");
  const [pct, setPct] = useState<number>(0);
  const [desc, setDesc] = useState<string>("");
  const [showResult, setShowResult] = useState(false);

  const clientRef = useRef<any | null>(null);

  const utm = useMemo(() => {
    if (typeof window === "undefined") return {};
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get("utm_source") || "",
      utm_medium: p.get("utm_medium") || "",
      utm_campaign: p.get("utm_campaign") || ""
    };
  }, []);

  useEffect(() => {
    // Preload Space client (best-effort; will retry on click if it fails)
    (async () => {
      try {
        const client = await loadGradioClient();
        clientRef.current = await client(SPACE_ID);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    // Render Typeform with hidden fields
    const container = document.getElementById("tf-form");
    if (!window.tf || !container) return;
    container.innerHTML = "";
    window.tf.createWidget(TYPEFORM_ID, {
      container,
      hidden: {
        hairType: label || "",
        confidence: String(pct || ""),
        consent: storeOk ? "store_ok" : "no_store",
        ...utm
      },
      opacity: 100,
      lazy: false
    });
  }, [label, pct, storeOk, TYPEFORM_ID, utm]);

  async function analyze() {
    try {
      if (!file) { alert("Select a JPEG/PNG first."); return; }
      if (!ageOk) { alert("Please confirm you are 13+."); return; }
      if (file.size > MAX_MB * 1024 * 1024) { alert(`Please upload an image under ${MAX_MB} MB.`); return; }

      setStatus("Analyzing…");
      if (!clientRef.current) {
        const client = await loadGradioClient();
        clientRef.current = await client(SPACE_ID);
      }

      let res: any;
      try {
        res = await clientRef.current.predict("/predict", [file]);
      } catch {
        res = await clientRef.current.predict(0, [file]);
      }

      const out = res?.data?.[0];
      const { label, conf } = parseGradioOutput(out);
      const percentage = Math.round(conf * 100);

      setLabel(label);
      setPct(percentage);
      setDesc(DESCRIPTIONS[label] || "");
      setShowResult(true);
      setStatus("Done.");
    } catch (e: any) {
      console.error("Predict error:", e);
      setStatus("Error. Try again.");
      alert("Prediction failed. Please try another photo.");
    }
  }

  return (
    <>
      <Script src="https://embed.typeform.com/next/embed.js" strategy="afterInteractive" />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: 24, fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <img src="https://dummyimage.com/160x40/000/fff&text=KeraNova" alt="KeraNova" style={{ height: 32 }} />
          <h1 style={{ margin: 0, fontSize: 20, width: "100%" }}>Hair Type Teller</h1>
        </header>

        <p style={{ color: "#555", fontSize: 14 }}>
          Upload a clear hair photo. We’ll show the top hair type and confidence, then you can leave your email.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          {/* Left card */}
          <div style={{ background: "#f4f6f8", borderRadius: 12, padding: 16 }}>
            <label><strong>1) Upload photo (JPEG/PNG)</strong></label><br />
            <input type="file" accept="image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] || null)} />

            <div style={{ height: 1, background: "#e6e9ec", margin: "16px 0" }} />

            <strong>2) Consent</strong>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", margin: "8px 0" }}>
              <input id="c13" type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} />
              <label htmlFor="c13">I am 13+ and agree to process my photo for a one-time prediction. Photos are <em>not</em> stored unless I opt in.</label>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", margin: "8px 0" }}>
              <input id="cstore" type="checkbox" checked={storeOk} onChange={(e) => setStoreOk(e.target.checked)} />
              <label htmlFor="cstore">I consent to let KeraNova store this photo to improve the model (optional).</label>
            </div>
            <a href="#" target="_blank" style={{ color: "#555", fontSize: 14 }}>Privacy Policy</a>

            <div style={{ marginTop: 12 }}>
              <button
                onClick={analyze}
                disabled={!file || !ageOk}
                style={{
                  background: "#1f6feb", color: "#fff", border: 0, padding: "12px 16px",
                  borderRadius: 10, fontWeight: 600, cursor: (!file || !ageOk) ? "not-allowed" : "pointer", opacity: (!file || !ageOk) ? 0.5 : 1
                }}
              >
                Analyze
              </button>
              <span style={{ marginLeft: 8, color: "#555", fontSize: 14 }}>{status}</span>
            </div>

            {showResult && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 22, fontWeight: 700, margin: "8px 0 4px" }}>
                  {label} — {pct}%
                </div>
                <div style={{ fontSize: 14 }}>{desc}</div>
              </div>
            )}
          </div>

          {/* Right card: Typeform */}
          <div id="typeform-card" style={{ background: "#f4f6f8", borderRadius: 12, padding: 16, position: "relative" }}>
            <button
              onClick={() => {
                const el = document.getElementById("typeform-card");
                if (el) el.style.display = "none";
              }}
              aria-label="Close"
              style={{ position: "absolute", top: 8, right: 12, background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "#555" }}
            >
              &times;
            </button>
            <label><strong>Leave your email (optional)</strong></label>
            <div id="tf-form" style={{ minHeight: 500 }} />
          </div>
        </div>

        {/* Small privacy footer (collapsible) */}
        <footer style={{ margin: "24px 0", fontSize: 12, color: "#555" }}>
          <div>
            <strong>Privacy:</strong> Effective September 9, 2025 —{" "}
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: "pointer", color: "#1f6feb", listStyle: "none", display: "inline" }}>
                View policy
              </summary>
              <div style={{ marginTop: 8, maxHeight: 280, overflow: "auto", border: "1px solid #e6e9ec", padding: 12, borderRadius: 8, background: "#fafbfc" }}>
                <p><em>Summary:</em> We collect your uploaded photo, the model’s hair-type prediction and confidence, your consent choices (13+ / store photo), optional contact details, basic device/usage data, and UTM parameters. We do not sell personal information or share it for cross-context behavioral advertising. Photos are processed transiently and not stored unless you opt in; stored photos are kept until you request deletion. Contact: danielle@keranovahair.com.</p>
              </div>
            </details>
          </div>
        </footer>
      </main>
    </>
  );
}
