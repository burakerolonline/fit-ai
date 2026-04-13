// Vercel timeout: 60 saniye
export const maxDuration = 60;

export async function POST(request) {
  try {
    const body = await request.json();
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

    if (!ANTHROPIC_KEY) {
      return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    }

    // Kıyafet görseli arama modu
    if (body.findGarment) {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
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
            content: "Search for a product photo of \"" + body.garmentQuery + "\" clothing item on a plain white background. Find a direct image URL (.jpg, .png, .webp) from a shopping or fashion catalog website. Return ONLY the direct image URL, nothing else."
          }],
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        return Response.json({ error: "Anthropic API error: " + err }, { status: resp.status });
      }

      const data = await resp.json();
      const text = (data.content || []).map(function(c) { return c.text || ""; }).filter(Boolean).join(" ");
      const urls = text.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/gi);

      return Response.json({ garmentUrl: urls && urls[0] ? urls[0] : null });
    }

    // Fotoğraf analiz modu
    const userContent = [];
    if (body.photo) {
      const base64 = body.photo.split(",")[1];
      const mediaType = body.photo.split(";")[0].split(":")[1] || "image/jpeg";
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64 },
      });
    }

    const styleNames = body.styles && body.styles.length > 0 ? body.styles.join(", ") : "luxury";
    userContent.push({
      type: "text",
      text: "Bu kisinin fotografini analiz et. Sectigi stiller: " + styleNames + ". SADECE JSON dondur, baska bir sey yazma: {\"bodyType\":\"vucut tipi 1 cumle\",\"skinTone\":\"ten rengi 1 cumle\",\"faceShape\":\"yuz sekli 1 cumle\",\"currentStyle\":\"mevcut giyim tarzi 1 cumle\",\"recommendedOutfit\":\"onerilen kombin detayli 3-4 cumle\",\"colorRecommendation\":\"renk onerileri 2 cumle\",\"fitTips\":\"kesim onerileri 2 cumle\",\"avoidList\":\"kacinilacaklar 1-2 cumle\",\"score\":9.0,\"tier\":\"Elite Tier\",\"outfitPieces\":[\"parca1\",\"parca2\",\"parca3\",\"parca4\",\"parca5\"]}. Turkce yaz, kisiye ozel ol."
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

    if (!resp.ok) {
      const err = await resp.text();
      return Response.json({ error: "Anthropic API error: " + err }, { status: resp.status });
    }

    const data = await resp.json();
    const text = (data.content || []).map(function(c) { return c.text || ""; }).join("");
    const analysis = JSON.parse(text.replace(/```json|```/g, "").trim());

    return Response.json({ analysis: analysis });

  } catch (error) {
    console.error("Analyze error:", error);
    return Response.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
