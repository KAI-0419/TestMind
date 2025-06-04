
const express = require("express");
const cors = require("cors");
const analysisRoutes = require("./routes/analysisRoutes");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/analyze", analysisRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
