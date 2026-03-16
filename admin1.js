// OA Admin Panel v2 — admin.js

var API = 'https://script.google.com/macros/s/AKfycbw9FhogzY47oLdZJXXngJC6izqnSilOgCSo6l3MYcGOKmWs1ZdYUkjCQK6oBr2_LTVnIQ/exec';
var allProducts = [];
var dashData = null;
var currentOrderTab = 'pending';
var currentClientTab = 'business';
var currentInvTab = 'stock';

// ── AUTH ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  if (sessionStorage.getItem('oa_admin') === 'yes') { bootAdmin(); }
  var pw = document.getElementById('login-password');
  if (pw) { pw.addEventListener('keydown', function(e) { if (e.key === 'Enter') { attemptLogin(); } }); }
});

function attemptLogin() {
  var pw = document.getElementById('login-password').value.trim();
  var err = document.getElementById('login-error');
  if (!pw) { err.classList.remove('hidden'); err.textContent = 'Please enter your password.'; return; }
  call('getSettings').then(function(res) {
    if (!res.success) { showToast('Cannot reach server. Check internet.', 'error'); return; }
    if (pw === String(res.data.admin_password||'')) {
      sessionStorage.setItem('oa_admin', 'yes');
      bootAdmin();
    } else {
      err.classList.remove('hidden'); err.textContent = 'Incorrect password.';
    }
  }).catch(function() { showToast('Connection failed.', 'error'); });
}

function bootAdmin() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('admin-shell').classList.remove('hidden');
  loadDashboard();
}

function logout() {
  sessionStorage.removeItem('oa_admin');
  document.getElementById('admin-shell').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-password').value = '';
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────

function showSection(name, el) {
  document.querySelectorAll('.section').forEach(function(s) {
    s.classList.remove('active'); s.classList.add('hidden');
  });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  var sec = document.getElementById('section-' + name);
  if (sec) { sec.classList.remove('hidden'); sec.classList.add('active'); }
  if (el) { el.classList.add('active'); }
  document.getElementById('topbar-title').textContent = name.charAt(0).toUpperCase() + name.slice(1);
  document.getElementById('sidebar').classList.remove('open');
  if (name === 'dashboard')  { loadDashboard(); }
  if (name === 'orders')     { loadOrders('pending'); }
  if (name === 'products')   { loadProducts(); }
  if (name === 'inventory')  { loadInventory('stock'); }
  if (name === 'clients')    { loadClients('business'); }
  if (name === 'customers')  { loadCustomers(); }
  if (name === 'finance')    { loadFinance(); }
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

// ── API ───────────────────────────────────────────────────────────────────────

function call(action, params) {
  var body = Object.assign({ action: action }, params || {});
  return fetch(API, {
    method: 'POST', headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body)
  }).then(function(r) { return r.json(); });
}

function showToast(msg, type) {
  var t = document.getElementById('admin-toast');
  t.textContent = msg;
  t.className = 'admin-toast show ' + (type || 'success');
  setTimeout(function() { t.className = 'admin-toast hidden'; }, 3000);
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    document.querySelectorAll('.modal-overlay').forEach(function(m) { m.classList.add('hidden'); });
  }
});

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

function loadDashboard() {
  call('getDashboard').then(function(res) {
    if (!res.success) { showToast('Dashboard load failed', 'error'); return; }
    dashData = res.data;
    renderDashboard(dashData);
    document.getElementById('badge-orders').textContent  = dashData.pending_orders || 0;
    document.getElementById('badge-clients').textContent =
      (dashData.business_clients||0) + (dashData.distributor_clients||0);
  }).catch(function() { showToast('Connection error', 'error'); });
}

function renderDashboard(d) {
  renderAlerts(d);
  renderMoneyMetrics(d);
  renderTargetBar(d);
  renderInventoryMetrics(d);
  renderLowStockPanel(d);
  renderRevenueChart(d);
  renderProductsChart(d);
  renderOpsMetrics(d);
}

function renderAlerts(d) {
  var html = '<div class="alert-row">';
  if (d.pending_orders > 0) {
    html += alert('warn', d.pending_orders + ' pending order' + (d.pending_orders > 1 ? 's' : '') + ' waiting for your decision');
  }
  if (d.low_stock_count > 0) {
    html += alert('danger', d.low_stock_count + ' product' + (d.low_stock_count > 1 ? 's are' : ' is') + ' running low on stock');
  }
  if (d.pending_follow_ups > 0) {
    html += alert('warn', d.pending_follow_ups + ' follow-up' + (d.pending_follow_ups > 1 ? 's are' : ' is') + ' overdue');
  }
  if (d.outstanding_balance > 0) {
    html += alert('info', 'Outstanding B2B balance: N' + fmt(d.outstanding_balance) + ' owed to you');
  }
  if (d.delivery_counts && d.delivery_counts.shipped > 0) {
    html += alert('info', d.delivery_counts.shipped + ' order' + (d.delivery_counts.shipped > 1 ? 's' : '') + ' currently out for delivery');
  }
  html += '</div>';
  document.getElementById('dash-alerts').innerHTML = html;
}

function alert(type, msg) {
  var icon = type === 'danger' ? '!' : type === 'warn' ? '⚠' : 'i';
  return '<div class="alert-item alert-' + type + '"><span>' + icon + '</span><span>' + msg + '</span></div>';
}

function renderMoneyMetrics(d) {
  var change = d.revenue_change_pct || 0;
  var changeCls = change > 0 ? 'metric-up' : change < 0 ? 'metric-down' : 'metric-neutral';
  var changeStr = change > 0 ? '+' + change + '% vs last month' : change < 0 ? change + '% vs last month' : 'No change vs last month';
  document.getElementById('metrics-money').innerHTML =
    mCard('mc-revenue', 'N' + fmt(d.this_month_revenue||0), 'Revenue This Month', '<span class="' + changeCls + '">' + changeStr + '</span>') +
    mCard('mc-profit',  'N' + fmt(d.total_net_profit||0),   'Total Net Profit',    '') +
    mCard('mc-balance', 'N' + fmt(d.outstanding_balance||0),'B2B Balance Owed',    'Across wholesale & distributor clients') +
    mCard('mc-revenue', 'N' + fmt(d.total_revenue||0),      'All-Time Revenue',    'From confirmed orders');
}

function renderTargetBar(d) {
  var pct = d.target_progress_pct || 0;
  var target = d.monthly_target || 0;
  document.getElementById('target-bar-label').textContent = 'Monthly Revenue Target';
  document.getElementById('target-bar-pct').textContent = pct + '%';
  document.getElementById('target-bar-fill').style.width = pct + '%';
  document.getElementById('target-bar-sub').textContent =
    'N' + fmt(d.this_month_revenue||0) + ' of N' + fmt(target) + ' target';
}

function renderInventoryMetrics(d) {
  document.getElementById('metrics-inventory').innerHTML =
    mCard('mc-invval',  'N' + fmt(d.inventory_value||0),   'Inventory Value',    'Current stock x cost price per unit') +
    mCard('mc-potrev',  'N' + fmt(d.potential_revenue||0), 'Potential Revenue',  'If all stock sells at consumer price') +
    mCard('mc-potpro',  'N' + fmt(d.potential_profit||0),  'Potential Profit',   'Potential revenue minus cost of stock') +
    mCard('mc-lowstock', String(d.low_stock_count||0),     'Low Stock Items',    'Below minimum threshold');
}

function renderLowStockPanel(d) {
  var el = document.getElementById('low-stock-panel');
  if (!d.low_stock_items || d.low_stock_items.length === 0) { el.innerHTML = ''; return; }
  var html = '<div class="low-stock-panel"><div class="low-stock-title">Low Stock Alert</div>';
  d.low_stock_items.forEach(function(item) {
    html += '<div class="low-stock-row">';
    html += '<span class="ls-name">' + esc(item.name) + '</span>';
    html += '<span><span class="ls-stock">' + item.stock + ' left</span> <span class="ls-threshold">/ min ' + item.threshold + '</span></span>';
    html += '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

function renderRevenueChart(d) {
  var chart = d.monthly_chart || [];
  if (chart.length === 0) { document.getElementById('revenue-bar-chart').innerHTML = '<div style="color:var(--muted);font-size:12px;padding:20px 0">No revenue data yet</div>'; return; }
  var max = Math.max.apply(null, chart.map(function(m) { return m.revenue; })) || 1;
  var html = '';
  chart.forEach(function(m) {
    var h = Math.round((m.revenue / max) * 100);
    var label = m.month ? m.month.slice(5) : '';
    html += '<div class="bar-wrap">';
    html += '<div class="bar" style="height:' + h + '%"><div class="bar-tooltip">N' + fmt(m.revenue) + '</div></div>';
    html += '<div class="bar-label">' + label + '</div>';
    html += '</div>';
  });
  document.getElementById('revenue-bar-chart').innerHTML = html;
}

function renderProductsChart(d) {
  var products = d.top_products || [];
  if (products.length === 0) { document.getElementById('products-bar-chart').innerHTML = '<div style="color:var(--muted);font-size:12px;padding:20px 0">No sales data yet</div>'; return; }
  var max = Math.max.apply(null, products.map(function(p) { return p.qty; })) || 1;
  var html = '';
  products.forEach(function(p) {
    var w = Math.round((p.qty / max) * 100);
    html += '<div class="bar-wrap">';
    html += '<div class="bar-label">' + esc(p.name||'') + '</div>';
    html += '<div class="bar" style="width:' + w + '%;height:20px;border-radius:0 4px 4px 0"><div class="bar-tooltip">' + p.qty + ' units</div></div>';
    html += '</div>';
  });
  document.getElementById('products-bar-chart').innerHTML = html;
}

function renderOpsMetrics(d) {
  var dc = d.delivery_counts || {};
  document.getElementById('metrics-ops').innerHTML =
    mCard('mc-pending',  String(d.pending_orders||0),    'Pending Orders',        'Waiting for your confirm or fail decision') +
    mCard('mc-delivery', String(dc.shipped||0),           'Out for Delivery',      'Shipped but not yet delivered') +
    mCard('mc-delivery', String(dc.delivered||0),         'Delivered This Period', '') +
    mCard('mc-clients',  String((d.business_clients||0) + (d.distributor_clients||0)), 'Total B2B Clients', 'Wholesale + distributor combined') +
    mCard('mc-followup', String(d.pending_follow_ups||0), 'Overdue Follow-ups',    'Past their scheduled follow-up date') +
    mCard('mc-pending',  String(d.total_customers||0),    'Total Customers',       'From confirmed consumer orders');
}

function mCard(cls, value, label, sub) {
  return '<div class="metric-card ' + cls + '"><div class="metric-value">' + value +
    '</div><div class="metric-label">' + label + '</div>' +
    (sub ? '<div class="metric-sub metric-neutral">' + sub + '</div>' : '') + '</div>';
}

function copyDashboardReport() {
  if (!dashData) { showToast('Load dashboard first', 'error'); return; }
  var d = dashData;
  var now = new Date().toLocaleDateString('en-NG');
  var lines = [
    'OA DRINKS & SNACKS — DASHBOARD REPORT',
    'Generated: ' + now,
    '',
    'THIS MONTH',
    'Revenue: N' + fmt(d.this_month_revenue||0),
    'vs Last Month: ' + (d.revenue_change_pct > 0 ? '+' : '') + (d.revenue_change_pct||0) + '%',
    'Monthly Target: N' + fmt(d.monthly_target||0) + ' (' + (d.target_progress_pct||0) + '% reached)',
    '',
    'INVENTORY',
    'Inventory Value: N' + fmt(d.inventory_value||0),
    'Potential Revenue: N' + fmt(d.potential_revenue||0),
    'Potential Profit: N' + fmt(d.potential_profit||0),
    'Low Stock Items: ' + (d.low_stock_count||0),
    '',
    'OPERATIONS',
    'Pending Orders: ' + (d.pending_orders||0),
    'Out for Delivery: ' + ((d.delivery_counts||{}).shipped||0),
    'Total Customers: ' + (d.total_customers||0),
    'B2B Balance Owed: N' + fmt(d.outstanding_balance||0),
    'Overdue Follow-ups: ' + (d.pending_follow_ups||0)
  ];
  if (d.low_stock_items && d.low_stock_items.length > 0) {
    lines.push(''); lines.push('LOW STOCK DETAIL');
    d.low_stock_items.forEach(function(item) {
      lines.push('- ' + item.name + ': ' + item.stock + ' left (min ' + item.threshold + ')');
    });
  }
  navigator.clipboard.writeText(lines.join('\n'))
    .then(function() { showToast('Report copied to clipboard!'); })
    .catch(function() { showToast('Copy failed — try again', 'error'); });
}

// ── ORDERS ────────────────────────────────────────────────────────────────────

function loadOrders(tab) {
  currentOrderTab = tab || currentOrderTab;
  var el = document.getElementById('orders-content');
  el.innerHTML = '<div class="loading-state">Loading...</div>';
  var actions = { pending: 'getPendingOrders', confirmed: 'getConfirmedOrders', failed: 'getFailedOrders' };
  call(actions[currentOrderTab]).then(function(res) {
    if (!res.success) { el.innerHTML = '<div class="loading-state">Error loading orders.</div>'; return; }
    el.innerHTML = renderOrderCards(res.data, currentOrderTab) + renderOrderTable(res.data, currentOrderTab);
  }).catch(function() { el.innerHTML = '<div class="loading-state">Connection error.</div>'; });
}

function switchOrderTab(tab, btn) {
  document.querySelectorAll('#section-orders .tab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  loadOrders(tab);
}

function renderOrderCards(orders, tab) {
  if (!orders || orders.length === 0) { return '<div class="card-list"><div class="empty-state"><p>No ' + tab + ' orders.</p></div></div>'; }
  var html = '<div class="card-list">';
  orders.forEach(function(o) {
    html += '<div class="data-card"><div class="card-header">';
    html += '<div><div class="card-id">' + esc(o.tracking_id||o.id||'') + '</div><div class="card-name">' + esc(o.customer_name||o.name||'') + '</div></div>';
    html += '<span class="badge badge-' + tab + '">' + tab + '</span></div>';
    html += '<div class="card-meta">' + esc(o.phone||'') + ' | ' + esc(o.state||'') + (o.lga ? ', ' + esc(o.lga) : '') + '</div>';
    html += '<div class="card-meta" style="font-size:11px;font-style:italic">' + esc(String(o.items_json||'')) + '</div>';
    html += '<div class="card-total">N' + fmt(o.total||0) + '</div>';
    html += '<div class="card-actions">';
    if (tab === 'pending') {
      html += '<button class="btn-confirm" onclick="confirmOrder(\'' + esc(o.id) + '\')">Confirm</button>';
      html += '<button class="btn-fail" onclick="openFailModal(\'' + esc(o.id) + '\')">Fail</button>';
    }
    if (tab === 'confirmed') {
      html += '<button class="btn-edit" onclick="openDeliveryModal(\'' + esc(o.id) + '\',\'' + esc(o.delivery_status||'pending_delivery') + '\')">Delivery</button>';
    }
    if (tab === 'failed') {
      html += '<span style="font-size:12px;color:var(--red)">' + esc(o.reason||'') + '</span>';
    }
    html += '</div></div>';
  });
  return html + '</div>';
}

function renderOrderTable(orders, tab) {
  if (!orders || orders.length === 0) { return '<div class="data-table-wrap"><div class="empty-state"><p>No ' + tab + ' orders.</p></div></div>'; }
  var html = '<div class="data-table-wrap"><table class="data-table"><thead><tr>';
  html += '<th>ID</th><th>Customer</th><th>Phone</th><th>Location</th><th>Items</th><th>Total</th>';
  if (tab === 'pending')   { html += '<th>Actions</th>'; }
  if (tab === 'confirmed') { html += '<th>Delivery</th><th>Action</th>'; }
  if (tab === 'failed')    { html += '<th>Reason</th>'; }
  html += '</tr></thead><tbody>';
  orders.forEach(function(o) {
    html += '<tr><td><span style="font-family:var(--mono);font-size:11px">' + esc(o.id||'') + '</span></td>';
    html += '<td><strong>' + esc(o.customer_name||o.name||'') + '</strong></td>';
    html += '<td>' + esc(o.phone||'') + '</td>';
    html += '<td>' + esc(o.state||'') + (o.lga ? ', ' + esc(o.lga) : '') + '</td>';
    html += '<td style="max-width:160px;font-size:11px;color:var(--muted)">' + esc(String(o.items_json||'')) + '</td>';
    html += '<td><strong>N' + fmt(o.total||0) + '</strong></td>';
    if (tab === 'pending') {
      html += '<td><div style="display:flex;gap:6px"><button class="btn-confirm" onclick="confirmOrder(\'' + esc(o.id) + '\')">Confirm</button><button class="btn-fail" onclick="openFailModal(\'' + esc(o.id) + '\')">Fail</button></div></td>';
    }
    if (tab === 'confirmed') {
      html += '<td><span class="badge badge-' + esc(o.delivery_status||'pending_delivery') + '">' + esc(o.delivery_status||'pending') + '</span></td>';
      html += '<td><button class="btn-edit" onclick="openDeliveryModal(\'' + esc(o.id) + '\',\'' + esc(o.delivery_status||'pending_delivery') + '\')">Update</button></td>';
    }
    if (tab === 'failed') { html += '<td style="color:var(--red);font-size:12px">' + esc(o.reason||'') + '</td>'; }
    html += '</tr>';
  });
  return html + '</tbody></table></div>';
}

function confirmOrder(id) {
  call('validateOrder', { order_id: id, decision: 'confirm' }).then(function(res) {
    if (res.success) { showToast('Order confirmed!'); loadOrders('pending'); loadDashboard(); }
    else { showToast('Error: ' + (res.error||'unknown'), 'error'); }
  });
}

function openFailModal(id) {
  document.getElementById('fail-order-id').value = id;
  document.getElementById('fail-reason-select').value = '';
  document.getElementById('fail-reason-other').classList.add('hidden');
  document.getElementById('fail-modal').classList.remove('hidden');
}

function handleFailReasonChange() {
  var v = document.getElementById('fail-reason-select').value;
  var o = document.getElementById('fail-reason-other');
  if (v === 'Other') { o.classList.remove('hidden'); } else { o.classList.add('hidden'); o.value = ''; }
}

function submitFailOrder() {
  var id = document.getElementById('fail-order-id').value;
  var sel = document.getElementById('fail-reason-select').value;
  var other = document.getElementById('fail-reason-other').value.trim();
  var reason = sel === 'Other' ? other : sel;
  if (!reason) { showToast('Please select a reason', 'error'); return; }
  call('validateOrder', { order_id: id, decision: 'fail', reason: reason }).then(function(res) {
    if (res.success) { closeModal('fail-modal'); showToast('Order marked failed'); loadOrders('pending'); loadDashboard(); }
    else { showToast('Error: ' + (res.error||''), 'error'); }
  });
}

function openDeliveryModal(id, currentStatus) {
  document.getElementById('dm-order-id').value = id;
  document.getElementById('dm-status').value = currentStatus || 'pending_delivery';
  document.getElementById('dm-notes').value = '';
  document.getElementById('delivery-modal').classList.remove('hidden');
}

function submitDeliveryStatus() {
  var id = document.getElementById('dm-order-id').value;
  call('updateDeliveryStatus', {
    order_id: id,
    delivery_status: document.getElementById('dm-status').value,
    delivery_notes: document.getElementById('dm-notes').value.trim()
  }).then(function(res) {
    if (res.success) { closeModal('delivery-modal'); showToast('Delivery updated!'); loadOrders('confirmed'); }
    else { showToast('Error: ' + (res.error||''), 'error'); }
  });
}

