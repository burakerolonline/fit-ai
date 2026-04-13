// app/api/analyze/route.js
// Anthropic API ile fotoğraf analizi + kıyafet görseli arama

export async function POST(request) {
  try {
    const { photo, styles, findGarment, garmentQuery } = await request.json();
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

    if (!ANTHROPIC_KEY) {
      return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    }

    // If findGarment mode — search for garment image
    if (findGarment) {
      const searchResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 600,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{
            role: "user",
            content: `Search for a product photo of "${garmentQuery}" clothing item on a plain white background. Find a direct image URL (.jpg, .png, .webp) from a shopping or fashion catalog. Return ONLY the direct image URL.`
          }],
        }),
      });

      const searchData = await searchResp.json();
      const text = (searchData.content || []).map(c => c.text || "").filter(Boolean).join(" ");
      const urls = text.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/gi);

      return Response.json({ garmentUrl: urls?.[0] || null });
    }

    // Photo analysis mode
    const userContent = [];
    if (photo) {
      const base64 = photo.split(",")[1];
      const mediaType = photo.split(";")[0].split(":")[1] || "image/jpeg";
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64 },
      });
    }

    const styleNames = styles?.join(", ") || "luxury";
    userContent.push({
      type: "text",
      text: `Bu kişinin fotoğrafını analiz et. Seçtiği stiller: ${styleNames}.

SADECE JSON döndür:
{
  "bodyType": "vücut tipi (1 cümle)",
  "skinTone": "ten rengi (1 cümle)",
  "faceShape": "yüz şekli (1 cümle)",
  "currentStyle": "mevcut giyim tarzı (1 cümle)",
  "recommendedOutfit": "önerilen kombin detaylı (3-4 cümle)",
  "colorRecommendation": "renk önerileri (2 cümle)",
  "fitTips": "kesim önerileri (2 cümle)",
  "avoidList": "kaçınılacaklar (1-2 cümle)",
  "score": 8.5-9.8,
  "tier": "Elite Tier veya Premium Tier",
  "outfitPieces": ["parça1", "parça2", "parça3", "parça4", "parça5"]
}
Türkçe yaz.`,
    });

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    const data = await resp.json();
    const text = (data.content || []).map(c => c.text || "").join("");
    const analysis = JSON.parse(text.replace(/```json|```/g, "").trim());

    return Response.json({ analysis });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
