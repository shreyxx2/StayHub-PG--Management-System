/**
 * StayHub PG Management System - Core API Client & Utilities
 */

const API_BASE = '/api';

// Retrieve stored authentication token
function getToken() {
    return localStorage.getItem('stayhub_token');
}

// Retrieve stored user object
function getUser() {
    const raw = localStorage.getItem('stayhub_user');
    try {
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

// Set auth data
function setAuth(token, user) {
    localStorage.setItem('stayhub_token', token);
    localStorage.setItem('stayhub_user', JSON.stringify(user));
}

// Clear auth data
function clearAuth() {
    localStorage.removeItem('stayhub_token');
    localStorage.removeItem('stayhub_user');
}

// Check logged in state
function isLoggedIn() {
    return !!getToken() && !!getUser();
}

// Logout and redirect
function logout() {
    clearAuth();
    window.location.href = '/login.html';
}

// Centralized Fetch Wrapper
async function apiRequest(endpoint, options = {}) {
    const headers = options.headers || {};
    
    // Default to JSON Content-Type if sending body
    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    // Attach JWT Bearer Token if present
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    options.headers = headers;

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        
        // Handle unauthenticated expired token
        if (response.status === 401) {
            clearAuth();
            if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('register.html')) {
                showToast('Session expired. Please log in again.', 'warning');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 1200);
            }
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API request failed.');
        }

        return data;
    } catch (err) {
        throw err;
    }
}

// Toast Notification Utility
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-success' :
                    type === 'error' || type === 'danger' ? 'bg-danger' :
                    type === 'warning' ? 'bg-warning text-dark' : 'bg-primary';

    toast.className = `toast align-items-center text-white ${bgClass} border-0 show mb-2 shadow`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.style.minWidth = '280px';

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body d-flex align-items-center gap-2">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' || type === 'danger' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <div>${message}</div>
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Currency Formatter (INR)
function formatCurrency(amount) {
    const val = parseFloat(amount) || 0;
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Date Formatter
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Timestamp Formatter
function formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Dynamic Navigation Setup
function setupNavbar() {
    const user = getUser();
    const navRight = document.getElementById('navbar-auth-links');
    if (!navRight) return;

    if (user) {
        let dashboardUrl = '/tenant-dashboard.html';
        let roleBadge = 'Tenant';

        if (user.role === 'owner') {
            dashboardUrl = '/owner-dashboard.html';
            roleBadge = 'Owner';
        } else if (user.role === 'admin') {
            dashboardUrl = '/admin-dashboard.html';
            roleBadge = 'Admin';
        }

        navRight.innerHTML = `
            <li class="nav-item">
                <a class="nav-link" href="${dashboardUrl}">
                    <i class="fas fa-columns me-1"></i> Dashboard
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/showcase.html">
                    <i class="fas fa-terminal me-1 text-primary"></i> SQL Showcase
                </a>
            </li>
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle d-flex align-items-center gap-1" href="#" id="userMenu" role="button" data-bs-toggle="dropdown">
                    <i class="fas fa-user-circle fs-5"></i>
                    <span>${user.name || user.email}</span>
                    <span class="badge bg-secondary ms-1">${roleBadge}</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0" aria-labelledby="userMenu">
                    <li><span class="dropdown-item-text text-muted small">${user.email}</span></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="${dashboardUrl}"><i class="fas fa-tachometer-alt me-2 text-primary"></i>Dashboard</a></li>
                    <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="logout()"><i class="fas fa-sign-out-alt me-2"></i>Logout</a></li>
                </ul>
            </li>
        `;
    } else {
        navRight.innerHTML = `
            <li class="nav-item">
                <a class="nav-link" href="/showcase.html">
                    <i class="fas fa-terminal me-1 text-primary"></i> SQL Showcase
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/login.html"><i class="fas fa-sign-in-alt me-1"></i> Login</a>
            </li>
            <li class="nav-item">
                <a class="btn btn-primary btn-sm ms-2 px-3" href="/register.html">Register</a>
            </li>
        `;
    }
}

document.addEventListener('DOMContentLoaded', setupNavbar);

