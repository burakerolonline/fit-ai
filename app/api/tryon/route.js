export const maxDuration = 60;

export async function POST(request) {
  try {
    var body = await request.json();
    var humanImage = body.humanImage;
    var garmentImage = body.garmentImage;

    if (!humanImage || !garmentImage) {
      return Response.json({ error: "humanImage and garmentImage required" }, { status: 400 });
    }

    // HuggingFace Space: Nymbo/Virtual-Try-On (free, no auth needed)
    var SPACES = [
      "https://nymbo-virtual-try-on.hf.space",
      "https://yisol-idm-vton.hf.space",
    ];

    var resultImage = null;
    var usedSpace = null;

    for (var s = 0; s < SPACES.length; s++) {
      var space = SPACES[s];
      try {
        resultImage = await trySpace(space, humanImage, garmentImage);
        if (resultImage) { usedSpace = space; break; }
      } catch (e) {
        console.log("Space " + space + " failed:", e.message);
      }
    }

    if (resultImage) {
      return Response.json({ success: true, image: resultImage, space: usedSpace });
    }

    return Response.json({ error: "All HuggingFace Spaces failed. They may be overloaded — try again in a few minutes." }, { status: 503 });

  } catch (error) {
    console.error("Try-on error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function trySpace(spaceUrl, humanImage, garmentImage) {
  // Gradio API: Submit job
  var submitResp = await fetch(spaceUrl + "/call/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        { url: humanImage },
        { url: garmentImage },
        "A person wearing the garment",
        true,
        true,
        30,
        42
      ]
    }),
  });

  if (!submitResp.ok) {
    // Try alternative Gradio API format
    submitResp = await fetch(spaceUrl + "/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [humanImage, garmentImage, "A person wearing the garment", true, true, 30, 42],
        fn_index: 0,
      }),
    });

    if (!submitResp.ok) throw new Error("Submit failed: " + submitResp.status);
    
    // Synchronous response
    var syncData = await submitResp.json();
    return extractImage(syncData.data, spaceUrl);
  }

  var submitData = await submitResp.json();
  var eventId = submitData.event_id;

  if (!eventId) throw new Error("No event_id returned");

  // Poll for result (max 90 seconds)
  for (var i = 0; i < 30; i++) {
    await sleep(3000);

    var resultResp = await fetch(spaceUrl + "/call/process/" + eventId);
    var text = await resultResp.text();

    // Parse SSE format
    var lines = text.split("\n");
    for (var j = lines.length - 1; j >= 0; j--) {
      var line = lines[j];
      if (line.startsWith("data:")) {
        var dataStr = line.substring(5).trim();
        try {
          var parsed = JSON.parse(dataStr);
          var img = extractImage(parsed, spaceUrl);
          if (img) return img;
        } catch (e) {}
      }
    }

    // Check if complete
    if (text.indexOf("event: complete") >= 0 || text.indexOf("event: error") >= 0) {
      break;
    }
  }

  return null;
}

function extractImage(data, spaceUrl) {
  if (!data) return null;
  
  // Handle array format [image, ...]
  var items = Array.isArray(data) ? data : [data];
  
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (!item) continue;
    
    // Direct URL string
    if (typeof item === "string" && item.startsWith("http")) return item;
    
    // Object with url
    if (item.url && item.url.startsWith("http")) return item.url;
    
    // Object with path (Gradio file)
    if (item.path) return spaceUrl + "/file=" + item.path;
    
    // Nested in .value
    if (item.value) {
      if (typeof item.value === "string" && item.value.startsWith("http")) return item.value;
      if (item.value.url) return item.value.url;
      if (item.value.path) return spaceUrl + "/file=" + item.value.path;
    }
  }
  return null;
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}
