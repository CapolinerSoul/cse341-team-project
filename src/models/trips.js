import Trip from './schemas/trips.js';

export async function getTripById(id) {
    return Trip.findOne({ id }).lean().exec();
}

export async function getAllTrips() {
    return Trip.find({}).lean().exec();
}