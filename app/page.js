"use client";
import { useState, useRef, useCallback } from "react";

var STYLES = [
  { id: "streetwear", name: "Streetwear", color: "#00d4ff" },
  { id: "casual", name: "Casual", color: "#4ade80" },
  { id: "luxury", name: "Luxury", color: "#cdbdff" },
  { id: "minimalist", name: "Minimalist", color: "#e5e2e1" },
  { id: "avantgarde", name: "Avant-Garde", color: "#ec4899" },
];

export default function Home() {
  var _s = useState, _r = useRef, _c = useCallback;
  var [step, setStep] = _s("upload");
  var [photo, setPhoto] = _s(null);
  var [garment, setGarment] = _s(null);
  var [sel, setSel] = _s([]);
  var [prog, setProg] = _s(0);
  var [status, setStatus] = _s("");
  var [errMsg, setErrMsg] = _s("");
  var [result, setResult] = _s(null);
  var fRef = _r(null), gRef = _r(null);

  var loadImg = function(file, setter) {
    if (!file || !file.type || !file.type.startsWith("image/")) return;
    var r = new FileReader();
    r.onload = function(e) { setter(e.target.result); };
    r.readAsDataURL(file);
  };

  var go = _c(function() {
    setStep("processing"); setProg(0); setErrMsg("");
    var p = 0;
    var iv = setInterval(function() { p += 0.4; setProg(Math.min(p, 95)); }, 100);

    (async function() {
      try {
        setStatus("Fotoğraf analiz ediliyor...");
        var aResp = await fetch("/api/analyze", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photo: photo, styles: sel }),
        });
        var aData = await aResp.json();
        if (aData.error) throw new Error(aData.error);
        var analysis = aData.analysis;
        setProg(25);

        var gUrl = garment;
        if (!gUrl && analysis && analysis.outfitPieces && analysis.outfitPieces[0]) {
          setStatus("Kıyafet görseli aranıyor...");
          var gResp = await fetch("/api/analyze", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ findGarment: true, garmentQuery: analysis.outfitPieces[0] }),
          });
          var gData = await gResp.json();
          if (gData.garmentUrl) gUrl = gData.garmentUrl;
        }
        setProg(45);

        var tryOnImg = null;
        var method = "none";
        if (gUrl) {
          setStatus("Virtual try-on oluşturuluyor (30-60 sn)...");
          var tResp = await fetch("/api/tryon", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ humanImage: photo, garmentImage: gUrl, clothType: "overall" }),
          });
          var tData = await tResp.json();
          if (tData.success && tData.image) { tryOnImg = tData.image; method = "ai-tryon"; }
          else if (tData.error) setErrMsg("Try-on: " + tData.error);
        } else {
          setErrMsg("Kıyafet görseli bulunamadı — kıyafet yükleyerek tekrar deneyin");
        }

        clearInterval(iv); setProg(100);
        setResult({ analysis: analysis, styledPhoto: tryOnImg, method: method });
        setTimeout(function() { setStep("result"); }, 500);
      } catch (err) {
        clearInterval(iv);
        setErrMsg(err.message);
        setStatus("Hata oluştu");
      }
    })();
  }, [photo, garment, sel]);

  var P = { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "#131313", color: "#e5e2e1", fontFamily: "Inter,sans-serif" };
  var H = { fontFamily: "Manrope", fontWeight: 800, fontSize: 36, letterSpacing: -2, marginBottom: 8, textAlign: "center" };
  var B = function(active) { return { padding: "14px 32px", borderRadius: 14, fontWeight: 700, fontSize: 15, border: "none", cursor: active ? "pointer" : "not-allowed", background: active ? "linear-gradient(135deg,#cdbdff,#5d21df)" : "#333", color: active ? "#370096" : "#666", fontFamily: "Manrope" }; };

  // UPLOAD
  if (step === "upload") return (
    <div style={P}>
      <h1 style={H}>Fotoğrafını Yükle</h1>
      <p style={{ color: "#888", fontSize: 14, marginBottom: 32 }}>AI analiz edip kıyafetleri üzerine giydirecek</p>
      <div onClick={function() { fRef.current && fRef.current.click(); }} style={{ width: "100%", maxWidth: 600, height: photo ? 400 : 220, borderRadius: 16, background: "#0e0e0e", border: "2px dashed #333", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" }}>
        <input ref={fRef} type="file" accept="image/*" hidden onChange={function(e) { loadImg(e.target.files[0], setPhoto); }} />
        {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ textAlign: "center" }}><div style={{ fontSize: 48 }}>📸</div><p style={{ fontWeight: 600 }}>Fotoğrafı Sürükle veya Seç</p></div>}
      </div>
      <div onClick={function() { gRef.current && gRef.current.click(); }} style={{ width: "100%", maxWidth: 600, height: garment ? 140 : 70, borderRadius: 12, background: "#0e0e0e", border: "1px dashed #333", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", marginTop: 12 }}>
        <input ref={gRef} type="file" accept="image/*" hidden onChange={function(e) { loadImg(e.target.files[0], setGarment); }} />
        {garment ? <img src={garment} alt="" style={{ height: "100%", objectFit: "contain" }} /> : <p style={{ color: "#888", fontSize: 13 }}>👔 Kıyafet görseli (opsiyonel — AI otomatik bulur)</p>}
      </div>
      <button onClick={function() { if (photo) setStep("style"); }} disabled={!photo} style={B(!!photo)}>Devam Et</button>
    </div>
  );

  // STYLE
  if (step === "style") return (
    <div style={P}>
      <h1 style={H}>Stilini Seç</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12, width: "100%", maxWidth: 600, marginBottom: 32 }}>
        {STYLES.map(function(s) { var on = sel.indexOf(s.id) >= 0; return (
          <div key={s.id} onClick={function() { setSel(function(p) { return p.indexOf(s.id) >= 0 ? p.filter(function(x) { return x !== s.id; }) : p.concat(s.id); }); }} style={{ padding: 24, borderRadius: 14, textAlign: "center", cursor: "pointer", background: on ? s.color + "20" : "#1c1b1b", border: on ? "2px solid " + s.color : "2px solid transparent" }}>
            <span style={{ fontWeight: 700, color: on ? s.color : "#888" }}>{s.name}</span>
          </div>
        ); })}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={function() { setStep("upload"); }} style={{ padding: "14px 28px", borderRadius: 12, border: "1px solid #333", color: "#888", background: "none", cursor: "pointer" }}>Geri</button>
        <button onClick={go} disabled={!sel.length} style={B(sel.length > 0)}>Kombini Oluştur</button>
      </div>
    </div>
  );

  // PROCESSING
  if (step === "processing") return (
    <div style={P}>
      <div style={{ fontSize: 64, marginBottom: 24 }}>🧠</div>
      <h2 style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 24, marginBottom: 8 }}>{status || "İşleniyor..."}</h2>
      <div style={{ width: 300, height: 4, background: "#2a2a2a", borderRadius: 99, overflow: "hidden", marginTop: 16 }}>
        <div style={{ height: "100%", background: "linear-gradient(to right,#cdbdff,#a6e6ff)", width: prog + "%", transition: "width 0.3s" }}></div>
      </div>
      <p style={{ color: "#888", marginTop: 8, fontSize: 13 }}>{Math.round(prog)}%</p>
      {errMsg && <p style={{ color: "#ffb4ab", marginTop: 12, fontSize: 13, maxWidth: 500, textAlign: "center" }}>{errMsg}</p>}
    </div>
  );

  // RESULT
  if (step === "result" && result) {
    var a = result.analysis;
    var sp = result.styledPhoto;
    var mt = result.method;
    return (
      <div style={{ minHeight: "100vh", padding: "40px 20px", background: "#131313", color: "#e5e2e1", fontFamily: "Inter,sans-serif", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{ color: "#a6e6ff", fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Analiz Tamamlandı</p>
          <h1 style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 40 }}>Your Style <span style={{ background: "linear-gradient(to right,#cdbdff,#a6e6ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Refined.</span></h1>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
          <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", aspectRatio: "3/4", background: "#1c1b1b" }}>
            {photo && <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.7)", padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#888" }}>Önce</div>
          </div>
          <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", aspectRatio: "3/4", background: "#1c1b1b" }}>
            {sp ? <img src={sp} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: 24 }}><p style={{ color: "#888" }}>Try-on başarısız</p>{errMsg && <p style={{ color: "#ffb4ab", fontSize: 12, marginTop: 8, textAlign: "center" }}>{errMsg}</p>}</div>}
            <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
              <span style={{ background: "rgba(205,189,255,0.3)", padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#cdbdff" }}>Sonra</span>
              <span style={{ padding: "4px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700, textTransform: "uppercase", background: mt === "ai-tryon" ? "rgba(74,222,128,0.2)" : "rgba(255,180,171,0.2)", color: mt === "ai-tryon" ? "#4ade80" : "#ffb4ab" }}>{mt === "ai-tryon" ? "AI TRY-ON ✓" : "BAŞARISIZ"}</span>
            </div>
          </div>
        </div>
        {a && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "#1c1b1b", borderRadius: 14, padding: 24 }}>
              <h3 style={{ fontFamily: "Manrope", fontWeight: 700, marginBottom: 16 }}>Vücut Analizi</h3>
              {[{l:"Vücut",v:a.bodyType,c:"#cdbdff"},{l:"Ten",v:a.skinTone,c:"#a6e6ff"},{l:"Yüz",v:a.faceShape,c:"#4ade80"}].map(function(x) { return (
                <div key={x.l} style={{ padding: 10, background: "#0e0e0e", borderRadius: 8, marginBottom: 8, borderLeft: "2px solid " + x.c }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: x.c }}>{x.l}</span>
                  <p style={{ fontSize: 13, color: "#cbc3d9", marginTop: 4 }}>{x.v}</p>
                </div>
              ); })}
            </div>
            <div style={{ background: "#1c1b1b", borderRadius: 14, padding: 24 }}>
              <h3 style={{ fontFamily: "Manrope", fontWeight: 700, marginBottom: 16 }}>AI Kombin</h3>
              <p style={{ fontSize: 14, color: "#cbc3d9", lineHeight: 1.6, marginBottom: 16 }}>{a.recommendedOutfit}</p>
              {a.outfitPieces && <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{a.outfitPieces.map(function(p,i) { return <span key={i} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, background: "rgba(205,189,255,0.1)", color: "#cdbdff" }}>{p}</span>; })}</div>}
            </div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
          <button onClick={function() { setStep("upload"); setPhoto(null); setGarment(null); setResult(null); setSel([]); setErrMsg(""); }} style={{ padding: "14px 32px", borderRadius: 14, fontWeight: 700, border: "none", cursor: "pointer", background: "#2a2a2a", color: "#e5e2e1" }}>Tekrar Dene</button>
        </div>
      </div>
    );
  }
  return null;
}
