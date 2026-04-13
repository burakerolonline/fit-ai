import { fal } from "@fal-ai/client";

export const maxDuration = 60;

export async function POST(request) {
  try {
    var body = await request.json();

    if (!process.env.FAL_KEY) {
      return Response.json({ error: "FAL_KEY not set" }, { status: 500 });
    }

    fal.config({ credentials: process.env.FAL_KEY });

    // Upload base64 images to fal storage first
    var humanUrl = body.humanImage;
    var garmentUrl = body.garmentImage;

    if (humanUrl && humanUrl.startsWith("data:")) {
      var hBlob = dataURLtoBlob(humanUrl);
      humanUrl = await fal.storage.upload(hBlob);
    }

    if (garmentUrl && garmentUrl.startsWith("data:")) {
      var gBlob = dataURLtoBlob(garmentUrl);
      garmentUrl = await fal.storage.upload(gBlob);
    }

    // Call fal.ai cat-vton
    var result = await fal.subscribe("fal-ai/cat-vton", {
      input: {
        human_image_url: humanUrl,
        garment_image_url: garmentUrl,
        cloth_type: body.clothType || "overall",
      },
    });

    if (result.data?.image?.url) {
      return Response.json({ success: true, image: result.data.image.url });
    }

    return Response.json({ error: "No image in result" }, { status: 500 });
  } catch (error) {
    console.error("Try-on error:", error);
    return Response.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}

function dataURLtoBlob(dataURL) {
  var parts = dataURL.split(",");
  var mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  var binary = atob(parts[1]);
  var arr = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
