// OA Shop Book — shop2.js  v3.3 Final
// Items in Shop, My Stock, People Asking, Customers, Money Records, Settings

// ── ITEMS IN SHOP ─────────────────────────────────────────────────────────────

function loadItems(){
  var el=document.getElementById('items-body');
  el.innerHTML='<div class="loading-msg">Loading items…</div>';
  call('getProducts').then(function(res){
    if(!res.success){el.innerHTML='<div class="loading-msg">Error loading items.</div>';return;}
    APP.allProducts=res.data||[];
    var active=APP.allProducts.filter(function(p){return String(p.active)==='TRUE';});
    var hidden=APP.allProducts.filter(function(p){return String(p.active)!=='TRUE';});
    if(!APP.allProducts.length){el.innerHTML='<div class="empty-msg">No items yet. Add your first item above.</div>';return;}
    // Search bar (Kimi image 9)
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

// Item card with category badge + YOUR COST and DIRECT prices (Kimi image 9)
function itemCard(p,isHidden){
  var stock=parseInt(p.stock_qty)||0;
  var low=stock<(parseInt(p.low_stock_alert)||20);
  var catBadge=p.category==='Drinks'?'DRINKS':p.category==='Snacks'?'SNACKS':'OTHER';
  var imgSrc=(p.image_file||'').trim();
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
      document.getElementById('pf-name').value=p.name||''; document.getElementById('pf-cat').value=p.category||'Drinks';
      document.getElementById('pf-cost').value=p.cost_price||''; document.getElementById('pf-consumer').value=p.consumer_price||'';
      document.getElementById('pf-retail').value=p.retail_price||''; document.getElementById('pf-wholesale').value=p.wholesale_price||'';
      document.getElementById('pf-stock').value=p.stock_qty||''; document.getElementById('pf-alert').value=p.low_stock_alert||'20';
      document.getElementById('pf-img').value=p.image_file||''; document.getElementById('pf-desc').value=p.description||'';
    }
  }
  document.getElementById('modal-product').classList.remove('hidden');
}

function submitProduct(){
  var id=document.getElementById('pf-id').value;
  var payload={id:id,name:document.getElementById('pf-name').value.trim(),category:document.getElementById('pf-cat').value,
    cost_price:document.getElementById('pf-cost').value,consumer_price:document.getElementById('pf-consumer').value,
    retail_price:document.getElementById('pf-retail').value,wholesale_price:document.getElementById('pf-wholesale').value,
    stock_qty:document.getElementById('pf-stock').value,low_stock_alert:document.getElementById('pf-alert').value,
    image_file:document.getElementById('pf-img').value.trim(),description:document.getElementById('pf-desc').value.trim(),done_by:APP.name};
  if(!payload.name){toast('Item name is required','bad');return;}
  // Fix 2: reject negative values in all price/cost fields
  var priceFields=[
    {key:'cost_price',label:'Buying price'},
    {key:'consumer_price',label:'Direct customer price'},
    {key:'retail_price',label:'Small shops price'},
    {key:'wholesale_price',label:'Wholesaler price'}
  ];
  for(var i=0;i<priceFields.length;i++){
    var v=parseFloat(payload[priceFields[i].key]);
    if(payload[priceFields[i].key]!=='' && (isNaN(v)||v<0)){
      toast(priceFields[i].label+' cannot be negative','bad'); return;
    }
  }
  if(payload.stock_qty!=='' && parseFloat(payload.stock_qty)<0){toast('Stock quantity cannot be negative','bad');return;}
  var action=id==='NEW'?'addProduct':'updateProduct';
  call(action,payload).then(function(res){
    if(res.success){closeModal('modal-product');toast(id==='NEW'?'Item added!':'Item updated!','good');loadItems();loadToday();}
    else toast('Error: '+(res.error||''),'bad');
  });
}

function hideItem(id){
  if(!confirm('Hide this item? It will no longer show on your public site. You can show it again anytime.')) return;
  call('hideProduct',{id:id,done_by:APP.name}).then(function(res){
    if(res.success){toast('Item hidden','good');loadItems();} else toast('Error: '+(res.error||''),'bad');
  });
}
function showItemAgain(id){
  call('updateProduct',{id:id,active:'TRUE',done_by:APP.name}).then(function(res){
    if(res.success){toast('Item is showing again','good');loadItems();} else toast('Error: '+(res.error||''),'bad');
  });
}

// ── MY STOCK ──────────────────────────────────────────────────────────────────

function loadStock(tab){
  APP.currentStockTab=tab||APP.currentStockTab;
  var el=document.getElementById('stock-body');
  el.innerHTML='<div class="loading-msg">Loading…</div>';
  if(APP.currentStockTab==='levels'){
    call('getProducts').then(function(res){
      if(!res.success){el.innerHTML='<div class="loading-msg">Error.</div>';return;}
      var active=(res.data||[]).filter(function(p){return String(p.active)==='TRUE';});
      if(!active.length){el.innerHTML='<div class="empty-msg">No active items.</div>';return;}
      // Stock cards with GRADE/LOW STOCK badge, ESTIMATED WORTH and direct +/- (Kimi image 12)
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
          '<div class="scv2-qty'+(low?' low':'')+'">'+stock+'<span class="scv2-unit"> packs</span></div>' +
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
    call('getBatchRecords').then(function(res){
      el.innerHTML=renderSimpleTable(res.data||[],['id','made_on','product_name','qty_made','expires_on','batch_note'],['Batch ID','Made On','Item','Qty Made','Expires On','Note']);
    });
  } else {
    call('getStockLog').then(function(res){
      el.innerHTML=renderSimpleTable(res.data||[],['when','product_name','change_qty','reason','recorded_by','stock_before','stock_after'],['When','Item','Change','Reason','Done By','Before','After']);
    });
  }
}

// Direct quick stock change from card (Kimi image 12)
function quickStockChange(pid,dir,name,current){
  var qty=parseInt(prompt((dir==='in'?'Add how many packs of ':'Remove how many packs of ')+name+'? (Current: '+current+')'));
  if(!qty||qty<=0) return;
  if(qty>50){
    var newT=dir==='in'?current+qty:current-qty;
    if(!confirm('You are '+(dir==='in'?'adding':'removing')+' '+qty+' packs of '+name+'.\n\nYour current stock is '+current+'.\nAfter this, you will have '+newT+' packs.\n\nIs this correct?')) return;
  }
  var reason=prompt('Reason for this change:') || 'Manual adjustment';
  call('adjustStock',{product_id:pid,change_qty:dir==='in'?qty:-qty,reason:reason,done_by:APP.name}).then(function(res){
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
  call('adjustStock',{product_id:pid,change_qty:dir==='in'?qty:-qty,reason:reason,done_by:APP.name}).then(function(res){
    if(res.success){closeModal('modal-stock');toast('Stock updated. New total: '+res.after,'good');loadStock('levels');loadToday();}
    else toast('Error: '+(res.error||''),'bad');
  });
}

function openBatchForm(){
  var sel=document.getElementById('bf-product'); sel.innerHTML='';
  call('getProducts').then(function(res){
    (res.data||[]).filter(function(p){return String(p.active)==='TRUE';}).forEach(function(p){
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
  call('logBatch',{product_id:pid,qty_made:qty,expires_on:expiry,batch_note:note,done_by:APP.name}).then(function(res){
    if(res.success){closeModal('modal-batch');toast('Batch recorded! Stock updated.','good');loadStock('levels');loadToday();}
    else toast('Error: '+(res.error||''),'bad');
  });
}

// ── PEOPLE ASKING ─────────────────────────────────────────────────────────────

function loadPeople(tab){
  APP.currentPeopleTab=tab||APP.currentPeopleTab;
  var el=document.getElementById('people-body');
  el.innerHTML='<div class="loading-msg">Loading…</div>';
  var actionMap={retail:'getRetailClients',wholesale:'getWholesaleClients',distributor:'getDistributors'};
  call(actionMap[APP.currentPeopleTab]).then(function(res){
    if(!res.success){el.innerHTML='<div class="loading-msg">Error.</div>';return;}
    var people=res.data||[];
    if(!people.length){el.innerHTML='<div class="card-list"><div class="empty-msg">Nobody here yet.</div></div>';return;}
    // Update subtitle count (Kimi image 10)
    var subEl=document.getElementById('people-subtitle');
    if(subEl) subEl.textContent='Managing '+people.length+' active '+(tab==='retail'?'small shop':tab==='wholesale'?'wholesale':tab)+' conversations';
    var html='<div class="card-list">';
    people.forEach(function(c){
      var name=c.contact_name||c.name||'';
      var biz=c.shop_name||c.business_name||'';
      var owes=parseFloat(c.balance_owed)||0;
      var stage=c.where_we_are||'still_talking';
      var stageCls='stage-'+stage.replace(/_/g,'-');
      // Avatar initials (Kimi image 10)
      var av=initials(name);
      var avColour=stage==='ready_to_buy'?'var(--accent2)':stage==='not_interested'?'var(--text3)':'var(--accent)';
      var cleanPhone=String(c.phone||'').replace(/\D/g,'');
      if(cleanPhone.startsWith('0')) cleanPhone='234'+cleanPhone.slice(1);
      html+='<div class="people-card">';
      // Card header
      html+='<div class="pcard-head">';
      html+='<div class="pcard-avatar" style="background:'+avColour+'">'+esc(av||'?')+'</div>';
      html+='<div class="pcard-info"><div class="pcard-id">ID: #'+esc(c.id||'')+'</div><div class="pcard-name">'+esc(name)+'</div>'+(biz?'<div class="pcard-biz">'+esc(biz)+'</div>':'')+'</div>';
      html+='<span class="people-stage-badge '+stageCls+'">'+stageLabel(stage)+'</span>';
      html+='</div>';
      // Details
      if(c.state||c.lga) html+='<div class="pcard-detail">📍 '+esc(c.lga||''+(c.lga&&c.state?', ':'')+c.state)+'</div>';
      if(c.interest||c.packs_requested) html+='<div class="pcard-detail">🧺 '+esc(c.interest||c.packs_requested||'')+'</div>';
      // Follow-up date with Edit (Kimi image 10)
      if(c.remind_me_on){
        html+='<div class="pcard-followup"><span>🔔 Follow up: '+esc(String(c.remind_me_on))+'</span><button class="pcard-edit-date" onclick="openPeopleModal(\''+esc(c.id)+'\',\''+APP.currentPeopleTab+'\',\''+stage+'\')">EDIT DATE</button></div>';
      }
      if(owes>0) html+='<div class="pcard-owes">💳 Owes you: ₦'+fmt(owes)+'</div>';
      // 3 action buttons: UPDATE | WHATSAPP | RECORD (Kimi image 10)
      html+='<div class="pcard-actions">';
      html+='<button class="pcard-btn pcard-update" onclick="openPeopleModal(\''+esc(c.id)+'\',\''+APP.currentPeopleTab+'\',\''+stage+'\')">⇄ UPDATE</button>';
      html+='<a class="pcard-btn pcard-wa" href="https://wa.me/'+cleanPhone+'" target="_blank">💬 WHATSAPP</a>';
      html+='<button class="pcard-btn pcard-record'+(owes<=0?' disabled':'\"')+'" onclick="'+(owes>0?'openPaymentModal(\''+esc(c.id)+'\',\''+APP.currentPeopleTab+'\',\''+esc(name)+'\','+owes+')':'toast(\'No balance to record\',\'bad\')')+'">💰 RECORD</button>';
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
  call('updateClientStatus',{
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
  document.getElementById('pay-client-id').value=clientId; document.getElementById('pay-sheet').value=sheet;
  document.getElementById('pay-sub').textContent=name+' currently owes ₦'+fmt(owes);
  document.getElementById('pay-amount').value='';
  document.getElementById('modal-payment').classList.remove('hidden');
}

function submitPayment(){
  var amount=parseFloat(document.getElementById('pay-amount').value)||0;
  if(!amount||amount<=0){toast('Please enter a valid amount','bad');return;}
  call('recordPayment',{client_id:document.getElementById('pay-client-id').value,client_sheet:document.getElementById('pay-sheet').value,amount:amount,done_by:APP.name}).then(function(res){
    if(res.success){
      closeModal('modal-payment');
      toast(res.status==='paid_in_full'?'Payment recorded. Fully paid!':'Payment recorded. Still owes ₦'+fmt(res.still_owes),'good');
      loadPeople(APP.currentPeopleTab);
    } else toast('Error: '+(res.error||''),'bad');
  });
}

// ── MY CUSTOMERS ──────────────────────────────────────────────────────────────

function loadCustomers(){
  var el=document.getElementById('customers-body');
  el.innerHTML='<div class="loading-msg">Loading customers…</div>';
  call('getCustomers').then(function(res){
    if(!res.success){el.innerHTML='<div class="loading-msg">Error.</div>';return;}
    var customers=(res.data||[]).sort(function(a,b){return (parseFloat(b.total_spent)||0)-(parseFloat(a.total_spent)||0);});
    if(!customers.length){el.innerHTML='<div class="empty-msg">No customers yet. Confirm orders to build your customer list.</div>';return;}
    var html='<div class="customers-subtitle">Ranking by total lifetime spend</div><div class="card-list">';
    customers.forEach(function(c,i){
      var rank=i+1, isTop=rank<=3;
      var cleanPhone=String(c.phone||'').replace(/\D/g,'');
      if(cleanPhone.startsWith('0')) cleanPhone='234'+cleanPhone.slice(1);
      if(isTop){
        // Expanded top-3 card (Kimi image 13)
        var rankColors=['var(--accent)','#6b7280','#d97706'];
        html+='<div class="cust-card-top">';
        html+='<div class="cust-top-head"><div class="cust-rank-badge" style="background:'+rankColors[i]+'">'+rank+'</div>';
        html+='<div class="cust-top-info"><div class="cust-name">'+esc(c.name||'')+'</div><div class="cust-meta">'+esc(c.state||'')+(c.lga?', '+esc(c.lga):'')+'</div></div>';
        html+=(cleanPhone?'<a class="btn-wa" style="padding:6px 14px;font-size:12px;text-decoration:none;font-weight:700" href="https://wa.me/'+cleanPhone+'" target="_blank">💬 WhatsApp</a>':'');
        html+='</div>';
        html+='<div class="cust-top-stats"><div class="cust-stat"><div class="cust-stat-label">TOTAL SPENT</div><div class="cust-stat-val accent">₦'+fmt(c.total_spent)+'</div></div><div class="cust-stat"><div class="cust-stat-label">ORDERS</div><div class="cust-stat-val">'+esc(String(c.total_orders||0))+'</div></div></div>';
        if(c.phone) html+='<div class="cust-phone">📞 '+esc(c.phone||'')+'</div>';
        html+='</div>';
      } else {
        // Compact row (Kimi image 13)
        html+='<div class="cust-card-compact">';
        html+='<div class="cust-rank-num">'+rank+'</div>';
        html+='<div class="cust-compact-info"><div class="cust-name">'+esc(c.name||'')+'</div><div class="cust-meta">'+esc(c.state||'')+'</div></div>';
        html+='<div class="cust-compact-right"><div class="cust-spent-compact">'+fmtK(c.total_spent)+'</div><div class="cust-orders-compact">'+esc(String(c.total_orders||0))+' orders</div></div>';
        html+='</div>';
      }
    });
    html+='</div>';
    html+=renderSimpleTable(customers,['name','phone','state','total_orders','total_spent','heard_from','last_order'],['Name','Phone','State','Orders','Total Spent','How They Found Us','Last Order']);
    el.innerHTML=html;
  }).catch(function(){el.innerHTML='<div class="loading-msg">Connection issue.</div>';});
}

function fmtK(v){ var n=parseFloat(v)||0; if(n>=1000000) return '₦'+(n/1000000).toFixed(1)+'M'; if(n>=1000) return '₦'+(n/1000).toFixed(0)+'k'; return '₦'+(n).toLocaleString('en-NG'); }

// ── MONEY RECORDS ─────────────────────────────────────────────────────────────

function loadMoney(){
  if(APP.role!=='master') return;
  var el=document.getElementById('money-body'), sum=document.getElementById('money-summary');
  el.innerHTML='<div class="loading-msg">Loading money records…</div>';
  call('getMoneyRecords').then(function(res){
    if(!res.success){el.innerHTML='<div class="loading-msg">Error.</div>';return;}
    var rows=res.data||[];
    var totIn=0,totCost=0,totProfit=0,totSpoil=0,thisMonth=0,lastMonth=0;
    var now=new Date();
    var thisMK=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
    var lastMD=new Date(now.getFullYear(),now.getMonth()-1,1);
    var lastMK=lastMD.getFullYear()+'-'+String(lastMD.getMonth()+1).padStart(2,'0');
    rows.forEach(function(r){
      var amt=parseFloat(r.total_collected)||0;
      totIn+=amt; totCost+=parseFloat(r.total_cost)||0; totProfit+=parseFloat(r.final_profit)||0; totSpoil+=parseFloat(r.spoilage_loss)||0;
      if(r.month===thisMK) thisMonth+=amt;
      if(r.month===lastMK) lastMonth+=amt;
    });
    var chgPct=lastMonth>0?Math.round(((thisMonth-lastMonth)/lastMonth)*100):0;
    var chgSign=chgPct>0?'+':''; var spoilPct=totIn>0?Math.round((totSpoil/totIn)*100):0;
    // Fix 1c: single compact totals strip — no competing hero cards
    sum.innerHTML=
      '<div class="money-totals-strip">'+
        '<div class="mts-item"><div class="mts-label">TOTAL PROFIT</div>'+
          '<div class="mts-val '+(totProfit>=0?'profit-pos':'profit-neg')+'">₦'+fmt(totProfit)+'</div></div>'+
        '<div class="mts-item"><div class="mts-label">THIS MONTH</div>'+
          '<div class="mts-val">₦'+fmt(thisMonth)+'</div>'+
          (chgPct!==0?'<div class="mts-change '+(chgPct>0?'pos':'neg')+'">'+chgSign+chgPct+'% vs last month</div>':'')+
        '</div>'+
        '<div class="mts-item"><div class="mts-label">LOST TO WASTE</div>'+
          '<div class="mts-val profit-neg">₦'+fmt(totSpoil)+'</div>'+
          (spoilPct>0?'<div class="mts-change neg">'+spoilPct+'% of revenue</div>':'')+
        '</div>'+
      '</div>';
    if(!rows.length){
      el.innerHTML='<div class="empty-msg">No records yet. Use the + button to add your first month.</div>';
      return;
    }
    // Recent Activity list + See All Records toggle (Kimi image 14)
    var recentRows=rows.slice().reverse().slice(0,5);
    el.innerHTML=
      '<div class="money-activity-header"><div class="money-activity-title">Recent Activity</div>'+
        '<button class="btn-main sm" onclick="toggleMoneyTable()">☰ See All Records</button>'+
      '</div>'+
      '<div class="money-activity-list">'+
        recentRows.map(function(r){
          var profit=parseFloat(r.final_profit)||0;
          var isProfit=profit>=0;
          return '<div class="mac-row">'+
            '<div class="mac-icon">'+(isProfit?'💰':'📉')+'</div>'+
            '<div class="mac-info"><div class="mac-name">'+esc(r.product_name||'')+'</div><div class="mac-meta">'+esc(r.month||'')+'</div></div>'+
            '<div class="mac-right"><div class="mac-val '+(isProfit?'profit-pos':'profit-neg')+'">'+(isProfit?'+':'−')+'₦'+fmt(Math.abs(profit))+'</div><div class="mac-tag">'+(isProfit?'PROFIT':'LOSS')+'</div></div>'+
          '</div>';
        }).join('')+
      '</div>'+
      '<div id="money-table-wrap" class="hidden">'+
        renderSimpleTable(rows,['month','product_name','packs_sold','total_collected','total_cost','gross_earnings','spoilage_loss','final_profit'],
          ['Month','Item','Packs Sold','Money In','Total Cost','Gross Earnings','Lost to Waste','Final Profit'])+
      '</div>'+
      // Master Insight panel (Kimi image 14)
      '<div class="master-insight-panel">'+
        '<div class="mip-head"><span class="mip-icon">⚙</span><span class="mip-label">MASTER INSIGHT</span></div>'+
        '<div class="mip-text">"'+buildInsight(rows,chgPct,totSpoil,totIn)+'"</div>'+
      '</div>';
  });
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
  var payload={month:document.getElementById('mf-month').value.trim(),product_name:document.getElementById('mf-product').value.trim(),
    packs_sold:document.getElementById('mf-packs').value,cost_per_pack:document.getElementById('mf-cost').value,
    sold_per_pack:document.getElementById('mf-sold').value,spoilt_packs:document.getElementById('mf-spoilt').value||'0',
    notes:document.getElementById('mf-notes').value.trim(),done_by:APP.name};
  if(!payload.month||!payload.product_name||!payload.packs_sold){toast('Month, item and packs sold are required','bad');return;}
  call('addMoneyRecord',payload).then(function(res){
    if(res.success){closeModal('modal-money');toast('Saved! Profit: ₦'+fmt(res.final_profit),'good');loadMoney();loadToday();}
    else toast('Error: '+(res.error||''),'bad');
  });
}

// ── SHOP SETTINGS ─────────────────────────────────────────────────────────────

function loadSettings(tab){
  APP.currentSettingsTab=tab||APP.currentSettingsTab;
  var el=document.getElementById('settings-body');
  el.innerHTML='<div class="loading-msg">Loading…</div>';
  if(tab==='general'){
    call('getSettings').then(function(res){
      if(!res.success){el.innerHTML='<div class="loading-msg">Error.</div>';return;}
      var s=res.data||{};
      var labels={business_name:'Shop / Brand Name',whatsapp_number:'WhatsApp Number for Orders',
        monthly_target:'Monthly Revenue Goal (₦)',low_stock_alert_level:'Alert Me When Stock Drops Below',
        bulk_discount_qty:'Bulk Deal: Minimum Packs',bulk_discount_pct:'Bulk Deal: Discount (%)',currency:'Currency'};
      var html='<div class="settings-block"><div class="settings-block-title">General Settings</div>';
      Object.keys(labels).forEach(function(key){
        html+='<div class="setting-row"><div><div class="setting-label-upper">'+esc(key.replace(/_/g,' ').toUpperCase())+'</div><div class="setting-val-bold">'+esc(String(s[key]||''))+'</div></div>'+
          '<button class="setting-edit-btn" onclick="editSetting(\''+key+'\',\''+esc(String(s[key]||'\'))\')">✏</button></div>';
      });
      // Danger Zone (Kimi image 11)
      html+='</div><div class="danger-zone-block"><div class="dz-icon">⚠</div><div class="dz-title">Danger Zone</div>'+
        '<div class="dz-desc">This will permanently delete all shop data including orders, items, and history.</div>'+
        '<button class="btn-danger dz-btn" onclick="confirmFactoryReset()">↺ Start Afresh — Factory Reset</button></div>';
      el.innerHTML=html;
    });
  }
  if(tab==='password'){
    el.innerHTML='<div class="settings-block"><div class="settings-block-title">Change Master Password</div>'+
      '<label class="field-label">Current Password</label><input type="password" id="cpw-current" class="field-input" placeholder="Your current password"/>'+
      '<label class="field-label">New Password</label><input type="password" id="cpw-new" class="field-input" placeholder="At least 4 characters"/>'+
      '<label class="field-label">Confirm New Password</label><input type="password" id="cpw-confirm" class="field-input" placeholder="Type new password again"/>'+
      '<div style="margin-top:16px"><button class="btn-main" onclick="submitPasswordChange()">Update Password</button></div></div>';
  }
  if(tab==='staff'){
    call('getStaffList').then(function(res){
      var staff=res.data||[];
      var html='<div class="settings-block"><div class="settings-block-title">Staff Logins</div>';
      if(!staff.length) html+='<div class="empty-msg" style="padding:20px 0">No staff logins yet.</div>';
      else staff.forEach(function(s){
        var active=String(s.active)==='TRUE';
        html+='<div class="staff-row"><div><div class="staff-name">'+esc(s.name||'')+(active?'':' (inactive)')+'</div><div class="staff-role">'+esc(s.role||'staff')+'</div></div>'+
          (active?'<div style="display:flex;gap:6px"><button class="btn-edit" onclick="resetStaffPin(\''+esc(s.id)+'\',\''+esc(s.name||'')+'\')">Reset PIN</button><button class="btn-fail" onclick="deactivateStaff(\''+esc(s.id)+'\',\''+esc(s.name||'')+'\')">Remove</button></div>':'<span style="font-size:12px;color:var(--text3)">Inactive</span>')+'</div>';
      });
      html+='</div><div style="margin-top:14px"><button class="btn-main" onclick="document.getElementById(\'modal-staff\').classList.remove(\'hidden\')">+ Add Staff Login</button></div>';
      el.innerHTML=html;
    });
  }
  if(tab==='backup'){
    el.innerHTML='<div class="settings-block"><div class="settings-block-title">Back Up Your Data</div>'+
      '<p style="font-size:14px;color:var(--text2);line-height:1.6;margin-bottom:16px">Tapping the button below saves a copy of all your important sheets inside your Google Sheet file.</p>'+
      '<button class="btn-main" onclick="doBackup()">💾 Back Up Now</button>'+
      '<div id="backup-result" style="margin-top:12px;font-size:13px;color:var(--text2)"></div></div>';
  }
  if(tab==='audit'){
    call('getAuditLog').then(function(res){
      var rows=(res.data||[]).slice().reverse().slice(0,100);
      el.innerHTML=renderSimpleTable(rows,['when','action','details','done_by'],['When','What Happened','Details','Done By']);
    });
  }
}

function confirmFactoryReset(){
  // Step 1 — warn clearly
  if(!confirm(
    '⚠️ FACTORY RESET — READ CAREFULLY\n\n' +
    'This will permanently clear ALL your shop data:\n' +
    '  • All orders (pending, confirmed, fell through)\n' +
    '  • All customers and CRM contacts\n' +
    '  • All stock records and batch logs\n' +
    '  • All money records and audit logs\n\n' +
    'Your product list and settings will be kept.\n\n' +
    'A backup will be saved first automatically.\n\n' +
    'Are you sure you want to continue?'
  )) { return; }

  // Step 2 — type DELETE to confirm
  var typed = (prompt('Type  DELETE  in capitals to confirm the factory reset:') || '').trim();
  if(typed !== 'DELETE') {
    toast('Factory reset cancelled — nothing was changed', 'good');
    return;
  }

  // Step 3 — backup first, then reset
  toast('Saving backup before reset…', '');
  call('backupNow', { done_by: APP.name }).then(function(backupRes) {
    var backupOk = backupRes && backupRes.success;
    call('factoryReset', { done_by: APP.name }).then(function(res) {
      if(res && res.success) {
        toast('Factory reset complete.' + (backupOk ? ' Backup saved at ' + res.stamp + '.' : ''), 'good');
        // Reload the page after 2 seconds so all sections refresh clean
        setTimeout(function() { window.location.reload(); }, 2000);
      } else {
        // Backend doesn't have factoryReset action yet — do client-side clear
        // Clear all offline queues and session data
        localStorage.removeItem('oa_sb_offline_queue');
        toast(
          '⚠ Your backend does not have a factoryReset action yet.\n' +
          'To complete this reset, clear your Google Sheets data manually.\n' +
          (backupOk ? 'Your backup was saved.' : ''),
          'bad'
        );
      }
    }).catch(function() {
      toast('Connection error during reset. Nothing was changed.', 'bad');
    });
  }).catch(function() {
    // Backup failed — still ask if they want to continue
    if(confirm('Could not save backup. Continue with reset anyway?')) {
      call('factoryReset', { done_by: APP.name }).then(function(res) {
        if(res && res.success) {
          toast('Factory reset complete.', 'good');
          setTimeout(function() { window.location.reload(); }, 2000);
        } else {
          toast('Backend reset action not available. Please clear sheets manually.', 'bad');
        }
      });
    }
  });
}

// ── SECTION RESET ─────────────────────────────────────────────────────────────
// Clear data in a specific section — master only, requires typed confirmation

function openSectionReset(sectionKey, sectionLabel, sheetNames) {
  var typed = (prompt(
    '🗑 Clear ' + sectionLabel + '?\n\n' +
    'This will permanently delete all records in this section.\n' +
    'Type  CLEAR  to confirm:'
  ) || '').trim();
  if(typed !== 'CLEAR') {
    toast('Section clear cancelled', 'good');
    return;
  }
  toast('Clearing ' + sectionLabel + '…', '');
  call('clearSection', {
    section: sectionKey,
    sheets:  sheetNames,
    done_by: APP.name
  }).then(function(res) {
    if(res && res.success) {
      toast(sectionLabel + ' cleared successfully', 'good');
      // Refresh the relevant page
      var pageRefreshMap = {
        orders:    function(){ loadOrders(APP.currentOrderTab); loadToday(); },
        stock_log: function(){ loadStock('log'); },
        crm:       function(){ loadPeople(APP.currentPeopleTab); },
        customers: function(){ loadCustomers(); },
        audit:     function(){ loadSettings('audit'); },
        money:     function(){ loadMoney(); }
      };
      if(pageRefreshMap[sectionKey]) pageRefreshMap[sectionKey]();
    } else {
      // Backend action not available — tell master what to do manually
      toast(
        'The clearSection action is not yet in your Apps Script.\n' +
        'Open your Google Sheet and delete the rows in: ' + sheetNames.join(', '),
        'bad'
      );
    }
  }).catch(function() {
    toast('Connection error. Nothing was cleared.', 'bad');
  });
}

function switchSettingsTab(tab,btn){
  document.querySelectorAll('#page-settings .tab').forEach(function(t){t.classList.remove('active');});
  btn.classList.add('active'); loadSettings(tab);
}
function editSetting(key,currentVal){
  var newVal=prompt('Update "'+key+'":\nCurrent value: '+currentVal,currentVal);
  if(newVal===null||newVal===currentVal) return;
  call('updateSetting',{key:key,value:newVal,done_by:APP.name}).then(function(res){
    if(res.success){toast('Setting updated!','good');loadSettings('general');}
    else toast('Error: '+(res.error||''),'bad');
  });
}
function submitPasswordChange(){
  var cur=document.getElementById('cpw-current').value, nw=document.getElementById('cpw-new').value, cnf=document.getElementById('cpw-confirm').value;
  if(!cur||!nw||!cnf){toast('Please fill in all three fields','bad');return;}
  if(nw!==cnf){toast('New passwords do not match','bad');return;}
  if(nw.length<4){toast('New password must be at least 4 characters','bad');return;}
  call('changeMasterPassword',{current_password:cur,new_password:nw}).then(function(res){
    if(res.success){toast('Password changed successfully','good');['cpw-current','cpw-new','cpw-confirm'].forEach(function(id){document.getElementById(id).value='';});}
    else toast(res.error||'Incorrect current password','bad');
  });
}
function submitAddStaff(){
  var name=document.getElementById('sf-name').value.trim(), role=document.getElementById('sf-role').value, pin=document.getElementById('sf-pin').value.trim();
  if(!name||!pin){toast('Name and PIN are required','bad');return;}
  if(pin.length<4){toast('PIN must be at least 4 characters','bad');return;}
  call('addStaff',{name:name,role:role,pin:pin}).then(function(res){
    if(res.success){closeModal('modal-staff');toast(name+' added!','good');loadSettings('staff');document.getElementById('sf-name').value='';document.getElementById('sf-pin').value='';}
    else toast(res.error||'Error adding staff','bad');
  });
}
function resetStaffPin(id,name){
  var newPin=prompt('Enter new PIN for '+name+' (minimum 4 characters):');
  if(!newPin||newPin.length<4) return;
  call('updateStaffPin',{staff_id:id,new_pin:newPin}).then(function(res){
    if(res.success) toast('PIN updated for '+name,'good'); else toast('Error: '+(res.error||''),'bad');
  });
}
function deactivateStaff(id,name){
  if(!confirm('Remove '+name+' from staff? They will no longer be able to log in.')) return;
  call('deactivateStaff',{staff_id:id}).then(function(res){
    if(res.success){toast(name+' removed','good');loadSettings('staff');} else toast('Error: '+(res.error||''),'bad');
  });
}
function doBackup(){
  var btn=document.querySelector('[onclick="doBackup()"]');
  if(btn){btn.disabled=true;btn.textContent='Backing up…';}
  call('backupNow',{done_by:APP.name}).then(function(res){
    if(btn){btn.disabled=false;btn.textContent='💾 Back Up Now';}
    if(res.success){document.getElementById('backup-result').textContent='✓ Backup saved at '+res.stamp;toast('Backup complete!','good');}
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

function initials(name){ var p=String(name||'').trim().split(/\s+/); return ((p[0]?p[0][0]:'')+( p[1]?p[1][0]:'')).toUpperCase(); }
