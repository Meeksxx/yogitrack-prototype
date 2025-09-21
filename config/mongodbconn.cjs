// config/mongodbconn.cjs
const mongoose = require("mongoose");

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/yogidb";

mongoose
  .connect(uri)
  .then(() => {
    const c = mongoose.connection;
    const mode = uri.startsWith("mongodb+srv") ? "Atlas/SRV" : "Local/Direct";

    // Try to show a friendly host (optional; may be empty on some drivers)
    const clientOpts = c.getClient()?.options || {};
    let hostInfo = "";
    if (clientOpts.srvHost) {
      hostInfo = clientOpts.srvHost;              // Atlas style
    } else if (Array.isArray(clientOpts.hosts) && clientOpts.hosts.length) {
      hostInfo = clientOpts.hosts.map(h => `${h.host}:${h.port}`).join(",");
    }

    console.log(
      `✅ Connected to MongoDB • db="${c.name}" • mode=${mode}` +
      (hostInfo ? ` • host="${hostInfo}"` : "")
    );
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err.message);
  });

module.exports = mongoose;
