// OA Shop Book — admin2.js  v4.0 Supabase
// Items in Shop, My Stock, People Asking, Customers, Money Records, Settings

// ── ITEMS IN SHOP ─────────────────────────────────────────────────────────────

function loadItems(){
  renderRefreshBar('items');
  var el=document.getElementById('items-body');
  el.innerHTML='<div class="loading-msg">Loading items…</div>';
  sbCall('getProducts').then(function(res){
    if(!res.success){el.innerHTML='<div class="loading-msg">Error loading items.</div>';return;}
    APP.allProducts=res.data||[];
    var active=APP.allProducts.filter(function(p){return p.active===true||p.active==='TRUE';});
    var hidden=APP.allProducts.filter(function(p){return p.active!==true&&p.active!=='TRUE';});
    if(!APP.allProducts.length){el.innerHTML='<div class="empty-msg">No items yet. Add your first item above.</div>';return;}
    var html='<div class="items-search-bar"><input type="text" class="items-search-input" placeholder="Search items…" oninput="filterItems(this.value)"/><button class="items-filter-btn">⊟</button></div>';
    html+='<div class="items-grid" id="items-grid-inner">';
    active.forEach(function(p){html+=itemCard(p,false);});
    hidden.forEach(function(p){html+=itemCard(p,true);});
    el.innerHTML=html+'</div>';
  }).catch(function(){el.innerHTML='<div class="loading-msg">Connection issue.</div>';});
}

function filterItems(q){
  var cards=document.querySelectorAll('.item-card[data-name]');
  var lq=q.toLowerCase();
  cards.forEach(function(card){
    card.style.display=card.getAttribute('data-name').toLowerCase().includes(lq)?'':'none';
  });
}

function itemCard(p,isHidden){
  var stock=parseInt(p.stock_qty)||0;
  var low=stock<(parseInt(p.low_stock_alert)||20);
  var catBadge=p.category==='Drinks'?'DRINKS':p.category==='Snacks'?'SNACKS':'OTHER';
  // Supabase uses image_url; support both field names
  var imgSrc=(p.image_url||p.image_file||'').trim();
  return '<div class="item-card" data-name="'+esc(p.name)+'" style="'+(isHidden?'opacity:.55':'')+'">' +
    (imgSrc
      ? '<div class="item-img-wrap"><img src="'+esc(imgSrc)+'" alt="'+esc(p.name)+'" class="item-img" onerror="this.parentElement.style.display=\'none\'"/></div>'
      : '<div class="item-img-wrap item-img-placeholder"><span class="item-img-icon">📦</span></div>') +
    '<div class="item-card-top">' +
      '<span class="item-cat-badge">'+catBadge+'</span>' +
      (low?'<span class="item-low-badge">⚠ LOW</span>':'') +
    '</div>' +
    '<div class="item-name">'+esc(p.name)+'</div>' +
    '<div class="item-prices">' +
      '<div class="item-price-row"><span class="ipr-label">YOUR COST</span><span class="ipr-label">DIRECT</span></div>' +
      '<div class="item-price-row"><span class="ipr-val">₦'+fmt(p.cost_price)+'</span><span class="ipr-val accent">₦'+fmt(p.consumer_price)+'</span></div>' +
    '</div>' +
    '<div class="item-stock-row">' +
      (low?'<span class="item-low-text">⚠ Low Stock: '+stock+'</span>':'<span class="item-stock-ok">Stock: '+stock+'</span>') +
    '</div>' +
    '<div class="item-actions">' +
      '<button class="btn-edit" onclick="openProductForm(\''+esc(p.id)+'\')">✏ Edit</button>' +
      (isHidden
        ?'<button class="btn-stock-in" onclick="showItemAgain(\''+esc(p.id)+'\')">👁 Show</button>'
        :'<button class="btn-stock-out" onclick="hideItem(\''+esc(p.id)+'\')">🙈 Hide</button>') +
    '</div>' +
  '</div>';
}

function openProductForm(id){
  var title=document.getElementById('product-form-title');
  document.getElementById('pf-id').value=id||'NEW';
  if(!id){
    title.textContent='Add New Item';
    ['pf-name','pf-cost','pf-consumer','pf-retail','pf-wholesale','pf-stock','pf-img','pf-desc'].forEach(function(f){document.getElementById(f).value='';});
    document.getElementById('pf-cat').value='Drinks'; document.getElementById('pf-alert').value='20';
  } else {
    title.textContent='Edit Item';
    var p=APP.allProducts.find(function(x){return x.id===id;});
    if(p){
      document.getElementById('pf-name').value=p.name||'';
      document.getElementById('pf-cat').value=p.category||'Drinks';
      document.getElementById('pf-cost').value=p.cost_price||'';
      document.getElementById('pf-consumer').value=p.consumer_price||'';
      document.getElementById('pf-retail').value=p.retail_price||'';
      document.getElementById('pf-wholesale').value=p.wholesale_price||'';
      document.getElementById('pf-stock').value=p.stock_qty||'';
      document.getElementById('pf-alert').value=p.low_stock_alert||'20';
      // Support both image field names
      document.getElementById('pf-img').value=p.image_url||p.image_file||'';
      document.getElementById('pf-desc').value=p.description||'';
    }
  }
  document.getElementById('modal-product').classList.remove('hidden');
}

function submitProduct(){
  var id=document.getElementById('pf-id').value;
  var payload={
    id:id, name:document.getElementById('pf-name').value.trim(),
    category:document.getElementById('pf-cat').value,
    cost_price:document.getElementById('pf-cost').value,
    consumer_price:document.getElementById('pf-consumer').value,
    retail_price:document.getElementById('pf-retail').value,
    wholesale_price:document.getElementById('pf-wholesale').value,
    stock_qty:document.getElementById('pf-stock').value,
    low_stock_alert:document.getElementById('pf-alert').value,
    image_file:document.getElementById('pf-img').value.trim(),
    description:document.getElementById('pf-desc').value.trim(),
    done_by:APP.name
  };
  if(!payload.name){toast('Item name is required','bad');return;}
  var priceFields=[
    {key:'cost_price',label:'Buying price'},
    {key:'consumer_price',label:'Direct customer price'},
    {key:'retail_price',label:'Small shops price'},
    {key:'wholesale_price',label:'Wholesaler price'}
  ];
  for(var i=0;i<priceFields.length;i++){
    var v=parseFloat(payload[priceFields[i].key]);
    if(payload[priceFields[i].key]!==''&&(isNaN(v)||v<0)){
      toast(priceFields[i].label+' cannot be negative','bad'); return;
    }
  }
  if(payload.stock_qty!==''&&parseFloat(payload.stock_qty)<0){toast('Stock quantity cannot be negative','bad');return;}
  var action=id==='NEW'?'addProduct':'updateProduct';
  sbCall(action,payload).then(function(res){
    if(res.success){closeModal('modal-product');toast(id==='NEW'?'Item added!':'Item updated!','good');loadItems();loadToday();}
    else toast('Error: '+(res.error||''),'bad');
  });
}

function hideItem(id){
  if(!confirm('Hide this item? It will no longer show on your public site. You can show it again anytime.')) return;
  sbCall('hideProduct',{id:id,done_by:APP.name}).then(function(res){
    if(res.success){toast('Item hidden','good');loadItems();} else toast('Error: '+(res.error||''),'bad');
  });
}
function showItemAgain(id){
  sbCall('updateProduct',{id:id,active:'TRUE',done_by:APP.name}).then(function(res){
    if(res.success){toast('Item is showing again','good');loadItems();} else toast('Error: '+(res.error||''),'bad');
  });
}

// ── MY STOCK ──────────────────────────────────────────────────────────────────

function loadStock(tab){
  APP.currentStockTab=tab||APP.currentStockTab;
  renderRefreshBar('stock');
  var el=document.getElementById('stock-body');
  el.innerHTML='<div class="loading-msg">Loading…</div>';
  if(APP.currentStockTab==='levels'){
    sbCall('getProducts').then(function(res){
      if(!res.success){el.innerHTML='<div class="loading-msg">Error.</div>';return;}
      var active=(res.data||[]).filter(function(p){return p.active===true||p.active==='TRUE';});
      if(!active.length){el.innerHTML='<div class="empty-msg">No active items.</div>';return;}
      var html='';
      active.forEach(function(p){
        var stock=parseInt(p.stock_qty)||0;
        var low=stock<(parseInt(p.low_stock_alert)||20);
        var val=stock*(parseFloat(p.cost_price)||0);
        var grade=!low?'GRADE A':'LOW STOCK';
        var gradeClass=!low?'grade-badge-a':'grade-badge-low';
        html+='<div class="stock-card-v2'+(low?' low':'')+'">' +
          '<div class="scv2-head"><div class="scv2-label">PRODUCT</div><span class="'+gradeClass+'">'+grade+'</span></div>' +
          '<div class="scv2-name">'+esc(p.name)+'</div>' +
          '<div class="scv2-qty'+(low?' low':'"')+'>'+stock+'<span class="scv2-unit"> packs</span></div>' +
          '<div class="scv2-worth"><span class="scv2-worth-label">ESTIMATED WORTH</span><div class="scv2-worth-val">₦'+fmt(val)+'</div></div>' +
          '<div class="scv2-actions">' +
            '<button class="scv2-btn minus" onclick="quickStockChange(\''+esc(p.id)+'\',\'out\',\''+esc(p.name)+'\','+stock+')">−</button>' +
            '<button class="scv2-btn plus"  onclick="quickStockChange(\''+esc(p.id)+'\',\'in\', \''+esc(p.name)+'\','+stock+')">+</button>' +
          '</div>' +
        '</div>';
      });
      el.innerHTML='<div class="stock-grid-v2">'+html+'</div>';
    });
  } else if(APP.currentStockTab==='batches'){
    sbCall('getBatchRecords').then(function(res){
      el.innerHTML=renderSimpleTable(res.data||[],['id','made_on','product_name','qty_made','expires_on','batch_note'],['Batch ID','Made On','Item','Qty Made','Expires On','Note']);
    });
  } else {
    sbCall('getStockLog').then(function(res){
      el.innerHTML=renderSimpleTable(res.data||[],['when','product_name','change_qty','reason','recorded_by','stock_before','stock_after'],['When','Item','Change','Reason','Done By','Before','After']);
    });
  }
}

function quickStockChange(pid,dir,name,current){
  var qty=parseInt(prompt((dir==='in'?'Add how many packs of ':'Remove how many packs of ')+name+'? (Current: '+current+')'));
  if(!qty||qty<=0) return;
  if(qty>50){
    var newT=dir==='in'?current+qty:current-qty;
    if(!confirm('You are '+(dir==='in'?'adding':'removing')+' '+qty+' packs of '+name+'.\n\nYour current stock is '+current+'.\nAfter this, you will have '+newT+' packs.\n\nIs this correct?')) return;
  }
  var reason=prompt('Reason for this change:')||'Manual adjustment';
  sbCall('adjustStock',{product_id:pid,change_qty:dir==='in'?qty:-qty,reason:reason,done_by:APP.name}).then(function(res){
    if(res.success){toast('Stock updated. New total: '+res.after,'good');loadStock('levels');loadToday();}
    else toast('Error: '+(res.error||''),'bad');
  });
}

function switchStockTab(tab,btn){
  document.querySelectorAll('#page-stock .tab').forEach(function(t){t.classList.remove('active');});
  btn.classList.add('active'); loadStock(tab);
}

function openStockModal(productId,direction){
  document.getElementById('sa-product-id').value=productId;
  document.getElementById('sa-direction').value=direction;
  document.getElementById('sa-qty').value=''; document.getElementById('sa-reason').value='';
  document.getElementById('stock-modal-title').textContent=direction==='in'?'Add Stock':'Remove / Fix Stock';
  document.getElementById('modal-stock').classList.remove('hidden');
}

function submitStockAdjust(){
  var pid=document.getElementById('sa-product-id').value, dir=document.getElementById('sa-direction').value;
  var qty=parseInt(document.getElementById('sa-qty').value)||0;
  var reason=document.getElementById('sa-reason').value.trim()||'Manual adjustment';
  if(!qty||qty<=0){toast('Please enter a valid quantity','bad');return;}
  var product=APP.allProducts.find(function(p){return p.id===pid;});
  var currentStock=product?(parseInt(product.stock_qty)||0):0;
  var productName=product?product.name:'this item';
  if(qty>50){
    var newTotal=dir==='in'?currentStock+qty:currentStock-qty;
    var confirmMsg='You are '+(dir==='in'?'adding':'removing')+' '+qty+' packs of '+productName+'.\n\nYour current stock is '+currentStock+'.\nAfter this, you will have '+newTotal+' packs.\n\nIs this correct?';
    if(!confirm(confirmMsg)) return;
  }
  sbCall('adjustStock',{product_id:pid,change_qty:dir==='in'?qty:-qty,reason:reason,done_by:APP.name}).then(function(res){
    if(res.success){closeModal('modal-stock');toast('Stock updated. New total: '+res.after,'good');loadStock('levels');loadToday();}
    else toast('Error: '+(res.error||''),'bad');
  });
}

function openBatchForm(){
  var sel=document.getElementById('bf-product'); sel.innerHTML='';
  sbCall('getProducts').then(function(res){
    (res.data||[]).filter(function(p){return p.active===true||p.active==='TRUE';}).forEach(function(p){
      var opt=document.createElement('option'); opt.value=p.id; opt.textContent=p.name; sel.appendChild(opt);
    });
  });
  document.getElementById('bf-qty').value=''; document.getElementById('bf-expiry').value=''; document.getElementById('bf-note').value='';
  document.getElementById('modal-batch').classList.remove('hidden');
}

function submitBatch(){
  var pid=document.getElementById('bf-product').value, qty=document.getElementById('bf-qty').value;
  var expiry=document.getElementById('bf-expiry').value, note=document.getElementById('bf-note').value.trim();
  if(!pid||!qty){toast('Please select an item and enter quantity','bad');return;}
  var product=APP.allProducts.find(function(p){return p.id===pid;});
  var productName=product?product.name:'this item', qtyNum=parseInt(qty)||0;
  if(qtyNum>50){
    var currentStock=product?(parseInt(product.stock_qty)||0):0;
    if(!confirm('You are recording a batch of '+qtyNum+' packs of '+productName+'.\n\nYour current stock is '+currentStock+'.\nAfter this batch, you will have '+(currentStock+qtyNum)+' packs.\n\nIs this correct?')) return;
  }
  sbCall('logBatch',{product_id:pid,qty_made:qty,expires_on:expiry,batch_note:note,done_by:APP.name}).then(function(res){
    if(res.success){closeModal('modal-batch');toast('Batch recorded! Stock updated.','good');loadStock('levels');loadToday();}
    else toast('Error: '+(res.error||''),'bad');
  });
}

// ── PEOPLE ASKING ─────────────────────────────────────────────────────────────

function loadPeople(tab){
  APP.currentPeopleTab=tab||APP.currentPeopleTab;
  renderRefreshBar('people');
  var el=document.getElementById('people-body');
  el.innerHTML='<div class="loading-msg">Loading…</div>';
  var actionMap={retail:'getRetailClients',wholesale:'getWholesaleClients',distributor:'getDistributors'};
  sbCall(actionMap[APP.currentPeopleTab]).then(function(res){
    if(!res.success){el.innerHTML='<div class="loading-msg">Error.</div>';return;}
    var people=res.data||[];
    if(!people.length){el.innerHTML='<div class="card-list"><div class="empty-msg">Nobody here yet.</div></div>';return;}
    var subEl=document.getElementById('people-subtitle');
    if(subEl) subEl.textContent='Managing '+people.length+' active '+(tab==='retail'?'small shop':tab==='wholesale'?'wholesale':tab)+' conversations';
    var html='<div class="card-list">';
    people.forEach(function(c){
      var name=c.contact_name||c.name||'';
      var biz=c.shop_name||c.business_name||'';
      var owes=parseFloat(c.balance_owed)||0;
      var stage=c.where_we_are||'still_talking';
      var stageCls='stage-'+stage.replace(/_/g,'-');
      var av=initials(name);
      var avColour=stage==='ready_to_buy'?'var(--accent2)':stage==='not_interested'?'var(--text3)':'var(--accent)';
      var cleanPhone=String(c.phone||'').replace(/\D/g,'');
      if(cleanPhone.startsWith('0')) cleanPhone='234'+cleanPhone.slice(1);
      html+='<div class="people-card">';
      html+='<div class="pcard-head">';
      html+='<div class="pcard-avatar" style="background:'+avColour+'">'+esc(av||'?')+'</div>';
      html+='<div class="pcard-info"><div class="pcard-id">ID: #'+esc(c.id||'')+'</div><div class="pcard-name">'+esc(name)+'</div>'+(biz?'<div class="pcard-biz">'+esc(biz)+'</div>':'')+'</div>';
      html+='<span class="people-stage-badge '+stageCls+'">'+stageLabel(stage)+'</span>';
      html+='</div>';
      if(c.state||c.lga) html+='<div class="pcard-detail">📍 '+esc((c.lga||'')+((c.lga&&c.state)?', ':'')+( c.state||''))+'</div>';
      if(c.interest||c.packs_requested) html+='<div class="pcard-detail">🧺 '+esc(c.interest||c.packs_requested||'')+'</div>';
      if(c.remind_me_on){
        html+='<div class="pcard-followup"><span>🔔 Follow up: '+esc(String(c.remind_me_on))+'</span><button class="pcard-edit-date" onclick="openPeopleModal(\''+esc(c.id)+'\',\''+APP.currentPeopleTab+'\',\''+stage+'\')">EDIT DATE</button></div>';
      }
      if(owes>0) html+='<div class="pcard-owes">💳 Owes you: ₦'+fmt(owes)+'</div>';
      html+='<div class="pcard-actions">';
      html+='<button class="pcard-btn pcard-update" onclick="openPeopleModal(\''+esc(c.id)+'\',\''+APP.currentPeopleTab+'\',\''+stage+'\')">⇄ UPDATE</button>';
      html+='<a class="pcard-btn pcard-wa" href="https://wa.me/'+cleanPhone+'" target="_blank">💬 WHATSAPP</a>';
      html+='<button class="pcard-btn pcard-record'+(owes<=0?' disabled":':'":')+'onclick="'+(owes>0?'openPaymentModal(\''+esc(c.id)+'\',\''+APP.currentPeopleTab+'\',\''+esc(name)+'\','+owes+')':'toast(\'No balance to record\',\'bad\')')+'">'+'💰 RECORD</button>';
      html+='</div></div>';
    });
    el.innerHTML=html+'</div>'+renderSimpleTable(people,
      ['id','contact_name','phone','state','interest','where_we_are','balance_owed','remind_me_on'],
      ['ID','Name','Phone','State','Interest','Stage','Owes','Follow Up']);
  }).catch(function(){el.innerHTML='<div class="loading-msg">Connection issue.</div>';});
}

function switchPeopleTab(tab,btn){
  document.querySelectorAll('#page-people .tab').forEach(function(t){t.classList.remove('active');});
  btn.classList.add('active'); loadPeople(tab);
}

function stageLabel(stage){
  var map={still_talking:'STILL TALKING',ready_to_buy:'READY TO BUY',not_interested:'NOT INTERESTED',
    just_asked:'STILL TALKING',talking:'STILL TALKING',active:'READY TO BUY',
    applied:'STILL TALKING',vetting:'STILL TALKING',signed:'READY TO BUY'};
  return map[stage]||stage||'STILL TALKING';
}

function openPeopleModal(id,sheet,stage){
  document.getElementById('pm-id').value=id; document.getElementById('pm-sheet').value=sheet;
  document.getElementById('pm-stage').value=stage||'still_talking';
  document.getElementById('pm-remind').value=''; document.getElementById('pm-notes').value='';
  document.getElementById('modal-people').classList.remove('hidden');
}

function submitPeopleUpdate(){
  sbCall('updateClientStatus',{
    client_id:document.getElementById('pm-id').value,
    client_sheet:document.getElementById('pm-sheet').value,
    where_we_are:document.getElementById('pm-stage').value,
    remind_me_on:document.getElementById('pm-remind').value,
    notes:document.getElementById('pm-notes').value.trim(),
    done_by:APP.name
  }).then(function(res){
    if(res.success){closeModal('modal-people');toast('Updated!','good');loadPeople(APP.currentPeopleTab);}
    else toast('Error: '+(res.error||''),'bad');
  });
}

function openPaymentModal(clientId,sheet,name,owes){
  // Delegate to the enhanced version in admin.js which handles
  // partial payment, Mark Fully Paid, and Write Off Debt
  APP.currentPeopleTab = sheet || APP.currentPeopleTab;
  openPartialPaymentModal(clientId, name, owes);
}

function submitPayment(){
  var amount=parseFloat(document.getElementById('pay-amount').value)||0;
  if(!amount||amount<=0){toast('Please enter a valid amount','bad');return;}
  sbCall('recordPayment',{client_id:document.getElementById('pay-client-id').value,client_sheet:document.getElementById('pay-sheet').value,amount:amount,done_by:APP.name}).then(function(res){
    if(res.success){
      closeModal('modal-payment');
      toast(res.status==='paid_in_full'?'Payment recorded. Fully paid!':'Payment recorded. Still owes ₦'+fmt(res.still_owes),'good');
      loadPeople(APP.currentPeopleTab);
    } else toast('Error: '+(res.error||''),'bad');
  });
}

// ── MY CUSTOMERS ──────────────────────────────────────────────────────────────

function loadCustomers(tab){
  renderRefreshBar('customers');
  tab = tab || APP._custTab || 'all';
  APP._custTab = tab;
  var el=document.getElementById('customers-body');
  el.innerHTML='<div class="loading-msg">Loading customers…</div>';

  // Tab strip
  var tabHtml = '<div class="tab-strip cust-tab-strip">'+
    ['all','consumer','retail','wholesale','distributor'].map(function(t){
      var labels={all:'Everyone',consumer:'Consumers',retail:'Retail Shops',wholesale:'Wholesalers',distributor:'Distributors'};
      return '<button class="tab'+(tab===t?' active':'')+'" onclick="loadCustomers(\''+t+'\')">'+labels[t]+'</button>';
    }).join('')+
  '</div>';

  sbCall('getCustomers').then(function(res){
    if(!res.success){el.innerHTML=tabHtml+'<div class="loading-msg">Error.</div>';return;}
    var all=(res.data||[]);
    // Filter by buyer_type if not 'all'
    var customers = tab==='all' ? all : all.filter(function(c){ return (c.buyer_type||'consumer')===tab; });
    customers.sort(function(a,b){return (parseFloat(b.total_spent)||0)-(parseFloat(a.total_spent)||0);});

    if(!customers.length){
      el.innerHTML=tabHtml+'<div class="empty-msg">No '+tab+' customers yet.</div>';
      return;
    }
    var html=tabHtml+'<div class="customers-subtitle">Ranked by lifetime spend · live state &amp; tier</div><div class="card-list">';
    customers.forEach(function(c,i){
      var rank=i+1, isTop=rank<=3;
      var cleanPhone=String(c.phone||'').replace(/\D/g,'');
      if(cleanPhone.startsWith('0')) cleanPhone='234'+cleanPhone.slice(1);
      var cs = getCustomerState(c);
      var badges = stateTag(cs.state) + tierTag(cs.tier);
      // WhatsApp CTA
      var waMsg = 'Hello '+esc(c.name||c.buyer_name||'')+'! 👋 Thank you for being a valued OA Drinks & Snacks customer. We have fresh stock ready for you. Would you like to place an order?';
      var waBtn = cleanPhone ? '<a class="btn-wa-cta" href="https://wa.me/'+cleanPhone+'?text='+encodeURIComponent(waMsg)+'" target="_blank">'+
        '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z"/></svg>Message</a>' : '';
      if(isTop){
        var rankColors=['var(--accent)','#6b7280','#d97706'];
        html+='<div class="cust-card-top">';
        html+='<div class="cust-top-head"><div class="cust-rank-badge" style="background:'+rankColors[i]+'">'+rank+'</div>';
        html+='<div class="cust-top-info"><div class="cust-name">'+esc(c.name||c.buyer_name||'')+'</div>';
        html+='<div class="cust-badges">'+badges+'</div>';
        html+='<div class="cust-meta">'+esc(c.state||'')+(c.lga?', '+esc(c.lga):'')+'</div></div>';
        html+=waBtn;
        html+='</div>';
        html+='<div class="cust-top-stats"><div class="cust-stat"><div class="cust-stat-label">TOTAL SPENT</div><div class="cust-stat-val accent">₦'+fmt(c.total_spent)+'</div></div>';
        html+='<div class="cust-stat"><div class="cust-stat-label">ORDERS</div><div class="cust-stat-val">'+esc(String(c.total_orders||0))+'</div></div>';
        html+='<div class="cust-stat"><div class="cust-stat-label">LAST ORDER</div><div class="cust-stat-val">'+cs.days+' days ago</div></div></div>';
        if(c.phone) html+='<div class="cust-phone"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 12 19.79 19.79 0 0 1 1.09 3.4 2 2 0 0 1 3.05 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> '+esc(c.phone||'')+'</div>';
        html+='</div>';
      } else {
        html+='<div class="cust-card-compact">';
        html+='<div class="cust-rank-num">'+rank+'</div>';
        html+='<div class="cust-compact-info"><div class="cust-name">'+esc(c.name||c.buyer_name||'')+'</div>';
        html+='<div class="cust-badges-sm">'+badges+'</div>';
        html+='<div class="cust-meta">'+esc(c.state||'')+'</div></div>';
        html+='<div class="cust-compact-right"><div class="cust-spent-compact">'+fmtK(c.total_spent)+'</div><div class="cust-orders-compact">'+esc(String(c.total_orders||0))+' orders</div>'+waBtn+'</div>';
        html+='</div>';
      }
    });
    html+='</div>';
    el.innerHTML=html;
  }).catch(function(){el.innerHTML=tabHtml+'<div class="loading-msg">Connection issue.</div>';});
}

function fmtK(v){ var n=parseFloat(v)||0; if(n>=1000000) return '₦'+(n/1000000).toFixed(1)+'M'; if(n>=1000) return '₦'+(n/1000).toFixed(0)+'k'; return '₦'+(n).toLocaleString('en-NG'); }

// ── MONEY RECORDS ─────────────────────────────────────────────────────────────

function loadMoney(){
  if(APP.role!=='master') return;
  renderRefreshBar('money');
  var el=document.getElementById('money-body'), sum=document.getElementById('money-summary');
  el.innerHTML='<div class="loading-msg">Loading money records…</div>';

  var now=new Date();
  var thisMK=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  var monthStart=thisMK+'-01T00:00:00';

  // Fetch both manual money_records AND live confirmed orders in parallel
  Promise.all([
    sbCall('getMoneyRecords'),
    sb().from('orders').select('id,total,buyer_type,created_at,order_items(product_name,qty,unit_price)')
      .eq('project_id',PROJECT_ID).eq('status','confirmed')
      .gte('created_at',monthStart)
      .order('created_at',{ascending:false}),
  ]).then(function(results){
    var manualRes = results[0];
    var liveOrders = results[1].data||[];

    if(!manualRes.success){el.innerHTML='<div class="loading-msg">Error loading records.</div>';return;}
    var rows=manualRes.data||[];

    // Manual totals
    var totIn=0,totCost=0,totProfit=0,totSpoil=0,thisMonth=0,lastMonth=0;
    var lastMD=new Date(now.getFullYear(),now.getMonth()-1,1);
    var lastMK=lastMD.getFullYear()+'-'+String(lastMD.getMonth()+1).padStart(2,'0');
    rows.forEach(function(r){
      var amt=parseFloat(r.total_collected)||0;
      totIn+=amt; totCost+=parseFloat(r.total_cost)||0; totProfit+=parseFloat(r.final_profit)||0; totSpoil+=parseFloat(r.spoilage_loss)||0;
      if(r.month===thisMK) thisMonth+=amt;
      if(r.month===lastMK) lastMonth+=amt;
    });
    var chgPct=lastMonth>0?Math.round(((thisMonth-lastMonth)/lastMonth)*100):0;
    var chgSign=chgPct>0?'+':'';
    var spoilPct=totIn>0?Math.round((totSpoil/totIn)*100):0;

    // Live totals from confirmed orders this month
    var liveRev=liveOrders.reduce(function(s,o){return s+(parseFloat(o.total)||0);},0);
    var liveCount=liveOrders.length;
    // Breakdown by buyer type
    var liveCon=0,liveRet=0,liveWho=0,liveDis=0;
    liveOrders.forEach(function(o){
      var t=parseFloat(o.total)||0;
      if(o.buyer_type==='consumer')    liveCon+=t;
      if(o.buyer_type==='retail')      liveRet+=t;
      if(o.buyer_type==='wholesale')   liveWho+=t;
      if(o.buyer_type==='distributor') liveDis+=t;
    });

    // Summary strip — shows both manual profit and live revenue
    sum.innerHTML=
      '<div class="money-totals-strip">'+
        '<div class="mts-item"><div class="mts-label">TOTAL PROFIT</div>'+
          '<div class="mts-val '+(totProfit>=0?'profit-pos':'profit-neg')+'">₦'+fmt(totProfit)+'</div>'+
          '<div class="mts-source">from manual records</div></div>'+
        '<div class="mts-item"><div class="mts-label">THIS MONTH (LIVE)</div>'+
          '<div class="mts-val">₦'+fmtK(liveRev)+'</div>'+
          '<div class="mts-source">'+liveCount+' confirmed order'+(liveCount!==1?'s':'')+
            (chgPct!==0?' · <span class="mts-change '+(chgPct>0?'pos':'neg')+'">'+chgSign+chgPct+'% vs last month</span>':'')+
          '</div></div>'+
        '<div class="mts-item"><div class="mts-label">LOST TO WASTE</div>'+
          '<div class="mts-val profit-neg">₦'+fmt(totSpoil)+'</div>'+
          (spoilPct>0?'<div class="mts-source">'+spoilPct+'% of manual revenue</div>':'')+
        '</div>'+
      '</div>'+
      // Live buyer type breakdown
      (liveRev>0?
        '<div class="money-live-strip">'+
          '<div class="mls-label">This month\'s live sales by buyer type</div>'+
          '<div class="mls-row">'+
            (liveCon>0?'<span class="mls-item con">Consumer ₦'+fmtK(liveCon)+'</span>':'')+
            (liveRet>0?'<span class="mls-item ret">Retail ₦'+fmtK(liveRet)+'</span>':'')+
            (liveWho>0?'<span class="mls-item who">Wholesale ₦'+fmtK(liveWho)+'</span>':'')+
            (liveDis>0?'<span class="mls-item dis">Distributor ₦'+fmtK(liveDis)+'</span>':'')+
          '</div>'+
        '</div>'
      :'');

    if(!rows.length){
      el.innerHTML=
        '<div class="money-live-banner">'+
          '<div class="mlb-title">'+
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'+
            ' Live orders are tracked automatically'+
          '</div>'+
          '<div class="mlb-sub">Add a manual money record to capture your production cost, spoilage, and profit margin per item.</div>'+
        '</div>'+
        (liveOrders.length?renderLiveOrdersList(liveOrders):'<div class="empty-msg">No confirmed orders this month yet.</div>');
      return;
    }

    var recentRows=rows.slice().reverse().slice(0,5);
    el.innerHTML=
      // Live orders this month (auto, always shown)
      (liveOrders.length?
        '<div class="money-section-head">'+
          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>'+
          ' Live — This Month\'s Confirmed Orders'+
        '</div>'+
        renderLiveOrdersList(liveOrders.slice(0,5)):'') +
      // Manual records
      '<div class="money-activity-header"><div class="money-activity-title">'+
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'+
        ' Manual Profit Records'+
      '</div>'+
        '<button class="btn-ghost sm" onclick="toggleMoneyTable()">☰ Full Table</button>'+
      '</div>'+
      '<div class="money-activity-list">'+
        recentRows.map(function(r){
          var profit=parseFloat(r.final_profit)||0;
          var isProfit=profit>=0;
          return '<div class="mac-row">'+
            '<div class="mac-avatar '+(isProfit?'mac-av-profit':'mac-av-loss')+'">'+
              '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+
                (isProfit?'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>':
                          '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>')+
              '</svg>'+
            '</div>'+
            '<div class="mac-info"><div class="mac-name">'+esc(r.product_name||'')+'</div><div class="mac-meta">'+esc(r.month||'')+'</div></div>'+
            '<div class="mac-right"><div class="mac-val '+(isProfit?'profit-pos':'profit-neg')+'">'+(isProfit?'+':'−')+'₦'+fmt(Math.abs(profit))+'</div><div class="mac-tag '+(isProfit?'':'mac-tag-loss')+'">'+(isProfit?'PROFIT':'LOSS')+'</div></div>'+
          '</div>';
        }).join('')+
      '</div>'+
      '<div id="money-table-wrap" class="hidden">'+
        renderSimpleTable(rows,['month','product_name','packs_sold','total_collected','total_cost','gross_earnings','spoilage_loss','final_profit'],
          ['Month','Item','Packs Sold','Money In','Total Cost','Gross Earnings','Lost to Waste','Final Profit'])+
      '</div>'+
      '<div class="master-insight-panel">'+
        '<div class="mip-head">'+
          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'+
          '<span class="mip-label">MASTER INSIGHT</span>'+
        '</div>'+
        '<div class="mip-text">"'+buildInsight(rows,chgPct,totSpoil,totIn)+'"</div>'+
      '</div>';
  });
}

function renderLiveOrdersList(orders){
  return '<div class="live-orders-list">'+
    orders.map(function(o){
      var dt=o.created_at?new Date(o.created_at).toLocaleDateString('en-NG'):'';
      var typeLabel={consumer:'Consumer',retail:'Retail',wholesale:'Wholesale',distributor:'Distributor'}[o.buyer_type]||o.buyer_type||'';
      var items=(o.order_items||[]).map(function(i){return i.product_name;}).join(', ');
      return '<div class="live-order-row">'+
        '<div class="lo-avatar">'+
          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>'+
        '</div>'+
        '<div class="lo-info">'+
          '<div class="lo-name">'+esc(o.buyer_name||'')+'</div>'+
          '<div class="lo-meta">'+typeLabel+(items?' · '+esc(items.slice(0,40)):'')+' · '+dt+'</div>'+
        '</div>'+
        '<div class="lo-amt">₦'+fmtK(o.total)+'</div>'+
      '</div>';
    }).join('')+
  '</div>';
}

function buildInsight(rows,chgPct,totSpoil,totIn){
  if(!rows.length) return 'Add your first money record above to start seeing insights here.';
  var spoilPct=totIn>0?Math.round((totSpoil/totIn)*100):0;
  if(chgPct>10) return 'Money in this month is up '+chgPct+'% compared to last month. Keep pushing — you are on a strong run.';
  if(chgPct<-10) return 'Money is down '+Math.abs(chgPct)+'% vs last month. Check which items are selling slowly and consider a promotion.';
  if(spoilPct>8) return 'About '+spoilPct+'% of your revenue is being lost to waste. Consider smaller production batches to reduce spoilage.';
  return 'Business is running steady. Your top items are consistent. Watch your restock timing to avoid lost sales.';
}

function toggleMoneyTable(){
  var wrap=document.getElementById('money-table-wrap');
  var btn=document.querySelector('.money-activity-header .btn-main');
  if(!wrap) return;
  if(wrap.classList.contains('hidden')){wrap.classList.remove('hidden');if(btn) btn.textContent='☰ Hide Full Records';}
  else{wrap.classList.add('hidden');if(btn) btn.textContent='☰ See All Records';}
}

function openMoneyForm(){
  var now=new Date();
  document.getElementById('mf-month').value=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  ['mf-product','mf-packs','mf-cost','mf-sold','mf-notes'].forEach(function(id){document.getElementById(id).value='';});
  document.getElementById('mf-spoilt').value='0';
  document.getElementById('money-preview').classList.add('hidden');
  document.getElementById('modal-money').classList.remove('hidden');
}

function calcMoneyPreview(){
  var packs=parseInt(document.getElementById('mf-packs').value)||0;
  var cost=parseFloat(document.getElementById('mf-cost').value)||0;
  var sold=parseFloat(document.getElementById('mf-sold').value)||0;
  var spoilt=parseInt(document.getElementById('mf-spoilt').value)||0;
  var prev=document.getElementById('money-preview');
  if(!packs||!cost||!sold){prev.classList.add('hidden');return;}
  var collected=packs*sold, tc=packs*cost, gross=collected-tc, spoilage=spoilt*cost, profit=gross-spoilage;
  prev.classList.remove('hidden');
  prev.innerHTML=
    mpRow('Money collected','₦'+fmt(collected))+mpRow('What it cost you','₦'+fmt(tc))+
    mpRow('Gross earnings','₦'+fmt(gross))+mpRow('Lost to waste','₦'+fmt(spoilage))+
    '<div class="mp-row"><span>Your final profit</span><span style="color:'+(profit>=0?'var(--green)':'var(--red)')+'">₦'+fmt(profit)+'</span></div>';
}
function mpRow(l,v){return '<div class="mp-row"><span>'+l+'</span><span>'+v+'</span></div>';}

function submitMoneyRecord(){
  var payload={
    month:document.getElementById('mf-month').value.trim(),
    product_name:document.getElementById('mf-product').value.trim(),
    packs_sold:document.getElementById('mf-packs').value,
    cost_per_pack:document.getElementById('mf-cost').value,
    sold_per_pack:document.getElementById('mf-sold').value,
    spoilt_packs:document.getElementById('mf-spoilt').value||'0',
    notes:document.getElementById('mf-notes').value.trim(),
    done_by:APP.name
  };
  if(!payload.month||!payload.product_name||!payload.packs_sold){toast('Month, item and packs sold are required','bad');return;}
  sbCall('addMoneyRecord',payload).then(function(res){
    if(res.success){
      closeModal('modal-money');
      var msg = 'Saved! Your profit: ₦'+fmt(res.final_profit);
      if(res.live_revenue && res.live_revenue>0){
        msg += ' · Live orders this month: ₦'+fmtK(res.live_revenue);
      }
      toast(msg,'good');
      loadMoney();
      loadToday();
    } else {
      toast('Error: '+(res.error||''),'bad');
    }
  });
}

// ── SHOP SETTINGS ─────────────────────────────────────────────────────────────

function loadSettings(tab){
  APP.currentSettingsTab=tab||APP.currentSettingsTab;
  renderRefreshBar('settings');
  var el=document.getElementById('settings-body');
  el.innerHTML='<div class="loading-msg">Loading…</div>';
  if(tab==='general'){
    sbCall('getSettings').then(function(res){
      if(!res.success){el.innerHTML='<div class="loading-msg">Error.</div>';return;}
      var s=res.data||{};
      var labels={
        shop_name:'Shop / Brand Name',
        whatsapp_number:'WhatsApp Number for Orders',
        monthly_target:'Monthly Revenue Goal (₦)',
        low_stock_default:'Alert Me When Stock Drops Below',
        delivery_fee:'Delivery Fee (₦)',
      };
      var html='<div class="settings-block"><div class="settings-block-title">General Settings</div>';
      Object.keys(labels).forEach(function(key){
        html+='<div class="setting-row"><div><div class="setting-label-upper">'+esc(key.replace(/_/g,' ').toUpperCase())+'</div><div class="setting-val-bold">'+esc(String(s[key]||''))+'</div></div>'+
          '<button class="setting-edit-btn" onclick="editSetting(\''+key+'\',\''+esc(String(s[key]||''))+'\')">✏</button></div>';
      });
      html+='</div>';

      // ── Customer tracking thresholds (Phase 5) ─────────────────────────────
      var thresholdLabels={
        active_window_days:   'Active Customer Window (days since last order)',
        dormant_days:         'Gone Quiet After (days of no orders)',
        loyal_min_orders:     'Loyal Customer — Minimum Orders',
        high_value_min_spend: 'Big Spender — Minimum Lifetime Spend (₦)',
      };
      html+='<div class="settings-block" style="margin-top:16px"><div class="settings-block-title">Customer Tracking Thresholds</div>';
      html+='<div class="settings-threshold-note">These control how customers are labelled as Active, Gone Quiet, Loyal, Big Spender, and At Risk. Changes take effect on next page load.</div>';
      Object.keys(thresholdLabels).forEach(function(key){
        var cur = s[key] || {active_window_days:'14',dormant_days:'30',loyal_min_orders:'5',high_value_min_spend:'50000'}[key] || '';
        html+='<div class="setting-row"><div><div class="setting-label-upper">'+esc(thresholdLabels[key].toUpperCase())+'</div><div class="setting-val-bold">'+esc(String(cur))+'</div></div>'+
          '<button class="setting-edit-btn" onclick="editSetting(\''+key+'\',\''+esc(String(cur))+'\')">✏</button></div>';
      });
      html+='</div>';

      html+='<div class="danger-zone-block"><div class="dz-icon">⚠</div><div class="dz-title">Danger Zone</div>'+
        '<div class="dz-desc">This will permanently delete all shop data including orders, items, and history.</div>'+
        '<button class="btn-danger dz-btn" onclick="confirmFactoryReset()">↺ Start Afresh — Factory Reset</button></div>';
      el.innerHTML=html;
    });
  }
  if(tab==='password'){
    el.innerHTML='<div class="settings-block"><div class="settings-block-title">Change Master Password</div>'+
      '<label class="field-label">New Password</label><input type="password" id="cpw-new" class="field-input" placeholder="At least 6 characters"/>'+
      '<label class="field-label">Confirm New Password</label><input type="password" id="cpw-confirm" class="field-input" placeholder="Type new password again"/>'+
      '<div style="margin-top:16px"><button class="btn-main" onclick="submitPasswordChange()">Update Password</button></div></div>';
    // Note: Supabase handles the current password check via the session itself.
    // No need to enter current password — the session proves identity.
  }
  if(tab==='staff'){
    sbCall('getStaffList').then(function(res){
      var staff=res.data||[];
      var html='<div class="settings-block"><div class="settings-block-title">Staff Logins</div>';
      if(!staff.length) html+='<div class="empty-msg" style="padding:20px 0">No staff logins yet.</div>';
      else staff.forEach(function(s){
        var active=String(s.active)==='TRUE';
        html+='<div class="staff-row"><div><div class="staff-name">'+esc(s.name||'')+(active?'':' (inactive)')+'</div><div class="staff-role">'+esc(s.role||'staff')+'</div></div>'+
          (active?'<div style="display:flex;gap:6px"><button class="btn-fail" onclick="deactivateStaff(\''+esc(s.id)+'\',\''+esc(s.name||'')+'\')">Remove</button></div>':'<span style="font-size:12px;color:var(--text3)">Inactive</span>')+'</div>';
      });
      html+='</div><div style="margin-top:14px"><button class="btn-main" onclick="document.getElementById(\'modal-staff\').classList.remove(\'hidden\')">+ Add Staff Login</button></div>';
      el.innerHTML=html;
    });
  }
  if(tab==='backup'){
    el.innerHTML='<div class="settings-block"><div class="settings-block-title">Back Up Your Data</div>'+
      '<p style="font-size:14px;color:var(--text2);line-height:1.6;margin-bottom:16px">Tapping the button below downloads a JSON file of all your important data to your device.</p>'+
      '<button class="btn-main" onclick="doBackup()">💾 Back Up Now</button>'+
      '<div id="backup-result" style="margin-top:12px;font-size:13px;color:var(--text2)"></div></div>';
  }
  if(tab==='audit'){
    sbCall('getAuditLog').then(function(res){
      var rows=(res.data||[]).slice(0,100);
      el.innerHTML=renderSimpleTable(rows,['when','action','details','done_by'],['When','What Happened','Details','Done By']);
    });
  }
}

function confirmFactoryReset(){
  if(!confirm(
    '⚠️ FACTORY RESET — READ CAREFULLY\n\n'+
    'This will permanently clear ALL your shop data:\n'+
    '  • All orders (pending, confirmed, fell through)\n'+
    '  • All customers and CRM contacts\n'+
    '  • All stock records and batch logs\n'+
    '  • All money records and audit logs\n\n'+
    'Your product list and settings will be kept.\n\n'+
    'A backup will be downloaded first automatically.\n\n'+
    'Are you sure you want to continue?'
  )) { return; }
  var typed=(prompt('Type  DELETE  in capitals to confirm the factory reset:')||'').trim();
  if(typed!=='DELETE'){toast('Factory reset cancelled — nothing was changed','good');return;}
  toast('Saving backup before reset…','');
  sbCall('backupNow',{done_by:APP.name}).then(function(){
    sbCall('factoryReset',{done_by:APP.name}).then(function(res){
      if(res&&res.success){
        toast('Factory reset complete.','good');
        setTimeout(function(){window.location.reload();},2000);
      } else {
        toast('Reset error. Please try again.','bad');
      }
    });
  });
}

function openSectionReset(sectionKey,sectionLabel){
  var typed=(prompt('🗑 Clear '+sectionLabel+'?\n\nThis will permanently delete all records in this section.\nType  CLEAR  to confirm:')||'').trim();
  if(typed!=='CLEAR'){toast('Section clear cancelled','good');return;}
  toast('Clearing '+sectionLabel+'…','');
  sbCall('clearSection',{section:sectionKey,done_by:APP.name}).then(function(res){
    if(res&&res.success){
      toast(sectionLabel+' cleared successfully','good');
      var pageRefreshMap={
        orders:    function(){loadOrders(APP.currentOrderTab);loadToday();},
        stock_log: function(){loadStock('log');},
        crm:       function(){loadPeople(APP.currentPeopleTab);},
        audit:     function(){loadSettings('audit');},
        money:     function(){loadMoney();}
      };
      if(pageRefreshMap[sectionKey]) pageRefreshMap[sectionKey]();
    } else {
      toast('Could not clear section: '+(res.error||'unknown error'),'bad');
    }
  });
}

function switchSettingsTab(tab,btn){
  document.querySelectorAll('#page-settings .tab').forEach(function(t){t.classList.remove('active');});
  btn.classList.add('active'); loadSettings(tab);
}

function editSetting(key,currentVal){
  var newVal=prompt('Update "'+key+'":\nCurrent value: '+currentVal,currentVal);
  if(newVal===null||newVal===currentVal) return;
  sbCall('updateSetting',{key:key,value:newVal,done_by:APP.name}).then(function(res){
    if(res.success){toast('Setting updated!','good');loadSettings('general');}
    else toast('Error: '+(res.error||''),'bad');
  });
}

function submitPasswordChange(){
  var nw=document.getElementById('cpw-new').value, cnf=document.getElementById('cpw-confirm').value;
  if(!nw||!cnf){toast('Please fill in both fields','bad');return;}
  if(nw!==cnf){toast('New passwords do not match','bad');return;}
  if(nw.length<6){toast('Password must be at least 6 characters','bad');return;}
  sbCall('changeMasterPassword',{new_password:nw}).then(function(res){
    if(res.success){toast('Password changed successfully','good');['cpw-new','cpw-confirm'].forEach(function(id){document.getElementById(id).value='';});}
    else toast(res.error||'Could not change password','bad');
  });
}

function submitAddStaff(){
  var name=document.getElementById('sf-name').value.trim();
  var role=document.getElementById('sf-role').value;
  var email=document.getElementById('sf-email')?document.getElementById('sf-email').value.trim():'';
  var pin=document.getElementById('sf-pin').value.trim();
  if(!name||!pin){toast('Name and password are required','bad');return;}
  if(pin.length<6){toast('Password must be at least 6 characters','bad');return;}
  sbCall('addStaff',{name:name,role:role,email:email,pin:pin}).then(function(res){
    if(res.success){closeModal('modal-staff');toast(name+' added!','good');loadSettings('staff');document.getElementById('sf-name').value='';document.getElementById('sf-pin').value='';}
    else toast(res.error||'Error adding staff','bad');
  });
}

function deactivateStaff(id,name){
  if(!confirm('Remove '+name+' from staff? They will no longer be able to log in.')) return;
  sbCall('deactivateStaff',{staff_id:id}).then(function(res){
    if(res.success){toast(name+' removed','good');loadSettings('staff');} else toast('Error: '+(res.error||''),'bad');
  });
}

function doBackup(){
  var btn=document.querySelector('[onclick="doBackup()"]');
  if(btn){btn.disabled=true;btn.textContent='Backing up…';}
  sbCall('backupNow',{done_by:APP.name}).then(function(res){
    if(btn){btn.disabled=false;btn.textContent='💾 Back Up Now';}
    if(res.success){document.getElementById('backup-result').textContent='✓ Backup downloaded at '+res.stamp;toast('Backup complete!','good');}
    else toast('Backup failed: '+(res.error||''),'bad');
  }).catch(function(){if(btn){btn.disabled=false;btn.textContent='💾 Back Up Now';}toast('Connection error during backup','bad');});
}

// ── SHARED HELPERS ────────────────────────────────────────────────────────────

function renderSimpleTable(rows,cols,labels){
  if(!rows.length) return '<div class="data-table-wrap"><div class="empty-msg">No records yet.</div></div>';
  var html='<div class="data-table-wrap"><table class="data-table"><thead><tr>';
  (labels||cols).forEach(function(l){html+='<th>'+esc(l)+'</th>';});
  html+='</tr></thead><tbody>';
  rows.forEach(function(r){
    html+='<tr>';
    cols.forEach(function(c){
      var val=r[c]; if(val instanceof Date) val=val.toLocaleDateString('en-NG');
      html+='<td>'+esc(String(val||''))+'</td>';
    });
    html+='</tr>';
  });
  return html+'</tbody></table></div>';
}

function initials(name){ var p=String(name||'').trim().split(/\s+/); return ((p[0]?p[0][0]:'')+(p[1]?p[1][0]:'')).toUpperCase(); }
