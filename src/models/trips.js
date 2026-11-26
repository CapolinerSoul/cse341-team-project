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