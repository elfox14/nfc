const { createIndexes } = require('../utils/database');

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
});
