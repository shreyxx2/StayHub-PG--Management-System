/**
 * StayHub PG - Tenant Dashboard JavaScript
 */

document.addEventListener('DOMContentLoaded', async () => {
    const user = getUser();
    if (!user || (user.role !== 'tenant' && user.role !== 'admin')) {
        showToast('Please log in with a tenant account.', 'warning');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
        return;
    }

    document.getElementById('tenantWelcomeName').textContent = `Welcome, ${user.name || 'Tenant'}`;
    if (user.phone) {
        document.getElementById('tenantPhoneDisplay').textContent = `Mobile: +91 ${user.phone} • Email: ${user.email}`;
    }

    const bookingsTableBody = document.getElementById('bookingsTableBody');
    const paymentsTableBody = document.getElementById('paymentsTableBody');
    const complaintsTableBody = document.getElementById('complaintsTableBody');
    const payBookingSelect = document.getElementById('payBookingSelect');

    const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
    const complaintModal = new bootstrap.Modal(document.getElementById('complaintModal'));

    let tenantBookings = [];

    // Load Bookings
    async function loadBookings() {
        try {
            tenantBookings = await apiRequest('/bookings/my');

            let activeCount = 0;
            let totalPaid = 0;
            let totalPending = 0;

            payBookingSelect.innerHTML = '<option value="">-- Choose Booking --</option>';

            if (tenantBookings.length === 0) {
                bookingsTableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-4 text-muted">
                            <i class="fas fa-bed fs-4 d-block mb-2"></i>
                            You have no PG bookings yet. <a href="/index.html" class="fw-semibold">Browse PGs and book a bed</a>.
                        </td>
                    </tr>
                `;
            } else {
                bookingsTableBody.innerHTML = tenantBookings.map(bk => {
                    if (bk.booking_status === 'Active') {
                        activeCount++;
                        // Populate booking options in payment modal
                        const opt = document.createElement('option');
                        opt.value = bk.booking_id;
                        opt.textContent = `Booking #${bk.booking_id} - ${bk.property_name} (Bed #${bk.bed_id}, Rent: ₹${bk.monthly_rent})`;
                        payBookingSelect.appendChild(opt);
                    }

                    totalPaid += parseFloat(bk.total_paid || 0);
                    totalPending += parseFloat(bk.pending_due || 0);

                    const statusBadge = bk.booking_status === 'Active' ? 'status-active' :
                                        bk.booking_status === 'Completed' ? 'status-completed' : 'bg-danger text-white';

                    return `
                        <tr>
                            <td class="fw-bold">#${bk.booking_id}</td>
                            <td>
                                <div class="fw-semibold text-dark">${bk.property_name}</div>
                                <div class="small text-muted">${bk.room_type} Room #${bk.room_id}</div>
                            </td>
                            <td><span class="badge bg-secondary">Bed #${bk.bed_id}</span></td>
                            <td>${formatDate(bk.check_in_date)}</td>
                            <td class="fw-semibold">${formatCurrency(bk.monthly_rent)}</td>
                            <td><span class="status-pill ${statusBadge}">${bk.booking_status}</span></td>
                            <td>
                                <span class="fw-bold ${parseFloat(bk.pending_due) > 0 ? 'text-danger' : 'text-success'}">
                                    ${formatCurrency(bk.pending_due)}
                                </span>
                            </td>
                            <td>
                                ${bk.booking_status === 'Active' ? `
                                    <div class="d-flex gap-1">
                                        <button class="btn btn-primary btn-sm pay-now-btn" data-booking-id="${bk.booking_id}" data-rent="${bk.monthly_rent}">
                                            <i class="fas fa-money-bill-wave me-1"></i> Pay
                                        </button>
                                        <button class="btn btn-outline-danger btn-sm checkout-btn" data-booking-id="${bk.booking_id}">
                                            <i class="fas fa-sign-out-alt me-1"></i> Checkout
                                        </button>
                                    </div>
                                ` : `
                                    <span class="text-muted small">Checked out on ${formatDate(bk.check_out_date)}</span>
                                `}
                            </td>
                        </tr>
                    `;
                }).join('');
            }

            document.getElementById('kpiActiveBookings').textContent = activeCount;
            document.getElementById('kpiTotalPaid').textContent = formatCurrency(totalPaid);
            document.getElementById('kpiPendingDue').textContent = formatCurrency(totalPending);

            // Attach Pay button listeners
            document.querySelectorAll('.pay-now-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const bId = btn.dataset.bookingId;
                    const rent = btn.dataset.rent;
                    payBookingSelect.value = bId;
                    document.getElementById('payAmount').value = rent;
                    paymentModal.show();
                });
            });

            // Attach Checkout button listeners
            document.querySelectorAll('.checkout-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const bId = btn.dataset.bookingId;
                    if (confirm(`Are you sure you want to check out from Booking #${bId}? This will free the bed in MySQL.`)) {
                        try {
                            const res = await apiRequest(`/bookings/${bId}/checkout`, {
                                method: 'POST',
                                body: JSON.stringify({ check_out_date: new Date().toISOString().split('T')[0] })
                            });
                            showToast(res.message || 'Checked out successfully!', 'success');
                            loadBookings();
                        } catch (err) {
                            showToast(err.message || 'Checkout failed', 'danger');
                        }
                    }
                });
            });

        } catch (err) {
            console.error('Error loading bookings:', err);
            bookingsTableBody.innerHTML = `<tr><td colspan="8" class="text-danger py-4 text-center">${err.message}</td></tr>`;
        }
    }

    // Load Payments
    async function loadPayments() {
        try {
            const payments = await apiRequest('/payments/my');

            if (payments.length === 0) {
                paymentsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No payment transactions recorded yet.</td></tr>`;
                return;
            }

            paymentsTableBody.innerHTML = payments.map(p => `
                <tr>
                    <td class="fw-bold">PAY-${p.payment_id}</td>
                    <td><span class="badge bg-light text-dark border">#${p.booking_id}</span></td>
                    <td>
                        <div class="fw-semibold">${p.property_name}</div>
                        <div class="small text-muted">${p.room_type} (Bed #${p.bed_id})</div>
                    </td>
                    <td class="fw-bold text-success">${formatCurrency(p.amount)}</td>
                    <td><span class="badge bg-secondary-subtle text-secondary">${p.payment_mode}</span></td>
                    <td>${formatDateTime(p.payment_date)}</td>
                    <td><span class="status-pill status-resolved"><i class="fas fa-check"></i> Success</span></td>
                </tr>
            `).join('');

        } catch (err) {
            console.error('Error loading payments:', err);
            paymentsTableBody.innerHTML = `<tr><td colspan="7" class="text-danger py-4 text-center">${err.message}</td></tr>`;
        }
    }

    // Load Complaints
    async function loadComplaints() {
        try {
            const complaints = await apiRequest('/complaints/my');

            if (complaints.length === 0) {
                complaintsTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No complaints filed. Everything is good!</td></tr>`;
                return;
            }

            complaintsTableBody.innerHTML = complaints.map(c => {
                const statusClass = c.status === 'Open' ? 'status-open' :
                                    c.status === 'In Progress' ? 'status-in-progress' : 'status-resolved';

                return `
                    <tr>
                        <td class="fw-bold">#${c.complaint_id}</td>
                        <td class="small text-muted">${formatDateTime(c.complaint_date)}</td>
                        <td>${c.description}</td>
                        <td class="fw-semibold text-primary">${c.assigned_owner_name || 'Assigned to Owner'}</td>
                        <td class="small text-muted">+91 ${c.assigned_owner_phone || 'N/A'}</td>
                        <td><span class="status-pill ${statusClass}">${c.status}</span></td>
                    </tr>
                `;
            }).join('');

        } catch (err) {
            console.error('Error loading complaints:', err);
            complaintsTableBody.innerHTML = `<tr><td colspan="6" class="text-danger py-4 text-center">${err.message}</td></tr>`;
        }
    }

    // Submit Payment Form (Calls Stored Procedure record_payment)
    document.getElementById('paymentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const bookingId = payBookingSelect.value;
        const amount = document.getElementById('payAmount').value;
        const mode = document.getElementById('payModeSelect').value;
        const submitBtn = document.getElementById('paySubmitBtn');

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Executing record_payment...';

            const res = await apiRequest('/payments', {
                method: 'POST',
                body: JSON.stringify({ booking_id: bookingId, amount, payment_mode: mode })
            });

            showToast(res.message || 'Payment recorded successfully!', 'success');
            paymentModal.hide();
            loadBookings();
            loadPayments();
        } catch (err) {
            showToast(err.message || 'Failed to record payment', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Payment';
        }
    });

    // Submit Complaint Form (Calls Stored Procedure raise_complaint)
    document.getElementById('complaintForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const description = document.getElementById('complaintDescription').value;
        const submitBtn = document.getElementById('complaintSubmitBtn');

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Executing raise_complaint...';

            const res = await apiRequest('/complaints', {
                method: 'POST',
                body: JSON.stringify({ description })
            });

            showToast(res.message || 'Complaint raised successfully!', 'success');
            complaintModal.hide();
            document.getElementById('complaintDescription').value = '';
            loadComplaints();
        } catch (err) {
            showToast(err.message || 'Failed to raise complaint', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Log Complaint';
        }
    });

    // Initial load
    loadBookings();
    loadPayments();
    loadComplaints();
});

