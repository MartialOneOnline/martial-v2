import cors from "cors";
import "dotenv/config";
import express from "express";

const app = express();

const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "martial-v2-api",
  });
});

app.listen(port, () => {
  console.log(`Martial V2 API running on http://localhost:${port}`);
});
