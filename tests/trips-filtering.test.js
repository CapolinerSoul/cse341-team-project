import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import Trip from '../src/models/schemas/trips.js';

describe('GET /api/trips filtering', () => {
    test('filters by region without requiring a page parameter', async () => {
        const response = await request(app).get('/api/trips?region=central').expect(200);
        expect(response.body.trips.map((trip) => trip.id))
            .toEqual(['alpine-panorama', 'gorge-explorer']);
        expect(response.body.pagination).toEqual({
            page: 1, limit: 10, total: 2, totalPages: 1
        });
    });

    test('filters by season', async () => {
        const response = await request(app).get('/api/trips?season=winter').expect(200);
        expect(response.body.trips.map((trip) => trip.id)).toEqual(['winter-wetlands']);
    });

    test.each([
        ['PANORAMA', ['alpine-panorama']],
        ['TRADITIONAL VILLAGES', ['alpine-panorama']],
        ['CENTRAL', ['alpine-panorama', 'gorge-explorer']],
        ['anSAi', ['romantic-gorge', 'sakura-valley']]
    ])('matches a case-insensitive substring: %s', async (search, expected) => {
        const response = await request(app).get('/api/trips').query({ search }).expect(200);
        expect(response.body.trips.map((trip) => trip.id)).toEqual(expected);
    });

    test('combines region keywords with the selected dropdown filters', async () => {
        const response = await request(app).get('/api/trips')
            .query({ search: 'KANSAI', season: 'spring' }).expect(200);
        expect(response.body.trips.map((trip) => trip.id)).toEqual(['sakura-valley']);
        expect(response.body.pagination.total).toBe(1);

        const conflicting = await request(app).get('/api/trips')
            .query({ search: 'KANSAI', region: 'central' }).expect(200);
        expect(conflicting.body.trips).toEqual([]);
        expect(conflicting.body.pagination.total).toBe(0);
    });

    test('combines filters before pagination and preserves all dropdown options', async () => {
        const template = await Trip.findOne({ id: 'alpine-panorama' })
            .select('-_id').lean().exec();
        const matches = Array.from({ length: 13 }, (_, index) => ({
            ...template,
            id: `filter-test-${String(index + 1).padStart(2, '0')}`,
            name: `Filtering fixture ${index + 1}`,
            description: 'A paginationkeyword journey.'
        }));
        await Trip.insertMany([
            ...matches,
            { ...matches[0], id: 'aaa-decoy-region', region: 'northern' },
            { ...matches[0], id: 'aaa-decoy-season', bestSeason: 'summer' }
        ]);

        const ids = [];
        for (const page of [1, 2]) {
            const response = await request(app).get('/api/trips').query({
                page, region: 'central', season: 'autumn', search: 'paginationkeyword'
            }).expect(200);
            expect(response.body.trips).toHaveLength(page === 1 ? 10 : 3);
            expect(response.body.pagination).toEqual({
                page, limit: 10, total: 13, totalPages: 2
            });
            expect(response.body.query).toEqual({
                region: 'central', season: 'autumn', search: 'paginationkeyword'
            });
            expect(response.body.filters.regions).toEqual([
                'central', 'hokkaido', 'kansai', 'northern'
            ]);
            expect(response.body.filters.seasons).toEqual([
                'autumn', 'spring', 'summer', 'winter'
            ]);
            ids.push(...response.body.trips.map((trip) => trip.id));
        }
        expect(ids).toEqual(matches.map((trip) => trip.id));
    });

    test('treats regular expression characters as literal keywords', async () => {
        const response = await request(app).get('/api/trips')
            .query({ search: '.*' }).expect(200);
        expect(response.body.trips).toEqual([]);
        expect(response.body.pagination.total).toBe(0);
    });

    test('trims filter values and reports the applied query', async () => {
        const response = await request(app).get('/api/trips').query({
            region: ' central ', season: ' autumn ', search: ' PANORAMA '
        }).expect(200);
        expect(response.body.trips.map((trip) => trip.id)).toEqual(['alpine-panorama']);
        expect(response.body.query).toEqual({
            region: 'central', season: 'autumn', search: 'PANORAMA'
        });
    });

    test('returns an empty first page for unknown filters', async () => {
        const response = await request(app)
            .get('/api/trips?region=unknown&page=99').expect(200);
        expect(response.body.trips).toEqual([]);
        expect(response.body.pagination).toEqual({
            page: 1, limit: 10, total: 0, totalPages: 0
        });
    });

    test('allows all and blank filters', async () => {
        for (const query of [
            { region: 'all', season: 'all', search: '' },
            { region: ' ', season: '', search: ' ' }
        ]) {
            const response = await request(app).get('/api/trips').query(query).expect(200);
            expect(response.body.trips).toHaveLength(6);
            expect(response.body.query).toEqual({ region: 'all', season: 'all', search: '' });
        }
    });

    test('rejects repeated and overly long filter parameters', async () => {
        for (const field of ['region', 'season', 'search']) {
            await request(app).get(`/api/trips?${field}=a&${field}=b`).expect(400);
            const maxLength = field === 'search' ? 200 : 100;
            await request(app).get('/api/trips')
                .query({ [field]: 'x'.repeat(maxLength + 1) }).expect(400);
        }
    });
});
