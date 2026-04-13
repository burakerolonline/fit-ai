export const maxDuration = 60;

// ─── FALLBACK CATALOG (last resort) ───
var FALLBACK = {
  blazer: "https://storage.googleapis.com/falserverless/model_assets/idm-vton/example/garment/00055_00.jpg",
  tshirt: "https://storage.googleapis.com/falserverless/catvton/tshirt.jpg",
  shirt: "https://storage.googleapis.com/falserverless/model_assets/idm-vton/example/garment/00034_00.jpg",
};
function fallbackGarment(pieces) {
  if (!pieces || !pieces[0]) return FALLBACK.tshirt;
  var p = pieces[0].toLowerCase();
  if (p.indexOf("blazer")>=0||p.indexOf("ceket")>=0||p.indexOf("jacket")>=0||p.indexOf("mont")>=0||p.indexOf("coat")>=0||p.indexOf("palto")>=0||p.indexOf("trench")>=0) return FALLBACK.blazer;
  if (p.indexOf("gomlek")>=0||p.indexOf("gömlek")>=0||p.indexOf("shirt")>=0&&p.indexOf("t-shirt")<0||p.indexOf("oxford")>=0) return FALLBACK.shirt;
  return FALLBACK.tshirt;
}

// ─── GEMINI GARMENT SEARCH (multiple attempts) ───
async function searchGarment(pieces) {
  var key = process.env.GEMINI_API_KEY;
  if (!key || !pieces || !pieces[0]) return null;

  // Try 3 different search queries for best results
  var queries = [
    pieces[0] + " product photo white background ecommerce",
    pieces[0] + " clothing flatlay photo png transparent",
    pieces[0] + " garment isolated white background shop",
  ];

  for (var q = 0; q < queries.length; q++) {
    try {
      var resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + key, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Search Google Images for "' + queries[q] + '". Find a DIRECT image URL that ends with .jpg .jpeg .png or .webp from a real website. The image should show the clothing item on a white or plain background. Return ONLY the full URL, nothing else. No markdown, no explanation.' }] }],
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 500 },
        }),
      });
      if (!resp.ok) continue;
      var data = await resp.json();
      var allText = "";
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        data.candidates[0].content.parts.forEach(function(p) { if (p.text) allText += " " + p.text; });
      }
      // Also check groundingMetadata for source URLs
      var meta = data.candidates && data.candidates[0] && data.candidates[0].groundingMetadata;
      if (meta && meta.groundingChunks) {
        meta.groundingChunks.forEach(function(c) { if (c.web && c.web.uri) allText += " " + c.web.uri; });
      }
      var urls = allText.match(/https?:\/\/[^\s"'<>\])+]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>\])]*)*/gi);
      if (urls && urls[0]) return urls[0];
    } catch (e) { continue; }
  }
  return null;
}

// ─── ANALYSIS FUNCTIONS ───
var PROMPT = function(s) {
  return "Bu kisinin fotografini analiz et. Stiller: " + s + ". SADECE JSON dondur: {\"bodyType\":\"vucut tipi 1 cumle\",\"skinTone\":\"ten rengi 1 cumle\",\"faceShape\":\"yuz sekli 1 cumle\",\"currentStyle\":\"mevcut giyim 1 cumle\",\"recommendedOutfit\":\"onerilen kombin 3-4 cumle\",\"colorRecommendation\":\"renk onerileri 2 cumle\",\"fitTips\":\"kesim onerileri 2 cumle\",\"avoidList\":\"kacinilacaklar 1-2 cumle\",\"score\":9.0,\"tier\":\"Elite Tier\",\"outfitPieces\":[\"parca1\",\"parca2\",\"parca3\",\"parca4\",\"parca5\"]}. Turkce yaz, kisiye ozel ol.";
};

async function withOpenAI(photo, styles) {
  var key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("NO_KEY");
  var c = [];
  if (photo) c.push({ type: "image_url", image_url: { url: photo, detail: "low" } });
  c.push({ type: "text", text: PROMPT(styles) });
  var r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: c }], max_tokens: 1500 }),
  });
  if (!r.ok) throw new Error("OpenAI " + r.status);
  var d = await r.json();
  return JSON.parse((d.choices[0].message.content || "").replace(/```json|```/g, "").trim());
}

async function withGemini(photo, styles) {
  var key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NO_KEY");
  var parts = [];
  if (photo) parts.push({ inline_data: { mime_type: photo.split(";")[0].split(":")[1] || "image/jpeg", data: photo.split(",")[1] } });
  parts.push({ text: PROMPT(styles) });
  var r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + key, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: parts }], generationConfig: { maxOutputTokens: 1500 } }),
  });
  if (!r.ok) throw new Error("Gemini " + r.status);
  var d = await r.json();
  return JSON.parse((d.candidates[0].content.parts[0].text || "").replace(/```json|```/g, "").trim());
}

// ─── MAIN HANDLER ───
export async function POST(request) {
  try {
    var body = await request.json();

    // Garment search mode
    if (body.findGarment) {
      // 1) Try Gemini Google Search (3 attempts with different queries)
      var url = await searchGarment(body.outfitPieces);
      // 2) Fallback to built-in catalog
      if (!url) url = fallbackGarment(body.outfitPieces);
      return Response.json({ garmentUrl: url });
    }

    // Photo analysis
    var styles = body.styles && body.styles.length > 0 ? body.styles.join(", ") : "luxury";
    var analysis = null;
    try { analysis = await withOpenAI(body.photo, styles); } catch (e) {
      console.log("OpenAI->Gemini:", e.message);
      try { analysis = await withGemini(body.photo, styles); } catch (e2) {
        return Response.json({ error: "API keylerini kontrol edin" }, { status: 500 });
      }
    }
    return Response.json({ analysis: analysis });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
