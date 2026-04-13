import { fal } from "@fal-ai/client";

// Vercel timeout: 60 saniye (hobby plan max)
export const maxDuration = 60;

export async function POST(request) {
  try {
    const { humanImage, garmentImage, clothType } = await request.json();

    if (!process.env.FAL_KEY) {
      return Response.json({ error: "FAL_KEY environment variable not set" }, { status: 500 });
    }

    // fal.ai client'ı yapılandır
    fal.config({ credentials: process.env.FAL_KEY });

    // Base64 resimleri fal.ai storage'a yükle
    let humanUrl = humanImage;
    let garmentUrl = garmentImage;

    if (humanImage && humanImage.startsWith("data:")) {
      const humanBlob = dataURLtoBlob(humanImage);
      humanUrl = await fal.storage.upload(humanBlob);
    }

    if (garmentImage && garmentImage.startsWith("data:")) {
      const garmentBlob = dataURLtoBlob(garmentImage);
      garmentUrl = await fal.storage.upload(garmentBlob);
    }

    // fal.ai cat-vton modelini çağır (subscribe = queue + polling otomatik)
    const result = await fal.subscribe("fal-ai/cat-vton", {
      input: {
        human_image_url: humanUrl,
        garment_image_url: garmentUrl,
        cloth_type: clothType || "overall",
      },
    });

    if (result.data?.image?.url) {
      return Response.json({
        success: true,
        image: result.data.image.url,
        method: "fal-ai-cat-vton",
      });
    }

    return Response.json({ error: "No image in result", data: result.data }, { status: 500 });

  } catch (error) {
    console.error("Try-on error:", error);
    return Response.json({
      error: error.message || "Unknown error",
      details: error.body || error.toString(),
    }, { status: 500 });
  }
}

// Base64 data URL -> Blob
function dataURLtoBlob(dataURL) {
  const parts = dataURL.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}
