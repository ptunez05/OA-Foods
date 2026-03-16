// OA Admin Panel - admin.js
// Wired to Apps Script backend v2.0

var API = 'https://script.google.com/macros/s/AKfycbzPhQWpk6HJdzKX8sjXO1SkUMAMxygz7U8mBSQ9-rYTkct2C5-RRZ7LxP75ZvWwe15DFg/exec';

var currentOrderTab = 'pending';
var currentLeadTab  = 'wholesale';
var allProducts     = [];

// ── AUTH ─────────────────────────────────────────────────────────────────────

function attemptLogin() {
  var pw = document.getElementById('login-password').value.trim();
  var err = document.getElementById('login-error');
  if (!pw) { err.classList.remove('hidden'); err.textContent = 'Please enter your password.'; return; }
  call('getSettings').then(function(res) {
    if (!res.success) { showError('Could not reach server. Check your connection.'); return; }
    var stored = String(res.data.admin_password || '');
    if (pw === stored) {
      sessionStorage.setItem('oa_admin_auth', 'yes');
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('admin-shell').classList.remove('hidden');
      loadDashboard();
    } else {
      err.classList.remove('hidden');
      err.textContent = 'Incorrect password. Try again.';
    }
  }).catch(function() {
    showError('Connection failed. Please check your internet and try again.');
  });
}

document.addEventListener('DOMContentLoaded', function() {
  if (sessionStorage.getItem('oa_admin_auth') === 'yes') {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-shell').classList.remove('hidden');
    loadDashboard();
  }
  var pwInput = document.getElementById('login-password');
  if (pwInput) {
    pwInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { attemptLogin(); }
    });
  }
});

function logout() {
  sessionStorage.removeItem('oa_admin_auth');
  document.getElementById('admin-shell').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-password').value = '';
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────

function showSection(name, el) {
  document.querySelectorAll('.section').forEach(function(s) {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  var sec = document.getElementById('section-' + name);
  if (sec) { sec.classList.remove('hidden'); sec.classList.add('active'); }
  if (el)  { el.classList.add('active'); }
  document.getElementById('topbar-title').textContent =
    name.charAt(0).toUpperCase() + name.slice(1);
  document.getElementById('sidebar').classList.remove('open');
  if (name === 'dashboard')  { loadDashboard(); }
  if (name === 'orders')     { loadOrders('pending'); }
  if (name === 'products')   { loadProducts(); }
  if (name === 'leads')      { loadLeads('wholesale'); }
  if (name === 'customers')  { loadCustomers(); }
  if (name === 'finance')    { loadFinance(); }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── API HELPER ────────────────────────────────────────────────────────────────

function call(action, params) {
  var body = Object.assign({ action: action }, params || {});
  return fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body)
  }).then(function(r) { return r.json(); });
}

// ── TOAST ─────────────────────────────────────────────────────────────────────

function toast(msg, type) {
  var t = document.getElementById('admin-toast');
  t.textContent = msg;
  t.className = 'admin-toast show ' + (type || 'success');
  setTimeout(function() { t.className = 'admin-toast hidden'; }, 3000);
}
function showError(msg) { toast(msg, 'error'); }

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

function loadDashboard() {
  call('getDashboard').then(function(res) {
    if (!res.success) { showError('Dashboard load failed'); return; }
    var d = res.data;
    document.getElementById('m-pending').textContent   = d.pending_orders    || 0;
    document.getElementById('m-confirmed').textContent = d.confirmed_orders  || 0;
    document.getElementById('m-failed').textContent    = d.failed_orders     || 0;
    document.getElementById('m-customers').textContent = d.total_customers   || 0;
    document.getElementById('m-leads').textContent     =
      (d.wholesale_leads || 0) + (d.distributor_leads || 0);
    document.getElementById('m-stock').textContent     = d.low_stock_count   || 0;
    document.getElementById('m-revenue').textContent   =
      'N' + formatMoney(d.total_revenue || 0);
    document.getElementById('m-profit').textContent    =
      'N' + formatMoney(d.total_net_profit || 0);
    document.getElementById('badge-orders').textContent = d.pending_orders || 0;
    document.getElementById('badge-leads').textContent  =
      (d.wholesale_leads || 0) + (d.distributor_leads || 0);
  }).catch(function() { showError('Could not load dashboard'); });
}

// ── ORDERS ────────────────────────────────────────────────────────────────────

function loadOrders(tab) {
  currentOrderTab = tab || currentOrderTab;
  var el = document.getElementById('orders-content');
  el.innerHTML = '<div class="loading-state">Loading orders...</div>';
  var actionMap = {
    pending:   'getPendingOrders',
    confirmed: 'getConfirmedOrders',
    failed:    'getFailedOrders'
  };
  call(actionMap[currentOrderTab]).then(function(res) {
    if (!res.success) { el.innerHTML = '<div class="loading-state">Error loading orders.</div>'; return; }
    el.innerHTML = renderOrderCards(res.data, currentOrderTab) +
                   renderOrderTable(res.data, currentOrderTab);
  }).catch(function() { el.innerHTML = '<div class="loading-state">Connection error.</div>'; });
}

function switchOrderTab(tab, btn) {
  currentOrderTab = tab;
  document.querySelectorAll('#section-orders .tab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  loadOrders(tab);
}

function renderOrderCards(orders, tab) {
  if (!orders || orders.length === 0) {
    return '<div class="card-list"><div class="empty-state"><p>No ' + tab + ' orders.</p></div></div>';
  }
  var html = '<div class="card-list">';
  orders.forEach(function(o) {
    html += '<div class="data-card">';
    html += '<div class="card-header">';
    html += '<div><div class="card-id">' + esc(o.id || o.tracking_id || '') + '</div>';
    html += '<div class="card-name">' + esc(o.customer_name || o.name || '') + '</div></div>';
    html += '<span class="badge badge-' + (tab === 'pending' ? 'pending' : tab) + '">' + tab + '</span>';
    html += '</div>';
    html += '<div class="card-meta">' + esc(o.phone || '') + ' &bull; ' + esc(o.state || '') + ', ' + esc(o.lga || '') + '</div>';
    html += '<div class="card-meta">' + esc(o.address || '') + '</div>';
    html += '<div class="card-items">' + esc(o.items_json || o.items || '') + '</div>';
    html += '<div class="card-total">N' + formatMoney(o.total || 0) + '</div>';
    if (tab === 'pending') {
      html += '<div class="card-actions">';
      html += '<button class="btn-confirm" onclick="confirmOrder(\'' + esc(o.id) + '\')">Confirm</button>';
      html += '<button class="btn-fail" onclick="openFailModal(\'' + esc(o.id) + '\')">Fail</button>';
      html += '</div>';
    }
    if (tab === 'failed') {
      html += '<div class="card-meta" style="margin-top:6px;color:#ef4444;">Reason: ' + esc(o.reason || '') + '</div>';
    }
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function renderOrderTable(orders, tab) {
  if (!orders || orders.length === 0) {
    return '<div class="data-table-wrap"><div class="empty-state"><p>No ' + tab + ' orders.</p></div></div>';
  }
  var html = '<div class="data-table-wrap"><table class="data-table"><thead><tr>';
  html += '<th>ID</th><th>Customer</th><th>Phone</th><th>Location</th><th>Items</th><th>Total</th>';
  if (tab === 'pending')  { html += '<th>Actions</th>'; }
  if (tab === 'failed')   { html += '<th>Reason</th>'; }
  html += '</tr></thead><tbody>';
  orders.forEach(function(o) {
    html += '<tr>';
    html += '<td><span style="font-family:var(--mono);font-size:11px;">' + esc(o.id || '') + '</span></td>';
    html += '<td><strong>' + esc(o.customer_name || o.name || '') + '</strong></td>';
    html += '<td>' + esc(o.phone || '') + '</td>';
    html += '<td>' + esc(o.state || '') + (o.lga ? ', ' + esc(o.lga) : '') + '</td>';
    html += '<td style="max-width:180px;font-size:12px;color:var(--text-muted);">' + esc(o.items_json || o.items || '') + '</td>';
    html += '<td><strong>N' + formatMoney(o.total || 0) + '</strong></td>';
    if (tab === 'pending') {
      html += '<td><div style="display:flex;gap:6px;">';
      html += '<button class="btn-confirm" onclick="confirmOrder(\'' + esc(o.id) + '\')">Confirm</button>';
      html += '<button class="btn-fail" onclick="openFailModal(\'' + esc(o.id) + '\')">Fail</button>';
      html += '</div></td>';
    }
    if (tab === 'failed') {
      html += '<td style="color:var(--red);font-size:12px;">' + esc(o.reason || '') + '</td>';
    }
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

function confirmOrder(orderId) {
  if (!orderId) { showError('Order ID missing'); return; }
  call('validateOrder', { order_id: orderId, decision: 'confirm' }).then(function(res) {
    if (res.success) {
      toast('Order confirmed and moved to Confirmed Orders');
      loadOrders('pending');
      loadDashboard();
    } else {
      showError('Failed: ' + (res.error || 'unknown error'));
    }
  }).catch(function() { showError('Connection error'); });
}

// ── FAIL ORDER MODAL ──────────────────────────────────────────────────────────

function openFailModal(orderId) {
  document.getElementById('fail-order-id').value = orderId;
  document.getElementById('fail-reason-select').value = '';
  document.getElementById('fail-reason-other').classList.add('hidden');
  document.getElementById('fail-reason-other').value = '';
  document.getElementById('fail-modal').classList.remove('hidden');
}

function closeFailModal() {
  document.getElementById('fail-modal').classList.add('hidden');
}

function handleFailReasonChange() {
  var sel = document.getElementById('fail-reason-select').value;
  var other = document.getElementById('fail-reason-other');
  if (sel === 'Other') { other.classList.remove('hidden'); }
  else { other.classList.add('hidden'); other.value = ''; }
}

function submitFailOrder() {
  var orderId = document.getElementById('fail-order-id').value;
  var sel = document.getElementById('fail-reason-select').value;
  var other = document.getElementById('fail-reason-other').value.trim();
  var reason = sel === 'Other' ? other : sel;
  if (!reason) { showError('Please select a reason'); return; }
  call('validateOrder', { order_id: orderId, decision: 'fail', reason: reason }).then(function(res) {
    if (res.success) {
      closeFailModal();
      toast('Order marked as failed');
      loadOrders('pending');
      loadDashboard();
    } else {
      showError('Failed: ' + (res.error || 'unknown'));
    }
  }).catch(function() { showError('Connection error'); });
}

// ── PRODUCTS ──────────────────────────────────────────────────────────────────

function loadProducts() {
  var el = document.getElementById('products-content');
  el.innerHTML = '<div class="loading-state">Loading products...</div>';
  call('getProducts').then(function(res) {
    if (!res.success) { el.innerHTML = '<div class="loading-state">Error loading products.</div>'; return; }
    allProducts = res.data;
    if (!allProducts || allProducts.length === 0) {
      el.innerHTML = '<div class="empty-state"><p>No products yet. Add your first product.</p></div>';
      return;
    }
    var html = '<div class="product-grid">';
    allProducts.forEach(function(p) {
      var isActive = String(p.active) === 'TRUE';
      var stockNum = parseInt(p.stock_qty) || 0;
      var lowStock = stockNum < 10;
      html += '<div class="product-card" style="' + (isActive ? '' : 'opacity:0.5;') + '">';
      html += '<div class="product-name">' + esc(p.name) + '</div>';
      html += '<div class="product-cat">' + esc(p.category) + '</div>';
      html += '<div class="product-price">Consumer: <strong>N' + formatMoney(p.price_consumer) + '</strong></div>';
      html += '<div class="product-price">Wholesale: <strong>N' + formatMoney(p.price_wholesale) + '</strong></div>';
      html += '<div class="product-stock ' + (lowStock ? 'stock-low' : '') + '">Stock: ' + stockNum + (lowStock ? ' — LOW' : '') + '</div>';
      if (!isActive) { html += '<div class="inactive-label">INACTIVE</div>'; }
      html += '<div class="product-actions">';
      html += '<button class="btn-edit" onclick="openProductModal(\'' + esc(p.id) + '\')">Edit</button>';
      if (isActive) {
        html += '<button class="btn-delete" onclick="softDeleteProduct(\'' + esc(p.id) + '\')">Deactivate</button>';
      } else {
        html += '<button class="btn-edit" onclick="reactivateProduct(\'' + esc(p.id) + '\')">Reactivate</button>';
      }
      html += '</div></div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }).catch(function() { el.innerHTML = '<div class="loading-state">Connection error.</div>'; });
}

function openProductModal(productId) {
  var modal = document.getElementById('product-modal');
  var title = document.getElementById('product-modal-title');
  document.getElementById('pm-id').value = productId || 'NEW';
  if (!productId) {
    title.textContent = 'Add Product';
    ['pm-name','pm-price-consumer','pm-price-wholesale','pm-stock','pm-image','pm-description'].forEach(function(id) {
      document.getElementById(id).value = '';
    });
    document.getElementById('pm-category').value = 'Drinks';
  } else {
    title.textContent = 'Edit Product';
    var p = allProducts.find(function(x) { return x.id === productId; });
    if (p) {
      document.getElementById('pm-name').value          = p.name || '';
      document.getElementById('pm-category').value      = p.category || 'Drinks';
      document.getElementById('pm-price-consumer').value= p.price_consumer || '';
      document.getElementById('pm-price-wholesale').value=p.price_wholesale || '';
      document.getElementById('pm-stock').value         = p.stock_qty || '';
      document.getElementById('pm-image').value         = p.image_url || '';
      document.getElementById('pm-description').value   = p.description || '';
    }
  }
  modal.classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('product-modal').classList.add('hidden');
}

function submitProduct() {
  var id = document.getElementById('pm-id').value;
  var payload = {
    id:               id,
    name:             document.getElementById('pm-name').value.trim(),
    category:         document.getElementById('pm-category').value,
    price_consumer:   document.getElementById('pm-price-consumer').value,
    price_wholesale:  document.getElementById('pm-price-wholesale').value,
    stock_qty:        document.getElementById('pm-stock').value,
    image_url:        document.getElementById('pm-image').value.trim(),
    description:      document.getElementById('pm-description').value.trim()
  };
  if (!payload.name) { showError('Product name is required'); return; }
  var action = id === 'NEW' ? 'addProduct' : 'updateProduct';
  call(action, payload).then(function(res) {
    if (res.success) {
      closeProductModal();
      toast(id === 'NEW' ? 'Product added!' : 'Product updated!');
      loadProducts();
    } else {
      showError('Save failed: ' + (res.error || 'unknown'));
    }
  }).catch(function() { showError('Connection error'); });
}

function softDeleteProduct(id) {
  if (!confirm('Deactivate this product? It will be hidden from the public site but data is kept.')) { return; }
  call('deleteProduct', { id: id }).then(function(res) {
    if (res.success) { toast('Product deactivated'); loadProducts(); }
    else { showError('Error: ' + (res.error || 'unknown')); }
  });
}

function reactivateProduct(id) {
  call('updateProduct', { id: id, active: 'TRUE' }).then(function(res) {
    if (res.success) { toast('Product reactivated'); loadProducts(); }
    else { showError('Error: ' + (res.error || 'unknown')); }
  });
}

// ── LEADS ─────────────────────────────────────────────────────────────────────

function loadLeads(tab) {
  currentLeadTab = tab || currentLeadTab;
  var el = document.getElementById('leads-content');
  el.innerHTML = '<div class="loading-state">Loading leads...</div>';
  var action = (currentLeadTab === 'distributor') ? 'getDistributorLeads' : 'getWholesaleLeads';
  call(action).then(function(res) {
    if (!res.success) { el.innerHTML = '<div class="loading-state">Error loading leads.</div>'; return; }
    el.innerHTML = renderLeadCards(res.data) + renderLeadTable(res.data);
  }).catch(function() { el.innerHTML = '<div class="loading-state">Connection error.</div>'; });
}

function switchLeadTab(tab, btn) {
  currentLeadTab = tab;
  document.querySelectorAll('#section-leads .tab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  loadLeads(tab);
}

function renderLeadCards(leads) {
  if (!leads || leads.length === 0) {
    return '<div class="card-list"><div class="empty-state"><p>No leads yet.</p></div></div>';
  }
  var html = '<div class="card-list">';
  leads.forEach(function(l) {
    var name = l.contact_name || l.name || '';
    var biz  = l.business_name || '';
    html += '<div class="data-card">';
    html += '<div class="card-header">';
    html += '<div><div class="card-id">' + esc(l.id || '') + '</div>';
    html += '<div class="card-name">' + esc(name) + (biz ? ' — ' + esc(biz) : '') + '</div></div>';
    html += '<span class="badge badge-' + (l.status || 'new') + '">' + esc(l.status || 'new') + '</span>';
    html += '</div>';
    html += '<div class="card-meta">' + esc(l.phone || '') + ' &bull; ' + esc(l.state || '') + '</div>';
    html += '<div class="card-meta">' + esc(l.interest || l.qty || '') + '</div>';
    if (l.follow_up_date) { html += '<div class="card-meta">Follow-up: ' + esc(String(l.follow_up_date)) + '</div>'; }
    html += '<div class="card-actions">';
    html += '<button class="btn-edit" onclick="openLeadModal(\'' + esc(l.id) + '\',\'' + currentLeadTab + '\')">Update</button>';
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

function renderLeadTable(leads) {
  if (!leads || leads.length === 0) {
    return '<div class="data-table-wrap"><div class="empty-state"><p>No leads yet.</p></div></div>';
  }
  var isDist = (currentLeadTab === 'distributor');
  var html = '<div class="data-table-wrap"><table class="data-table"><thead><tr>';
  html += '<th>ID</th><th>Name</th><th>Phone</th><th>State</th>';
  if (!isDist) { html += '<th>Business</th><th>Interest</th>'; }
  else         { html += '<th>Region</th><th>Qty</th><th>Kit</th>'; }
  html += '<th>Status</th><th>Follow-up</th><th>Action</th>';
  html += '</tr></thead><tbody>';
  leads.forEach(function(l) {
    var name = l.contact_name || l.name || '';
    html += '<tr>';
    html += '<td style="font-family:var(--mono);font-size:11px;">' + esc(l.id || '') + '</td>';
    html += '<td><strong>' + esc(name) + '</strong></td>';
    html += '<td>' + esc(l.phone || '') + '</td>';
    html += '<td>' + esc(l.state || '') + '</td>';
    if (!isDist) {
      html += '<td>' + esc(l.business_name || '') + '</td>';
      html += '<td style="font-size:12px;">' + esc(l.interest || '') + '</td>';
    } else {
      html += '<td>' + esc(l.region || '') + '</td>';
      html += '<td>' + esc(String(l.qty || '')) + '</td>';
      html += '<td>' + esc(l.kit_included || '') + '</td>';
    }
    html += '<td><span class="badge badge-' + (l.status || 'new') + '">' + esc(l.status || 'new') + '</span></td>';
    html += '<td style="font-size:12px;">' + esc(String(l.follow_up_date || '—')) + '</td>';
    html += '<td><button class="btn-edit" onclick="openLeadModal(\'' + esc(l.id) + '\',\'' + currentLeadTab + '\')">Update</button></td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

function openLeadModal(leadId, type) {
  document.getElementById('lm-id').value   = leadId;
  document.getElementById('lm-type').value = type;
  document.getElementById('lm-status').value   = 'new';
  document.getElementById('lm-followup').value = '';
  document.getElementById('lm-notes').value    = '';
  document.getElementById('lead-modal').classList.remove('hidden');
}

function closeLeadModal() {
  document.getElementById('lead-modal').classList.add('hidden');
}

function submitLeadUpdate() {
  var id   = document.getElementById('lm-id').value;
  var type = document.getElementById('lm-type').value;
  call('updateLeadStatus', {
    lead_id:       id,
    lead_type:     type,
    status:        document.getElementById('lm-status').value,
    follow_up_date:document.getElementById('lm-followup').value,
    notes:         document.getElementById('lm-notes').value.trim()
  }).then(function(res) {
    if (res.success) { closeLeadModal(); toast('Lead updated!'); loadLeads(currentLeadTab); }
    else { showError('Error: ' + (res.error || 'unknown')); }
  }).catch(function() { showError('Connection error'); });
}

// ── CUSTOMERS ─────────────────────────────────────────────────────────────────

function loadCustomers() {
  var el = document.getElementById('customers-content');
  el.innerHTML = '<div class="loading-state">Loading customers...</div>';
  call('getCustomers').then(function(res) {
    if (!res.success) { el.innerHTML = '<div class="loading-state">Error.</div>'; return; }
    var customers = res.data;
    if (!customers || customers.length === 0) {
      el.innerHTML = '<div class="empty-state"><p>No customers yet. Customers appear here when orders are confirmed.</p></div>';
      return;
    }
    // Sort by total_spend descending
    customers.sort(function(a, b) { return (parseFloat(b.total_spend) || 0) - (parseFloat(a.total_spend) || 0); });
    var html = '<div class="card-list">';
    customers.forEach(function(c) {
      html += '<div class="customer-card">';
      html += '<div class="customer-info">';
      html += '<div class="cname">' + esc(c.name || '') + '</div>';
      html += '<div class="cphone">' + esc(c.phone || '') + '</div>';
      html += '<div class="cstate">' + esc(c.state || '') + (c.lga ? ', ' + esc(c.lga) : '') + '</div>';
      html += '</div>';
      html += '<div class="customer-stats">';
      html += '<div class="corders">' + (c.total_orders || 0) + ' orders</div>';
      html += '<div class="cspend">N' + formatMoney(c.total_spend || 0) + '</div>';
      html += '</div></div>';
    });
    html += '</div>';
    // Also render desktop table
    html += '<div class="data-table-wrap"><table class="data-table"><thead><tr>';
    html += '<th>Name</th><th>Phone</th><th>Location</th><th>Orders</th><th>Total Spend</th><th>Last Order</th>';
    html += '</tr></thead><tbody>';
    customers.forEach(function(c) {
      html += '<tr>';
      html += '<td><strong>' + esc(c.name || '') + '</strong></td>';
      html += '<td>' + esc(c.phone || '') + '</td>';
      html += '<td>' + esc(c.state || '') + (c.lga ? ', ' + esc(c.lga) : '') + '</td>';
      html += '<td>' + (c.total_orders || 0) + '</td>';
      html += '<td><strong style="color:var(--green);">N' + formatMoney(c.total_spend || 0) + '</strong></td>';
      html += '<td style="font-size:12px;">' + esc(String(c.last_order_date || '—')) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;
  }).catch(function() { el.innerHTML = '<div class="loading-state">Connection error.</div>'; });
}

// ── FINANCE ───────────────────────────────────────────────────────────────────

function loadFinance() {
  var el  = document.getElementById('finance-content');
  var sum = document.getElementById('finance-summary');
  el.innerHTML  = '<div class="loading-state">Loading finance data...</div>';
  sum.innerHTML = '';
  call('getFinance').then(function(res) {
    if (!res.success) { el.innerHTML = '<div class="loading-state">Error loading finance.</div>'; return; }
    var rows = res.data || [];
    // Compute summary totals
    var totRevenue = 0, totCOGS = 0, totProfit = 0, totSpoilage = 0;
    rows.forEach(function(r) {
      totRevenue  += parseFloat(r.total_revenue)  || 0;
      totCOGS     += parseFloat(r.total_cogs)     || 0;
      totProfit   += parseFloat(r.net_profit)     || 0;
      totSpoilage += parseFloat(r.spoilage_value) || 0;
    });
    sum.innerHTML =
      stat('Total Revenue',  'N' + formatMoney(totRevenue),  '') +
      stat('Total COGS',     'N' + formatMoney(totCOGS),     '') +
      stat('Net Profit',     'N' + formatMoney(totProfit),   totProfit >= 0 ? 'fin-positive' : 'fin-negative') +
      stat('Spoilage Losses','N' + formatMoney(totSpoilage), 'fin-negative');
    if (rows.length === 0) {
      el.innerHTML = '<div class="empty-state"><p>No finance entries yet. Use + Log Entry to add one.</p></div>';
      return;
    }
    var html = '<div class="data-table-wrap"><table class="data-table"><thead><tr>';
    html += '<th>Month</th><th>Product</th><th>Units Sold</th><th>Revenue</th><th>COGS</th><th>Gross Profit</th><th>Spoilage</th><th>Net Profit</th>';
    html += '</tr></thead><tbody>';
    rows.forEach(function(r) {
      var np = parseFloat(r.net_profit) || 0;
      html += '<tr>';
      html += '<td>' + esc(r.month || '') + '</td>';
      html += '<td>' + esc(r.product_name || '') + '</td>';
      html += '<td>' + esc(String(r.units_sold || 0)) + '</td>';
      html += '<td>N' + formatMoney(r.total_revenue) + '</td>';
      html += '<td>N' + formatMoney(r.total_cogs) + '</td>';
      html += '<td>N' + formatMoney(r.gross_profit) + '</td>';
      html += '<td style="color:var(--red);">N' + formatMoney(r.spoilage_value) + '</td>';
      html += '<td style="font-weight:700;color:' + (np >= 0 ? 'var(--green)' : 'var(--red)') + ';">N' + formatMoney(np) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;
  }).catch(function() { el.innerHTML = '<div class="loading-state">Connection error.</div>'; });
}

function stat(label, value, cls) {
  return '<div class="fin-stat"><div class="fin-stat-value ' + cls + '">' + value + '</div><div class="fin-stat-label">' + label + '</div></div>';
}

function openFinanceModal() {
  var now = new Date();
  var m   = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('fm-month').value    = m;
  document.getElementById('fm-product').value  = '';
  document.getElementById('fm-units').value    = '';
  document.getElementById('fm-cost').value     = '';
  document.getElementById('fm-sale').value     = '';
  document.getElementById('fm-spoilage').value = '0';
  document.getElementById('fm-notes').value    = '';
  document.getElementById('finance-preview').classList.remove('visible');
  document.getElementById('finance-preview').innerHTML = '';
  document.getElementById('finance-modal').classList.remove('hidden');
  ['fm-units','fm-cost','fm-sale','fm-spoilage'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', updateFinancePreview);
  });
}

function closeFinanceModal() {
  document.getElementById('finance-modal').classList.add('hidden');
}

function updateFinancePreview() {
  var units    = parseInt(document.getElementById('fm-units').value)    || 0;
  var cost     = parseFloat(document.getElementById('fm-cost').value)   || 0;
  var sale     = parseFloat(document.getElementById('fm-sale').value)   || 0;
  var spoilage = parseInt(document.getElementById('fm-spoilage').value) || 0;
  if (!units || !cost || !sale) { return; }
  var revenue      = units * sale;
  var cogs         = units * cost;
  var grossProfit  = revenue - cogs;
  var spoilValue   = spoilage * cost;
  var netProfit    = grossProfit - spoilValue;
  var preview = document.getElementById('finance-preview');
  preview.classList.add('visible');
  preview.innerHTML =
    fpRow('Revenue',     'N' + formatMoney(revenue)) +
    fpRow('COGS',        'N' + formatMoney(cogs)) +
    fpRow('Gross Profit','N' + formatMoney(grossProfit)) +
    fpRow('Spoilage Loss','N' + formatMoney(spoilValue)) +
    '<div class="fp-row"><span>Net Profit</span><span style="color:' + (netProfit >= 0 ? 'var(--green)' : 'var(--red)') + ';">N' + formatMoney(netProfit) + '</span></div>';
}

function fpRow(label, value) {
  return '<div class="fp-row"><span>' + label + '</span><span>' + value + '</span></div>';
}

function submitFinanceEntry() {
  var payload = {
    month:          document.getElementById('fm-month').value.trim(),
    product_name:   document.getElementById('fm-product').value.trim(),
    units_sold:     document.getElementById('fm-units').value,
    unit_cost_price:document.getElementById('fm-cost').value,
    unit_sale_price:document.getElementById('fm-sale').value,
    spoilage_units: document.getElementById('fm-spoilage').value || '0',
    notes:          document.getElementById('fm-notes').value.trim()
  };
  if (!payload.month || !payload.product_name || !payload.units_sold) {
    showError('Month, product and units sold are required');
    return;
  }
  call('addFinanceEntry', payload).then(function(res) {
    if (res.success) {
      closeFinanceModal();
      toast('Finance entry saved!');
      loadFinance();
    } else {
      showError('Error: ' + (res.error || 'unknown'));
    }
  }).catch(function() { showError('Connection error'); });
}

// ── UTILITIES ─────────────────────────────────────────────────────────────────

function formatMoney(val) {
  var n = parseFloat(val) || 0;
  return n.toLocaleString('en-NG');
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Close modals on overlay click
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    document.querySelectorAll('.modal-overlay').forEach(function(m) {
      m.classList.add('hidden');
    });
  }
});
