/**
 * StayHub PG - Admin Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    const user = getUser();
    if (!user || user.role !== 'admin') {
        showToast('System Administrator access required.', 'warning');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
        return;
    }

    async function loadAdminStats() {
        try {
            const stats = await apiRequest('/stats/admin');

            document.getElementById('adminOwners').textContent = stats.total_owners || 0;
            document.getElementById('adminProperties').textContent = stats.total_properties || 0;
            document.getElementById('adminBeds').textContent = stats.total_beds || 0;
            document.getElementById('adminAvailableBeds').textContent = stats.available_beds || 0;
            document.getElementById('adminRevenue').textContent = formatCurrency(stats.total_revenue || 0);
        } catch (err) {
            console.error('Error loading admin stats:', err);
        }
    }

    async function loadUsers() {
        try {
            const users = await apiRequest('/admin/users');
            const tbody = document.getElementById('adminUsersTableBody');

            tbody.innerHTML = users.map(u => {
                const roleBadge = u.role === 'admin' ? 'bg-danger' :
                                  u.role === 'owner' ? 'bg-primary' : 'bg-success';
                const name = u.role === 'owner' ? u.owner_name : u.role === 'tenant' ? u.tenant_name : 'Administrator';
                const phone = u.owner_phone || u.tenant_phone || 'N/A';

                return `
                    <tr>
                        <td class="fw-bold">#${u.user_id}</td>
                        <td class="fw-semibold">${u.email}</td>
                        <td><span class="badge ${roleBadge}">${u.role.toUpperCase()}</span></td>
                        <td>${name}</td>
                        <td class="small text-muted">${phone}</td>
                        <td class="small text-muted">${formatDateTime(u.created_at)}</td>
                        <td>
                            ${u.user_id !== user.user_id ? `
                                <button class="btn btn-outline-danger btn-sm delete-user-btn" data-user-id="${u.user_id}">
                                    <i class="fas fa-trash-alt me-1"></i> Delete
                                </button>
                            ` : `<span class="badge bg-light text-muted border">Current User</span>`}
                        </td>
                    </tr>
                `;
            }).join('');

            // Delete user
            document.querySelectorAll('.delete-user-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const uid = btn.dataset.userId;
                    if (confirm(`Are you sure you want to delete User Account #${uid}?`)) {
                        try {
                            await apiRequest(`/admin/users/${uid}`, { method: 'DELETE' });
                            showToast('User deleted successfully.', 'success');
                            loadUsers();
                            loadAdminStats();
                        } catch (err) {
                            showToast(err.message, 'danger');
                        }
                    }
                });
            });

        } catch (err) {
            console.error('Error loading users:', err);
        }
    }

    async function loadAllBookings() {
        try {
            const bookings = await apiRequest('/bookings');
            const tbody = document.getElementById('adminBookingsTableBody');

            tbody.innerHTML = bookings.map(b => `
                <tr>
                    <td class="fw-bold">#${b.booking_id}</td>
                    <td>
                        <div class="fw-semibold">${b.tenant_name}</div>
                        <div class="small text-muted">+91 ${b.tenant_phone}</div>
                    </td>
                    <td>
                        <div class="fw-semibold">${b.property_name}</div>
                        <div class="small text-muted">Owner: ${b.owner_name}</div>
                    </td>
                    <td><span class="badge bg-light text-dark border">Bed #${b.bed_id} (${b.room_type})</span></td>
                    <td>${formatDate(b.check_in_date)}</td>
                    <td class="fw-semibold">${formatCurrency(b.monthly_rent)}</td>
                    <td>
                        <span class="status-pill ${b.booking_status === 'Active' ? 'status-active' : 'status-completed'}">
                            ${b.booking_status}
                        </span>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error('Error loading all bookings:', err);
        }
    }

    async function loadAllPayments() {
        try {
            const payments = await apiRequest('/payments');
            const tbody = document.getElementById('adminPaymentsTableBody');

            tbody.innerHTML = payments.map(p => `
                <tr>
                    <td class="fw-bold">PAY-${p.payment_id}</td>
                    <td>#${p.booking_id}</td>
                    <td>${p.tenant_name}</td>
                    <td>${p.property_name}</td>
                    <td class="fw-bold text-success">${formatCurrency(p.amount)}</td>
                    <td><span class="badge bg-secondary-subtle text-secondary">${p.payment_mode}</span></td>
                    <td class="small text-muted">${formatDateTime(p.payment_date)}</td>
                </tr>
            `).join('');
        } catch (err) {
            console.error('Error loading payments:', err);
        }
    }

    async function loadAllComplaints() {
        try {
            const complaints = await apiRequest('/complaints');
            const tbody = document.getElementById('adminComplaintsTableBody');

            tbody.innerHTML = complaints.map(c => `
                <tr>
                    <td class="fw-bold">#${c.complaint_id}</td>
                    <td class="small text-muted">${formatDateTime(c.complaint_date)}</td>
                    <td>
                        <div class="fw-semibold">${c.tenant_name}</div>
                        <div class="small text-muted">+91 ${c.tenant_phone}</div>
                    </td>
                    <td class="text-primary fw-semibold">${c.owner_name || 'Assigned'}</td>
                    <td>${c.description}</td>
                    <td>
                        <span class="status-pill status-${c.status.toLowerCase().replace(' ', '-')}">
                            ${c.status}
                        </span>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error('Error loading complaints:', err);
        }
    }

    loadAdminStats();
    loadUsers();
    loadAllBookings();
    loadAllPayments();
    loadAllComplaints();
});

