export const maxDuration = 60;

const PROMPT = function(styles) {
  return "Bu kisinin fotografini analiz et. Stiller: " + styles + ". SADECE JSON dondur: {\"bodyType\":\"vucut tipi 1 cumle\",\"skinTone\":\"ten rengi 1 cumle\",\"faceShape\":\"yuz sekli 1 cumle\",\"currentStyle\":\"mevcut giyim 1 cumle\",\"recommendedOutfit\":\"onerilen kombin 3-4 cumle\",\"colorRecommendation\":\"renk onerileri 2 cumle\",\"fitTips\":\"kesim onerileri 2 cumle\",\"avoidList\":\"kacinilacaklar 1-2 cumle\",\"score\":9.0,\"tier\":\"Elite Tier\",\"outfitPieces\":[\"parca1\",\"parca2\",\"parca3\",\"parca4\",\"parca5\"]}. Turkce yaz, kisiye ozel ol.";
};

const SEARCH_PROMPT = function(query) {
  return "Search for a product photo of \"" + query + "\" clothing item on a plain white background from a shopping website. Find the direct image URL ending in .jpg .png or .webp. Return ONLY the URL, nothing else.";
};

// ─── OpenAI GPT-4o ───
async function analyzeWithOpenAI(photo, styles) {
  var key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("NO_OPENAI_KEY");

  var content = [];
  if (photo) {
    content.push({ type: "image_url", image_url: { url: photo, detail: "low" } });
  }
  content.push({ type: "text", text: PROMPT(styles) });

  var resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: content }],
      max_tokens: 1500,
    }),
  });

  if (!resp.ok) {
    var err = await resp.text();
    throw new Error("OPENAI_FAIL:" + err);
  }

  var data = await resp.json();
  var text = data.choices?.[0]?.message?.content || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ─── Google Gemini (fallback) ───
async function analyzeWithGemini(photo, styles) {
  var key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NO_GEMINI_KEY");

  var parts = [];
  if (photo) {
    var base64 = photo.split(",")[1];
    var mime = photo.split(";")[0].split(":")[1] || "image/jpeg";
    parts.push({ inline_data: { mime_type: mime, data: base64 } });
  }
  parts.push({ text: PROMPT(styles) });

  var resp = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + key,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: parts }],
        generationConfig: { maxOutputTokens: 1500 },
      }),
    }
  );

  if (!resp.ok) {
    var err = await resp.text();
    throw new Error("GEMINI_FAIL:" + err);
  }

  var data = await resp.json();
  var text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ─── Garment Search (Gemini with Google Search grounding — free) ───
async function searchGarmentWithGemini(query) {
  var key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  var resp = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + key,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SEARCH_PROMPT(query) }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 300 },
      }),
    }
  );

  if (!resp.ok) return null;
  var data = await resp.json();
  var text = data.candidates?.[0]?.content?.parts?.map(function(p) { return p.text || ""; }).join(" ") || "";
  var urls = text.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/gi);
  return urls?.[0] || null;
}

// ─── Garment Search fallback: OpenAI ───
async function searchGarmentWithOpenAI(query) {
  var key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  try {
    var resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-search-preview",
        messages: [{ role: "user", content: SEARCH_PROMPT(query) }],
        max_tokens: 300,
      }),
    });
    if (!resp.ok) return null;
    var data = await resp.json();
    var text = data.choices?.[0]?.message?.content || "";
    var urls = text.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/gi);
    return urls?.[0] || null;
  } catch (e) { return null; }
}

// ─── MAIN HANDLER ───
export async function POST(request) {
  try {
    var body = await request.json();

    // Garment search mode
    if (body.findGarment) {
      var url = await searchGarmentWithGemini(body.garmentQuery);
      if (!url) url = await searchGarmentWithOpenAI(body.garmentQuery);
      return Response.json({ garmentUrl: url });
    }

    // Photo analysis: OpenAI first, Gemini fallback
    var styles = body.styles?.join(", ") || "luxury";
    var analysis = null;
    var usedApi = "none";

    try {
      analysis = await analyzeWithOpenAI(body.photo, styles);
      usedApi = "openai";
    } catch (openaiErr) {
      console.log("OpenAI failed:", openaiErr.message, "→ falling back to Gemini");
      try {
        analysis = await analyzeWithGemini(body.photo, styles);
        usedApi = "gemini";
      } catch (geminiErr) {
        return Response.json({
          error: "Both APIs failed. OpenAI: " + openaiErr.message + " | Gemini: " + geminiErr.message
        }, { status: 500 });
      }
    }

    return Response.json({ analysis: analysis, api: usedApi });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
