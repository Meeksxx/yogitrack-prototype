const mongoose = require("mongoose");

const uri = "mongodb://localhost:27017/yogidb"

mongoose.connect(uri)
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => {
  console.error("❌ MongoDB connection error:", err.message);
});

module.exports =  mongoose;