import { getMongoDb } from "./mongodb";

export type UserSettingsDocument = {
  userId: string;
  binanceApiKey?: string | null;
  binanceApiSecret?: string | null;
  bybitApiKey?: string | null;
  bybitApiSecret?: string | null;
  updatedAt: Date;
};

export type UserSettingsPayload = {
  userId: string;
  binanceApiKey: string | null;
  binanceApiSecret: string | null;
  bybitApiKey: string | null;
  bybitApiSecret: string | null;
  updatedAt: string;
};

const COLLECTION = "user_settings";

const toPayload = (doc: UserSettingsDocument): UserSettingsPayload => ({
  userId: doc.userId,
  binanceApiKey: doc.binanceApiKey ?? null,
  binanceApiSecret: doc.binanceApiSecret ?? null,
  bybitApiKey: doc.bybitApiKey ?? null,
  bybitApiSecret: doc.bybitApiSecret ?? null,
  updatedAt: doc.updatedAt.toISOString(),
});

export const getUserSettings = async (userId: string) => {
  const db = await getMongoDb();
  const collection = db.collection<UserSettingsDocument>(COLLECTION);
  const doc = await collection.findOne({ userId });
  return doc ? toPayload(doc) : null;
};

export const upsertUserSettings = async (
  userId: string,
  updates: {
    binanceApiKey?: string | null;
    binanceApiSecret?: string | null;
    bybitApiKey?: string | null;
    bybitApiSecret?: string | null;
  }
) => {
  const db = await getMongoDb();
  const collection = db.collection<UserSettingsDocument>(COLLECTION);
  const now = new Date();
  await collection.updateOne(
    { userId },
    {
      $set: {
        userId,
        binanceApiKey: updates.binanceApiKey ?? null,
        binanceApiSecret: updates.binanceApiSecret ?? null,
        bybitApiKey: updates.bybitApiKey ?? null,
        bybitApiSecret: updates.bybitApiSecret ?? null,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  return {
    userId,
    binanceApiKey: updates.binanceApiKey ?? null,
    binanceApiSecret: updates.binanceApiSecret ?? null,
    bybitApiKey: updates.bybitApiKey ?? null,
    bybitApiSecret: updates.bybitApiSecret ?? null,
    updatedAt: now.toISOString(),
  } satisfies UserSettingsPayload;
};
