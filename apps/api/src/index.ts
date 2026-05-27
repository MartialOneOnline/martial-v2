import cors from "cors";
import "dotenv/config";
import express from "express";
import { prisma } from "./lib/prisma";

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

// Temporary endpoint to verify API → Prisma → Supabase connection.
// Remove or protect this endpoint in a future session.
app.get("/db-test", async (_req, res) => {
  try {
    const users = await prisma.user.count();
    const schools = await prisma.school.count();

    res.json({
      status: "connected",
      users,
      schools,
    });
  } catch (error) {
    console.error("DB TEST ERROR:", error);

    const err = error as {
      name?: string;
      code?: string;
      message?: string;
      meta?: unknown;
    };

    res.status(500).json({
      status: "error",
      name: err.name,
      code: err.code,
      message: err.message,
      meta: err.meta,
    });
  }
});

app.listen(port, () => {
  console.log(`Martial V2 API running on http://localhost:${port}`);
});
