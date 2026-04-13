export const maxDuration = 60;

var PROMPT = function(styles) {
  return "Bu kisinin fotografini analiz et. Stiller: " + styles + ". SADECE JSON dondur: {\"bodyType\":\"vucut tipi 1 cumle\",\"skinTone\":\"ten rengi 1 cumle\",\"faceShape\":\"yuz sekli 1 cumle\",\"currentStyle\":\"mevcut giyim 1 cumle\",\"recommendedOutfit\":\"onerilen kombin 3-4 cumle\",\"colorRecommendation\":\"renk onerileri 2 cumle\",\"fitTips\":\"kesim onerileri 2 cumle\",\"avoidList\":\"kacinilacaklar 1-2 cumle\",\"score\":9.0,\"tier\":\"Elite Tier\",\"outfitPieces\":[\"parca1\",\"parca2\",\"parca3\",\"parca4\",\"parca5\"]}. Turkce yaz, kisiye ozel ol.";
};

async function analyzeWithOpenAI(photo, styles) {
  var key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("NO_KEY");
  var content = [];
  if (photo) content.push({ type: "image_url", image_url: { url: photo, detail: "low" } });
  content.push({ type: "text", text: PROMPT(styles) });
  var resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: content }], max_tokens: 1500 }),
  });
  if (!resp.ok) throw new Error("OpenAI " + resp.status);
  var data = await resp.json();
  var text = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function analyzeWithGemini(photo, styles) {
  var key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NO_KEY");
  var parts = [];
  if (photo) {
    var b64 = photo.split(",")[1];
    var mime = photo.split(";")[0].split(":")[1] || "image/jpeg";
    parts.push({ inline_data: { mime_type: mime, data: b64 } });
  }
  parts.push({ text: PROMPT(styles) });
  var resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + key, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: parts }], generationConfig: { maxOutputTokens: 1500 } }),
  });
  if (!resp.ok) throw new Error("Gemini " + resp.status);
  var data = await resp.json();
  var text = data.candidates && data.candidates[0] && data.candidates[0].content ? data.candidates[0].content.parts[0].text : "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function searchGarment(query) {
  // Try Gemini with Google Search
  var gKey = process.env.GEMINI_API_KEY;
  if (gKey) {
    try {
      var resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + gKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Find a direct image URL of \"" + query + "\" clothing product photo on white background from a shopping site. Return ONLY the URL ending in .jpg .png or .webp. Nothing else." }] }],
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 300 },
        }),
      });
      if (resp.ok) {
        var data = await resp.json();
        var allText = "";
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          data.candidates[0].content.parts.forEach(function(p) { if (p.text) allText += " " + p.text; });
        }
        var urls = allText.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/gi);
        if (urls && urls[0]) return urls[0];
      }
    } catch (e) { console.log("Gemini search failed:", e.message); }
  }

  // Fallback: Gemini without search tool (just ask it to suggest a URL pattern)
  // This won't find real URLs but prevents the whole flow from failing
  return null;
}

export async function POST(request) {
  try {
    var body;
    try {
      body = await request.json();
    } catch (e) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Garment search mode
    if (body.findGarment) {
      try {
        var url = await searchGarment(body.garmentQuery || "blazer jacket");
        return Response.json({ garmentUrl: url });
      } catch (e) {
        return Response.json({ garmentUrl: null });
      }
    }

    // Photo analysis: OpenAI → Gemini fallback
    var styles = body.styles && body.styles.length > 0 ? body.styles.join(", ") : "luxury";
    var analysis = null;

    // Try OpenAI
    try {
      analysis = await analyzeWithOpenAI(body.photo, styles);
    } catch (e) {
      console.log("OpenAI failed:", e.message, "-> trying Gemini");
      // Try Gemini
      try {
        analysis = await analyzeWithGemini(body.photo, styles);
      } catch (e2) {
        return Response.json({ error: "Analiz basarisiz. OpenAI ve Gemini API keylerini kontrol edin." }, { status: 500 });
      }
    }

    return Response.json({ analysis: analysis });

  } catch (error) {
    // ALWAYS return JSON, never plain text
    return Response.json({ error: error.message || "Unknown server error" }, { status: 500 });
  }
}
