function initializeTrips() {
    const list = document.getElementById('trips-list');
    const template = document.getElementById('trip-card-template');
    const loading = document.getElementById('trips-loading');
    const errorMessage = document.getElementById('trips-error');
    const emptyMessage = document.getElementById('trips-empty');
    const pagination = document.getElementById('trips-pagination');
    const previousButton = document.getElementById('trips-previous');
    const nextButton = document.getElementById('trips-next');
    const pageInfo = document.getElementById('trips-page-info');

    let currentPage = 1;
    let totalPages = 0;
    let isLoading = false;

    function renderTrips(trips) {
        const fragment = document.createDocumentFragment();

        for (const trip of trips) {
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

            const highlights = card.querySelector('[data-field="highlights"]');

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
        emptyMessage.hidden = trips.length > 0;
    }

    function updateButtons() {
        previousButton.disabled = isLoading || currentPage <= 1;
        nextButton.disabled = isLoading || currentPage >= totalPages;
    }

    async function loadPage(page) {
        if (isLoading) {
            return;
        }

        isLoading = true;
        loading.hidden = false;
        errorMessage.hidden = true;
        list.setAttribute('aria-busy', 'true');
        updateButtons();

        try {
            const response = await fetch(`/api/trips?page=${page}`);

            if (!response.ok) {
                throw new Error(`Failed to load trips (${response.status})`);
            }

            const payload = await response.json();

            if (!Array.isArray(payload.trips) || !payload.pagination) {
                throw new Error('Unexpected trips response');
            }

            renderTrips(payload.trips);

            currentPage = payload.pagination.page;
            totalPages = payload.pagination.totalPages;

            pageInfo.textContent = payload.pagination.total === 0
                ? 'No trips found'
                : `Page ${currentPage} of ${totalPages}`;

            pagination.hidden = false;
        } catch (error) {
            console.error('Error loading trips:', error);
            errorMessage.textContent =
                'Unable to load trips right now. Please try again.';
            errorMessage.hidden = false;
        } finally {
            isLoading = false;
            loading.hidden = true;
            list.setAttribute('aria-busy', 'false');
            updateButtons();
        }
    }

    previousButton.addEventListener('click', () => {
        loadPage(currentPage - 1);
    });

    nextButton.addEventListener('click', () => {
        loadPage(currentPage + 1);
    });

    loadPage(1);
}

document.addEventListener('DOMContentLoaded', initializeTrips);