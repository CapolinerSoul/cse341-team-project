import { beforeEach, describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { Role } from '../src/models/schemas/roles.js';
import { User } from '../src/models/schemas/users.js';

const registerAndLogin = async ({ name, username, email, role }) => {
  const agent = request.agent(app);
  const password = 'TestPassword123!';

  await agent
    .post('/register')
    .type('form')
    .send({ name, username, email, password })
    .expect(302);

  if (role === 'admin') {
    const adminRole = await Role.findOne({ name: 'admin' });
    await User.updateOne({ email }, { role: adminRole._id });
  }

  await agent
    .post('/login')
    .type('form')
    .send({ email, password })
    .expect(302)
    .expect('Location', '/');

  return agent;
};

describe('trip admin API', () => {
  let customerAgent;
  let adminAgent;

  beforeEach(async () => {
    await Role.create([{ name: 'customer' }, { name: 'admin' }]);

    customerAgent = await registerAndLogin({
      name: 'Test Customer',
      username: 'testcustomer',
      email: 'customer@example.com',
      role: 'customer'
    });

    adminAgent = await registerAndLogin({
      name: 'Test Admin',
      username: 'testadmin',
      email: 'admin@example.com',
      role: 'admin'
    });
  });

  test('rejects signed-out and non-admin modification requests', async () => {
    await request(app).put('/api/trips/alpine-panorama').expect(401);
    await request(app).delete('/api/trips/alpine-panorama').expect(401);

    await customerAgent
      .put('/api/trips/alpine-panorama')
      .send({ name: 'Hacked' })
      .expect(403);
    await customerAgent.delete('/api/trips/alpine-panorama').expect(403);
  });

  test('an admin can update a trip', async () => {
    const response = await adminAgent
      .put('/api/trips/alpine-panorama')
      .send({
        name: 'Alpine Panorama Deluxe',
        startStation: 'toyama',
        endStation: 'nagoya',
        distance: 200,
        operatingMonths: [5, 6, 7]
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 'alpine-panorama',
      name: 'Alpine Panorama Deluxe',
      startStation: 'toyama',
      endStation: 'nagoya',
      distance: 200,
      operatingMonths: [5, 6, 7]
    });
  });

  test('rejects invalid trip updates', async () => {
    await adminAgent
      .put('/api/trips/alpine-panorama')
      .send({ distance: -5 })
      .expect(400);

    await adminAgent
      .put('/api/trips/alpine-panorama')
      .send({ operatingMonths: [0, 13] })
      .expect(400);

    await adminAgent
      .put('/api/trips/missing-trip')
      .send({ name: 'Missing' })
      .expect(404);
  });

  test('an admin can delete a trip', async () => {
    await adminAgent.delete('/api/trips/alpine-panorama').expect(204);
    await adminAgent.delete('/api/trips/alpine-panorama').expect(404);
    await request(app).get('/api/trips/alpine-panorama').expect(404);
  });

  test('returns the stations used by the trip edit form', async () => {
    const response = await adminAgent.get('/api/stations');

    expect(response.status).toBe(200);
    expect(response.body.stations.length).toBeGreaterThan(0);
    expect(response.body.stations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'nagoya', name: 'Nagoya Station' })
      ])
    );
  });

  test('trip admin page requires the admin role', async () => {
    await request(app)
      .get('/admin/trips')
      .expect(302)
      .expect('Location', '/login');

    await customerAgent.get('/admin/trips').expect(403);
    await adminAgent.get('/admin/trips').expect(200);
  });

  test('booking admin page requires a signed-in user', async () => {
    await request(app)
      .get('/admin/bookings')
      .expect(302)
      .expect('Location', '/login');

    await customerAgent.get('/admin/bookings').expect(200);
  });
});
