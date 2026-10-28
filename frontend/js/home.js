/**
 * StayHub PG - Home Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const filterForm = document.getElementById('filterForm');
    const searchInput = document.getElementById('searchInput');
    const roomTypeSelect = document.getElementById('roomTypeSelect');
    const maxRentSelect = document.getElementById('maxRentSelect');
    const availableOnlyCheck = document.getElementById('availableOnlyCheck');
    const propertiesGrid = document.getElementById('propertiesGrid');
    const resultsCountBadge = document.getElementById('resultsCountBadge');

    async function loadProperties() {
        try {
            const params = new URLSearchParams();

            if (searchInput.value.trim()) {
                params.append('search', searchInput.value.trim());
            }
            if (roomTypeSelect.value) {
                params.append('room_type', roomTypeSelect.value);
            }
            if (maxRentSelect.value) {
                params.append('max_rent', maxRentSelect.value);
            }
            if (availableOnlyCheck.checked) {
                params.append('available_only', 'true');
            }

            const properties = await apiRequest(`/properties?${params.toString()}`);

            resultsCountBadge.textContent = `${properties.length} PG Properties Available`;

            if (properties.length === 0) {
                propertiesGrid.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <i class="fas fa-search fs-1 text-muted mb-3 d-block"></i>
                        <h5>No properties match your filter criteria</h5>
                        <p class="text-muted">Try clearing search terms or selecting 'All Room Types'.</p>
                    </div>
                `;
                return;
            }

            propertiesGrid.innerHTML = properties.map(p => {
                const availableBeds = parseInt(p.available_beds, 10) || 0;
                const totalBeds = parseInt(p.total_beds, 10) || 0;
                const availBadgeClass = availableBeds > 0 ? 'bg-success' : 'bg-danger';

                return `
                    <div class="col-md-6 col-lg-4">
                        <div class="custom-card property-card h-100">
                            <div class="card-body p-4">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h5 class="fw-bold mb-0 text-dark">${p.property_name}</h5>
                                    <span class="badge ${availBadgeClass} text-white px-2 py-1 small">
                                        ${availableBeds > 0 ? `${availableBeds} Beds Free` : 'Full'}
                                    </span>
                                </div>
                                <p class="text-muted small mb-3">
                                    <i class="fas fa-map-marker-alt text-danger me-1"></i> ${p.address}
                                </p>
                                
                                <div class="bg-light p-3 rounded mb-3">
                                    <div class="row text-center">
                                        <div class="col-4 border-end">
                                            <span class="text-muted d-block small">Rooms</span>
                                            <span class="fw-bold fs-6">${p.total_rooms || 0}</span>
                                        </div>
                                        <div class="col-4 border-end">
                                            <span class="text-muted d-block small">Capacity</span>
                                            <span class="fw-bold fs-6">${totalBeds} Beds</span>
                                        </div>
                                        <div class="col-4">
                                            <span class="text-muted d-block small">Available</span>
                                            <span class="fw-bold fs-6 text-success">${availableBeds}</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="mt-auto">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <div>
                                            <span class="text-muted small d-block">Starting from</span>
                                            <span class="fw-bold fs-5 text-primary">
                                                ${p.starting_rent ? formatCurrency(p.starting_rent) : '₹5,000'}<span class="small text-muted fw-normal">/mo</span>
                                            </span>
                                        </div>
                                        <div class="text-end">
                                            <span class="text-muted small d-block">Owner</span>
                                            <span class="fw-semibold small text-secondary">
                                                <i class="fas fa-user-tie me-1"></i>${p.owner_name}
                                            </span>
                                        </div>
                                    </div>
                                    <a href="/property-details.html?id=${p.property_id}" class="btn btn-primary w-100 fw-semibold">
                                        View Details & Book Bed <i class="fas fa-arrow-right ms-1"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error(err);
            propertiesGrid.innerHTML = `
                <div class="col-12 text-center py-5 text-danger">
                    <i class="fas fa-exclamation-triangle fs-1 mb-2"></i>
                    <h5>Error loading properties from database</h5>
                    <p>${err.message}</p>
                </div>
            `;
        }
    }

    filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        loadProperties();
    });

    searchInput.addEventListener('input', () => {
        // Debounce search
        clearTimeout(window.searchTimer);
        window.searchTimer = setTimeout(loadProperties, 350);
    });

    roomTypeSelect.addEventListener('change', loadProperties);
    maxRentSelect.addEventListener('change', loadProperties);
    availableOnlyCheck.addEventListener('change', loadProperties);

    // Initial load
    loadProperties();
});

