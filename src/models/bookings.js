import { getDb } from '../db/connect.js';

// Bookings are stored in the "confirmations" collection, keyed by their
// confirmation code in the "id" field.
const bookings = () => getDb().collection('confirmations');

export async function getAllBookings() {
    return bookings().find({}).sort({ createdAt: -1 }).toArray();
}

export async function getBookingsByPassengerEmail(email) {
    return bookings()
        .find({
            passengers: {
                $elemMatch: {
                    email: {
                        $regex: `^${escapeRegex(email)}$`,
                        $options: 'i'
                    }
                }
            }
        })
        .sort({ createdAt: -1 })
        .toArray();
}

export async function getBookingById(id) {
    return bookings().findOne({ id });
}

export async function updateBookingById(id, updates) {
    const result = await bookings().findOneAndUpdate(
        { id },
        { $set: updates },
        { returnDocument: 'after' }
    );

    return result;
}

export async function deleteBookingById(id) {
    const result = await bookings().deleteOne({ id });

    return result.deletedCount > 0;
}

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
