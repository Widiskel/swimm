import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import type { Collection, WithId } from "mongodb";
import type { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";
import { getMongoDb } from "./mongodb";

export const SESSION_COOKIE_NAME = "swimm_session";
const SESSION_COLLECTION = "sessions";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export type SessionDocument = {
  sessionId: string;
  userId: string;
  email?: string | null;
  name?: string | null;
  wallet?: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
};

type SessionPublicData = {
  sessionId: string;
  userId: string;
  email?: string | null;
  name?: string | null;
  wallet?: string | null;
  expiresAt: string;
  createdAt: string;
  credits: number;
};

let sessionCollectionPromise: Promise<Collection<SessionDocument>> | null = null;

const getSessionCollection = async () => {
  if (!sessionCollectionPromise) {
    sessionCollectionPromise = (async () => {
      const db = await getMongoDb();
      return db.collection<SessionDocument>(SESSION_COLLECTION);
    })();
  }
  return sessionCollectionPromise;
};

const buildSessionCookieOptions = (expiresAt: Date) => ({
  name: SESSION_COOKIE_NAME,
  value: "",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV !== "development",
  path: "/",
  expires: expiresAt,
});

const getMutableCookies = async () => {
  return (await cookies()) as unknown as RequestCookies;
};

export const createSession = async (payload: {
  userId: string;
  email?: string | null;
  name?: string | null;
  wallet?: string | null;
}) => {
  const collection = await getSessionCollection();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const sessionId = randomUUID();

  await collection.deleteMany({ userId: payload.userId });

  const doc: SessionDocument = {
    sessionId,
    userId: payload.userId,
    email: payload.email ?? null,
    name: payload.name ?? null,
    wallet: payload.wallet ?? null,
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };

  await collection.insertOne(doc);

  const cookieStore = await getMutableCookies();
  cookieStore.set({
    ...buildSessionCookieOptions(expiresAt),
    value: sessionId,
  });

  return doc;
};

export const touchSession = async (sessionId: string) => {
  const collection = await getSessionCollection();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const updateResult = await collection.updateOne(
    { sessionId },
    {
      $set: {
        updatedAt: now,
        expiresAt,
      },
    }
  );

  if (updateResult.matchedCount === 0) {
    return null;
  }

  const doc = await collection.findOne({ sessionId });

  if (!doc) {
    return null;
  }

  const cookieStore = await getMutableCookies();
  cookieStore.set({
    ...buildSessionCookieOptions(expiresAt),
    value: sessionId,
  });

  return doc as WithId<SessionDocument>;
};

export const getSessionFromCookie = async () => {
  const cookieStore = await getMutableCookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) {
    return null;
  }

  const collection = await getSessionCollection();
  const session = await collection.findOne({ sessionId });

  if (!session) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await collection.deleteOne({ sessionId });
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return session;
};

export const destroySession = async () => {
  const cookieStore = await getMutableCookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) {
    return;
  }

  const collection = await getSessionCollection();
  await collection.deleteOne({ sessionId });
  cookieStore.delete(SESSION_COOKIE_NAME);
};

export const toSessionResponse = (
  session: SessionDocument | null,
  options?: { credits?: number }
): SessionPublicData | null => {
  if (!session) {
    return null;
  }
  return {
    sessionId: session.sessionId,
    userId: session.userId,
    email: session.email ?? null,
    name: session.name ?? null,
    wallet: session.wallet ?? null,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    credits: Math.max(0, options?.credits ?? 0),
  };
};












