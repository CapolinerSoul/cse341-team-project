import {
    getAllBookings,
    getBookingsByPassengerEmail,
    getBookingById,
    updateBookingById,
    deleteBookingById
} from '../models/bookings.js';
import { findUserById } from '../models/users.js';

const isAdmin = (req) => req.user?.role === 'admin';

// Older sessions may not carry the email, so fall back to the database.
async function resolveUserEmail(req) {
    if (req.user?.email) {
        return req.user.email;
    }

    const user = await findUserById(req.user.id);

    return user?.email || null;
}

function isPassenger(booking, email) {
    if (!email || !Array.isArray(booking.passengers)) {
        return false;
    }

    return booking.passengers.some(
        (passenger) => passenger?.email?.toLowerCase() === email.toLowerCase()
    );
}

async function canManageBooking(req, booking) {
    if (isAdmin(req)) {
        return true;
    }

    const email = await resolveUserEmail(req);

    return isPassenger(booking, email);
}

function sanitizeBookingUpdates(body) {
    const updates = {};

    if (typeof body.ticketClass === 'string' && body.ticketClass.trim()) {
        updates.ticketClass = body.ticketClass.trim();
    }

    if (typeof body.selectedDay === 'string' && body.selectedDay.trim()) {
        updates.selectedDay = body.selectedDay.trim();
    }

    if (Array.isArray(body.passengers)) {
        const passengers = body.passengers.map((passenger) => ({
            firstName: String(passenger?.firstName || '').trim(),
            lastName: String(passenger?.lastName || '').trim(),
            email: String(passenger?.email || '').trim(),
            phone: String(passenger?.phone || '').trim()
        }));

        const allValid = passengers.length > 0 && passengers.every(
            (passenger) => passenger.firstName && passenger.lastName
                && passenger.email && passenger.phone
        );

        if (!allValid) {
            return null;
        }

        updates.passengers = passengers;
    }

    return updates;
}

export async function getBookings(req, res) {
    try {
        if (isAdmin(req)) {
            return res.status(200).json({ bookings: await getAllBookings() });
        }

        const email = await resolveUserEmail(req);

        if (!email) {
            return res.status(200).json({ bookings: [] });
        }

        return res.status(200).json({
            bookings: await getBookingsByPassengerEmail(email)
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);

        return res.status(500).json({
            error: 'Failed to fetch bookings'
        });
    }
}

export async function updateBooking(req, res) {
    try {
        const booking = await getBookingById(req.params.id);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (!(await canManageBooking(req, booking))) {
            return res.status(403).json({
                error: 'You are not allowed to modify this booking'
            });
        }

        const updates = sanitizeBookingUpdates(req.body);

        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: 'No valid booking fields were provided'
            });
        }

        const updated = await updateBookingById(req.params.id, updates);

        return res.status(200).json({ booking: updated });
    } catch (error) {
        console.error('Error updating booking:', error);

        return res.status(500).json({
            error: 'Failed to update booking'
        });
    }
}

export async function deleteBooking(req, res) {
    try {
        const booking = await getBookingById(req.params.id);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (!(await canManageBooking(req, booking))) {
            return res.status(403).json({
                error: 'You are not allowed to delete this booking'
            });
        }

        await deleteBookingById(req.params.id);

        return res.status(204).send();
    } catch (error) {
        console.error('Error deleting booking:', error);

        return res.status(500).json({
            error: 'Failed to delete booking'
        });
    }
}

export function bookingsAdminPage(req, res) {
    return res.render('bookings-admin', {
        title: 'Booking Admin'
    });
}
