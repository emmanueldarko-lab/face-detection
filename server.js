// FaceRec backend: Node.js + Express (ES modules)
import "dotenv/config";
import express from "express";
import multer from "multer";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;
const MAX_BYTES = 15 * 1024 * 1024; // matches the frontend limit
const API_URL =
  process.env.ULTRALYTICS_API_URL ||
  "https://predict-6afa06239b676272a74fb8e5-dproatj77a-og.a.run.app/predict";
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) =>
    ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new Error("UNSUPPORTED_TYPE"))
});

app.use(cors());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", model_configured: Boolean(process.env.ULTRALYTICS_API_KEY) });
});

// Normalise the Ultralytics response into the shape the frontend uses.
function normalise(result) {
  const img = result?.images?.[0] || {};
  const shape = img.shape || []; // [height, width]
  const detections = (img.results || []).map((d) => {
    const b = d.box || {};
    return {
      class_name: d.name || "face",
      confidence: Number(d.confidence) || 0,
      x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2
    };
  });
  return {
    face_count: detections.length,
    detections,
    image_height: shape[0] ?? null,
    image_width: shape[1] ?? null
  };
}

async function handlePredict(req, res) {
  const apiKey = process.env.ULTRALYTICS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ULTRALYTICS_API_KEY is not set on the server." });
  if (!req.file) return res.status(400).json({ error: "Please upload an image (field name: file)." });
  try {
    const form = new FormData();
    form.append("file", new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);
    form.append("conf", "0.25");
    form.append("iou", "0.5");
    form.append("imgsz", "640");
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(180000)
    });
    const text = await response.text();
    let result;
    try { result = JSON.parse(text); } catch { result = {}; }
    if (!response.ok) {
      console.error("Model API error:", response.status);
      return res.status(response.status).json({
        error: (typeof result.detail === "string" && result.detail) || result.error || `Model API returned HTTP ${response.status}.`
      });
    }
    res.json(normalise(result));
  } catch (err) {
    console.error("FaceRec backend error:", err.message);
    const timeout = err.name === "TimeoutError";
    res.status(timeout ? 504 : 502).json({
      error: timeout ? "The model took too long to respond." : "Unable to reach the AI model."
    });
  }
}

app.post("/api/detect", upload.single("file"), handlePredict);
app.post("/api/predict", upload.single("file"), handlePredict); // backwards-compatible alias

// Serve the built frontend if it exists
const dist = path.join(__dirname, "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// Error handler (multer errors, etc.)
app.use((err, _req, res, _next) => {
  if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "Image is larger than 15 MB." });
  if (err.message === "UNSUPPORTED_TYPE") return res.status(415).json({ error: "Only JPG, PNG or WEBP images are supported." });
  console.error(err);
  res.status(500).json({ error: "Unexpected server error." });
});

// On Vercel the platform handles listening; locally we start the server.
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`FaceRec backend running on http://localhost:${PORT}`));
}

export default app;
