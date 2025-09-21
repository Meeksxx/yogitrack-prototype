const express = require("express");
require("./config/mongodbconn.cjs"); // keep this
const app = express();

const BUILD_TAG = "srv-dupcheck-v4"; // <— shows up in /api/health and terminal

app.use(express.static("public"));
app.use(express.json());

// Log EVERY request so we SEE traffic
app.use((req, _res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, tag: BUILD_TAG, time: new Date().toISOString() })
);

app.use("/api/instructor", require("./routes/instructorRoutes.cjs"));
app.use("/api/customer",   require("./routes/customerRoutes.cjs"));
app.use("/api/package", require("./routes/packageRoutes.cjs"));
app.use("/api/class", require("./routes/classRoutes.cjs"));



const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}...`);
  console.log(`Build tag: ${BUILD_TAG}`);
  console.log(`Open http://localhost:${PORT}/index.html`);
});
