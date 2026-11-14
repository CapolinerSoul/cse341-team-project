async function loadTrips() {
    const list = document.getElementById('trips-list');
    const template = document.getElementById('trip-card-template');
    const loading = document.getElementById('trips-loading');
    const errorMessage = document.getElementById('trips-error');
    const emptyMessage = document.getElementById('trips-empty');
    const regionFilter = document.getElementById('region-filter');
    const seasonFilter = document.getElementById('season-filter');

    function populateFilter(select, values, selectedValue) {
        const uniqueValues = [...new Set(values)].sort();

        for (const value of uniqueValues) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value.charAt(0).toUpperCase() + value.slice(1);
            select.appendChild(option);
        }

        if (uniqueValues.includes(selectedValue)) {
            select.value = selectedValue;
        }
    }

    try {
        const response = await fetch('/api/trips');

        if (!response.ok) {
            throw new Error(`Failed to load trips (${response.status})`);
        }

        const payload = await response.json();

        if (!Array.isArray(payload.trips)) {
            throw new Error('Unexpected trips response');
        }

        const trips = payload.trips;
        const parameters = new URLSearchParams(window.location.search);

        populateFilter(
            regionFilter,
            trips.map((trip) => trip.region),
            parameters.get('region')
        );

        populateFilter(
            seasonFilter,
            trips.map((trip) => trip.bestSeason),
            parameters.get('season')
        );

        function renderTrips() {
            const filteredTrips = trips.filter((trip) => {
                const matchesRegion = regionFilter.value === 'all'
                    || trip.region === regionFilter.value;
                const matchesSeason = seasonFilter.value === 'all'
                    || trip.bestSeason === seasonFilter.value;

                return matchesRegion && matchesSeason;
            });

            const fragment = document.createDocumentFragment();

            for (const trip of filteredTrips) {
                const card = template.content.cloneNode(true);

                const fields = {
                    name: trip.name,
                    region: trip.region,
                    startStation: trip.startStation,
                    endStation: trip.endStation,
                    duration: trip.duration,
                    distance: `${trip.distance}km`,
                    description: trip.description
                };

                for (const [field, value] of Object.entries(fields)) {
                    card.querySelector(
                        `[data-field="${field}"]`
                    ).textContent = value;
                }

                if (/^[a-z0-9-]+$/i.test(trip.region)) {
                    card.querySelector('.route-card').classList.add(trip.region);
                }

                const season = card.querySelector('[data-field="season"]');
                season.textContent = `Best in ${trip.bestSeason}`;

                if (/^[a-z0-9-]+$/i.test(trip.bestSeason)) {
                    season.classList.add(`season-${trip.bestSeason}`);
                }

                const highlights = card.querySelector(
                    '[data-field="highlights"]'
                );

                for (const highlight of trip.highlights || []) {
                    const tag = document.createElement('span');
                    tag.className = 'highlight-tag';
                    tag.textContent = highlight;
                    highlights.appendChild(tag);
                }

                card.querySelector('[data-field="link"]').href =
                    `/trips/${encodeURIComponent(trip.id)}`;

                fragment.appendChild(card);
            }

            list.replaceChildren(fragment);
            emptyMessage.hidden = filteredTrips.length > 0;
        }

        function updateFilters() {
            const url = new URL(window.location.href);

            for (const [key, select] of [
                ['region', regionFilter],
                ['season', seasonFilter]
            ]) {
                if (select.value === 'all') {
                    url.searchParams.delete(key);
                } else {
                    url.searchParams.set(key, select.value);
                }
            }

            window.history.replaceState(null, '', url);
            renderTrips();
        }

        regionFilter.addEventListener('change', updateFilters);
        seasonFilter.addEventListener('change', updateFilters);

        renderTrips();
    } catch (error) {
        console.error('Error loading trips:', error);
        errorMessage.textContent =
            'Unable to load trips right now. Please try again.';
        errorMessage.hidden = false;
    } finally {
        loading.hidden = true;
    }
}

document.addEventListener('DOMContentLoaded', loadTrips);