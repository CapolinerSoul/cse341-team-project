(() => {
    const state = { bookings: [] };

    let listEl;
    let templateEl;
    let loadingEl;
    let errorEl;
    let emptyEl;

    const showError = (message) => {
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.hidden = false;
        }
    };

    const formatDate = (value) => {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
    };

    const passengerList = (booking) => (Array.isArray(booking.passengers)
        ? booking.passengers
        : []);

    const renderPassengerFields = (container, booking) => {
        container.replaceChildren();

        passengerList(booking).forEach((passenger, index) => {
            const fieldset = document.createElement('fieldset');
            fieldset.className = 'admin-passenger-fieldset';
            fieldset.dataset.passengerIndex = index;

            const legend = document.createElement('legend');
            legend.textContent = `Passenger ${index + 1}`;
            fieldset.appendChild(legend);

            const grid = document.createElement('div');
            grid.className = 'form-grid';

            const fields = [
                ['firstName', 'First Name', 'text'],
                ['lastName', 'Last Name', 'text'],
                ['email', 'Email', 'email'],
                ['phone', 'Phone', 'tel']
            ];

            for (const [name, labelText, type] of fields) {
                const group = document.createElement('div');
                group.className = 'form-group';

                const label = document.createElement('label');
                label.className = 'form-label';
                label.textContent = labelText;

                const input = document.createElement('input');
                input.type = type;
                input.name = `passenger-${index}-${name}`;
                input.className = 'form-input';
                input.required = true;
                input.value = passenger[name] || '';

                label.appendChild(input);
                group.appendChild(label);
                grid.appendChild(group);
            }

            fieldset.appendChild(grid);
            container.appendChild(fieldset);
        });
    };

    const readPassengerFields = (form, booking) => passengerList(booking)
        .map((passenger, index) => ({
            firstName: form.elements[`passenger-${index}-firstName`].value.trim(),
            lastName: form.elements[`passenger-${index}-lastName`].value.trim(),
            email: form.elements[`passenger-${index}-email`].value.trim(),
            phone: form.elements[`passenger-${index}-phone`].value.trim()
        }));

    const readErrorMessage = async (response, fallback) => {
        try {
            const body = await response.json();
            return body.error || fallback;
        } catch {
            return fallback;
        }
    };

    const buildCard = (booking) => {
        const card = templateEl.content.cloneNode(true).firstElementChild;
        card.dataset.bookingId = booking.id;

        card.querySelector('[data-field="id"]').textContent = booking.id;
        card.querySelector('[data-field="createdAt"]').textContent =
            booking.createdAt ? `Booked ${formatDate(booking.createdAt)}` : '';
        card.querySelector('[data-field="tripId"]').textContent =
            booking.tripId || '—';
        card.querySelector('[data-field="scheduleId"]').textContent =
            booking.scheduleId || '—';
        card.querySelector('[data-field="ticketClass"]').textContent =
            booking.ticketClass || '—';
        card.querySelector('[data-field="selectedDay"]').textContent =
            booking.selectedDay || '—';

        const passengersEl = card.querySelector('[data-field="passengers"]');
        passengersEl.replaceChildren();

        for (const passenger of passengerList(booking)) {
            const item = document.createElement('li');
            item.textContent =
                `${passenger.firstName} ${passenger.lastName} — ${passenger.email} — ${passenger.phone}`;
            passengersEl.appendChild(item);
        }

        const form = card.querySelector('[data-role="edit-form"]');
        form.elements.ticketClass.value = booking.ticketClass || 'standard';
        form.elements.selectedDay.value = booking.selectedDay || 'monday';
        renderPassengerFields(
            form.querySelector('[data-role="passenger-fields"]'),
            booking
        );

        return card;
    };

    const renderBookings = () => {
        const fragment = document.createDocumentFragment();

        for (const booking of state.bookings) {
            fragment.appendChild(buildCard(booking));
        }

        listEl.replaceChildren(fragment);
        emptyEl.hidden = state.bookings.length > 0;
    };

    const getBooking = (id) => state.bookings.find(
        (booking) => booking.id === id
    );

    const handleSave = async (card, form) => {
        const id = card.dataset.bookingId;
        const booking = getBooking(id);
        const formError = form.querySelector('[data-role="form-error"]');
        formError.hidden = true;

        const payload = {
            ticketClass: form.elements.ticketClass.value,
            selectedDay: form.elements.selectedDay.value,
            passengers: readPassengerFields(form, booking)
        };

        try {
            const response = await fetch(
                `/api/bookings/${encodeURIComponent(id)}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) {
                throw new Error(await readErrorMessage(
                    response,
                    `Update failed (${response.status})`
                ));
            }

            const { booking: updated } = await response.json();
            const index = state.bookings.findIndex((item) => item.id === id);
            state.bookings[index] = updated;
            card.replaceWith(buildCard(updated));
        } catch (error) {
            formError.textContent = error.message;
            formError.hidden = false;
        }
    };

    const handleDelete = async (card) => {
        const id = card.dataset.bookingId;

        if (!window.confirm(`Delete booking ${id}? This cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(
                `/api/bookings/${encodeURIComponent(id)}`,
                { method: 'DELETE' }
            );

            if (!response.ok && response.status !== 204) {
                throw new Error(await readErrorMessage(
                    response,
                    `Delete failed (${response.status})`
                ));
            }

            state.bookings = state.bookings.filter((item) => item.id !== id);
            card.remove();
            emptyEl.hidden = state.bookings.length > 0;
        } catch (error) {
            showError(error.message);
        }
    };

    const hookListEvents = () => {
        listEl.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-action]');

            if (!button) {
                return;
            }

            const card = button.closest('.admin-card');
            const form = card.querySelector('[data-role="edit-form"]');

            if (button.dataset.action === 'edit') {
                form.hidden = !form.hidden;
            } else if (button.dataset.action === 'cancel') {
                form.hidden = true;
            } else if (button.dataset.action === 'delete') {
                handleDelete(card);
            }
        });

        listEl.addEventListener('submit', (event) => {
            const form = event.target.closest('[data-role="edit-form"]');

            if (!form) {
                return;
            }

            event.preventDefault();
            handleSave(form.closest('.admin-card'), form);
        });
    };

    const loadBookings = async () => {
        try {
            const response = await fetch('/api/bookings');

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                throw new Error(`Failed to load bookings (${response.status})`);
            }

            const payload = await response.json();
            state.bookings = Array.isArray(payload.bookings)
                ? payload.bookings
                : [];
            renderBookings();
        } catch (error) {
            console.error('Error loading bookings:', error);
            showError('Unable to load bookings right now. Please try again.');
        } finally {
            loadingEl.hidden = true;
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        listEl = document.getElementById('bookings-list');
        templateEl = document.getElementById('booking-card-template');
        loadingEl = document.getElementById('bookings-loading');
        errorEl = document.getElementById('bookings-error');
        emptyEl = document.getElementById('bookings-empty');

        if (!listEl || !templateEl) {
            return;
        }

        hookListEvents();
        loadBookings();
    });
})();
