// yogiserver.cjs
const express = require("express");

// Ensure DB connection is established (uses your .env connection string)
require("./config/mongodbconn.cjs");

const app = express();
const BUILD_TAG = "srv-sales-v1";

// -------- middleware --------
app.use(express.static("public")); // serves /public as the site root
app.use(express.json());           // parse JSON bodies

// simple request logger so we SEE traffic in the terminal
app.use((req, _res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, tag: BUILD_TAG, time: new Date().toISOString() });
});

// optional top-level ping
app.get("/api/ping", (_req, res) => {
  res.json({ ok: true, scope: "api" });
});

// -------- feature routers --------
app.use("/api/instructor", require("./routes/instructorRoutes.cjs"));
app.use("/api/customer",   require("./routes/customerRoutes.cjs"));
app.use("/api/package",    require("./routes/packageRoutes.cjs"));
app.use("/api/class",      require("./routes/classRoutes.cjs"));
app.use("/api/sale",       require("./routes/saleRoutes.cjs"));   // <- sales

// Helpful 404 for any missing /api/* route
app.use("/api", (req, res) => {
  res
    .status(404)
    .json({ ok: false, message: "No matching API route", method: req.method, url: req.originalUrl });
});

// -------- start server --------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}...`);
  console.log(`Open http://localhost:${PORT}/index.html`);
});
