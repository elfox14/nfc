async function createIndexes(db, collectionNames) {
  const {
    designsCollectionName,
    usersCollectionName,
    savedCardsCollectionName,
    cardRequestsCollectionName
  } = collectionNames;

  await db.collection(designsCollectionName).createIndex({ shortId: 1 }, { unique: true });
  await db.collection(designsCollectionName).createIndex({ slug: 1 }, { sparse: true });
  await db.collection(designsCollectionName).createIndex({ ownerId: 1 });
  await db.collection(designsCollectionName).createIndex({ createdAt: -1 });

  await db.collection(usersCollectionName).createIndex({ email: 1 }, { unique: true });
  await db.collection(usersCollectionName).createIndex({ userId: 1 }, { unique: true });
  await db.collection(usersCollectionName).createIndex({ googleId: 1 }, { unique: true, sparse: true });
  await db.collection(usersCollectionName).createIndex({ 'usedRefreshTokens.hash': 1 }, { sparse: true });
  await db.collection(usersCollectionName).createIndex({ refreshTokenHash: 1 }, { sparse: true });
  await db.collection(usersCollectionName).createIndex({ resetTokenHash: 1 }, { sparse: true });
  await db.collection(usersCollectionName).createIndex({ verificationTokenHash: 1 }, { sparse: true });

  await db.collection(savedCardsCollectionName).createIndex({ userId: 1 });
  await db.collection(savedCardsCollectionName).createIndex(
    { userId: 1, designShortId: 1 },
    { unique: true }
  );

  const cardRequests = db.collection(cardRequestsCollectionName);
  await cardRequests.createIndex({ ownerUserId: 1, status: 1 });
  await cardRequests.createIndex({ requesterId: 1, designShortId: 1 });

  // Migrate away any historical duplicate pending requests before enforcing
  // atomic uniqueness. Keep the oldest request and remove only redundant copies.
  const duplicatePendingGroups = await cardRequests.aggregate([
    { $match: { status: 'pending' } },
    { $sort: { createdAt: 1, _id: 1 } },
    {
      $group: {
        _id: { requesterId: '$requesterId', designShortId: '$designShortId' },
        ids: { $push: '$_id' },
        count: { $sum: 1 }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  for (const group of duplicatePendingGroups) {
    const duplicateIds = Array.isArray(group.ids) ? group.ids.slice(1) : [];
    if (duplicateIds.length) {
      await cardRequests.deleteMany({ _id: { $in: duplicateIds } });
    }
  }

  await cardRequests.createIndex(
    { requesterId: 1, designShortId: 1, status: 1 },
    {
      unique: true,
      partialFilterExpression: { status: 'pending' },
      name: 'uniq_pending_card_request'
    }
  );

  await db.collection('leads').createIndex({ cardId: 1 });
  await db.collection('leads').createIndex({ createdAt: -1 });

  const viewEvents = db.collection('viewEvents');
  await viewEvents.createIndex(
    { designShortId: 1, viewerHash: 1 },
    { unique: true, name: 'uniq_card_viewer_window' }
  );
  await viewEvents.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: 'view_event_ttl' }
  );

  await db.collection('adminSessions').createIndex({ jti: 1 }, { unique: true });
  await db.collection('adminSessions').createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: 'admin_session_ttl' }
  );
}

async function connectDatabase({
  mongoUrl,
  dbName,
  collectionNames
}) {
  const { MongoClient } = require('mongodb');
  const client = await MongoClient.connect(mongoUrl);
  const db = client.db(dbName);

  // Security-critical uniqueness and TTL guarantees are part of application
  // correctness. Do not serve traffic if these indexes cannot be established.
  try {
    await createIndexes(db, collectionNames);
  } catch (indexErr) {
    await client.close().catch(() => {});
    throw new Error(`Failed to establish required MongoDB indexes: ${indexErr.message}`);
  }

  return { db, client };
}

module.exports = {
  connectDatabase,
  createIndexes
};
