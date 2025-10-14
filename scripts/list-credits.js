#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { MongoClient, ServerApiVersion } = require("mongodb");

const loadEnv = () => {
  const envPath = resolve(process.cwd(), ".env");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const rawValue = line.slice(idx + 1).trim();
      const cleaned = rawValue.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
      if (key && !(key in process.env)) process.env[key] = cleaned;
    }
  } catch {
    /* ignore */
  }
};

const main = async () => {
  loadEnv();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI missing");
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
    const docs = await db
      .collection("user_credits")
      .find({}, { projection: { userId: 1, balance: 1, updatedAt: 1 } })
      .limit(50)
      .toArray();
    console.table(
      docs.map((doc) => ({
        userId: doc.userId,
        balance: doc.balance,
        updatedAt: doc.updatedAt?.toISOString?.() ?? null,
      }))
    );
  } catch (error) {
    console.error("Failed to list credits:", error);
    process.exitCode = 1;
  } finally {
    await client.close().catch(() => undefined);
  }
};

void main();
