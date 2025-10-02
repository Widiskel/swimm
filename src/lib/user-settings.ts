import { getMongoDb } from "./mongodb";

export type UserSettingsDocument = {
  userId: string;
  displayName?: string | null;
  binanceApiKey?: string | null;
  binanceApiSecret?: string | null;
  bybitApiKey?: string | null;
  bybitApiSecret?: string | null;
  updatedAt: Date;
};

export type UserSettingsPayload = {
  userId: string;
  displayName: string | null;
  binanceApiKey: string | null;
  binanceApiSecret: string | null;
  bybitApiKey: string | null;
  bybitApiSecret: string | null;
  updatedAt: string;
};

const COLLECTION = "user_settings";

const toPayload = (doc: UserSettingsDocument): UserSettingsPayload => ({
  userId: doc.userId,
  displayName: doc.displayName ?? null,
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
    displayName?: string | null;
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
        displayName: updates.displayName ?? null,
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
    displayName: updates.displayName ?? null,
    binanceApiKey: updates.binanceApiKey ?? null,
    binanceApiSecret: updates.binanceApiSecret ?? null,
    bybitApiKey: updates.bybitApiKey ?? null,
    bybitApiSecret: updates.bybitApiSecret ?? null,
    updatedAt: now.toISOString(),
  } satisfies UserSettingsPayload;
};
