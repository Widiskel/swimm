#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { MongoClient, ServerApiVersion } = require("mongodb");

const loadEnv = () => {
  const envPath = resolve(process.cwd(), ".env");
  let content;
  try {
    content = readFileSync(envPath, "utf-8");
  } catch {
    return;
  }
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }
    const idx = line.indexOf("=");
    if (idx === -1) {
      continue;
    }
    const key = line.slice(0, idx).trim();
    const rawValue = line.slice(idx + 1).trim();
    const cleaned = rawValue.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    if (key && !(key in process.env)) {
      process.env[key] = cleaned;
    }
  }
};

const usage = () => {
  console.log("Usage: node scripts/add-credits.js <email|user:userId> <amount>");
  process.exit(1);
};

const main = async () => {
  loadEnv();

  const [, , targetArg, amountArg] = process.argv;
  if (!targetArg || !amountArg) {
    usage();
  }

  const target = targetArg.trim();
  const amount = Number.parseInt(amountArg, 10);

  if (!Number.isFinite(amount) || amount <= 0) {
    console.error("Amount must be a positive integer.");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not defined in environment.");
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB_NAME ?? "swimm";

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    let userId = null;
    let label = target;

    if (target.toLowerCase().startsWith("user:")) {
      userId = target.slice("user:".length).trim();
      if (!userId) {
        console.error("User id is required after 'user:' prefix.");
        process.exit(1);
      }
    } else {
      const email = target.toLowerCase();
      const session = await db.collection("sessions").findOne({ email });
      if (!session) {
        console.error(`No session found for email: ${email}`);
        process.exit(1);
      }
      userId = session.userId;
      label = `${email} (userId: ${userId})`;
    }

    const now = new Date();
    await db.collection("user_credits").updateOne(
      { userId },
      {
        $inc: { balance: amount },
        $set: { updatedAt: now, userId },
        $setOnInsert: { createdAt: now },
        $unset: { credits: "" },
      },
      { upsert: true }
    );

    const updated = await db.collection("user_credits").findOne({ userId });
    const balance =
      typeof updated?.balance === "number"
        ? updated.balance
        : typeof updated?.credits === "number"
        ? updated.credits
        : 0;
    console.log(`Credits updated for ${label}. Current balance: ${balance}`);
  } catch (error) {
    console.error("Failed to update credits:", error);
    process.exitCode = 1;
  } finally {
    await client.close().catch(() => undefined);
  }
};

void main();
