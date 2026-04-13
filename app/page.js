"use client";
import { useState, useRef, useCallback } from "react";

const STYLES = [
  { id: "streetwear", name: "Streetwear", color: "#00d4ff" },
  { id: "casual", name: "Casual", color: "#4ade80" },
  { id: "luxury", name: "Luxury", color: "#cdbdff" },
  { id: "minimalist", name: "Minimalist", color: "#e5e2e1" },
  { id: "avantgarde", name: "Avant-Garde", color: "#ec4899" },
];

export default function Home() {
  const [step, setStep] = useState("upload"); // upload | style | processing | result
  const [photo, setPhoto] = useState(null);
  const [garment, setGarment] = useState(null);
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);
  const garmentRef = useRef(null);

  const loadImage = (file, setter) => {
    if (!file?.type?.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setter(e.target.result);
    reader.readAsDataURL(file);
  };

  const startProcessing = useCallback(async () => {
    setStep("processing");
    setProgress(0);

    // Progress animation
    let prog = 0;
    const progInterval = setInterval(() => {
      prog += 0.5;
      setProgress(Math.min(prog, 95));
    }, 100);

    try {
      // Step 1: AI Analysis
      setStatusText("Fotoğraf analiz ediliyor...");
      const analyzeResp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo, styles: selectedStyles }),
      });
      const { analysis } = await analyzeResp.json();
      setProgress(30);

      // Step 2: Find garment image (if not uploaded)
      let garmentUrl = garment;
      if (!garmentUrl && analysis?.outfitPieces?.[0]) {
        setStatusText("Kıyafet görseli aranıyor...");
        const garmentResp = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ findGarment: true, garmentQuery: analysis.outfitPieces[0] }),
        });
        const { garmentUrl: foundUrl } = await garmentResp.json();
        if (foundUrl) garmentUrl = foundUrl;
      }
      setProgress(50);

      // Step 3: Virtual Try-On
      let tryOnImage = null;
      let method = "none";

      if (garmentUrl) {
        setStatusText("Virtual try-on oluşturuluyor...");
        try {
          const tryonResp = await fetch("/api/tryon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              humanImage: photo,
              garmentImage: garmentUrl,
              clothType: "overall",
            }),
          });
          const tryonData = await tryonResp.json();
          if (tryonData.success && tryonData.image) {
            tryOnImage = tryonData.image;
            method = "ai-tryon";
          }
        } catch (e) {
          console.error("Try-on failed:", e);
        }
      }

      setProgress(95);
      setStatusText("Tamamlanıyor...");

      clearInterval(progInterval);
      setProgress(100);

      setResult({
        analysis,
        styledPhoto: tryOnImage,
        method,
        garmentUrl,
      });

      setTimeout(() => setStep("result"), 500);
    } catch (error) {
      clearInterval(progInterval);
      console.error("Processing failed:", error);
      setStatusText("Hata: " + error.message);
    }
  }, [photo, garment, selectedStyles]);

  // ─── UPLOAD STEP ───
  if (step === "upload") {
    return (
      <div style={page}>
        <h1 style={heading}>Fotoğrafını Yükle</h1>
        <p style={sub}>AI seni analiz edecek ve önerdiği kıyafetleri üzerine giydirecek</p>

        <div onClick={() => fileRef.current?.click()} style={{ ...dropzone, height: photo ? 400 : 240 }}>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => loadImage(e.target.files?.[0], setPhoto)} />
          {photo ? (
            <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }} />
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
              <p style={{ fontWeight: 600 }}>Fotoğrafı sürükle veya tıkla</p>
              <p style={{ color: "#888", fontSize: 13, marginTop: 4 }}>Tam boy, iyi ışık</p>
            </div>
          )}
        </div>

        <div onClick={() => garmentRef.current?.click()} style={{ ...dropzone, height: garment ? 160 : 80, marginTop: 16 }}>
          <input ref={garmentRef} type="file" accept="image/*" hidden onChange={(e) => loadImage(e.target.files?.[0], setGarment)} />
          {garment ? (
            <img src={garment} alt="" style={{ height: "100%", objectFit: "contain" }} />
          ) : (
            <p style={{ color: "#888", fontSize: 13 }}>👔 Kıyafet görseli (opsiyonel — AI otomatik bulur)</p>
          )}
        </div>

        <button onClick={() => { if (photo) setStep("style"); }} disabled={!photo} style={{ ...btn, opacity: photo ? 1 : 0.4, marginTop: 24 }}>
          Devam Et
        </button>
      </div>
    );
  }

  // ─── STYLE STEP ───
  if (step === "style") {
    return (
      <div style={page}>
        <h1 style={heading}>Stilini Seç</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, width: "100%", maxWidth: 600 }}>
          {STYLES.map((s) => {
            const on = selectedStyles.includes(s.id);
            return (
              <div key={s.id} onClick={() => setSelectedStyles((p) => p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id])}
                style={{ padding: 24, borderRadius: 14, textAlign: "center", cursor: "pointer", background: on ? s.color + "20" : "#1c1b1b", border: on ? "2px solid " + s.color : "2px solid transparent", transition: "all 0.2s" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>👔</div>
                <span style={{ fontWeight: 700, color: on ? s.color : "#888" }}>{s.name}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          <button onClick={() => setStep("upload")} style={{ ...btn, background: "#2a2a2a" }}>Geri</button>
          <button onClick={startProcessing} disabled={selectedStyles.length === 0} style={{ ...btn, opacity: selectedStyles.length > 0 ? 1 : 0.4 }}>
            ✨ Kombini Oluştur
          </button>
        </div>
      </div>
    );
  }

  // ─── PROCESSING STEP ───
  if (step === "processing") {
    return (
      <div style={page}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🧠</div>
        <h2 style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 24, marginBottom: 8 }}>{statusText || "İşleniyor..."}</h2>
        <div style={{ width: 300, height: 4, background: "#2a2a2a", borderRadius: 99, overflow: "hidden", marginTop: 16 }}>
          <div style={{ height: "100%", background: "linear-gradient(to right, #cdbdff, #a6e6ff)", width: progress + "%", transition: "width 0.3s", borderRadius: 99 }} />
        </div>
        <p style={{ color: "#888", marginTop: 8, fontSize: 13 }}>{Math.round(progress)}%</p>
      </div>
    );
  }

  // ─── RESULT STEP ───
  if (step === "result" && result) {
    const { analysis, styledPhoto, method } = result;
    return (
      <div style={{ ...page, alignItems: "stretch", maxWidth: 1000 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{ color: "#a6e6ff", fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Analiz Tamamlandı</p>
          <h1 style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 40 }}>
            Your Style <span style={{ background: "linear-gradient(to right, #cdbdff, #a6e6ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Refined.</span>
          </h1>
        </div>

        {/* Before / After */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
          <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", aspectRatio: "3/4", background: "#1c1b1b" }}>
            {photo && <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.7)", padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#888" }}>Şimdiki</div>
          </div>
          <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", aspectRatio: "3/4", background: "#1c1b1b" }}>
            {styledPhoto ? (
              <img src={styledPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>
                <p>Try-on başarısız — backend API key'leri kontrol edin</p>
              </div>
            )}
            <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
              <span style={{ background: "rgba(205,189,255,0.3)", padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#cdbdff" }}>AI Öneri</span>
              <span style={{ padding: "4px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700, textTransform: "uppercase", background: method === "ai-tryon" ? "rgba(74,222,128,0.2)" : "rgba(255,180,171,0.2)", color: method === "ai-tryon" ? "#4ade80" : "#ffb4ab" }}>
                {method === "ai-tryon" ? "AI TRY-ON ✓" : "BAŞARISIZ"}
              </span>
            </div>
          </div>
        </div>

        {/* Analysis */}
        {analysis && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "#1c1b1b", borderRadius: 14, padding: 24 }}>
              <h3 style={{ fontFamily: "Manrope", fontWeight: 700, marginBottom: 16 }}>Vücut Analizi</h3>
              {[
                { label: "Vücut", value: analysis.bodyType },
                { label: "Ten", value: analysis.skinTone },
                { label: "Yüz", value: analysis.faceShape },
              ].map((x) => (
                <div key={x.label} style={{ padding: 10, background: "#0e0e0e", borderRadius: 8, marginBottom: 8, borderLeft: "2px solid #cdbdff" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#cdbdff", letterSpacing: 1 }}>{x.label}</span>
                  <p style={{ fontSize: 13, color: "#cbc3d9", marginTop: 4 }}>{x.value}</p>
                </div>
              ))}
            </div>
            <div style={{ background: "#1c1b1b", borderRadius: 14, padding: 24 }}>
              <h3 style={{ fontFamily: "Manrope", fontWeight: 700, marginBottom: 16 }}>AI Kombin Önerisi</h3>
              <p style={{ fontSize: 14, color: "#cbc3d9", lineHeight: 1.6, marginBottom: 16 }}>{analysis.recommendedOutfit}</p>
              {analysis.outfitPieces && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {analysis.outfitPieces.map((p, i) => (
                    <span key={i} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, background: "rgba(205,189,255,0.1)", color: "#cdbdff", border: "1px solid rgba(205,189,255,0.2)" }}>{p}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
          <button onClick={() => { setStep("upload"); setPhoto(null); setGarment(null); setResult(null); setSelectedStyles([]); }} style={{ ...btn, background: "#2a2a2a" }}>Tekrar Dene</button>
        </div>
      </div>
    );
  }

  return null;
}

const page = { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "#131313", color: "#e5e2e1", fontFamily: "Inter, system-ui, sans-serif" };
const heading = { fontFamily: "Manrope, sans-serif", fontWeight: 800, fontSize: 36, letterSpacing: -2, marginBottom: 8, textAlign: "center" };
const sub = { color: "#888", fontSize: 14, marginBottom: 32, textAlign: "center" };
const dropzone = { width: "100%", maxWidth: 600, borderRadius: 16, background: "#0e0e0e", border: "2px dashed #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" };
const btn = { padding: "14px 32px", borderRadius: 14, fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #cdbdff, #5d21df)", color: "#370096", fontFamily: "Manrope, sans-serif" };
