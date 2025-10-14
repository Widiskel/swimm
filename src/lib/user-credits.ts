import type { Collection, ModifyResult } from "mongodb";

import { getMongoDb } from "./mongodb";

export type UserCreditsDocument = {
  userId: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
};

const COLLECTION = "user_credits";
const DEFAULT_INITIAL_CREDITS = Number.parseInt(
  process.env.DEFAULT_USER_CREDITS ?? "10",
  10
);

let collectionPromise: Promise<Collection<UserCreditsDocument>> | null = null;

const getCreditsCollection = async () => {
  if (!collectionPromise) {
    collectionPromise = (async () => {
      const db = await getMongoDb();
      return db.collection<UserCreditsDocument>(COLLECTION);
    })();
  }
  return collectionPromise;
};

const normalizeInitialCredits = (value: number) =>
  Number.isFinite(value) && value > 0 ? Math.floor(value) : 10;

export const getUserCredits = async (userId: string) => {
  const collection = await getCreditsCollection();
  return collection.findOne({ userId });
};

export const ensureUserCredits = async (userId: string) => {
  const collection = await getCreditsCollection();
  const now = new Date();
  const initialBalance = normalizeInitialCredits(DEFAULT_INITIAL_CREDITS);
  const result = await collection.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        balance: initialBalance,
        createdAt: now,
      },
      $set: { updatedAt: now },
    },
    {
      upsert: true,
      returnDocument: "after",
    }
  );

  if (result.value) {
    return result.value;
  }

  const fallback = await collection.findOne({ userId });
  if (fallback) {
    return fallback;
  }

  const seeded: UserCreditsDocument = {
    userId,
    balance: initialBalance,
    createdAt: now,
    updatedAt: now,
  };
  await collection.insertOne(seeded);
  return seeded;
};

const applyBalanceChange = async (
  userId: string,
  amount: number,
  options?: { requireSufficientBalance?: boolean }
) => {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new Error("Credit delta must be a non-zero integer");
  }

  const collection = await getCreditsCollection();
  const now = new Date();

  const filter =
    options?.requireSufficientBalance && amount < 0
      ? { userId, balance: { $gte: Math.abs(amount) } }
      : { userId };

  const update = {
    $inc: { balance: amount },
    $set: { updatedAt: now },
  };

  const result: ModifyResult<UserCreditsDocument> =
    await collection.findOneAndUpdate(filter, update, {
      returnDocument: "after",
    });

  return result.value ?? null;
};

export const decrementUserCredits = async (userId: string, amount = 1) => {
  if (amount <= 0) {
    throw new Error("Decrement amount must be positive");
  }
  return applyBalanceChange(userId, -amount, { requireSufficientBalance: true });
};

export const incrementUserCredits = async (userId: string, amount = 1) => {
  if (amount <= 0) {
    throw new Error("Increment amount must be positive");
  }
  return applyBalanceChange(userId, amount);
};
