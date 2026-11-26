(() => {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const state = { trips: [], stations: [] };

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

    const stationName = (id) => {
        const station = state.stations.find((item) => item.id === id);
        return station ? station.name : id;
    };

    const fillStationSelect = (select, selectedId) => {
        select.replaceChildren();

        for (const station of state.stations) {
            const option = document.createElement('option');
            option.value = station.id;
            option.textContent = station.name;
            select.appendChild(option);
        }

        if (selectedId) {
            select.value = selectedId;
        }
    };

    const fillMonthCheckboxes = (container, selectedMonths) => {
        container.replaceChildren();
        const selected = Array.isArray(selectedMonths) ? selectedMonths : [];

        monthNames.forEach((name, index) => {
            const month = index + 1;
            const label = document.createElement('label');
            label.className = 'admin-month-option';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'operatingMonths';
            checkbox.value = month;
            checkbox.checked = selected.includes(month);

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(` ${name}`));
            container.appendChild(label);
        });
    };

    const readErrorMessage = async (response, fallback) => {
        try {
            const body = await response.json();
            return body.error || fallback;
        } catch {
            return fallback;
        }
    };

    const buildCard = (trip) => {
        const card = templateEl.content.cloneNode(true).firstElementChild;
        card.dataset.tripId = trip.id;

        card.querySelector('[data-field="name"]').textContent = trip.name;
        card.querySelector('[data-field="id"]').textContent = trip.id;
        card.querySelector('[data-field="description"]').textContent =
            trip.description;
        card.querySelector('[data-field="region"]').textContent = trip.region;
        card.querySelector('[data-field="route"]').textContent =
            `${stationName(trip.startStation)} → ${stationName(trip.endStation)}`;
        card.querySelector('[data-field="duration"]').textContent =
            trip.duration;
        card.querySelector('[data-field="distance"]').textContent =
            `${trip.distance} km`;
        card.querySelector('[data-field="bestSeason"]').textContent =
            trip.bestSeason;
        card.querySelector('[data-field="operatingMonths"]').textContent =
            (trip.operatingMonths || [])
                .map((month) => monthNames[month - 1])
                .join(', ') || '—';

        const form = card.querySelector('[data-role="edit-form"]');
        form.elements.name.value = trip.name;
        form.elements.region.value = trip.region;
        form.elements.duration.value = trip.duration;
        form.elements.distance.value = trip.distance;
        form.elements.bestSeason.value = trip.bestSeason;
        form.elements.description.value = trip.description;
        form.elements.highlights.value = (trip.highlights || []).join('\n');

        const [startSelect, endSelect] =
            form.querySelectorAll('[data-role="station-select"]');
        fillStationSelect(startSelect, trip.startStation);
        fillStationSelect(endSelect, trip.endStation);

        fillMonthCheckboxes(
            form.querySelector('[data-role="month-checkboxes"]'),
            trip.operatingMonths
        );

        return card;
    };

    const renderTrips = () => {
        const fragment = document.createDocumentFragment();

        for (const trip of state.trips) {
            fragment.appendChild(buildCard(trip));
        }

        listEl.replaceChildren(fragment);
        emptyEl.hidden = state.trips.length > 0;
    };

    const handleSave = async (card, form) => {
        const id = card.dataset.tripId;
        const formError = form.querySelector('[data-role="form-error"]');
        formError.hidden = true;

        const payload = {
            name: form.elements.name.value,
            region: form.elements.region.value,
            startStation: form.elements.startStation.value,
            endStation: form.elements.endStation.value,
            duration: form.elements.duration.value,
            distance: form.elements.distance.value,
            bestSeason: form.elements.bestSeason.value,
            description: form.elements.description.value,
            highlights: form.elements.highlights.value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
            operatingMonths: [
                ...form.querySelectorAll('input[name="operatingMonths"]:checked')
            ].map((checkbox) => Number(checkbox.value))
        };

        try {
            const response = await fetch(
                `/api/trips/${encodeURIComponent(id)}`,
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

            const updated = await response.json();
            const index = state.trips.findIndex((trip) => trip.id === id);
            state.trips[index] = updated;
            card.replaceWith(buildCard(updated));
        } catch (error) {
            formError.textContent = error.message;
            formError.hidden = false;
        }
    };

    const handleDelete = async (card) => {
        const id = card.dataset.tripId;

        if (!window.confirm(`Delete trip "${id}"? This cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(
                `/api/trips/${encodeURIComponent(id)}`,
                { method: 'DELETE' }
            );

            if (!response.ok && response.status !== 204) {
                throw new Error(await readErrorMessage(
                    response,
                    `Delete failed (${response.status})`
                ));
            }

            state.trips = state.trips.filter((trip) => trip.id !== id);
            card.remove();
            emptyEl.hidden = state.trips.length > 0;
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

    const loadData = async () => {
        try {
            const [tripsResponse, stationsResponse] = await Promise.all([
                fetch('/api/trips'),
                fetch('/api/stations')
            ]);

            if (!tripsResponse.ok) {
                throw new Error(`Failed to load trips (${tripsResponse.status})`);
            }

            if (!stationsResponse.ok) {
                throw new Error(`Failed to load stations (${stationsResponse.status})`);
            }

            const tripsPayload = await tripsResponse.json();
            const stationsPayload = await stationsResponse.json();

            state.trips = Array.isArray(tripsPayload.trips)
                ? tripsPayload.trips
                : [];
            state.stations = Array.isArray(stationsPayload.stations)
                ? stationsPayload.stations
                : [];

            renderTrips();
        } catch (error) {
            console.error('Error loading trips:', error);
            showError('Unable to load trips right now. Please try again.');
        } finally {
            loadingEl.hidden = true;
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        listEl = document.getElementById('trips-list');
        templateEl = document.getElementById('trip-card-template');
        loadingEl = document.getElementById('trips-loading');
        errorEl = document.getElementById('trips-error');
        emptyEl = document.getElementById('trips-empty');

        if (!listEl || !templateEl) {
            return;
        }

        hookListEvents();
        loadData();
    });
})();
