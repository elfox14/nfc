async function createIndexes(db, collectionNames) {
  const {
    designsCollectionName,
    usersCollectionName,
    savedCardsCollectionName,
    cardRequestsCollectionName
  } = collectionNames;

  await db.collection(designsCollectionName).createIndex({ shortId: 1 }, { unique: true });
  await db.collection(designsCollectionName).createIndex({ ownerId: 1 });
  await db.collection(designsCollectionName).createIndex({ createdAt: -1 });

  await db.collection(usersCollectionName).createIndex({ email: 1 }, { unique: true });
  await db.collection(usersCollectionName).createIndex({ userId: 1 }, { unique: true });
  await db.collection(usersCollectionName).createIndex({ refreshTokenHash: 1 }, { sparse: true });
  await db.collection(usersCollectionName).createIndex({ resetTokenHash: 1 }, { sparse: true });
  await db.collection(usersCollectionName).createIndex({ verificationTokenHash: 1 }, { sparse: true });

  await db.collection(savedCardsCollectionName).createIndex({ userId: 1 });
  await db.collection(savedCardsCollectionName).createIndex(
    { userId: 1, designShortId: 1 },
    { unique: true }
  );

  await db.collection(cardRequestsCollectionName).createIndex({ ownerUserId: 1, status: 1 });
  await db.collection(cardRequestsCollectionName).createIndex({ requesterId: 1, designShortId: 1 });
}

async function connectDatabase({
  mongoUrl,
  dbName,
  collectionNames,
  onIndexesWarning = console.warn
}) {
  const { MongoClient } = require('mongodb');
  const client = await MongoClient.connect(mongoUrl);
  const db = client.db(dbName);

  try {
    await createIndexes(db, collectionNames);
  } catch (indexErr) {
    onIndexesWarning('Some indexes may already exist:', indexErr.message);
  }

  return db;
}

module.exports = {
  connectDatabase,
  createIndexes
};
