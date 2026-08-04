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
  connect = async url => {
    const { MongoClient } = require('mongodb');
    return MongoClient.connect(url);
  }
}) {
  const client = await connect(mongoUrl);
  const db = client.db(dbName);

  // Unique ownership and token indexes are security boundaries. Refuse to
  // accept traffic when any mandatory index cannot be created or verified.
  await createIndexes(db, collectionNames);

  return { db, client };
}

module.exports = {
  connectDatabase,
  createIndexes
};
