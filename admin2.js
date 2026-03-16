// ── PRODUCTS ──────────────────────────────────────────────────────────────────

function loadProducts() {
  var el = document.getElementById('products-content');
  el.innerHTML = '<div class="loading-state">Loading...</div>';
  call('getProducts').then(function(res) {
    if (!res.success) { el.innerHTML = '<div class="loading-state">Error.</div>'; return; }
    allProducts = res.data || [];
    if (allProducts.length === 0) { el.innerHTML = '<div class="empty-state"><p>No products yet.</p></div>'; return; }
    var html = '<div class="product-grid">';
    allProducts.forEach(function(p) {
      var active = String(p.active) === 'TRUE';
      var stock = parseInt(p.stock_qty)||0;
      var low = stock < (parseInt(p.low_stock_threshold)||20);
      html += '<div class="product-card" style="' + (active ? '' : 'opacity:.5') + '">';
      html += '<div class="product-name">' + esc(p.name) + '</div>';
      html += '<div class="product-cat">' + esc(p.category) + '</div>';
      html += '<div class="product-prices">';
      html += '<span>Consumer: <strong>N' + fmt(p.price_consumer) + '</strong></span>';
      html += '<span>Retail: <strong>N' + fmt(p.price_retail) + '</strong></span>';
      html += '<span>Wholesale: <strong>N' + fmt(p.price_wholesale) + '</strong></span>';
      html += '<span style="color:var(--muted)">Cost: N' + fmt(p.cost_price) + '</span>';
      html += '</div>';
      html += '<div class="product-stock ' + (low ? 'stock-low' : '') + '">Stock: ' + stock + (low ? ' — LOW' : '') + '</div>';
      if (!active) { html += '<div style="font-size:11px;color:var(--muted)">INACTIVE</div>'; }
      html += '<div class="product-actions">';
      html += '<button class="btn-edit" onclick="openProductModal(\'' + esc(p.id) + '\')">Edit</button>';
      if (active) {
        html += '<button class="btn-del" onclick="deleteProduct(\'' + esc(p.id) + '\')">Deactivate</button>';
      } else {
        html += '<button class="btn-edit" onclick="reactivateProduct(\'' + esc(p.id) + '\')">Reactivate</button>';
      }
      html += '</div></div>';
    });
    el.innerHTML = html + '</div>';
  });
}

function openProductModal(id) {
  var t = document.getElementById('product-modal-title');
  document.getElementById('pm-id').value = id || 'NEW';
  if (!id) {
    t.textContent = 'Add Product';
    ['pm-name','pm-price-consumer','pm-price-retail','pm-price-wholesale','pm-cost','pm-stock','pm-image','pm-description'].forEach(function(f) { document.getElementById(f).value = ''; });
    document.getElementById('pm-category').value = 'Drinks';
    document.getElementById('pm-threshold').value = '20';
  } else {
    t.textContent = 'Edit Product';
    var p = allProducts.find(function(x) { return x.id === id; });
    if (p) {
      document.getElementById('pm-name').value           = p.name || '';
      document.getElementById('pm-category').value       = p.category || 'Drinks';
      document.getElementById('pm-price-consumer').value = p.price_consumer || '';
      document.getElementById('pm-price-retail').value   = p.price_retail || '';
      document.getElementById('pm-price-wholesale').value= p.price_wholesale || '';
      document.getElementById('pm-cost').value           = p.cost_price || '';
      document.getElementById('pm-stock').value          = p.stock_qty || '';
      document.getElementById('pm-threshold').value      = p.low_stock_threshold || '20';
      document.getElementById('pm-image').value          = p.image_url || '';
      document.getElementById('pm-description').value    = p.description || '';
    }
  }
  document.getElementById('product-modal').classList.remove('hidden');
}

function submitProduct() {
  var id = document.getElementById('pm-id').value;
  var payload = {
    id: id, name: document.getElementById('pm-name').value.trim(),
    category: document.getElementById('pm-category').value,
    price_consumer: document.getElementById('pm-price-consumer').value,
    price_retail: document.getElementById('pm-price-retail').value,
    price_wholesale: document.getElementById('pm-price-wholesale').value,
    cost_price: document.getElementById('pm-cost').value,
    stock_qty: document.getElementById('pm-stock').value,
    low_stock_threshold: document.getElementById('pm-threshold').value,
    image_url: document.getElementById('pm-image').value.trim(),
    description: document.getElementById('pm-description').value.trim()
  };
  if (!payload.name) { showToast('Product name required', 'error'); return; }
  var action = id === 'NEW' ? 'addProduct' : 'updateProduct';
  call(action, payload).then(function(res) {
    if (res.success) { closeModal('product-modal'); showToast(id === 'NEW' ? 'Product added!' : 'Product updated!'); loadProducts(); loadDashboard(); }
    else { showToast('Error: ' + (res.error||''), 'error'); }
  });
}

function deleteProduct(id) {
  if (!confirm('Deactivate this product? Historical data is kept.')) { return; }
  call('deleteProduct', { id: id }).then(function(res) {
    if (res.success) { showToast('Product deactivated'); loadProducts(); }
    else { showToast('Error: ' + (res.error||''), 'error'); }
  });
}

function reactivateProduct(id) {
  call('updateProduct', { id: id, active: 'TRUE' }).then(function(res) {
    if (res.success) { showToast('Product reactivated'); loadProducts(); }
    else { showToast('Error: ' + (res.error||''), 'error'); }
  });
}

// ── INVENTORY ─────────────────────────────────────────────────────────────────

function loadInventory(tab) {
  currentInvTab = tab || currentInvTab;
  var el = document.getElementById('inventory-content');
  el.innerHTML = '<div class="loading-state">Loading...</div>';
  if (currentInvTab === 'stock') {
    call('getProducts').then(function(res) {
      if (!res.success) { el.innerHTML = '<div class="loading-state">Error.</div>'; return; }
      var products = (res.data||[]).filter(function(p) { return String(p.active) === 'TRUE'; });
      if (products.length === 0) { el.innerHTML = '<div class="empty-state"><p>No active products.</p></div>'; return; }
      var html = '<div class="inv-stock-grid">';
      products.forEach(function(p) {
        var stock = parseInt(p.stock_qty)||0;
        var threshold = parseInt(p.low_stock_threshold)||20;
        var low = stock < threshold;
        html += '<div class="inv-card ' + (low ? 'low' : '') + '">';
        html += '<div class="inv-name">' + esc(p.name) + '</div>';
        html += '<div class="inv-qty ' + (low ? 'low' : '') + '">' + stock + '</div>';
        html += '<div class="inv-meta">units in stock</div>';
        html += '<div class="inv-meta" style="margin-top:4px">Min alert: ' + threshold + '</div>';
        html += '<div class="inv-meta">Value: N' + fmt((parseInt(p.stock_qty)||0)*(parseFloat(p.cost_price)||0)) + '</div>';
        html += '<div class="inv-actions">';
        html += '<button class="btn-stock-in" onclick="quickStockAdjust(\'' + esc(p.id) + '\',\'' + esc(p.name) + '\',1)">+ Stock In</button>';
        html += '<button class="btn-stock-out" onclick="quickStockAdjust(\'' + esc(p.id) + '\',\'' + esc(p.name) + '\',-1)">− Adjustment</button>';
        html += '</div></div>';
      });
      el.innerHTML = html + '</div>';
    });
  } else if (currentInvTab === 'batches') {
    call('getBatchLog').then(function(res) {
      if (!res.success) { el.innerHTML = '<div class="loading-state">Error.</div>'; return; }
      el.innerHTML = renderGenericTable(res.data||[], ['id','batch_date','product_name','qty_produced','expiry_date','batch_note']);
    });
  } else {
    call('getInventoryLog').then(function(res) {
      if (!res.success) { el.innerHTML = '<div class="loading-state">Error.</div>'; return; }
      el.innerHTML = renderGenericTable(res.data||[], ['id','timestamp','product_name','change_qty','reason','order_ref','recorded_by','stock_before','stock_after']);
    });
  }
}

function switchInvTab(tab, btn) {
  document.querySelectorAll('#section-inventory .tab').forEach(function(t) { t.classList.remove('active'); });
  if (btn) { btn.classList.add('active'); }
  loadInventory(tab);
}

function quickStockAdjust(id, name, direction) {
  var qty = parseInt(prompt((direction > 0 ? 'Adding stock — how many units?' : 'Removing stock — how many units?')), 10);
  if (isNaN(qty) || qty <= 0) { return; }
  var reason = prompt('Reason (e.g. New batch, Spoilage, Correction):') || 'Manual adjustment';
  call('updateStock', {
    product_id: id,
    change_qty: direction > 0 ? qty : -qty,
    reason: reason,
    recorded_by: 'Admin'
  }).then(function(res) {
    if (res.success) { showToast('Stock updated. New qty: ' + res.new_stock); loadInventory('stock'); loadDashboard(); }
    else { showToast('Error: ' + (res.error||''), 'error'); }
  });
}

function openBatchModal() {
  var sel = document.getElementById('bm-product');
  sel.innerHTML = '';
  call('getProducts').then(function(res) {
    (res.data||[]).filter(function(p) { return String(p.active) === 'TRUE'; }).forEach(function(p) {
      var opt = document.createElement('option');
      opt.value = p.id; opt.textContent = p.name;
      sel.appendChild(opt);
    });
  });
  document.getElementById('bm-qty').value = '';
  document.getElementById('bm-note').value = '';
  document.getElementById('batch-modal').classList.remove('hidden');
}

function submitBatch() {
  var productId = document.getElementById('bm-product').value;
  var qty = document.getElementById('bm-qty').value;
  var expiry = document.getElementById('bm-expiry').value;
  var note = document.getElementById('bm-note').value.trim();
  if (!productId || !qty) { showToast('Product and quantity are required', 'error'); return; }
  call('addBatchEntry', { product_id: productId, qty_produced: qty, expiry_date: expiry, batch_note: note }).then(function(res) {
    if (res.success) { closeModal('batch-modal'); showToast('Batch logged and stock updated!'); loadInventory('stock'); loadDashboard(); }
    else { showToast('Error: ' + (res.error||''), 'error'); }
  });
}

// ── CLIENTS ───────────────────────────────────────────────────────────────────

function loadClients(tab) {
  currentClientTab = tab || currentClientTab;
  var el = document.getElementById('clients-content');
  el.innerHTML = '<div class="loading-state">Loading...</div>';
  var action = currentClientTab === 'distributor' ? 'getDistributorClients' : 'getBusinessClients';
  call(action).then(function(res) {
    if (!res.success) { el.innerHTML = '<div class="loading-state">Error.</div>'; return; }
    el.innerHTML = renderClientCards(res.data||[]) + renderClientTable(res.data||[]);
  });
}

function switchClientTab(tab, btn) {
  document.querySelectorAll('#section-clients .tab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  loadClients(tab);
}

function renderClientCards(clients) {
  if (!clients.length) { return '<div class="card-list"><div class="empty-state"><p>No clients yet.</p></div></div>'; }
  var html = '<div class="card-list">';
  clients.forEach(function(c) {
    var name = c.contact_name || c.name || '';
    html += '<div class="data-card"><div class="card-header">';
    html += '<div><div class="card-id">' + esc(c.id||'') + '</div><div class="card-name">' + esc(name) + (c.business_name ? ' — ' + esc(c.business_name) : '') + '</div></div>';
    html += '<span class="badge badge-' + esc(c.pipeline_stage||'enquiry') + '">' + esc(c.pipeline_stage||'enquiry') + '</span></div>';
    html += '<div class="card-meta">' + esc(c.phone||'') + ' | ' + esc(c.state||'') + '</div>';
    html += '<div class="card-meta">' + esc(c.interest||c.qty||'') + '</div>';
    if (parseFloat(c.balance_owed) > 0) {
      html += '<div class="card-meta" style="color:var(--red)">Balance owed: N' + fmt(c.balance_owed) + '</div>';
    }
    html += '<div class="card-actions"><button class="btn-edit" onclick="openClientModal(\'' + esc(c.id) + '\',\'' + currentClientTab + '\',\'' + esc(c.pipeline_stage||'enquiry') + '\')">Update</button></div>';
    html += '</div>';
  });
  return html + '</div>';
}

function renderClientTable(clients) {
  if (!clients.length) { return '<div class="data-table-wrap"><div class="empty-state"><p>No clients yet.</p></div></div>'; }
  var isDist = currentClientTab === 'distributor';
  var html = '<div class="data-table-wrap"><table class="data-table"><thead><tr>';
  html += '<th>ID</th><th>Name</th><th>Phone</th><th>State</th>';
  if (!isDist) { html += '<th>Business</th><th>Tier</th>'; } else { html += '<th>Region</th><th>Qty</th>'; }
  html += '<th>Stage</th><th>Payment</th><th>Balance</th><th>Follow-up</th><th>Action</th>';
  html += '</tr></thead><tbody>';
  clients.forEach(function(c) {
    var name = c.contact_name || c.name || '';
    html += '<tr><td style="font-family:var(--mono);font-size:11px">' + esc(c.id||'') + '</td>';
    html += '<td><strong>' + esc(name) + '</strong></td><td>' + esc(c.phone||'') + '</td><td>' + esc(c.state||'') + '</td>';
    if (!isDist) { html += '<td>' + esc(c.business_name||'') + '</td><td>' + esc(c.tier||'') + '</td>'; }
    else         { html += '<td>' + esc(c.region||'') + '</td><td>' + esc(String(c.qty||'')) + '</td>'; }
    html += '<td><span class="badge badge-' + esc(c.pipeline_stage||'enquiry') + '">' + esc(c.pipeline_stage||'enquiry') + '</span></td>';
    html += '<td><span class="badge badge-' + esc(c.payment_status||'unpaid') + '">' + esc(c.payment_status||'unpaid') + '</span></td>';
    html += '<td>' + (parseFloat(c.balance_owed) > 0 ? '<span style="color:var(--red)">N' + fmt(c.balance_owed) + '</span>' : '—') + '</td>';
    html += '<td style="font-size:12px">' + esc(String(c.follow_up_date||'—')) + '</td>';
    html += '<td><button class="btn-edit" onclick="openClientModal(\'' + esc(c.id) + '\',\'' + currentClientTab + '\',\'' + esc(c.pipeline_stage||'enquiry') + '\')">Update</button></td>';
    html += '</tr>';
  });
  return html + '</tbody></table></div>';
}

function openClientModal(id, type, stage) {
  document.getElementById('cm-id').value = id;
  document.getElementById('cm-type').value = type;
  document.getElementById('cm-stage').value = stage || 'enquiry';
  document.getElementById('cm-followup').value = '';
  document.getElementById('cm-notes').value = '';
  document.getElementById('client-modal').classList.remove('hidden');
}

function submitClientUpdate() {
  call('updateClientStage', {
    client_id: document.getElementById('cm-id').value,
    client_type: document.getElementById('cm-type').value,
    stage: document.getElementById('cm-stage').value,
    follow_up_date: document.getElementById('cm-followup').value,
    notes: document.getElementById('cm-notes').value.trim()
  }).then(function(res) {
    if (res.success) { closeModal('client-modal'); showToast('Client updated!'); loadClients(currentClientTab); }
    else { showToast('Error: ' + (res.error||''), 'error'); }
  });
}

// ── CUSTOMERS ─────────────────────────────────────────────────────────────────

function loadCustomers() {
  var el = document.getElementById('customers-content');
  el.innerHTML = '<div class="loading-state">Loading...</div>';
  call('getCustomers').then(function(res) {
    if (!res.success) { el.innerHTML = '<div class="loading-state">Error.</div>'; return; }
    var customers = (res.data||[]).sort(function(a, b) { return (parseFloat(b.total_spend)||0) - (parseFloat(a.total_spend)||0); });
    if (!customers.length) { el.innerHTML = '<div class="empty-state"><p>No customers yet. Confirm orders to build your customer list.</p></div>'; return; }
    var html = '<div class="card-list">';
    customers.forEach(function(c) {
      html += '<div class="customer-card"><div><div class="cname">' + esc(c.name||'') + '</div>';
      html += '<div class="cphone">' + esc(c.phone||'') + '</div><div class="cstate">' + esc(c.state||'') + (c.lga ? ', ' + esc(c.lga) : '') + '</div>';
      if (c.referral_source) { html += '<div class="cstate">via ' + esc(c.referral_source) + '</div>'; }
      html += '</div><div style="text-align:right"><div class="corders">' + (c.total_orders||0) + ' orders</div><div class="cspend">N' + fmt(c.total_spend||0) + '</div></div></div>';
    });
    html += '</div>';
    html += renderGenericTable(customers, ['name','phone','state','lga','total_orders','total_spend','referral_source','last_order_date']);
    el.innerHTML = html;
  });
}

// ── FINANCE ───────────────────────────────────────────────────────────────────

function loadFinance() {
  var el = document.getElementById('finance-content');
  var sum = document.getElementById('finance-summary');
  el.innerHTML = '<div class="loading-state">Loading...</div>';
  call('getFinance').then(function(res) {
    if (!res.success) { el.innerHTML = '<div class="loading-state">Error.</div>'; return; }
    var rows = res.data || [];
    var totRev = 0, totCOGS = 0, totProfit = 0, totSpoil = 0;
    rows.forEach(function(r) {
      totRev    += parseFloat(r.total_revenue)||0;
      totCOGS   += parseFloat(r.total_cogs)||0;
      totProfit += parseFloat(r.net_profit)||0;
      totSpoil  += parseFloat(r.spoilage_value)||0;
    });
    sum.innerHTML = '<div class="finance-summary-row">' +
      finStat('N' + fmt(totRev), 'Total Revenue', '') +
      finStat('N' + fmt(totCOGS), 'Total COGS', '') +
      finStat('N' + fmt(totProfit), 'Net Profit', totProfit >= 0 ? 'fin-positive' : 'fin-negative') +
      finStat('N' + fmt(totSpoil), 'Spoilage Losses', 'fin-negative') + '</div>';
    if (!rows.length) { el.innerHTML = '<div class="empty-state"><p>No entries yet. Use + Log Entry to add one.</p></div>'; return; }
    el.innerHTML = renderGenericTable(rows, ['month','product_name','units_sold','total_revenue','total_cogs','gross_profit','spoilage_value','net_profit']);
  });
}

function finStat(v, l, cls) {
  return '<div class="fin-stat"><div class="fin-stat-value ' + cls + '">' + v + '</div><div class="fin-stat-label">' + l + '</div></div>';
}

function openFinanceModal() {
  var now = new Date();
  document.getElementById('fm-month').value = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  ['fm-product','fm-units','fm-cost','fm-sale','fm-notes'].forEach(function(id) { document.getElementById(id).value = ''; });
  document.getElementById('fm-spoilage').value = '0';
  document.getElementById('finance-preview').classList.add('hidden');
  document.getElementById('finance-modal').classList.remove('hidden');
}

function updateFinancePreview() {
  var u = parseInt(document.getElementById('fm-units').value)||0;
  var c = parseFloat(document.getElementById('fm-cost').value)||0;
  var s = parseFloat(document.getElementById('fm-sale').value)||0;
  var sp = parseInt(document.getElementById('fm-spoilage').value)||0;
  var prev = document.getElementById('finance-preview');
  if (!u || !c || !s) { prev.classList.add('hidden'); return; }
  var rev = u*s, cogs = u*c, gross = rev-cogs, sVal = sp*c, net = gross-sVal;
  prev.classList.remove('hidden');
  prev.innerHTML =
    fp('Revenue', 'N' + fmt(rev)) + fp('COGS', 'N' + fmt(cogs)) +
    fp('Gross Profit', 'N' + fmt(gross)) + fp('Spoilage', 'N' + fmt(sVal)) +
    '<div class="fp-row"><span>Net Profit</span><span style="color:' + (net >= 0 ? 'var(--green)' : 'var(--red)') + '">N' + fmt(net) + '</span></div>';
}

function fp(l, v) { return '<div class="fp-row"><span>' + l + '</span><span>' + v + '</span></div>'; }

function submitFinanceEntry() {
  var payload = {
    month: document.getElementById('fm-month').value.trim(),
    product_name: document.getElementById('fm-product').value.trim(),
    units_sold: document.getElementById('fm-units').value,
    unit_cost_price: document.getElementById('fm-cost').value,
    unit_sale_price: document.getElementById('fm-sale').value,
    spoilage_units: document.getElementById('fm-spoilage').value || '0',
    notes: document.getElementById('fm-notes').value.trim()
  };
  if (!payload.month || !payload.product_name || !payload.units_sold) {
    showToast('Month, product and units are required', 'error'); return;
  }
  call('addFinanceEntry', payload).then(function(res) {
    if (res.success) { closeModal('finance-modal'); showToast('Finance entry saved!'); loadFinance(); loadDashboard(); }
    else { showToast('Error: ' + (res.error||''), 'error'); }
  });
}

// ── UTILITIES ─────────────────────────────────────────────────────────────────

function renderGenericTable(rows, cols) {
  if (!rows.length) { return '<div class="data-table-wrap"><div class="empty-state"><p>No records yet.</p></div></div>'; }
  var html = '<div class="data-table-wrap"><table class="data-table"><thead><tr>';
  cols.forEach(function(c) { html += '<th>' + c.replace(/_/g,' ') + '</th>'; });
  html += '</tr></thead><tbody>';
  rows.forEach(function(r) {
    html += '<tr>';
    cols.forEach(function(c) { html += '<td>' + esc(String(r[c]||'')) + '</td>'; });
    html += '</tr>';
  });
  return html + '</tbody></table></div>';
}

function fmt(val) { return (parseFloat(val)||0).toLocaleString('en-NG'); }
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
