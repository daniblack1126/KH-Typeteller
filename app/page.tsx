"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Script from "next/script"

declare global {
  interface Window {
    tf?: any
  }
}

const SPACE_ID = process.env.NEXT_PUBLIC_SPACE_ID || "daniblack1/Hair-Trainer-2025"
const TYPEFORM_ID = process.env.NEXT_PUBLIC_TYPEFORM_ID || "01K4T4CR7PWM5WCCH8KKPW1K5F"
const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || 8)

const DESCRIPTIONS: Record<string, string> = {
  "Type 1: Straight":
    "Smooth strands with minimal bend; can look shiny and may resist curls. Use lightweight wash/conditioner and a weightless volumizer.",
  "Type 2: Wavy":
    "Loose S-shaped pattern; can frizz or fall flat if products are heavy. Use light mousse or texturizing spray.",
  "Type 3: Curly":
    "Defined, springy curls and volume; frizz-prone. Use moisture-rich wash, curl cream + gel; leave-in helps.",
  "Type 4: Kinky":
    "Tight coils/zig-zags; very delicate and dry by nature. Use rich creams/butters and oils; coil-defining styler.",
}

// ---- Load Gradio client at runtime from CDN (avoids webpack bundling issues)
async function loadGradioClient(): Promise<(space: string) => Promise<any>> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const mod: any = await import(
    /* webpackIgnore: true */
    "https://cdn.jsdelivr.net/npm/@gradio/client/+esm"
  )
  return mod.client
}

function parseGradioOutput(out: any): { label: string; conf: number } {
  if (out && typeof out === "object" && "label" in out && Array.isArray(out.confidences)) {
    const label = out.label as string
    const m = out.confidences.find((x: any) => x.label === label)
    const conf = m ? Number(m.confidence) : 0
    return { label, conf }
  }
  if (out && typeof out === "object" && !Array.isArray(out)) {
    const entries = Object.entries(out).filter(([, v]) => typeof v === "number") as [string, number][]
    if (!entries.length) throw new Error("Empty prediction dict")
    entries.sort((a, b) => b[1] - a[1])
    const [label, conf] = entries[0]
    return { label, conf }
  }
  if (Array.isArray(out) && out.length && Array.isArray(out[0])) {
    const entries = [...out].sort((a, b) => b[1] - a[1]) as [string, number][]
    const [label, conf] = entries[0]
    return { label, conf }
  }
  throw new Error("Unexpected model output format")
}

export default function Page() {
  const [file, setFile] = useState<File | null>(null)
  const [ageOk, setAgeOk] = useState(false)
  const [storeOk, setStoreOk] = useState(false)
  const [status, setStatus] = useState<string>("")
  const [label, setLabel] = useState<string>("")
  const [pct, setPct] = useState<number>(0)
  const [desc, setDesc] = useState<string>("")
  const [showResult, setShowResult] = useState(false)

  const clientRef = useRef<any | null>(null)

  const utm = useMemo(() => {
    if (typeof window === "undefined") return {}
    const p = new URLSearchParams(window.location.search)
    return {
      utm_source: p.get("utm_source") || "",
      utm_medium: p.get("utm_medium") || "",
      utm_campaign: p.get("utm_campaign") || "",
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const client = await loadGradioClient()
        clientRef.current = await client(SPACE_ID)
      } catch {}
    })()
  }, [])

  useEffect(() => {
    const container = document.getElementById("tf-form")
    if (!window.tf || !container) return
    container.innerHTML = ""
    window.tf.createWidget(TYPEFORM_ID, {
      container,
      hidden: {
        hairType: label || "",
        confidence: String(pct || ""),
        consent: storeOk ? "store_ok" : "no_store",
        ...utm,
      },
      opacity: 100,
      lazy: false,
    })
  }, [label, pct, storeOk, TYPEFORM_ID, utm])

  async function analyze() {
    try {
      if (!file) { alert("Select a JPEG/PNG first."); return }
      if (!ageOk) { alert("Please confirm you are 13+."); return }
      if (file.size > MAX_MB * 1024 * 1024) { alert(`Please upload an image under ${MAX_MB} MB.`); return }

      setStatus("Analyzing…")
      if (!clientRef.current) {
        const client = await loadGradioClient()
        clientRef.current = await client(SPACE_ID)
      }

      let res: any
      try {
        res = await clientRef.current.predict("/predict", [file])
      } catch {
        res = await clientRef.current.predict(0, [file])
      }

      const out = res?.data?.[0]
      const { label, conf } = parseGradioOutput(out)
      const percentage = Math.round(conf * 100)

      setLabel(label)
      setPct(percentage)
      setDesc(DESCRIPTIONS[label] || "")
      setShowResult(true)
      setStatus("Done.")
    } catch (e: any) {
      console.error("Predict error:", e)
      setStatus("Error. Try again.")
      alert("Prediction failed. Please try another photo.")
    }
  }

  return (
    <>
      <Script src="https://embed.typeform.com/next/embed.js" strategy="afterInteractive" />
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 24px",
          background: "var(--warm-ivory)",
          minHeight: "100vh",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            flexWrap: "wrap",
            marginBottom: 40,
            textAlign: "center",
            justifyContent: "center",
          }}
        >
          <img
            src="https://dummyimage.com/200x50/3D2B20/DAA520&text=KeraNova"
            alt="KeraNova"
            style={{ height: 40, borderRadius: 8 }}
          />
          <h1
            className="header-main"
            style={{
              margin: 0,
              fontSize: "clamp(28px, 5vw, 40px)",
              width: "100%",
              color: "var(--rich-chocolate)",
              fontWeight: "700",
              letterSpacing: "-0.02em",
            }}
          >
            Hair Type Teller
          </h1>
        </header>

        <p
          className="intro-text"
          style={{
            color: "var(--deep-navy)",
            fontSize: 16,
            textAlign: "center",
            marginBottom: 48,
            maxWidth: 600,
            margin: "0 auto 48px",
            lineHeight: 1.6,
          }}
        >
          Upload a clear hair photo. We'll show the top hair type and confidence, then you can leave your email.
        </p>

        <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32 }}>
          {/* Left card */}
          <div
            style={{
              background: "var(--soft-cream)",
              borderRadius: 20,
              padding: 32,
              boxShadow: "0 8px 32px rgba(61, 43, 32, 0.1)",
              border: "1px solid var(--champagne-sparkle)",
            }}
          >
            <label className="section-header" style={{ fontSize: 20, fontWeight: 600, color: "var(--rich-chocolate)", marginBottom: 16, display: "block" }}>
              1) Upload photo (JPEG/PNG)
            </label>

            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "2px solid var(--caramel-tan)",
                background: "var(--warm-ivory)",
                fontSize: 14,
                marginBottom: 24,
              }}
            />

            <div style={{ height: 2, background: "linear-gradient(90deg, var(--caramel-tan), var(--champagne-sparkle))", margin: "24px 0", borderRadius: 1 }} />

            <div className="section-header" style={{ fontSize: 20, fontWeight: 600, color: "var(--rich-chocolate)", marginBottom: 16 }}>
              2) Consent
            </div>

            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", margin: "16px 0", padding: 16, background: "var(--warm-ivory)", borderRadius: 12, border: "1px solid var(--champagne-sparkle)" }}>
              <input id="c13" type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} style={{ marginTop: 2 }} />
              <label htmlFor="c13" style={{ fontSize: 14, lineHeight: 1.5, color: "var(--deep-navy)" }}>
                I am 13+ and agree to process my photo for a one-time prediction. Photos are <em>not</em> stored unless I opt in.
              </label>
            </div>

            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", margin: "16px 0", padding: 16, background: "var(--warm-ivory)", borderRadius: 12, border: "1px solid var(--champagne-sparkle)" }}>
              <input id="cstore" type="checkbox" checked={storeOk} onChange={(e) => setStoreOk(e.target.checked)} style={{ marginTop: 2 }} />
              <label htmlFor="cstore" style={{ fontSize: 14, lineHeight: 1.5, color: "var(--deep-navy)" }}>
                I consent to let KeraNova store this photo to improve the model (optional).
              </label>
            </div>

            <a href="#" target="_blank" style={{ color: "var(--muted-terracotta)", fontSize: 14, textDecoration: "underline", display: "block", marginBottom: 24 }} rel="noreferrer">
              Privacy Policy
            </a>

            <div style={{ marginTop: 24 }}>
              <button
                onClick={analyze}
                disabled={!file || !ageOk}
                style={{
                  background: !file || !ageOk ? "var(--caramel-tan)" : "var(--rich-chocolate)",
                  color: "var(--warm-ivory)",
                  border: 0,
                  padding: "16px 32px",
                  borderRadius: 16,
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: !file || !ageOk ? "not-allowed" : "pointer",
                  opacity: !file || !ageOk ? 0.6 : 1,
                  transition: "all 0.2s ease",
                  boxShadow: !file || !ageOk ? "none" : "0 4px 16px rgba(61, 43, 32, 0.3)",
                }}
              >
                Analyze Hair Type
              </button>
              <span style={{ marginLeft: 16, color: "var(--muted-terracotta)", fontSize: 14, fontStyle: "italic" }}>
                {status}
              </span>
            </div>

            {showResult && (
              <div style={{ marginTop: 32, padding: 24, background: "var(--warm-ivory)", borderRadius: 16, border: "2px solid var(--burnished-gold)" }}>
                <div className="result-header" style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, margin: "0 0 12px", color: "var(--rich-chocolate)", letterSpacing: "-0.01em" }}>
                  {label} — {pct}%
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.6, color: "var(--deep-navy)" }}>{desc}</div>
              </div>
            )}
          </div>

          {/* Right card: Typeform */}
          <div id="typeform-card" style={{ background: "var(--soft-cream)", borderRadius: 20, padding: 32, position: "relative", boxShadow: "0 8px 32px rgba(61, 43, 32, 0.1)", border: "1px solid var(--champagne-sparkle)" }}>
            <button
              onClick={() => {
                const el = document.getElementById("typeform-card")
                if (el) el.style.display = "none"
              }}
              aria-label="Close"
              style={{
                position: "absolute",
                top: 16,
                right: 20,
                background: "#3D2B20",
                border: "none",
                fontSize: 20,
                cursor: "pointer",
                color: "#F5F1E8",
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
              }}
            >
              &times;
            </button>
            <label className="section-header" style={{ fontSize: 20, fontWeight: 600, color: "var(--rich-chocolate)", marginBottom: 20, display: "block" }}>
              Leave your email (optional)
            </label>
            <div id="tf-form" style={{ minHeight: 500 }} />
          </div>
        </div>

        {/* Small privacy footer (collapsible) */}
        <footer style={{ margin: "48px 0 24px", fontSize: 12, color: "var(--muted-terracotta)", textAlign: "center" }}>
          <div>
            <strong>Privacy:</strong> Effective September 9, 2025 —{" "}
            <details style={{ marginTop: 16, textAlign: "left", maxWidth: 800, margin: "16px auto 0" }}>
              <summary style={{ cursor: "pointer", color: "var(--rich-chocolate)", listStyle: "none", display: "inline", fontWeight: 600 }}>
                View policy
              </summary>
              <div style={{ marginTop: 16, maxHeight: 280, overflow: "auto", border: "1px solid var(--caramel-tan)", padding: 20, borderRadius: 12, background: "var(--warm-ivory)", fontSize: 13, lineHeight: 1.5 }}>
                <p style={{ margin: 0, color: "var(--deep-navy)" }}>
                  We collect uploaded photo, the model's hair-type prediction and confidence, your consent choices (13+ / store photo), optional contact details, basic device/usage data, and UTM parameters. We do not sell
                  personal information or share it for cross-context behavioral advertising. Photos are processed transiently and not stored unless you opt in; stored photos are kept until you request deletion.
                  Contact: privacy@keranovahair.com.
                </p>
              </div>
            </details>
          </div>
        </footer>
      </main>
    </>
  )
}
