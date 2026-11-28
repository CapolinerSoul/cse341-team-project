import { beforeEach, describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { getDb } from '../src/db/connect.js';
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

const seedBookings = async () => {
  await getDb().collection('confirmations').insertMany([
    {
      id: 'JRCUSTOMER1',
      createdAt: '2025-01-01T00:00:00.000Z',
      scheduleId: '1',
      tripId: 'alpine-panorama',
      ticketClass: 'standard',
      selectedDay: 'monday',
      passengers: [{
        firstName: 'Test',
        lastName: 'Customer',
        email: 'Customer@Example.com',
        phone: '+81 120-555-0000'
      }]
    },
    {
      id: 'JROTHER0001',
      createdAt: '2025-01-02T00:00:00.000Z',
      scheduleId: '3',
      tripId: 'coastal-breeze',
      ticketClass: 'premium',
      selectedDay: 'friday',
      passengers: [{
        firstName: 'Someone',
        lastName: 'Else',
        email: 'someone.else@example.com',
        phone: '+81 120-555-0001'
      }]
    }
  ]);
};

describe('/api/bookings', () => {
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

    await seedBookings();
  });

  test('rejects signed-out requests', async () => {
    await request(app).get('/api/bookings').expect(401);
    await request(app).put('/api/bookings/JRCUSTOMER1').expect(401);
    await request(app).delete('/api/bookings/JRCUSTOMER1').expect(401);
  });

  test('customers only see bookings where they are a passenger', async () => {
    const response = await customerAgent.get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toHaveLength(1);
    expect(response.body.bookings[0].id).toBe('JRCUSTOMER1');
  });

  test('admins see all bookings', async () => {
    const response = await adminAgent.get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toHaveLength(2);
  });

  test('a passenger can update their own booking', async () => {
    const response = await customerAgent
      .put('/api/bookings/JRCUSTOMER1')
      .send({ ticketClass: 'first', selectedDay: 'sunday' });

    expect(response.status).toBe(200);
    expect(response.body.booking.ticketClass).toBe('first');
    expect(response.body.booking.selectedDay).toBe('sunday');
  });

  test('a customer cannot update or delete another passenger booking', async () => {
    await customerAgent
      .put('/api/bookings/JROTHER0001')
      .send({ ticketClass: 'first' })
      .expect(403);

    await customerAgent.delete('/api/bookings/JROTHER0001').expect(403);
  });

  test('an admin can update and delete any booking', async () => {
    const response = await adminAgent
      .put('/api/bookings/JROTHER0001')
      .send({ selectedDay: 'saturday' });

    expect(response.status).toBe(200);
    expect(response.body.booking.selectedDay).toBe('saturday');

    await adminAgent.delete('/api/bookings/JRCUSTOMER1').expect(204);

    const remaining = await getDb()
      .collection('confirmations')
      .find({})
      .toArray();
    expect(remaining.map((booking) => booking.id)).toEqual(['JROTHER0001']);
  });

  test('a passenger can delete their own booking', async () => {
    await customerAgent.delete('/api/bookings/JRCUSTOMER1').expect(204);
    await customerAgent.delete('/api/bookings/JRCUSTOMER1').expect(404);
  });

  test('rejects updates without any valid fields', async () => {
    await customerAgent
      .put('/api/bookings/JRCUSTOMER1')
      .send({ unexpected: 'value' })
      .expect(400);
  });
});
