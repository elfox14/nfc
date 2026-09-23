const LEADS_COLLECTION_NAME = 'leads';

function uniqueDesignIds(shortIds) {
  return [...new Set((shortIds || []).filter(id => typeof id === 'string' && id))];
}

async function getOwnedDesignIds(db, designsCollectionName, userId) {
  const ownedDesigns = await db.collection(designsCollectionName)
    .find({ ownerId: userId }, { projection: { shortId: 1, _id: 0 } })
    .toArray();
  return uniqueDesignIds(ownedDesigns.map(design => design.shortId));
}

async function cleanupDesignReferences(db, {
  shortIds,
  savedCardsCollectionName,
  cardRequestsCollectionName
}) {
  const ids = uniqueDesignIds(shortIds);
  if (ids.length === 0) return;

  await Promise.all([
    db.collection(savedCardsCollectionName).deleteMany({ designShortId: { $in: ids } }),
    db.collection(cardRequestsCollectionName).deleteMany({ designShortId: { $in: ids } }),
    db.collection(LEADS_COLLECTION_NAME).deleteMany({ cardId: { $in: ids } })
  ]);
}

async function cleanupUserOwnedData(db, {
  userId,
  designsCollectionName,
  savedCardsCollectionName,
  cardRequestsCollectionName
}) {
  const designIds = await getOwnedDesignIds(db, designsCollectionName, userId);

  await Promise.all([
    db.collection(designsCollectionName).deleteMany({ ownerId: userId }),
    db.collection(savedCardsCollectionName).deleteMany({
      $or: [
        { userId },
        ...(designIds.length ? [{ designShortId: { $in: designIds } }] : [])
      ]
    }),
    db.collection(cardRequestsCollectionName).deleteMany({
      $or: [
        { ownerUserId: userId },
        { requesterId: userId },
        ...(designIds.length ? [{ designShortId: { $in: designIds } }] : [])
      ]
    }),
    ...(designIds.length
      ? [db.collection(LEADS_COLLECTION_NAME).deleteMany({ cardId: { $in: designIds } })]
      : [])
  ]);

  return designIds;
}

module.exports = {
  LEADS_COLLECTION_NAME,
  cleanupDesignReferences,
  cleanupUserOwnedData,
  getOwnedDesignIds
};
