// app/api/tryon/route.js
// Bu API route fal.ai'yi server-side çağırır — CORS sorunu yok!

export async function POST(request) {
  try {
    const { humanImage, garmentImage, clothType } = await request.json();
    const FAL_KEY = process.env.FAL_KEY;
    
    if (!FAL_KEY) {
      return Response.json({ error: "FAL_KEY environment variable not set" }, { status: 500 });
    }

    // Step 1: Submit to fal.ai queue
    const submitResp = await fetch("https://queue.fal.run/fal-ai/cat-vton", {
      method: "POST",
      headers: {
        "Authorization": "Key " + FAL_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        human_image_url: humanImage,
        garment_image_url: garmentImage,
        cloth_type: clothType || "overall",
      }),
    });

    if (!submitResp.ok) {
      const err = await submitResp.text();
      return Response.json({ error: "fal.ai submit failed: " + err }, { status: submitResp.status });
    }

    const { request_id, status_url, response_url } = await submitResp.json();

    // Step 2: Poll for completion (max 3 minutes)
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3000));
      
      const statusResp = await fetch(status_url, {
        headers: { "Authorization": "Key " + FAL_KEY },
      });
      const statusData = await statusResp.json();

      if (statusData.status === "COMPLETED") {
        // Get result
        const resultResp = await fetch(response_url, {
          headers: { "Authorization": "Key " + FAL_KEY },
        });
        const resultData = await resultResp.json();
        
        return Response.json({
          success: true,
          image: resultData.image?.url || null,
          method: "fal-ai-cat-vton",
        });
      }

      if (statusData.status === "FAILED") {
        return Response.json({ 
          error: "Try-on generation failed", 
          details: statusData 
        }, { status: 500 });
      }
    }

    return Response.json({ error: "Timeout waiting for result" }, { status: 504 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
