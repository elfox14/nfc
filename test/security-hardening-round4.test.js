/**
 * @jest-environment node
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const createAuthRouter = require('../routes/auth.routes');
const createDesignsRouter = require('../routes/designs.routes');
const createAdminRouter = require('../routes/admin.routes');
const { sanitizeDesignState } = require('../utils/sanitize');
const {
  cleanupDesignReferences,
  cleanupUserOwnedData
} = require('../utils/data-cleanup');

describe('Security Hardening Round 4 - data lifecycle and race protections', () => {
  const jwtSecret = 'test-round4-hardening-secret-key-32bytes!';

  beforeAll(() => {
    process.env.JWT_SECRET = jwtSecret;
  });

  it('blocks prototype-pollution object keys during sanitization', () => {
    const payload = JSON.parse(
      '{"positions":{"__proto__":{"polluted":true},"constructor":{"x":8,"y":9},"safe":{"x":1,"y":2}}}'
    );

    const sanitized = sanitizeDesignState(payload);

    expect(Object.prototype.polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(sanitized.positions, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(sanitized.positions, 'constructor')).toBe(false);
    expect(sanitized.positions.safe).toEqual({ x: 1, y: 2 });
  });

  it('cleans references and leads for deleted designs', async () => {
    const collections = {
      saved: { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }) },
      requests: { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }) },
      leads: { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 3 }) }
    };
    const db = {
      collection: jest.fn((name) => {
        if (name === 'saved') return collections.saved;
        if (name === 'requests') return collections.requests;
        if (name === 'leads') return collections.leads;
        throw new Error('Unexpected collection ' + name);
      })
    };

    await cleanupDesignReferences(db, {
      shortIds: ['card-1', 'card-2'],
      savedCardsCollectionName: 'saved',
      cardRequestsCollectionName: 'requests'
    });

    expect(collections.saved.deleteMany).toHaveBeenCalledWith({
      designShortId: { $in: ['card-1', 'card-2'] }
    });
    expect(collections.requests.deleteMany).toHaveBeenCalledWith({
      designShortId: { $in: ['card-1', 'card-2'] }
    });
    expect(collections.leads.deleteMany).toHaveBeenCalledWith({
      cardId: { $in: ['card-1', 'card-2'] }
    });
  });

  it('cleans owned designs using ownerId and removes their leads', async () => {
    const designs = {
      find: jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue([{ shortId: 'owned-card' }])
      })),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 })
    };
    const saved = { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }) };
    const requests = { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }) };
    const leads = { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }) };
    const db = {
      collection: jest.fn((name) => {
        if (name === 'designs') return designs;
        if (name === 'saved') return saved;
        if (name === 'requests') return requests;
        if (name === 'leads') return leads;
        throw new Error('Unexpected collection ' + name);
      })
    };

    await cleanupUserOwnedData(db, {
      userId: 'user-1',
      designsCollectionName: 'designs',
      savedCardsCollectionName: 'saved',
      cardRequestsCollectionName: 'requests'
    });

    expect(designs.find).toHaveBeenCalledWith(
      { ownerId: 'user-1' },
      { projection: { shortId: 1, _id: 0 } }
    );
    expect(designs.deleteMany).toHaveBeenCalledWith({ ownerId: 'user-1' });
    expect(leads.deleteMany).toHaveBeenCalledWith({
      cardId: { $in: ['owned-card'] }
    });
  });

  it('includes leads collected by owned cards in account export', async () => {
    const cursors = {
      designs: [{ shortId: 'card-1', ownerId: 'user-1' }],
      saved: [],
      submitted: [],
      received: [],
      leads: [{ cardId: 'card-1', visitorEmail: 'visitor@example.com' }]
    };
    const users = {
      findOne: jest.fn().mockResolvedValue({
        userId: 'user-1',
        email: 'user@example.com',
        name: 'User'
      })
    };
    const designs = {
      find: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue(cursors.designs) }))
    };
    const saved = {
      find: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue(cursors.saved) }))
    };
    let requestFindCall = 0;
    const requests = {
      find: jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue(
          requestFindCall++ === 0 ? cursors.submitted : cursors.received
        )
      }))
    };
    const leads = {
      find: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue(cursors.leads) }))
    };
    const mockDb = {
      collection: jest.fn((name) => {
        if (name === 'users') return users;
        if (name === 'designs') return designs;
        if (name === 'saved') return saved;
        if (name === 'requests') return requests;
        if (name === 'leads') return leads;
        if (name === 'adminSessions') {
          return {
            findOne: jest.fn().mockResolvedValue({
              jti: 'round4-admin-session',
              type: 'admin',
              expiresAt: new Date(Date.now() + 60_000)
            }),
            deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
            deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 })
          };
        }
        throw new Error('Unexpected collection ' + name);
      })
    };

    const app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter({
      getDb: () => mockDb,
      usersCollectionName: 'users',
      designsCollectionName: 'designs',
      savedCardsCollectionName: 'saved',
      cardRequestsCollectionName: 'requests',
      authLimiter: (req, res, next) => next(),
      allowedOrigins: ['https://mcprime.test'],
      cloudinary: null
    }));

    const token = jwt.sign(
      { userId: 'user-1', email: 'user@example.com', type: 'access' },
      jwtSecret
    );
    const res = await request(app)
      .get('/api/auth/export-data')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.leads).toEqual(cursors.leads);
    expect(leads.find).toHaveBeenCalledWith({ cardId: { $in: ['card-1'] } });
  });

  it('admin user deletion removes ownerId designs and related leads before the user record', async () => {
    const users = {
      findOne: jest.fn().mockResolvedValue({ userId: 'victim-1' }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
    };
    const designs = {
      find: jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue([{ shortId: 'victim-card' }])
      })),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 })
    };
    const saved = { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }) };
    const requests = { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }) };
    const leads = { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }) };
    const mockDb = {
      collection: jest.fn((name) => {
        if (name === 'users') return users;
        if (name === 'designs') return designs;
        if (name === 'saved') return saved;
        if (name === 'requests') return requests;
        if (name === 'leads') return leads;
        throw new Error('Unexpected collection ' + name);
      })
    };

    const app = express();
    app.use(express.json());
    app.use('/api/admin', createAdminRouter({
      getDb: () => mockDb,
      usersCollectionName: 'users',
      designsCollectionName: 'designs',
      savedCardsCollectionName: 'saved',
      cardRequestsCollectionName: 'requests'
    }));

    const adminToken = jwt.sign({ role: 'admin', type: 'admin', jti: 'round4-admin-session' }, jwtSecret, { expiresIn: '1h' });
    const res = await request(app)
      .delete('/api/admin/users/victim-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(designs.deleteMany).toHaveBeenCalledWith({ ownerId: 'victim-1' });
    expect(leads.deleteMany).toHaveBeenCalledWith({
      cardId: { $in: ['victim-card'] }
    });
    expect(users.deleteOne).toHaveBeenCalledWith({ userId: 'victim-1' });
  });

  it('returns already_requested when a concurrent pending request hits the unique index', async () => {
    const designs = {
      findOne: jest.fn().mockResolvedValue({
        shortId: 'card-1',
        ownerId: 'owner-1',
        data: {
          publishedState: {
            inputs: { 'input-name_en': 'Card' }
          }
        }
      })
    };
    const saved = {
      findOne: jest.fn().mockResolvedValue(null)
    };
    const requests = {
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockRejectedValue(Object.assign(new Error('duplicate'), { code: 11000 }))
    };
    const users = {
      findOne: jest.fn()
        .mockResolvedValueOnce({
          userId: 'owner-1',
          cardPrivacy: 'require_approval',
          email: 'owner@example.com',
          name: 'Owner'
        })
        .mockResolvedValueOnce({
          userId: 'requester-1',
          email: 'requester@example.com',
          name: 'Requester'
        })
    };
    const mockDb = {
      collection: jest.fn((name) => {
        if (name === 'designs') return designs;
        if (name === 'saved') return saved;
        if (name === 'requests') return requests;
        if (name === 'users') return users;
        throw new Error('Unexpected collection ' + name);
      })
    };

    const app = express();
    app.use(express.json());
    app.use('/api', createDesignsRouter({
      getDb: () => mockDb,
      designsCollectionName: 'designs',
      usersCollectionName: 'users',
      savedCardsCollectionName: 'saved',
      cardRequestsCollectionName: 'requests',
      absoluteBaseUrl: () => 'https://mcprime.test',
      sanitizeDesignState: state => state,
      cloudinary: null
    }));

    const token = jwt.sign(
      { userId: 'requester-1', email: 'requester@example.com', type: 'access' },
      jwtSecret
    );
    const res = await request(app)
      .post('/api/save-card/card-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('already_requested');
  });
});
