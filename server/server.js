const express = require("express");
const cors = require("cors");

const questionRoutes = require("./routes/questionRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Question Bank API
app.use("/api/questions", questionRoutes);

// Kiểm tra máy chủ
app.get("/", (req, res) => {
  res.send("PTIT EDU Backend is running!");
});

// Khởi chạy máy chủ
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});