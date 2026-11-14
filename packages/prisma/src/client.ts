import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "../generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Ensure root .env is loaded regardless of current working directory
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
try {
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
  dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
} catch {
  // ignore
}

declare global {
  var prisma: PrismaClient | undefined;
}

const connectionString = process.env.DATABASE_URL || "";
const adapter = new PrismaPg({
  connectionString,
});

export const prisma =
  global.prisma ||
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" && process.env.LOG_QUERIES === "true"
        ? ["query", "error", "warn"]
        : ["error"],
  });

export const prismaClient = prisma;

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
