const { connectDatabase, createIndexes } = require('../utils/database');

describe('Database indexes', () => {
  it('creates the expected indexes for core collections', async () => {
    const collections = new Map();
    const db = {
      collection: jest.fn((name) => {
        if (!collections.has(name)) {
          collections.set(name, { createIndex: jest.fn().mockResolvedValue('ok') });
        }
        return collections.get(name);
      })
    };

    await createIndexes(db, {
      designsCollectionName: 'designs',
      usersCollectionName: 'users',
      savedCardsCollectionName: 'savedCards',
      cardRequestsCollectionName: 'cardRequests'
    });

    expect(collections.get('designs').createIndex).toHaveBeenCalledWith({ shortId: 1 }, { unique: true });
    expect(collections.get('users').createIndex).toHaveBeenCalledWith({ refreshTokenHash: 1 }, { sparse: true });
    expect(collections.get('users').createIndex).toHaveBeenCalledWith({ resetTokenHash: 1 }, { sparse: true });
    expect(collections.get('users').createIndex).toHaveBeenCalledWith({ verificationTokenHash: 1 }, { sparse: true });
    expect(collections.get('savedCards').createIndex).toHaveBeenCalledWith(
      { userId: 1, designShortId: 1 },
      { unique: true }
    );
    expect(collections.get('cardRequests').createIndex).toHaveBeenCalledWith({ ownerUserId: 1, status: 1 });
  });

  it('fails startup when a mandatory security index cannot be created', async () => {
    const createIndex = jest.fn().mockRejectedValue(new Error('duplicate values prevent unique index'));
    const db = { collection: jest.fn(() => ({ createIndex })) };
    const client = { db: jest.fn(() => db) };
    const connect = jest.fn().mockResolvedValueOnce(client);

    await expect(connectDatabase({
      mongoUrl: 'mongodb://test',
      dbName: 'test',
      connect,
      collectionNames: {
        designsCollectionName: 'designs',
        usersCollectionName: 'users',
        savedCardsCollectionName: 'savedCards',
        cardRequestsCollectionName: 'cardRequests'
      }
    })).rejects.toThrow('duplicate values prevent unique index');

  });
});
