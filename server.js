"use strict";

require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { nanoid } = require("nanoid");
const { body, validationResult } = require("express-validator");
const { MongoClient } = require("mongodb");
const multer = require("multer");
const sharp = require("sharp");
const { JSDOM } = require("jsdom");
const DOMPurify = require("dompurify");
let compression = null;
try { compression = require("compression"); } catch(_) {}

const window = new JSDOM("").window;
const purify = DOMPurify(window);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);

// --- Security headers via Helmet (keep our custom CSP below) ---
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: false, // We'll set a tailored CSP manually below
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "no-referrer-when-downgrade" }
}));

// --- View engine / Public dirs ---
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "public"));

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME || "nfc_db";
const DESIGNS_COLLECTION = process.env.MONGO_COLLECTION || "designs";
let db;

if (!MONGO_URI) {
  console.error("[FATAL] Missing MONGO_URI in environment.");
  process.exit(1);
}

if (compression) app.use(compression());
app.use(express.json({ limit: "2mb" })); // tighter limit; adjust as needed

// --- Restrictive CORS ---
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "https://www.mcprim.com,https://mcprim.com").split(",").map(s => s.trim());
app.use(cors({
  origin: function(origin, cb) {
    if (!origin) return cb(null, true); // allow non-browser tools
    const ok = ALLOWED_ORIGINS.some(o => origin === o);
    cb(ok ? null : new Error("CORS not allowed"), ok);
  },
  methods: ["GET","POST","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

// --- Static assets ---
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir, { maxAge: "7d" }));

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir, {
  maxAge: "14d",
  etag: true,
  immutable: true,
  setHeaders: (res) => res.setHeader("Cache-Control", "public, max-age=1209600, immutable")
}));

// --- Custom CSP ---
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "script-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https:",
      "frame-ancestors 'self'",
    ].join("; ")
  );
  next();
});

// --- Healthcheck & rate-limiter ---
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));
const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 100, standardHeaders: true, legacyHeaders: false });
app.use("/api", apiLimiter);

// --- Uploads ---
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => file.mimetype && file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Not an image!"))
});

async function isValidImageBuffer(buf) {
  try { const m = await sharp(buf).metadata(); return Boolean(m && (m.width || m.height)); } catch { return false; }
}

app.post("/api/upload-image", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image file uploaded." });
  try {
    const valid = await isValidImageBuffer(req.file.buffer);
    if (!valid) return res.status(400).json({ error: "Invalid image data." });
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2,8)}.webp`;
    await sharp(req.file.buffer).resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(uploadDir, filename));
    return res.json({ success: true, url: `/uploads/${filename}` });
  } catch (e) {
    console.error("[upload-image]", e);
    return res.status(500).json({ error: "Failed to process image." });
  }
});

// --- Save/Get design ---
app.post("/api/save-design",
  [
    body("inputs.input-name").trim().customSanitizer(v => purify.sanitize(v || "")),
    body("inputs.input-tagline").trim().customSanitizer(v => purify.sanitize(v || "")),
    body("inputs.input-email").optional({ nullable: true }).isEmail().normalizeEmail(),
    body("dynamic.phones.*").optional({ nullable: true })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!db) return res.status(503).json({ error: "Database not connected" });

    try {
      const shortId = nanoid(8);
      await db.collection(DESIGNS_COLLECTION).insertOne({ shortId, data: req.body, createdAt: new Date() });
      return res.json({ success: true, id: shortId });
    } catch (e) {
      console.error("[save-design]", e);
      return res.status(500).json({ error: "Failed to save design" });
    }
  }
);

app.get("/api/get-design/:id", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const doc = await db.collection(DESIGNS_COLLECTION).findOne({ shortId: req.params.id });
    if (!doc) return res.status(404).json({ error: "Design not found" });
    return res.json(doc.data);
  } catch (e) {
    console.error("[get-design]", e);
    return res.status(500).json({ error: "Failed to fetch design" });
  }
});

app.get("/api/gallery", async (_req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const arr = await db.collection(DESIGNS_COLLECTION)
      .find({})
      .project({ _id: 0, shortId: 1, createdAt: 1, "data.inputs.input-name": 1, "data.inputs.input-tagline": 1 })
      .sort({ createdAt: -1 })
      .limit(200).toArray();
    return res.json(arr);
  } catch (e) {
    console.error("[gallery]", e);
    return res.status(500).json({ error: "Failed to fetch gallery designs" });
  }
});

// --- Helper: extract sameAs from design data ---
function extractSameAs(designData) {
  const urls = new Set();
  const add = (u) => {
    if (!u || typeof u !== "string") return;
    try {
      let out = u.trim();
      if (!out) return;
      if (!/^https?:\/\//i.test(out) && /\./.test(out)) out = "https://" + out;
      const uu = new URL(out);
      if (uu.protocol !== "https:") uu.protocol = "https:";
      const ok = /(facebook|fb)\.com$|linkedin\.com$|x\.com$|twitter\.com$|instagram\.com$|tiktok\.com$|youtube\.com$|wa\.me$|whatsapp\.com$|github\.com$|behance\.net$|dribbble\.com$|medium\.com$|linktr\.ee$|taplink\.cc$|about\.me$|mcprim\.com$|mcprime?\.com$/i.test(uu.hostname);
      if (ok) urls.add(uu.toString());
    } catch(_) {}
  };
  const fields = designData?.inputs || {};
  ["input-facebook","input-linkedin","input-twitter","input-x","input-instagram","input-youtube","input-whatsapp","input-website","input-github","input-behance","input-dribbble"].forEach(k => add(fields[k]));
  const dyn = designData?.dynamic?.social || designData?.dynamic?.links || [];
  if (Array.isArray(dyn)) {
    dyn.forEach(item => {
      if (typeof item === "string") add(item);
      else if (item && typeof item.value === "string") add(item.value);
      else if (item && typeof item.url === "string") add(item.url);
    });
  }
  return Array.from(urls).slice(0, 20);
}

// --- vCard builder ---
function buildVCard(data, pageUrl) {
  const name = (data.inputs?.["input-name"] || "").toString().trim();
  const title = (data.inputs?.["input-tagline"] || "").toString().trim();
  const org = (data.inputs?.["input-org"] || "MC PRIME").toString().trim();
  const email = (data.inputs?.["input-email"] || "").toString().trim();
  const url = (data.inputs?.["input-website"] || pageUrl || "").toString().trim();
  const phones = Array.isArray(data.dynamic?.phones) ? data.dynamic.phones.filter(Boolean) : [];
  const tel = phones[0] || "";
  const logo = (data.inputs?.["input-logo"] || "").toString().trim();
  const adr = (data.inputs?.["input-address"] || "").toString().trim();

  const fields = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${name};;;`,
    `FN:${name}`,
    title ? `TITLE:${title}` : "",
    org ? `ORG:${org}` : "",
    email ? `EMAIL;TYPE=INTERNET:${email}` : "",
    tel ? `TEL;TYPE=CELL:${tel}` : "",
    url ? `URL:${url}` : "",
    adr ? `ADR;TYPE=WORK:;;${adr};;;;` : "",
    logo ? `PHOTO;VALUE=URI:${logo}` : "",
    "END:VCARD"
  ].filter(Boolean);
  return fields.join("\n");
}

// --- vCard endpoint ---
app.get("/api/vcard/:id", async (req, res) => {
  try {
    if (!db) return res.status(503).send("Database not connected");
    const doc = await db.collection(DESIGNS_COLLECTION).findOne({ shortId: req.params.id });
    if (!doc || !doc.data) return res.status(404).send("Design not found");
    const base = (process.env.PUBLIC_BASE_URL || "https://www.mcprim.com/nfc").replace(/\/$/,"");
    const pageUrl = `${base}/card/${req.params.id}`;
    const vcf = buildVCard(doc.data, pageUrl);
    res.setHeader("Content-Type", "text/vcard; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="card_${req.params.id}.vcf"`);
    return res.status(200).send(vcf);
  } catch (e) {
    console.error("[/api/vcard/:id]", e);
    return res.status(500).send("Internal Server Error");
  }
});

// --- SSR /card/:id (kept minimal here; your previous enhanced version can be merged similarly) ---
app.get("/card/:id", async (req, res) => {
  try {
    if (!db) return res.status(503).send("Database not connected");
    const doc = await db.collection(DESIGNS_COLLECTION).findOne({ shortId: req.params.id });
    if (!doc || !doc.data) return res.status(404).send("Design not found");
    const data = doc.data;
    const cardName = String((data.inputs?.["input-name"] || "بطاقة عمل رقمية") || "");
    const cardTagline = String((data.inputs?.["input-tagline"] || "") || "");
    const base = (process.env.PUBLIC_BASE_URL || "https://www.mcprim.com/nfc").replace(/\/$/,"");
    const pageUrl = `${base}/card/${req.params.id}`;
    const logoSrc = String(data.inputs?.["input-logo"] || "https://www.mcprim.com/nfc/mcprime-logo-transparent.png").replace(/^http:\/\//i, "https://");
    const ogImage = String(data.inputs?.["og-image"] || "https://www.mcprim.com/nfc/og-image.png");
    const sameAs = extractSameAs(data);

    const viewerPath = path.join(__dirname, "public", "viewer.html");
    let html = fs.readFileSync(viewerPath, "utf8");
    const title = `عرض وحفظ بطاقة ${cardName} – MC PRIME`;
    const description = cardTagline || "بطاقة عمل رقمية ذكية من MC PRIME. شارك بياناتك بلمسة واحدة.";

    html = html.replace(/<title>.*?<\/title>/is, `<title>${title}</title>`);
    if (/<meta name="description"/i.test(html)) {
      html = html.replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${description.replace(/"/g, '\\\"')}">`);
    } else {
      html = html.replace(/<head>/i, `<head>\n  <meta name="description" content="${description.replace(/"/g, '\\\"')}">`);
    }
    const replaceOrInject = (re, tag) => (re.test(html) ? (html = html.replace(re, tag)) : (html = html.replace(/<head>/i, `<head>\n  ${tag}`)));
    replaceOrInject(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${title.replace(/"/g, '\\\"')}">`);
    replaceOrInject(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${description.replace(/"/g, '\\\"')}">`);
    replaceOrInject(/<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${pageUrl}">`);
    replaceOrInject(/<meta property="og:image"[^>]*>/i, `<meta property="og:image" content="${ogImage}">`);

    const graph = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Person",
          "@id": `${pageUrl}#person`,
          "name": cardName,
          ...(cardTagline ? { "jobTitle": cardTagline } : {}),
          "image": { "@type": "ImageObject", "url": logoSrc },
          "url": pageUrl,
          ...(sameAs.length ? { "sameAs": sameAs } : {})
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          "url": pageUrl,
          "name": title,
          "about": { "@id": `${pageUrl}#person` },
          "description": description,
          "primaryImageOfPage": { "@type": "ImageObject", "url": ogImage },
          "breadcrumb": { "@id": `${pageUrl}#breadcrumb` }
        },
        {
          "@type": "BreadcrumbList",
          "@id": `${pageUrl}#breadcrumb`,
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": (process.env.PUBLIC_BASE_URL || "https://www.mcprim.com/nfc/") },
            { "@type": "ListItem", "position": 2, "name": cardName, "item": pageUrl }
          ]
        }
      ]
    };
    const ldScript = `\n<script type="application/ld+json">${JSON.stringify(graph)}</script>\n`;
    html = html.replace(/<\/head>/i, `${ldScript}</head>`);

    return res.status(200).send(html);
  } catch (e) {
    console.error("[/card/:id]", e);
    return res.status(500).send("Internal Server Error");
  }
});

// --- sitemap.xml ---
app.get("/sitemap.xml", async (_req, res) => {
  try {
    const base = (process.env.PUBLIC_BASE_URL || "https://www.mcprim.com/nfc").replace(/\/$/,"");
    const docs = await db.collection(DESIGNS_COLLECTION)
      .find({}, { projection: { shortId: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(1000).toArray();

    const staticPaths = ["", "/blog.html", "/viewer.html"].map(p => `${base}${p}`);
    const dynamicCardUrls = docs.map(d => `${base}/card/${d.shortId}`);

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
      ...staticPaths.map(u => `<url><loc>${u}</loc></url>`),
      ...dynamicCardUrls.map(u => `<url><loc>${u}</loc></url>`),
      `</urlset>`
    ].join("");

    res.type("application/xml").send(xml);
  } catch (e) {
    console.error("[/sitemap.xml]", e);
    res.status(500).send("Internal Server Error");
  }
});

// --- robots.txt ---
app.get("/robots.txt", (_req, res) => {
  const base = (process.env.PUBLIC_BASE_URL || "https://www.mcprim.com/nfc").replace(/\/$/,"");
  res.type("text/plain").send([
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${base}/sitemap.xml`
  ].join("\n"));
});

// --- Not found for /api ---
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  next();
});

// --- Global error handler ---
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err);
  if (!res.headersSent) res.status(500).json({ error: "Server error" });
});

// --- DB connect & start ---
async function start() {
  try {
    const client = await MongoClient.connect(MONGO_URI);
    db = client.db(DB_NAME);
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log("Server listening on", PORT));
  } catch (e) {
    console.error("Failed to connect to MongoDB", e);
    process.exit(1);
  }
}
process.on("unhandledRejection", (r) => console.error("[unhandledRejection]", r));
process.on("uncaughtException", (e) => console.error("[uncaughtException]", e));
start();
