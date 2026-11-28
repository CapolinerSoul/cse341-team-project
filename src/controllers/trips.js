import {
    getTripById as findTripById,
    getAllTrips as findAllTrips,
    getPaginatedTrips,
    updateTrip as updateTripById,
    deleteTrip as deleteTripById
} from '../models/trips.js';
import { getDb } from '../db/connect.js';

export async function getTripById(req, res) {
    try {
        const trip = await findTripById(req.params.id);

        if (!trip) {
            return res.status(404).json({
                error: 'Trip not found'
            });
        }

        return res.status(200).json(trip);
    } catch (error) {
        console.error('Error fetching trip:', error);

        return res.status(500).json({
            error: 'Failed to fetch trip'
        });
    }
}

export async function getAllTrips(req, res) {
    try {
        const hasQuery = ['page', 'region', 'season', 'search']
            .some((key) => req.query[key] !== undefined);

        // Preserve the complete list used by the admin page.
        if (!hasQuery) {
            const trips = await findAllTrips();

            return res.status(200).json({ trips });
        }

        const pageValue = req.query.page ?? '1';

        if (typeof pageValue !== 'string'
            || !/^[1-9]\d*$/.test(pageValue)
            || !Number.isSafeInteger(Number(pageValue))) {
            return res.status(400).json({
                error: 'Page must be a positive integer'
            });
        }

        const filters = {};

        for (const field of ['region', 'season', 'search']) {
            const value = req.query[field];

            if (value === undefined) {
                continue;
            }

            const maxLength = field === 'search' ? 200 : 100;

            if (typeof value !== 'string'
                || value.trim().length > maxLength) {
                return res.status(400).json({
                    error: `${field} must be a single string of at most ${maxLength} characters`
                });
            }

            filters[field] = value.trim();
        }

        const result = await getPaginatedTrips(
            Number(pageValue),
            10,
            filters
        );

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching trips:', error);

        return res.status(500).json({
            error: 'Failed to fetch trips'
        });
    }
}

const stringFields = [
    'name', 'description', 'region', 'startStation',
    'endStation', 'duration', 'bestSeason', 'imageUrl'
];

function sanitizeTripUpdates(body) {
    const updates = {};

    for (const field of stringFields) {
        if (typeof body[field] === 'string' && body[field].trim()) {
            updates[field] = body[field].trim();
        }
    }

    if (body.distance !== undefined) {
        const value = body.distance;

        if (typeof value !== 'number'
            && (typeof value !== 'string' || !value.trim())) {
            return null;
        }

        const distance = Number(value);

        if (!Number.isFinite(distance) || distance < 0) {
            return null;
        }

        updates.distance = distance;
    }

    if (body.highlights !== undefined) {
        if (!Array.isArray(body.highlights)
            || body.highlights.some((highlight) => typeof highlight !== 'string')) {
            return null;
        }

        updates.highlights = body.highlights
            .map((highlight) => highlight.trim())
            .filter(Boolean);
    }

    if (body.operatingMonths !== undefined) {
        if (!Array.isArray(body.operatingMonths)
            || body.operatingMonths.some((month) => !Number.isInteger(month) || month < 1 || month > 12)) {
            return null;
        }

        updates.operatingMonths = body.operatingMonths;
    }

    return updates;
}

export async function updateTrip(req, res) {
    try {
        const updates = sanitizeTripUpdates(req.body);

        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: 'No valid trip fields were provided'
            });
        }

        const trip = await updateTripById(req.params.id, updates);

        if (!trip) {
            return res.status(404).json({
                error: 'Trip not found'
            });
        }

        return res.status(200).json(trip);
    } catch (error) {
        console.error('Error updating trip:', error);

        return res.status(500).json({
            error: 'Failed to update trip'
        });
    }
}

export async function deleteTrip(req, res) {
    try {
        const deleted = await deleteTripById(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                error: 'Trip not found'
            });
        }

        return res.status(204).send();
    } catch (error) {
        console.error('Error deleting trip:', error);

        return res.status(500).json({
            error: 'Failed to delete trip'
        });
    }
}

export async function getAllStations(req, res) {
    try {
        const stations = await getDb()
            .collection('stations')
            .find({})
            .sort({ name: 1 })
            .toArray();

        return res.status(200).json({ stations });
    } catch (error) {
        console.error('Error fetching stations:', error);

        return res.status(500).json({
            error: 'Failed to fetch stations'
        });
    }
}

export function listTripsPage(req, res) {
    return res.render('trips/list', {
        title: 'Scenic Train Trips'
    });
}

export function tripsAdminPage(req, res) {
    return res.render('trips-admin', {
        title: 'Trip Admin'
    });
}

export async function tripDetailsPage(req, res, next) {
    try {
        const details = await findTripById(req.params.tripId);

        if (!details) {
            const error = new Error('Trip not found');
            error.status = 404;
            return next(error);
        }

        details.schedules = await getDb()
            .collection('schedules')
            .find({ tripId: details.id })
            .toArray();

        return res.render('trips/details', {
            title: details.name,
            details
        });
    } catch (error) {
        return next(error);
    }
}