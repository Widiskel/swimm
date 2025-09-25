import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not set. Provide a MongoDB connection string in your environment.");
}

const dbName = process.env.MONGODB_DB_NAME ?? "swimm";

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

declare global {
  var __swimmMongoClientPromise: Promise<MongoClient> | undefined;
  var __swimmMongoIndexesEnsured: boolean | undefined;
}

const connectClient = () => {
  const client = new MongoClient(uri, options);
  return client.connect();
};

const getClientPromise = () => {
  if (process.env.NODE_ENV === "development") {
    if (!global.__swimmMongoClientPromise) {
      global.__swimmMongoClientPromise = connectClient();
    }
    return global.__swimmMongoClientPromise;
  }
  return connectClient();
};

const clientPromise = getClientPromise();

const ensureIndexes = async (client: MongoClient) => {
  if (process.env.NODE_ENV === "development" && global.__swimmMongoIndexesEnsured) {
    return;
  }

  const db = client.db(dbName);
  const sessionCollection = db.collection("sessions");
  const historyCollection = db.collection("agent_history");

  await Promise.all([
    sessionCollection.createIndex({ sessionId: 1 }, { unique: true }),
    sessionCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    historyCollection.createIndex({ userId: 1, createdAt: -1 }),
    historyCollection.createIndex({ sessionId: 1, createdAt: -1 }),
  ]);

  if (process.env.NODE_ENV === "development") {
    global.__swimmMongoIndexesEnsured = true;
  }
};

export const getMongoClient = async () => {
  const client = await clientPromise;
  await ensureIndexes(client);
  return client;
};

export const getMongoDb = async () => {
  const client = await getMongoClient();
  return client.db(dbName);
};
