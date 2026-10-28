/**
 * StayHub PG - Property Details & Bed Booking Handler
 */

document.addEventListener('DOMContentLoaded', async () => {
    const propertyContainer = document.getElementById('propertyContainer');
    const bookingModalEl = document.getElementById('bookingModal');
    const bookingModal = new bootstrap.Modal(bookingModalEl);
    const bookingForm = document.getElementById('bookingForm');
    const modalBedId = document.getElementById('modalBedId');
    const modalBedLabel = document.getElementById('modalBedLabel');
    const modalCheckInDate = document.getElementById('modalCheckInDate');
    const modalMonthlyRent = document.getElementById('modalMonthlyRent');
    const tenantNotice = document.getElementById('tenantNotice');

    // Extract property ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');

    if (!propertyId) {
        propertyContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i> Invalid Property ID.
                <a href="/index.html" class="alert-link">Return to Home</a>
            </div>
        `;
        return;
    }

    // Default check-in date to today
    modalCheckInDate.value = new Date().toISOString().split('T')[0];

    async function loadPropertyDetails() {
        try {
            const prop = await apiRequest(`/properties/${propertyId}`);

            document.title = `${prop.property_name} - StayHub PG`;

            const stats = prop.stats || {};
            const rooms = prop.rooms || [];

            propertyContainer.innerHTML = `
                <!-- Property Overview Header Card -->
                <div class="custom-card p-4 mb-4">
                    <div class="row align-items-center">
                        <div class="col-lg-8">
                            <span class="badge bg-primary-subtle text-primary fw-semibold px-3 py-1 mb-2">
                                <i class="fas fa-building me-1"></i> Verified PG Property
                            </span>
                            <h2 class="fw-bold mb-2 text-dark">${prop.property_name}</h2>
                            <p class="text-muted mb-3 fs-6">
                                <i class="fas fa-map-marker-alt text-danger me-2"></i>${prop.address}
                            </p>
                            
                            <div class="d-flex flex-wrap gap-4 pt-2 border-top">
                                <div>
                                    <span class="text-muted small d-block">Property Owner</span>
                                    <span class="fw-semibold text-dark"><i class="fas fa-user-tie me-1 text-primary"></i> ${prop.owner_name}</span>
                                </div>
                                <div>
                                    <span class="text-muted small d-block">Contact Phone</span>
                                    <span class="fw-semibold text-dark"><i class="fas fa-phone-alt me-1 text-success"></i> +91 ${prop.owner_phone}</span>
                                </div>
                                <div>
                                    <span class="text-muted small d-block">Current Occupancy Rate</span>
                                    <span class="fw-bold text-primary">${stats.occupancy_rate || 0}%</span>
                                </div>
                            </div>
                        </div>

                        <div class="col-lg-4 mt-4 mt-lg-0">
                            <div class="bg-light p-3 rounded-3 border">
                                <h6 class="fw-bold mb-3 text-secondary">Bed Capacity Overview</h6>
                                <div class="d-flex justify-content-between mb-2">
                                    <span class="text-muted small"><i class="fas fa-bed me-1"></i> Total Inventory:</span>
                                    <span class="fw-bold">${stats.total_beds || 0} Beds</span>
                                </div>
                                <div class="d-flex justify-content-between mb-2 text-success">
                                    <span class="small"><i class="fas fa-check-circle me-1"></i> Available Now:</span>
                                    <span class="fw-bold">${stats.available_beds || 0} Beds</span>
                                </div>
                                <div class="d-flex justify-content-between mb-2 text-danger">
                                    <span class="small"><i class="fas fa-user me-1"></i> Occupied:</span>
                                    <span class="fw-bold">${stats.occupied_beds || 0} Beds</span>
                                </div>
                                <div class="d-flex justify-content-between text-warning">
                                    <span class="small"><i class="fas fa-tools me-1"></i> Maintenance:</span>
                                    <span class="fw-bold">${stats.maintenance_beds || 0} Beds</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Rooms & Beds Layout -->
                <div class="mb-4 d-flex justify-content-between align-items-center">
                    <div>
                        <h4 class="fw-bold mb-1">Rooms & Bed Layout</h4>
                        <p class="text-muted small mb-0">Select any available bed slot to initiate booking</p>
                    </div>
                    <div class="d-flex gap-2">
                        <span class="status-pill status-available"><i class="fas fa-circle fs-6"></i> Available</span>
                        <span class="status-pill status-occupied"><i class="fas fa-circle fs-6"></i> Occupied</span>
                        <span class="status-pill status-maintenance"><i class="fas fa-circle fs-6"></i> Maintenance</span>
                    </div>
                </div>

                <div class="row g-4">
                    ${rooms.map(room => `
                        <div class="col-md-6 col-lg-4">
                            <div class="custom-card h-100">
                                <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                                    <h6 class="fw-bold mb-0">Room #${room.room_id}</h6>
                                    <span class="badge bg-secondary text-white">${room.room_type} Sharing</span>
                                </div>
                                <div class="card-body p-3">
                                    <div class="row g-2">
                                        ${room.beds.map(bed => {
                                            const statusClass = bed.status.toLowerCase();
                                            const isAvailable = bed.status === 'Available';
                                            return `
                                                <div class="col-6">
                                                    <div class="bed-box ${statusClass}">
                                                        <div class="fw-bold mb-1"><i class="fas fa-bed me-1"></i> Bed #${bed.bed_id}</div>
                                                        <span class="status-pill status-${statusClass} mb-2">${bed.status}</span>
                                                        ${isAvailable ? `
                                                            <button class="btn btn-primary btn-sm w-100 mt-2 book-bed-btn" 
                                                                data-bed-id="${bed.bed_id}" 
                                                                data-room-type="${room.room_type}"
                                                                data-room-id="${room.room_id}">
                                                                Book Bed
                                                            </button>
                                                        ` : `
                                                            <div class="small text-muted mt-2">${bed.current_tenant_name ? `Occupied by: ${bed.current_tenant_name}` : 'Not Available'}</div>
                                                        `}
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            // Attach booking button handlers
            document.querySelectorAll('.book-bed-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const bedId = btn.dataset.bedId;
                    const roomType = btn.dataset.roomType;
                    const roomId = btn.dataset.roomId;

                    const user = getUser();
                    if (!user) {
                        showToast('Please log in as a Tenant to book a bed.', 'warning');
                        setTimeout(() => {
                            window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
                        }, 1200);
                        return;
                    }

                    if (user.role !== 'tenant' && user.role !== 'admin') {
                        showToast('Only tenant accounts can book beds.', 'danger');
                        return;
                    }

                    modalBedId.value = bedId;
                    modalBedLabel.value = `Bed #${bedId} (Room #${roomId} - ${roomType})`;
                    
                    // Suggest standard rent based on room type
                    const defaultRent = roomType === 'Single' ? 12000 :
                                        roomType === 'Double' ? 8500 :
                                        roomType === 'Triple' ? 6500 : 5000;
                    modalMonthlyRent.value = defaultRent;

                    tenantNotice.innerHTML = `<i class="fas fa-user-check me-1 text-success"></i> Booking will be created for <strong>${user.name}</strong>`;

                    bookingModal.show();
                });
            });

        } catch (err) {
            console.error('Error fetching property details:', err);
            propertyContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i> Error loading property: ${err.message}
                </div>
            `;
        }
    }

    // Submit Booking Form
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bedId = modalBedId.value;
        const checkInDate = modalCheckInDate.value;
        const rent = modalMonthlyRent.value;

        try {
            const submitBtn = document.getElementById('confirmBookingBtn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Processing Stored Procedure...';

            const res = await apiRequest('/bookings', {
                method: 'POST',
                body: JSON.stringify({
                    bed_id: bedId,
                    check_in_date: checkInDate,
                    monthly_rent: rent
                })
            });

            showToast(res.message || 'Bed booked successfully!', 'success');
            bookingModal.hide();

            // Refresh property details to reflect the newly occupied bed
            setTimeout(() => {
                loadPropertyDetails();
            }, 600);

        } catch (err) {
            console.error(err);
            showToast(err.message || 'Failed to book bed', 'danger');
        } finally {
            const submitBtn = document.getElementById('confirmBookingBtn');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Confirm Booking';
        }
    });

    loadPropertyDetails();
});

