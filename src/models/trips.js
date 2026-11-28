import Trip from './schemas/trips.js';

export async function getTripById(id) {
    return Trip.findOne({ id }).lean().exec();
}

export async function getAllTrips() {
    return Trip.find({}).lean().exec();
}

export async function updateTrip(id, updates) {
    return Trip.findOneAndUpdate(
        { id },
        { $set: updates },
        { returnDocument: 'after', runValidators: true }
    ).lean().exec();
}

export async function deleteTrip(id) {
    const result = await Trip.deleteOne({ id }).exec();

    return result.deletedCount > 0;
}

export async function getPaginatedTrips(page = 1, limit = 10, filters = {}) {
    const query = {};

    if (filters.region && filters.region !== 'all') {
        query.region = filters.region;
    }

    if (filters.season && filters.season !== 'all') {
        query.bestSeason = filters.season;
    }

    if (filters.search) {
        // Escape regex characters so keywords are treated as literal text.
        const keyword = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        query.$or = [
            { name: { $regex: keyword, $options: 'i' } },
            { description: { $regex: keyword, $options: 'i' } }
        ];
    }

    const total = await Trip.countDocuments(query).exec();
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.min(page, Math.max(1, totalPages));

    const [trips, regions, seasons] = await Promise.all([
        Trip.find(query)
            .sort({ id: 1 })
            .skip((currentPage - 1) * limit)
            .limit(limit)
            .lean()
            .exec(),
        Trip.distinct('region').exec(),
        Trip.distinct('bestSeason').exec()
    ]);

    return {
        trips,
        pagination: {
            page: currentPage,
            limit,
            total,
            totalPages
        },
        filters: {
            regions: regions.sort(),
            seasons: seasons.sort()
        },
        query: {
            region: filters.region || 'all',
            season: filters.season || 'all',
            search: filters.search || ''
        }
    };
}