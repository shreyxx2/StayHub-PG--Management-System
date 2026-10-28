/**
 * StayHub PG - Owner Console Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    const user = getUser();
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
        showToast('Please log in with an Owner account.', 'warning');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
        return;
    }

    document.getElementById('ownerWelcomeName').textContent = `Welcome, ${user.name || 'Owner'}`;
    if (user.phone) {
        document.getElementById('ownerPhoneDisplay').textContent = `Phone: +91 ${user.phone} • Email: ${user.email}`;
    }

    const addPropertyModal = new bootstrap.Modal(document.getElementById('addPropertyModal'));
    const addRoomModal = new bootstrap.Modal(document.getElementById('addRoomModal'));

    // Load Owner KPIs
    async function loadStats() {
        try {
            const stats = await apiRequest('/stats/owner');

            document.getElementById('kpiOccupancy').textContent = `${stats.occupancy_rate || 0}%`;
            document.getElementById('kpiMonthlyRev').textContent = formatCurrency(stats.revenue_this_month || 0);
            document.getElementById('kpiPendingDues').textContent = formatCurrency(stats.total_pending_dues || 0);
            document.getElementById('kpiOpenComplaints').textContent = stats.open_complaints || 0;
        } catch (err) {
            console.error('Error loading stats:', err);
        }
    }

    // Load Properties
    async function loadProperties() {
        try {
            const props = await apiRequest('/properties');
            // Filter to this owner if role is owner
            const ownerProps = user.role === 'owner' ? props.filter(p => p.owner_id === user.owner_id) : props;

            const listEl = document.getElementById('ownerPropertiesList');

            if (ownerProps.length === 0) {
                listEl.innerHTML = `
                    <div class="col-12 text-center py-5 text-muted">
                        <i class="fas fa-building fs-1 mb-2 d-block"></i>
                        <h5>No properties added yet</h5>
                        <p>Click "Add Property" above to create your first PG building.</p>
                    </div>
                `;
                return;
            }

            listEl.innerHTML = ownerProps.map(p => `
                <div class="col-lg-6">
                    <div class="custom-card p-4 h-100">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <h5 class="fw-bold mb-1">${p.property_name}</h5>
                                <p class="text-muted small mb-0"><i class="fas fa-map-marker-alt text-danger me-1"></i> ${p.address}</p>
                            </div>
                            <span class="badge bg-primary text-white">ID #${p.property_id}</span>
                        </div>

                        <div class="bg-light p-3 rounded my-3">
                            <div class="row text-center">
                                <div class="col-4 border-end">
                                    <span class="text-muted d-block small">Rooms</span>
                                    <span class="fw-bold fs-6">${p.total_rooms || 0}</span>
                                </div>
                                <div class="col-4 border-end">
                                    <span class="text-muted d-block small">Total Beds</span>
                                    <span class="fw-bold fs-6">${p.total_beds || 0}</span>
                                </div>
                                <div class="col-4">
                                    <span class="text-muted d-block small">Available</span>
                                    <span class="fw-bold fs-6 text-success">${p.available_beds || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div class="d-flex flex-wrap gap-2 pt-2 border-top">
                            <a href="/property-details.html?id=${p.property_id}" class="btn btn-outline-primary btn-sm">
                                <i class="fas fa-eye me-1"></i> View Layout
                            </a>
                            <button class="btn btn-outline-secondary btn-sm open-add-room-btn" data-prop-id="${p.property_id}">
                                <i class="fas fa-plus me-1"></i> Add Room
                            </button>
                            <button class="btn btn-outline-danger btn-sm ms-auto delete-prop-btn" data-prop-id="${p.property_id}">
                                <i class="fas fa-trash-alt me-1"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            // Add room listener
            document.querySelectorAll('.open-add-room-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('addRoomPropId').value = btn.dataset.propId;
                    addRoomModal.show();
                });
            });

            // Delete property listener
            document.querySelectorAll('.delete-prop-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const pId = btn.dataset.propId;
                    if (confirm(`Are you sure you want to delete Property #${pId}? This cascades to all rooms and beds in MySQL!`)) {
                        try {
                            await apiRequest(`/properties/${pId}`, { method: 'DELETE' });
                            showToast('Property deleted successfully.', 'success');
                            loadProperties();
                            loadStats();
                        } catch (err) {
                            showToast(err.message, 'danger');
                        }
                    }
                });
            });

        } catch (err) {
            console.error('Error loading owner properties:', err);
        }
    }

    // Load Bookings
    async function loadBookings() {
        try {
            const bookings = await apiRequest('/bookings/owner');
            const tbody = document.getElementById('ownerBookingsTableBody');

            if (bookings.length === 0) {
                tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No resident bookings recorded yet.</td></tr>`;
                return;
            }

            tbody.innerHTML = bookings.map(b => {
                const isDefaulter = parseFloat(b.pending_due) > 0;
                return `
                    <tr>
                        <td class="fw-bold">#${b.booking_id}</td>
                        <td class="fw-semibold">${b.tenant_name}</td>
                        <td class="small text-muted">+91 ${b.tenant_phone}</td>
                        <td>${b.property_name}</td>
                        <td><span class="badge bg-light text-dark border">Bed #${b.bed_id} (${b.room_type})</span></td>
                        <td>${formatCurrency(b.monthly_rent)}</td>
                        <td class="text-success fw-semibold">${formatCurrency(b.total_paid)}</td>
                        <td class="fw-bold ${isDefaulter ? 'text-danger' : 'text-success'}">
                            ${formatCurrency(b.pending_due)}
                        </td>
                        <td>
                            <span class="status-pill ${b.booking_status === 'Active' ? 'status-active' : 'status-completed'}">
                                ${b.booking_status}
                            </span>
                        </td>
                        <td>
                            ${b.booking_status === 'Active' ? `
                                <button class="btn btn-outline-danger btn-sm checkout-owner-btn" data-booking-id="${b.booking_id}">
                                    <i class="fas fa-sign-out-alt me-1"></i> Checkout
                                </button>
                            ` : `
                                <span class="small text-muted">Completed</span>
                            `}
                        </td>
                    </tr>
                `;
            }).join('');

            // Checkout handler
            document.querySelectorAll('.checkout-owner-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const bId = btn.dataset.bookingId;
                    if (confirm(`Check out tenant from Booking #${bId}? This calls stored procedure checkout_tenant to free the bed.`)) {
                        try {
                            const res = await apiRequest(`/bookings/${bId}/checkout`, {
                                method: 'POST',
                                body: JSON.stringify({ check_out_date: new Date().toISOString().split('T')[0] })
                            });
                            showToast(res.message, 'success');
                            loadBookings();
                            loadProperties();
                            loadStats();
                        } catch (err) {
                            showToast(err.message, 'danger');
                        }
                    }
                });
            });

        } catch (err) {
            console.error('Error loading owner bookings:', err);
        }
    }

    // Load Payments
    async function loadPayments() {
        try {
            const payments = await apiRequest('/payments/owner');
            const tbody = document.getElementById('ownerPaymentsTableBody');

            if (payments.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No payments received yet.</td></tr>`;
                return;
            }

            tbody.innerHTML = payments.map(p => `
                <tr>
                    <td class="fw-bold">PAY-${p.payment_id}</td>
                    <td>#${p.booking_id}</td>
                    <td class="fw-semibold">${p.tenant_name}</td>
                    <td class="small text-muted">+91 ${p.tenant_phone}</td>
                    <td>${p.property_name}</td>
                    <td class="fw-bold text-success">${formatCurrency(p.amount)}</td>
                    <td><span class="badge bg-secondary-subtle text-secondary">${p.payment_mode}</span></td>
                    <td>${formatDateTime(p.payment_date)}</td>
                </tr>
            `).join('');

        } catch (err) {
            console.error('Error loading owner payments:', err);
        }
    }

    // Load Complaints via M:N owner_complaint link
    async function loadComplaints() {
        try {
            const complaints = await apiRequest('/complaints/owner');
            const tbody = document.getElementById('ownerComplaintsTableBody');

            if (complaints.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No complaints logged for your properties.</td></tr>`;
                return;
            }

            tbody.innerHTML = complaints.map(c => `
                <tr>
                    <td class="fw-bold">#${c.complaint_id}</td>
                    <td class="small text-muted">${formatDateTime(c.complaint_date)}</td>
                    <td class="fw-semibold">${c.tenant_name}</td>
                    <td class="small text-muted">+91 ${c.tenant_phone}</td>
                    <td>${c.description}</td>
                    <td>
                        <span class="status-pill status-${c.status.toLowerCase().replace(' ', '-')}">
                            ${c.status}
                        </span>
                    </td>
                    <td>
                        <select class="form-select form-select-sm status-update-select" data-complaint-id="${c.complaint_id}">
                            <option value="Open" ${c.status === 'Open' ? 'selected' : ''}>Open</option>
                            <option value="In Progress" ${c.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Resolved" ${c.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                        </select>
                    </td>
                </tr>
            `).join('');

            // Status change handler
            document.querySelectorAll('.status-update-select').forEach(select => {
                select.addEventListener('change', async () => {
                    const cId = select.dataset.complaintId;
                    const newStatus = select.value;
                    try {
                        await apiRequest(`/complaints/${cId}/status`, {
                            method: 'PUT',
                            body: JSON.stringify({ status: newStatus })
                        });
                        showToast(`Complaint #${cId} updated to ${newStatus}`, 'success');
                        loadComplaints();
                        loadStats();
                    } catch (err) {
                        showToast(err.message, 'danger');
                    }
                });
            });

        } catch (err) {
            console.error('Error loading complaints:', err);
        }
    }

    // Add Property Form Submit
    document.getElementById('addPropertyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('newPropName').value.trim();
        const address = document.getElementById('newPropAddress').value.trim();

        try {
            await apiRequest('/properties', {
                method: 'POST',
                body: JSON.stringify({ name, address })
            });

            showToast('Property created successfully!', 'success');
            addPropertyModal.hide();
            document.getElementById('newPropName').value = '';
            document.getElementById('newPropAddress').value = '';
            loadProperties();
            loadStats();
        } catch (err) {
            showToast(err.message, 'danger');
        }
    });

    // Add Room Form Submit
    document.getElementById('addRoomForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const propId = document.getElementById('addRoomPropId').value;
        const roomType = document.getElementById('addRoomType').value;
        const bedCount = document.getElementById('addRoomBedCount').value;

        try {
            await apiRequest(`/properties/${propId}/rooms`, {
                method: 'POST',
                body: JSON.stringify({ room_type: roomType, bed_count: bedCount })
            });

            showToast(`Room (${roomType}) with ${bedCount} beds added!`, 'success');
            addRoomModal.hide();
            loadProperties();
            loadStats();
        } catch (err) {
            showToast(err.message, 'danger');
        }
    });

    // Initial loads
    loadStats();
    loadProperties();
    loadBookings();
    loadPayments();
    loadComplaints();
});

