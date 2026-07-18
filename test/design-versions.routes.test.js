/** @jest-environment node */

jest.mock('../auth-middleware', () => (req, _res, next) => {
  req.user = { userId: 'user-1', email: 'owner@example.com', type: 'access' };
  next();
});

const express = require('express');
const request = require('supertest');
const createDesignVersionsRouter = require('../routes/design-versions.routes');

function createMemoryDb() {
  const designs = [
    { shortId: 'card123', ownerId: 'user-1', data: { inputs: { 'input-name_ar': 'الحالي' }, imageUrls: { capturedFront: '/front.webp' } } },
    { shortId: 'other12', ownerId: 'user-2', data: { inputs: { 'input-name_ar': 'آخر' } } }
  ];
  const versions = [];
  let sequence = 0;

  function matches(document, query) {
    return Object.entries(query).every(([key, value]) => {
      if (key === '_id' && value?.$in) return value.$in.includes(document._id);
      return document[key] === value;
    });
  }

  function cursor(items) {
    let current = [...items];
    return {
      project(projection) {
        if (projection?.state === 0) current = current.map(({ state, ...item }) => item);
        if (projection?._id === 1) current = current.map((item) => ({ _id: item._id }));
        return this;
      },
      sort(specification) {
        const [key, direction] = Object.entries(specification)[0];
        current.sort((a, b) => direction * (new Date(a[key]).getTime() - new Date(b[key]).getTime()));
        return this;
      },
      limit(value) {
        current = current.slice(0, value);
        return this;
      },
      async toArray() { return current.map((item) => ({ ...item })); }
    };
  }

  const collections = {
    designs: {
      async findOne(query) { return designs.find((item) => matches(item, query)) || null; },
      async updateOne(query, update) {
        const design = designs.find((item) => matches(item, query));
        if (!design) return { matchedCount: 0 };
        Object.assign(design, update.$set || {});
        return { matchedCount: 1 };
      }
    },
    designVersions: {
      createIndex: jest.fn(async () => 'ok'),
      async insertOne(document) {
        const stored = { ...document, _id: `mongo-${sequence += 1}` };
        versions.push(stored);
        return { insertedId: stored._id };
      },
      async countDocuments(query) { return versions.filter((item) => matches(item, query)).length; },
      find(query) { return cursor(versions.filter((item) => matches(item, query))); },
      async findOne(query) { return versions.find((item) => matches(item, query)) || null; },
      async deleteMany(query) {
        const before = versions.length;
        for (let index = versions.length - 1; index >= 0; index -= 1) {
          if (matches(versions[index], query)) versions.splice(index, 1);
        }
        return { deletedCount: before - versions.length };
      },
      async deleteOne(query) {
        const index = versions.findIndex((item) => matches(item, query));
        if (index < 0) return { deletedCount: 0 };
        versions.splice(index, 1);
        return { deletedCount: 1 };
      }
    }
  };

  return {
    db: { collection: (name) => collections[name] },
    designs,
    versions
  };
}

function createApp(memory) {
  const app = express();
  app.use(express.json({ limit: '512kb' }));
  app.use('/api', createDesignVersionsRouter({
    getDb: () => memory.db,
    designsCollectionName: 'designs',
    sanitizeInputs: (inputs) => ({ ...inputs }),
    DOMPurify: { sanitize: (value) => String(value).replace(/<[^>]*>/g, '') }
  }));
  return app;
}

describe('cloud design version routes', () => {
  test('creates and lists owner-scoped cloud versions without returning snapshot bodies', async () => {
    const memory = createMemoryDb();
    const app = createApp(memory);

    const created = await request(app)
      .post('/api/design/card123/versions')
      .send({
        name: 'قبل التعديل <b>الكبير</b>',
        state: {
          inputs: { 'input-name_ar': 'نسخة أولى' },
          dynamic: { phones: [{ value: '<strong>0100</strong>' }] }
        }
      });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ success: true, cloud: true });
    expect(created.body.version.name).toBe('قبل التعديل bالكبير/b');
    expect(memory.versions[0].state.dynamic.phones[0].value).toBe('0100');

    const listed = await request(app).get('/api/design/card123/versions');
    expect(listed.status).toBe(200);
    expect(listed.body.versions).toHaveLength(1);
    expect(listed.body.versions[0].state).toBeUndefined();
  });

  test('does not expose versions for a design owned by another user', async () => {
    const app = createApp(createMemoryDb());
    const response = await request(app).get('/api/design/other12/versions');
    expect(response.status).toBe(404);
    expect(response.body.error).toContain('unauthorized');
  });

  test('creates a safety checkpoint before restoring a cloud version', async () => {
    const memory = createMemoryDb();
    const app = createApp(memory);
    const created = await request(app)
      .post('/api/design/card123/versions')
      .send({ name: 'نسخة قديمة', state: { inputs: { 'input-name_ar': 'القديم' } } });

    const restored = await request(app)
      .post(`/api/design/card123/versions/${created.body.version.id}/restore`)
      .send({ safetyName: 'قبل الاستعادة' });

    expect(restored.status).toBe(200);
    expect(restored.body.restoredVersion.name).toBe('نسخة قديمة');
    expect(restored.body.safetyVersion).toMatchObject({ name: 'قبل الاستعادة', source: 'pre-restore' });
    expect(restored.body.state.inputs['input-name_ar']).toBe('القديم');
    expect(restored.body.state.imageUrls.capturedFront).toBe('/front.webp');
    expect(memory.designs[0].data.inputs['input-name_ar']).toBe('القديم');
    expect(memory.versions).toHaveLength(2);
  });

  test('deletes only an owned version', async () => {
    const memory = createMemoryDb();
    const app = createApp(memory);
    const created = await request(app)
      .post('/api/design/card123/versions')
      .send({ name: 'للحذف', state: { inputs: {} } });

    const deleted = await request(app).delete(`/api/design/card123/versions/${created.body.version.id}`);
    expect(deleted.status).toBe(200);
    expect(memory.versions).toHaveLength(0);

    const missing = await request(app).delete(`/api/design/card123/versions/${created.body.version.id}`);
    expect(missing.status).toBe(404);
  });
});
