import { beforeEach, describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import Trip from '../src/models/schemas/trips.js';

describe('GET /api/trips pagination', () => {
    beforeEach(async () => {
        const template = await Trip.findOne({ id: 'alpine-panorama' })
            .select('-_id').lean().exec();

        await Trip.insertMany(Array.from({ length: 15 }, (_, index) => ({
            ...template,
            id: `pagination-test-${String(index + 1).padStart(2, '0')}`,
            name: `Pagination Test Trip ${index + 1}`
        })));
    });

    test('returns 21 distinct trips across pages of 10, 10, and 1', async () => {
        const ids = [];

        for (const page of [1, 2, 3]) {
            const response = await request(app)
                .get(`/api/trips?page=${page}`).expect(200);

            expect(response.body.trips).toHaveLength(page === 3 ? 1 : 10);
            expect(response.body.pagination).toEqual({
                page, limit: 10, total: 21, totalPages: 3
            });
            ids.push(...response.body.trips.map((trip) => trip.id));
        }

        const allTrips = await request(app).get('/api/trips').expect(200);
        const expectedIds = allTrips.body.trips.map((trip) => trip.id).sort();
        expect(ids).toEqual(expectedIds);
        expect(new Set(ids).size).toBe(21);

        const revisited = await request(app).get('/api/trips?page=1').expect(200);
        expect(revisited.body.trips.map((trip) => trip.id))
            .toEqual(ids.slice(0, 10));
    });

    test('clamps requests beyond the last page', async () => {
        const response = await request(app).get('/api/trips?page=999').expect(200);
        expect(response.body.pagination.page).toBe(3);
        expect(response.body.trips).toHaveLength(1);
    });

    test('rejects invalid page parameters', async () => {
        for (const query of [
            'page=0', 'page=-1', 'page=1.5', 'page=abc', 'page=',
            'page=9007199254740992', 'page=1&page=2'
        ]) {
            const response = await request(app).get(`/api/trips?${query}`)
                .expect(400);
            expect(response.body.error).toBe('Page must be a positive integer');
        }
    });

    test('keeps the complete unpaginated list available', async () => {
        const response = await request(app).get('/api/trips').expect(200);
        expect(response.body.trips).toHaveLength(21);
        expect(response.body).not.toHaveProperty('pagination');
    });

    test('returns an empty page when no trips exist', async () => {
        await Trip.deleteMany({}).exec();
        const response = await request(app).get('/api/trips?page=1').expect(200);
        expect(response.body.trips).toEqual([]);
        expect(response.body.pagination).toEqual({
            page: 1, limit: 10, total: 0, totalPages: 0
        });
    });
});
