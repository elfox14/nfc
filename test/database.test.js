const { createIndexes } = require('../utils/database');

describe('Database indexes', () => {
  it('creates the expected indexes for core collections', async () => {
    const collections = new Map();
    const db = {
      collection: jest.fn((name) => {
        if (!collections.has(name)) {
          collections.set(name, {
            createIndex: jest.fn().mockResolvedValue('ok'),
            aggregate: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })),
            deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 })
          });
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
    expect(collections.get('designs').createIndex).toHaveBeenCalledWith({ slug: 1 }, { sparse: true });
    expect(collections.get('users').createIndex).toHaveBeenCalledWith({ refreshTokenHash: 1 }, { sparse: true });
    expect(collections.get('users').createIndex).toHaveBeenCalledWith({ resetTokenHash: 1 }, { sparse: true });
    expect(collections.get('users').createIndex).toHaveBeenCalledWith({ verificationTokenHash: 1 }, { sparse: true });
    expect(collections.get('savedCards').createIndex).toHaveBeenCalledWith(
      { userId: 1, designShortId: 1 },
      { unique: true }
    );
    expect(collections.get('cardRequests').createIndex).toHaveBeenCalledWith({ ownerUserId: 1, status: 1 });
    expect(collections.get('cardRequests').createIndex).toHaveBeenCalledWith(
      { requesterId: 1, designShortId: 1, status: 1 },
      {
        unique: true,
        partialFilterExpression: { status: 'pending' },
        name: 'uniq_pending_card_request'
      }
    );
    expect(collections.get('leads').createIndex).toHaveBeenCalledWith({ cardId: 1 });
    expect(collections.get('viewEvents').createIndex).toHaveBeenCalledWith(
      { designShortId: 1, viewerHash: 1 },
      { unique: true, name: 'uniq_card_viewer_window' }
    );
    expect(collections.get('viewEvents').createIndex).toHaveBeenCalledWith(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: 'view_event_ttl' }
    );
    expect(collections.get('adminSessions').createIndex).toHaveBeenCalledWith({ jti: 1 }, { unique: true });
    expect(collections.get('adminSessions').createIndex).toHaveBeenCalledWith(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: 'admin_session_ttl' }
    );
  });
});
