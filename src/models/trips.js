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

export async function getPaginatedTrips(page = 1, limit = 10) {
    const total = await Trip.countDocuments({}).exec();
    const totalPages = Math.ceil(total / limit);

    // Keep the requested page within the available results.
    const currentPage = Math.min(page, Math.max(1, totalPages));

    const trips = await Trip.find({})
        .sort({ id: 1 })
        .skip((currentPage - 1) * limit)
        .limit(limit)
        .lean()
        .exec();

    return {
        trips,
        pagination: {
            page: currentPage,
            limit,
            total,
            totalPages
        }
    };
}