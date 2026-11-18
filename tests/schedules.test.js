import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('GET /api/trips/:id/schedules', () => {
  test('returns schedules for a trip', async () => {
    const response = await request(app).get('/api/trips/alpine-panorama/schedules');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toMatchObject({
      id: 1,
      tripId: 'alpine-panorama',
      departureTime: '08:30'
    });
  });

  describe('GET /trips/:tripId', () => {
    test('renders schedule content for client-side hydration', async () => {
      const response = await request(app).get('/trips/alpine-panorama');

      expect(response.status).toBe(200);
      expect(response.text).toContain('id="schedule-month"');
      expect(response.text).toContain('/api/trips/');
      expect(response.text).not.toContain('class="schedule-card"');
    });
  });

  test('returns schedules only when the trip operates in the selected month', async () => {
    const operatingMonth = await request(app)
      .get('/api/trips/alpine-panorama/schedules?month=4');
    const offSeasonMonth = await request(app)
      .get('/api/trips/alpine-panorama/schedules?month=1');

    expect(operatingMonth.status).toBe(200);
    expect(operatingMonth.body).toHaveLength(2);
    expect(offSeasonMonth.status).toBe(200);
    expect(offSeasonMonth.body).toEqual([]);
  });

  test('rejects months outside the 1-12 range', async () => {
    const response = await request(app)
      .get('/api/trips/alpine-panorama/schedules?month=13');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});
