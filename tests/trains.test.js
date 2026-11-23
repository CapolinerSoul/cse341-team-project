import { beforeEach, describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { getDb } from '../src/db/connect.js';
import { Role } from '../src/models/schemas/roles.js';

describe('GET /api/trains', () => {
  let agent;

  beforeEach(async () => {
    await Role.create({ name: 'customer' });

    // Keep the login session cookie for subsequent requests.
    agent = request.agent(app);

    await agent
      .post('/register')
      .type('form')
      .send({
        name: 'Test Customer',
        username: 'testcustomer',
        email: 'customer@example.com',
        password: 'TestPassword123!'
      })
      .expect(302)
      .expect('Location', '/login');

    await agent
      .post('/login')
      .type('form')
      .send({
        email: 'customer@example.com',
        password: 'TestPassword123!'
      })
      .expect(302)
      .expect('Location', '/');
  });

  test('rejects signed-out requests with JSON', async () => {
    const response = await request(app).get('/api/trains');

    expect(response.status).toBe(401);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual({ message: 'Authentication required' });
  });

  test('returns a successful JSON response', async () => {
    const response = await agent.get('/api/trains');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toHaveProperty('trains');
    expect(response.body.trains).toBeInstanceOf(Array);
  });

  test('returns the trains from the starter data', async () => {
    const response = await agent.get('/api/trains');

    expect(response.status).toBe(200);
    expect(response.body.trains).toHaveLength(4);
    expect(response.body.trains).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'series-e353',
          name: 'Series E353 Limited Express',
          powerSource: 'Electric'
        })
      ])
    );
  });

  test('returns a train added to the test database', async () => {
    await getDb().collection('trains').insertOne({
      id: 'test-express',
      name: 'Test Express',
      operator: 'Test Railway'
    });

    const response = await agent.get('/api/trains');

    expect(response.status).toBe(200);
    expect(response.body.trains).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'test-express',
          name: 'Test Express'
        })
      ])
    );
  });
});
