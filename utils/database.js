async function createIndexes(db, collectionNames) {
  const {
    designsCollectionName,
    usersCollectionName,
    savedCardsCollectionName,
    cardRequestsCollectionName,
    brandKitsCollectionName = 'brandKits',
    workspacesCollectionName = 'workspaces',
    designReviewsCollectionName = 'designReviews',
    designVersionsCollectionName = 'designVersions'
  } = collectionNames;

  await db.collection(designsCollectionName).createIndex({ shortId: 1 }, { unique: true });
  await db.collection(designsCollectionName).createIndex({ ownerId: 1 });
  await db.collection(designsCollectionName).createIndex({ createdAt: -1 });
  await db.collection(designsCollectionName).createIndex({ workspaceId: 1, 'workflow.status': 1, lastModified: -1 });

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

  await db.collection(brandKitsCollectionName).createIndex({ kitId: 1 }, { unique: true });
  await db.collection(brandKitsCollectionName).createIndex({ ownerId: 1, updatedAt: -1 });
  await db.collection(brandKitsCollectionName).createIndex({ 'members.userId': 1, updatedAt: -1 });

  await db.collection(workspacesCollectionName).createIndex({ workspaceId: 1 }, { unique: true });
  await db.collection(workspacesCollectionName).createIndex({ ownerId: 1, updatedAt: -1 });
  await db.collection(workspacesCollectionName).createIndex({ 'members.userId': 1, updatedAt: -1 });

  await db.collection(designReviewsCollectionName).createIndex({ entryId: 1 }, { unique: true });
  await db.collection(designReviewsCollectionName).createIndex({ designId: 1, createdAt: 1 });
  await db.collection(designReviewsCollectionName).createIndex({ workspaceId: 1, createdAt: -1 });

  await db.collection(designVersionsCollectionName).createIndex({ designShortId: 1, ownerId: 1, createdAt: -1 });
  await db.collection(designVersionsCollectionName).createIndex({ designShortId: 1, versionId: 1 }, { unique: true });
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
