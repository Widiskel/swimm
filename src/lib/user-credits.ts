import type { Collection } from "mongodb";

import { getMongoDb } from "./mongodb";

export type UserCreditsDocument = {
  userId: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
};

const COLLECTION = "user_credits";

const DEFAULT_INITIAL_CREDITS = Number.parseInt(
  process.env.DEFAULT_USER_CREDITS ?? "5",
  10
);

const SPECIAL_CREDITS_EMAIL = "dessafrides@gmail.com";
const SPECIAL_INITIAL_CREDITS = Number.parseInt(
  process.env.SPECIAL_USER_CREDITS ?? "100",
  100
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
  Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_INITIAL_CREDITS;

const resolveInitialCredits = (email?: string | null) => {
  if (email && email.trim().toLowerCase() === SPECIAL_CREDITS_EMAIL) {
    return normalizeInitialCredits(SPECIAL_INITIAL_CREDITS);
  }
  return normalizeInitialCredits(DEFAULT_INITIAL_CREDITS);
};

export const getUserCredits = async (userId: string) => {
  const collection = await getCreditsCollection();
  return collection.findOne({ userId });
};

export const ensureUserCredits = async (
  userId: string,
  options?: { email?: string | null }
) => {
  const collection = await getCreditsCollection();
  const now = new Date();
  const initialBalance = resolveInitialCredits(options?.email ?? null);

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

  const normalizeDoc = (
    doc?: UserCreditsDocument | (UserCreditsDocument & { credits?: unknown })
  ) => {
    if (!doc) {
      return null;
    }
    if (typeof doc.balance === "number") {
      return doc;
    }
    const derived =
      typeof (doc as { credits?: unknown }).credits === "number"
        ? Number((doc as { credits: number }).credits)
        : initialBalance;
    return {
      ...doc,
      balance: normalizeInitialCredits(derived),
    };
  };

  const found =
    (result as { value?: UserCreditsDocument | null } | null)?.value ??
    (await collection.findOne({ userId }));

  const normalized = normalizeDoc(found ?? undefined);
  if (normalized) {
    if (
      typeof (found as { credits?: unknown })?.credits === "number" &&
      typeof normalized.balance === "number"
    ) {
      await collection.updateOne(
        { userId },
        {
          $set: { balance: normalized.balance, updatedAt: now },
          $unset: { credits: "" },
        }
      );
      return {
        ...normalized,
        updatedAt: now,
      };
    }
    return normalized;
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

  const requiresBalanceCheck = options?.requireSufficientBalance && amount < 0;
  const baseFilter = { userId };
  const guardedFilter = requiresBalanceCheck
    ? { userId, balance: { $gte: Math.abs(amount) } }
    : baseFilter;

  const normalizeDoc = (
    doc?: UserCreditsDocument | (UserCreditsDocument & { credits?: unknown })
  ) => {
    if (!doc) return null;
    if (typeof doc.balance === "number") {
      return doc;
    }
    const derived =
      typeof (doc as { credits?: unknown }).credits === "number"
        ? Number((doc as { credits: number }).credits)
        : 0;
    return {
      ...doc,
      balance: normalizeInitialCredits(derived),
    };
  };

  const update = {
    $inc: { balance: amount },
    $set: { updatedAt: now },
  };

  const attemptUpdate = async (filter: Record<string, unknown>) => {
    const result = await collection.findOneAndUpdate(filter, update, {
      returnDocument: "after",
    });
    if (!result) {
      return null;
    }
    if (typeof (result as { balance?: unknown }).balance !== "undefined") {
      return normalizeDoc(result as UserCreditsDocument);
    }
    const value = (result as { value?: UserCreditsDocument | null } | null)?.value ?? null;
    return value ? normalizeDoc(value) : null;
  };

  const updated = await attemptUpdate(guardedFilter);
  if (updated) {
    return updated;
  }

  if (!requiresBalanceCheck) {
    return null;
  }

  const current = normalizeDoc(await collection.findOne(baseFilter) ?? undefined);
  if (!current || current.balance <= 0) {
    return null;
  }

  if (typeof current.balance !== "number") {
    await collection.updateOne(
      { userId },
      {
        $set: { balance: current.balance, updatedAt: now },
        $unset: { credits: "" },
      }
    );
    if (current.balance < Math.abs(amount)) {
      return null;
    }
  }

  return attemptUpdate(baseFilter);
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
