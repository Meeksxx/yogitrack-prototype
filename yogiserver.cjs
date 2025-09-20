const express = require("express");
const app = express();

// Serve static files from the public dir
app.use(express.static("public"));
app.use(express.json());

app.use("/api/instructor", require("./routes/instructorRoutes.cjs"));



// Start the web server
const PORT = process.env.PORT || 8080;
app.listen(PORT, function () {
  console.log(`Listening on port ${PORT}...`);
  console.log('Open http://localhost:8080/index.html in your browser to view the app.');
});
