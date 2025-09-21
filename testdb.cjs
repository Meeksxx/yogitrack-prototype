const mongoose = require("./config/mongodbconn.cjs");

// Keep the connection alive long enough to see it working
setTimeout(() => {
  console.log("Closing connection...");
  mongoose.connection.close();
}, 3000);
