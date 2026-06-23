"use client";

import { useEffect, useRef, useState } from "react";
import CardTile from "@/components/CardTile";

export default function ScanPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [identified, setIdentified] = useState(null);
  const [candidates, setCandidates] = useState([]);

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreaming(true);
      }
    } catch (e) {
      setError("Couldn't access the camera. " + (e.message || ""));
    }
  }

  function stopCamera() {
    const v = videoRef.current;
    if (v?.srcObject) {
      v.srcObject.getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    }
    setStreaming(false);
  }

  async function capture() {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    await identify(dataUrl);
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => identify(reader.result);
    reader.readAsDataURL(file);
  }

  async function identify(dataUrl) {
    setBusy(true);
    setError(null);
    setIdentified(null);
    setCandidates([]);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const d = await res.json();
      if (d.error) setError(d.error);
      setIdentified(d.identified || null);
      setCandidates(d.candidates || []);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap" style={{ maxWidth: 820 }}>
      <h1 className="display" style={{ fontSize: 24, marginBottom: 6 }}>
        Scan a card
      </h1>
      <p style={{ color: "var(--t2)", marginBottom: 16 }}>
        Point your camera at a card (English or Japanese) to identify and add it. Or upload a photo.
      </p>

      <div className="card" style={{ padding: 16 }}>
        <div
          style={{
            position: "relative",
            aspectRatio: "4 / 3",
            background: "var(--sf3)",
            borderRadius: "var(--r-sm)",
            overflow: "hidden",
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover", display: streaming ? "block" : "none" }}
          />
          {!streaming && (
            <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--t3)" }}>
              <i className="ti ti-camera" style={{ fontSize: 36 }} />
            </div>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {!streaming ? (
            <button className="btn" onClick={startCamera}>
              <i className="ti ti-camera" /> Start camera
            </button>
          ) : (
            <>
              <button className="btn" onClick={capture} disabled={busy}>
                <i className="ti ti-capture" /> {busy ? "Identifying…" : "Capture & identify"}
              </button>
              <button className="tool" onClick={stopCamera}>
                Stop
              </button>
            </>
          )}
          <label className="tool" style={{ cursor: "pointer" }}>
            <i className="ti ti-upload" /> Upload photo
            <input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
          </label>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: 14, color: "var(--wn)", marginTop: 14 }}>
          <i className="ti ti-alert-triangle" /> {error}
        </div>
      )}

      {identified && (
        <div className="card" style={{ padding: 16, marginTop: 14 }}>
          <h3 style={{ fontSize: 14, marginBottom: 6 }}>Identified</h3>
          <p style={{ margin: 0 }}>
            <strong>{identified.name}</strong>
            {identified.name_original && identified.name_original !== identified.name
              ? ` · ${identified.name_original}`
              : ""}
          </p>
          <p className="xs" style={{ marginTop: 2 }}>
            {[identified.set, identified.number && `#${identified.number}`, identified.language?.toUpperCase()]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}

      {candidates.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, margin: "18px 0 10px" }}>Matches — tap to open & add</h3>
          <div className="grid">
            {candidates.map((c) => (
              <CardTile key={c.id} card={c} />
            ))}
          </div>
        </>
      )}

      <CenteringTool />
    </div>
  );
}

// Simple, genuinely-useful centering calculator (manual border inputs).
// Full automatic centering from the photo is a later enhancement.
function CenteringTool() {
  const [l, setL] = useState("");
  const [r, setR] = useState("");
  const [t, setT] = useState("");
  const [b, setB] = useState("");

  const hz = pct(l, r);
  const vt = pct(t, b);

  return (
    <div className="card" style={{ padding: 16, marginTop: 20 }}>
      <h3 style={{ fontSize: 14, marginBottom: 6 }}>Centering calculator</h3>
      <p className="xs" style={{ marginBottom: 12 }}>
        Enter the border widths (any unit) to estimate centering — a key grading factor.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="fi" style={{ width: 90 }} placeholder="Left" value={l} onChange={(e) => setL(e.target.value)} />
        <input className="fi" style={{ width: 90 }} placeholder="Right" value={r} onChange={(e) => setR(e.target.value)} />
        <input className="fi" style={{ width: 90 }} placeholder="Top" value={t} onChange={(e) => setT(e.target.value)} />
        <input className="fi" style={{ width: 90 }} placeholder="Bottom" value={b} onChange={(e) => setB(e.target.value)} />
      </div>
      {(hz || vt) && (
        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
          {hz && <span className="pill">Horizontal {hz}</span>}
          {vt && <span className="pill">Vertical {vt}</span>}
        </div>
      )}
    </div>
  );
}

function pct(a, b) {
  const x = Number(a);
  const y = Number(b);
  if (!x || !y) return null;
  const total = x + y;
  const lo = Math.round((Math.min(x, y) / total) * 100);
  const hi = 100 - lo;
  return `${hi}/${lo}`;
}
