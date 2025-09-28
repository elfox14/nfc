"use strict";

// Load environment variables
require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { nanoid } = require("nanoid");
const { body, validationResult } = require("express-validator");
const { MongoClient } = require("mongodb");
const multer = require("multer");
const sharp = require("sharp");
const { JSDOM } = require("jsdom");
const DOMPurify = require("dompurify");
const ejs = require("ejs");

// Optional deps (will be used only if installed)
let compression = null;
try { compression = require("compression"); } catch (e) { /* optional */ }

// DOMPurify (server-side)
const window = new JSDOM("").window;
const purify = DOMPurify(window);

// --- App init
const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Trust proxy (e.g., Render/Heroku) when enabled
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

// View engine (kept for future SSR templates)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "public"));

// --- Database setup
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME || "nfc_db";
const DESIGNS_COLLECTION = process.env.MONGO_COLLECTION || "designs";
let db; // will be set after connect

if (!MONGO_URI) {
  console.error("[FATAL] Missing MONGO_URI in environment.");
  process.exit(1);
}

// --- Middlewares
if (compression) app.use(compression());
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Static: /public
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// Static: /uploads (ensure directory, strong caching)
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use(
  "/uploads",
  express.static(uploadDir, {
    maxAge: "14d",
    etag: true,
    immutable: true,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=1209600, immutable");
    },
  })
);

// Security headers (lightweight CSP)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "script-src 'self' https://cdnjs.cloudflare.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https:",
      "frame-ancestors 'self'",
    ].join("; ")
  );
  next();
});

// Basic pages (static HTML files placed in /public)
app.get("/about", (_req, res) => res.sendFile(path.join(publicDir, "about.html")));
app.get("/privacy", (_req, res) => res.sendFile(path.join(publicDir, "privacy.html")));
app.get("/contact", (_req, res) => res.sendFile(path.join(publicDir, "contact.html")));

// Healthcheck
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

// --- API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use("/api", apiLimiter);

// --- Multer config (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Not an image! Please upload an image file."));
  },
});

// Helper: validate image buffer with sharp (basic safety)
async function isValidImageBuffer(buf) {
  try {
    const meta = await sharp(buf).metadata();
    return Boolean(meta && (meta.width || meta.height));
  } catch (_) {
    return false;
  }
}

// --- API: Upload image (optimize to WebP)
app.post("/api/upload-image", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image file uploaded." });

  try {
    const valid = await isValidImageBuffer(req.file.buffer);
    if (!valid) return res.status(400).json({ error: "Invalid image data." });

    const filename = `${nanoid(10)}.webp`;
    const outputPath = path.join(uploadDir, filename);

    await sharp(req.file.buffer)
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outputPath);

    const imageUrl = `/uploads/${filename}`;
    res.json({ success: true, url: imageUrl });
  } catch (error) {
    console.error("[upload-image]", error);
    res.status(500).json({ error: "Failed to process image." });
  }
});

// --- API: Save design (validate + sanitize)
app.post(
  "/api/save-design",
  [
    body("inputs.input-name").trim().customSanitizer((v) => purify.sanitize(v || "")),
    body("inputs.input-tagline").trim().customSanitizer((v) => purify.sanitize(v || "")),
    body("inputs.input-email").optional({ nullable: true }).isEmail().normalizeEmail(),
    body("dynamic.phones.*").optional({ nullable: true }).isMobilePhone().withMessage("Invalid phone number"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    if (!db) return res.status(503).json({ error: "Database not connected" });

    try {
      const designData = req.body;
      const shortId = nanoid(8);

      const collection = db.collection(DESIGNS_COLLECTION);
      await collection.insertOne({ shortId, data: designData, createdAt: new Date() });

      res.json({ success: true, id: shortId });
    } catch (error) {
      console.error("[save-design]", error);
      res.status(500).json({ error: "Failed to save design" });
    }
  }
);

// --- API: Get design by id
app.get("/api/get-design/:id", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { id } = req.params;
    const collection = db.collection(DESIGNS_COLLECTION);
    const design = await collection.findOne({ shortId: id });
    if (!design) return res.status(404).json({ error: "Design not found" });
    res.json(design.data);
  } catch (error) {
    console.error("[get-design]", error);
    res.status(500).json({ error: "Failed to fetch design" });
  }
});

// --- API: Gallery (latest 20)
app.get("/api/gallery", async (_req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const collection = db.collection(DESIGNS_COLLECTION);
    const designs = await collection
      .find({})
      .project({ _id: 0, shortId: 1, createdAt: 1, "data.inputs.input-name": 1, "data.inputs.input-tagline": 1 })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    res.json(designs);
  } catch (error) {
    console.error("[gallery]", error);
    res.status(500).json({ error: "Failed to fetch gallery designs" });
  }
});

// --- Page: /card/:id (SSR meta injection over viewer.html)
app.get("/card/:id", async (req, res) => {
  try {
    if (!db) return res.status(503).send("Database not connected");

    const { id } = req.params;
    const collection = db.collection(DESIGNS_COLLECTION);
    const doc = await collection.findOne({ shortId: id });
    if (!doc || !doc.data) return res.status(404).send("Design not found");

    const data = doc.data;
    const cardName = (data.inputs?.["input-name"] || "بطاقة عمل رقمية").toString();
    const cardTagline = (data.inputs?.["input-tagline"] || "").toString();
    const pageUrl = `${(process.env.PUBLIC_BASE_URL || "https://mcprim.com/nfc").replace(/\/$/, "")}/card/${id}`;
    const cardLogoUrl = (data.inputs?.["input-logo"] || "https://www.mcprim.com/nfc/mcprime-logo-transparent.png").replace(/^http:\/\//i, "https://");

    const title = `عرض وحفظ بطاقة ${cardName} – MC PRIME`;
    const description = cardTagline || "بطاقة عمل رقمية ذكية من MC PRIME. شارك بياناتك بلمسة واحدة.";
    const ogImage = "https://www.mcprim.com/nfc/og-image.png";

    const viewerPath = path.join(publicDir, "viewer.html");
    let html = fs.readFileSync(viewerPath, "utf8");

    // Inject <title> and basic meta
    html = html.replace(/<title>.*?<\/title>/is, `<title>${title}</title>`);
    html = html.replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${description.replace(/"/g, '\\"')}">`);

    // Replace OG tags
    html = html.replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${title.replace(/"/g, '\\"')}">`);
    html = html.replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${description.replace(/"/g, '\\"')}">`);
    html = html.replace(/<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${pageUrl}">`);
    html = html.replace(/<meta property="og:image"[^>]*>/i, `<meta property="og:image" content="${ogImage}">`);

    // Inject JSON-LD graph (Person + WebPage + Breadcrumb)
    const graph = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Person",
          "@id": pageUrl,
          name: cardName,
          image: { "@type": "ImageObject", url: cardLogoUrl },
          url: pageUrl,
          ...(cardTagline ? { jobTitle: cardTagline } : {}),
        },
        {
          "@type": "WebPage",
          url: pageUrl,
          name: title,
          about: { "@id": pageUrl },
          primaryImageOfPage: { "@type": "ImageObject", url: cardLogoUrl },
          breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
        },
        {
          "@type": "BreadcrumbList",
          "@id": `${pageUrl}#breadcrumb`,
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "الرئيسية", item: (process.env.PUBLIC_BASE_URL || "https://www.mcprim.com/nfc/") },
            { "@type": "ListItem", position: 2, name: cardName },
          ],
        },
      ],
    };

    const ldScript = `\n<script type="application/ld+json">${JSON.stringify(graph)}</script>\n`;
    html = html.replace(/<\/head>/i, `${ldScript}</head>`);

    res.status(200).send(html);
  } catch (error) {
    console.error("[/card/:id]", error);
    res.status(500).send("Internal Server Error");
  }
});

// 404 handler for unknown API routes (optional)
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  return next();
});

// Global error handler (avoid leaking internals)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Server error" });
});

// --- Start server after DB connects
async function start() {
  try {
    const client = await MongoClient.connect(MONGO_URI);
    db = client.db(DB_NAME);
    console.log("Connected successfully to MongoDB server");

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  }
}

// Shutdown handling
process.on("unhandledRejection", (r) => console.error("[unhandledRejection]", r));
process.on("uncaughtException", (e) => console.error("[uncaughtException]", e));

start();
