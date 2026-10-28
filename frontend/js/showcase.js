/**
 * StayHub PG - DBMS Viva Interactive Showcase Logic
 */

let allQueries = [];

function scrollToResult() {
    const el = document.getElementById('liveResultBox');
    if (el && el.style.display !== 'none') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        showToast('Run any query or view first to view output table.', 'info');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const liveResultBox = document.getElementById('liveResultBox');
    const resultTitle = document.getElementById('resultTitle');
    const resultTiming = document.getElementById('resultTiming');
    const resultRowCount = document.getElementById('resultRowCount');
    const resultSqlCode = document.getElementById('resultSqlCode');
    const resultTableHead = document.getElementById('resultTableHead');
    const resultTableBody = document.getElementById('resultTableBody');

    const queriesListContainer = document.getElementById('queriesListContainer');
    const viewsListContainer = document.getElementById('viewsListContainer');

    // Helper: Display Tabular Results
    function displayResults(title, sql, executionTimeMs, rowCount, columns, rows) {
        liveResultBox.style.display = 'block';
        resultTitle.textContent = title;
        resultTiming.textContent = `${executionTimeMs} ms`;
        resultRowCount.textContent = `${rowCount} rows`;
        resultSqlCode.textContent = sql;

        // Render Table Headers
        if (columns && columns.length > 0) {
            resultTableHead.innerHTML = `<tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr>`;
        } else {
            resultTableHead.innerHTML = '<tr><th>Output</th></tr>';
        }

        // Render Table Rows
        if (!rows || rows.length === 0) {
            resultTableBody.innerHTML = `<tr><td colspan="${columns.length || 1}" class="text-center py-3 text-muted">Empty result set (0 rows).</td></tr>`;
        } else {
            resultTableBody.innerHTML = rows.map(row => {
                return `<tr>${columns.map(col => {
                    const val = row[col];
                    const displayVal = val === null || val === undefined ? '<span class="text-muted fst-italic">NULL</span>' :
                                       typeof val === 'number' ? (col.includes('rent') || col.includes('amount') || col.includes('revenue') || col.includes('paid') || col.includes('due') ? formatCurrency(val) : val) :
                                       val;
                    return `<td>${displayVal}</td>`;
                }).join('')}</tr>`;
            }).join('');
        }

        liveResultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 1. Load 30 Master Queries
    async function loadQueries() {
        try {
            allQueries = await apiRequest('/showcase/queries');
            renderQueries('ALL');
        } catch (err) {
            console.error('Error loading queries:', err);
            queriesListContainer.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
        }
    }

    function renderQueries(selectedCategory) {
        const filtered = selectedCategory === 'ALL' 
            ? allQueries 
            : allQueries.filter(q => q.category.toLowerCase().includes(selectedCategory.toLowerCase()));

        if (filtered.length === 0) {
            queriesListContainer.innerHTML = `<div class="text-center py-4 text-muted">No queries in this category.</div>`;
            return;
        }

        queriesListContainer.innerHTML = filtered.map(q => `
            <div class="custom-card p-4">
                <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                    <div>
                        <span class="badge bg-secondary me-1">Query #${q.id}</span>
                        <span class="viva-tag me-1">${q.category}</span>
                        <span class="badge bg-light text-primary border">${q.concept}</span>
                        <h5 class="fw-bold mt-2 mb-1 text-dark">${q.title}</h5>
                    </div>
                    <button class="btn btn-primary btn-sm px-3 fw-semibold run-query-btn" data-query-id="${q.id}">
                        <i class="fas fa-play me-1"></i> Run Query
                    </button>
                </div>
                <p class="text-muted small mb-3">${q.description}</p>
                <pre class="sql-pre"><code>${q.sql}</code></pre>
            </div>
        `).join('');

        // Attach Run Query Handlers
        document.querySelectorAll('.run-query-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const qId = btn.dataset.queryId;
                const originalText = btn.innerHTML;
                try {
                    btn.disabled = true;
                    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Executing...';

                    const res = await apiRequest('/showcase/run-query', {
                        method: 'POST',
                        body: JSON.stringify({ query_id: qId })
                    });

                    const qObj = allQueries.find(item => item.id === parseInt(qId, 10));
                    displayResults(`Query #${qId}: ${qObj.title}`, res.sql, res.execution_time_ms, res.row_count, res.columns, res.rows);
                    showToast(`Query #${qId} executed in ${res.execution_time_ms} ms!`, 'success');
                } catch (err) {
                    showToast(err.message, 'danger');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            });
        });
    }

    // Category Filter Buttons
    document.querySelectorAll('.query-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.query-cat-btn').forEach(b => b.classList.remove('btn-primary', 'active'));
            document.querySelectorAll('.query-cat-btn').forEach(b => b.classList.add('btn-outline-secondary'));

            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-primary', 'active');

            renderQueries(btn.dataset.category);
        });
    });

    // 2. Load 5 Virtual Views
    async function loadViews() {
        try {
            const views = await apiRequest('/showcase/views');

            viewsListContainer.innerHTML = views.map(v => `
                <div class="col-md-6">
                    <div class="custom-card p-4 h-100 d-flex flex-direction-column">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="fw-bold mb-1 text-dark">${v.title}</h5>
                            <span class="badge bg-info text-dark">VIEW</span>
                        </div>
                        <p class="text-muted small mb-3">${v.description}</p>
                        <pre class="sql-pre small mb-3"><code>${v.sql}</code></pre>
                        <button class="btn btn-outline-primary btn-sm w-100 mt-auto run-view-btn" data-view-name="${v.name}" data-view-title="${v.title}">
                            <i class="fas fa-play me-1"></i> Query View (SELECT * FROM ${v.name})
                        </button>
                    </div>
                </div>
            `).join('');

            // Attach view runners
            document.querySelectorAll('.run-view-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const viewName = btn.dataset.viewName;
                    const viewTitle = btn.dataset.viewTitle;
                    const originalText = btn.innerHTML;

                    try {
                        btn.disabled = true;
                        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Querying View...';

                        const res = await apiRequest('/showcase/run-view', {
                            method: 'POST',
                            body: JSON.stringify({ view_name: viewName })
                        });

                        displayResults(`View: ${viewTitle}`, res.sql, res.execution_time_ms, res.row_count, res.columns, res.rows);
                        showToast(`View '${viewName}' queried in ${res.execution_time_ms} ms!`, 'success');
                    } catch (err) {
                        showToast(err.message, 'danger');
                    } finally {
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    }
                });
            });

        } catch (err) {
            console.error('Error loading views:', err);
        }
    }

    // 3. Stored Procedure with Cursor Runner
    document.getElementById('runCursorBtn').addEventListener('click', async () => {
        const btn = document.getElementById('runCursorBtn');
        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Executing Cursor Loop...';

            const res = await apiRequest('/showcase/run-cursor-report', { method: 'POST' });

            displayResults(
                'Stored Procedure Cursor: generate_monthly_dues_report()',
                `CALL generate_monthly_dues_report(); -- Iterates active bookings row-by-row using an explicit CURSOR`,
                res.execution_time_ms,
                res.row_count,
                res.columns,
                res.rows
            );
            showToast('Cursor report executed successfully!', 'success');
        } catch (err) {
            showToast(err.message, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-play me-1"></i> Execute generate_monthly_dues_report()';
        }
    });

    // 4. Sample SQL Function Buttons
    document.querySelectorAll('.run-sample-sql-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const sql = btn.dataset.sql;
            try {
                const res = await apiRequest('/showcase/run-query', {
                    method: 'POST',
                    body: JSON.stringify({ custom_sql: sql })
                });

                displayResults('Stored Function Demonstration', sql, res.execution_time_ms, res.row_count, res.columns, res.rows);
                showToast('Function query executed!', 'success');
            } catch (err) {
                showToast(err.message, 'danger');
            }
        });
    });

    // 5. Interactive Trigger Demonstration Runners
    const triggerResultBox = document.getElementById('triggerResultBox');
    const triggerResultContent = document.getElementById('triggerResultContent');

    document.querySelectorAll('.trigger-test-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const demoType = btn.dataset.demo;
            const originalText = btn.innerHTML;

            try {
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Firing Trigger Event in MySQL...';

                const res = await apiRequest('/showcase/test-trigger', {
                    method: 'POST',
                    body: JSON.stringify({ trigger_demo: demoType })
                });

                triggerResultBox.style.display = 'block';

                let detailsHtml = '';
                if (res.demo.includes('Occupied')) {
                    detailsHtml = `
                        <div class="row g-3 mb-3">
                            <div class="col-md-4">
                                <div class="bg-light p-3 rounded text-center">
                                    <div class="small text-muted">Tested Bed ID</div>
                                    <div class="fw-bold fs-5">Bed #${res.tested_bed_id}</div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="bg-light p-3 rounded text-center">
                                    <div class="small text-muted">Bed Status BEFORE</div>
                                    <span class="status-pill status-available">${res.bed_status_before}</span>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="bg-light p-3 rounded text-center">
                                    <div class="small text-muted">Bed Status AFTER Trigger</div>
                                    <span class="status-pill status-occupied">${res.bed_status_after}</span>
                                </div>
                            </div>
                        </div>
                    `;
                } else if (res.demo.includes('Available')) {
                    detailsHtml = `
                        <div class="row g-3 mb-3">
                            <div class="col-md-4">
                                <div class="bg-light p-3 rounded text-center">
                                    <div class="small text-muted">Tested Booking ID</div>
                                    <div class="fw-bold fs-5">Booking #${res.tested_booking_id}</div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="bg-light p-3 rounded text-center">
                                    <div class="small text-muted">Bed Status BEFORE</div>
                                    <span class="status-pill status-occupied">${res.bed_status_before}</span>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="bg-light p-3 rounded text-center">
                                    <div class="small text-muted">Bed Status AFTER Checkout</div>
                                    <span class="status-pill status-available">${res.bed_status_after}</span>
                                </div>
                            </div>
                        </div>
                    `;
                } else if (res.blocked_successfully) {
                    detailsHtml = `
                        <div class="alert alert-danger py-2 px-3 mb-3">
                            <div class="fw-bold"><i class="fas fa-shield-alt me-1"></i> Trigger Intercepted & Blocked Operation!</div>
                            <div class="small">MySQL SIGNAL SQLSTATE: <strong>${res.sqlstate}</strong></div>
                            <div class="small">Error Message: <em>"${res.mysql_error_message}"</em></div>
                        </div>
                    `;
                } else if (res.auto_linked_mappings) {
                    detailsHtml = `
                        <div class="alert alert-success py-2 px-3 mb-3">
                            <div class="fw-bold"><i class="fas fa-link me-1"></i> Complaint Auto-Mapped to Owner in Junction Table!</div>
                            <div class="small">Generated Complaint ID: <strong>#${res.new_complaint_id}</strong></div>
                            <div class="small">Linked Owner: <strong>${res.auto_linked_mappings[0]?.owner_name || 'Owner'} (ID: ${res.auto_linked_mappings[0]?.owner_id})</strong></div>
                        </div>
                    `;
                }

                triggerResultContent.innerHTML = `
                    <div class="border rounded p-3 bg-light mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="fw-bold text-dark mb-0">${res.demo}</h6>
                            <span class="badge bg-primary">${res.trigger_name}</span>
                        </div>
                        <p class="small text-secondary mb-0">${res.explanation}</p>
                    </div>
                    ${detailsHtml}
                `;

                triggerResultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                showToast('Trigger verified successfully!', 'success');

            } catch (err) {
                showToast(err.message, 'danger');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    });

    // 6. Custom SQL Sandbox
    const customSqlInput = document.getElementById('customSqlInput');
    const runCustomSqlBtn = document.getElementById('runCustomSqlBtn');

    // Preset buttons
    document.querySelectorAll('.preset-sql-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            customSqlInput.value = btn.dataset.sql;
            runCustomSqlBtn.click();
        });
    });

    runCustomSqlBtn.addEventListener('click', async () => {
        const sql = customSqlInput.value.trim();
        if (!sql) {
            showToast('Please type an SQL query.', 'warning');
            return;
        }

        try {
            runCustomSqlBtn.disabled = true;
            runCustomSqlBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Executing...';

            const res = await apiRequest('/showcase/run-query', {
                method: 'POST',
                body: JSON.stringify({ custom_sql: sql })
            });

            displayResults('Custom SQL Sandbox Query', sql, res.execution_time_ms, res.row_count, res.columns, res.rows);
            showToast(`Custom query executed in ${res.execution_time_ms} ms!`, 'success');
        } catch (err) {
            showToast(err.message, 'danger');
        } finally {
            runCustomSqlBtn.disabled = false;
            runCustomSqlBtn.innerHTML = '<i class="fas fa-play me-1"></i> Execute Query';
        }
    });

    // Initial loads
    loadQueries();
    loadViews();
});

