var OA_BIZ_API_URL = 'https://script.google.com/macros/s/AKfycbw9FhogzY47oLdZJXXngJC6izqnSilOgCSo6l3MYcGOKmWs1ZdYUkjCQK6oBr2_LTVnIQ/exec';

const bizLocationData = {
    "Abia": ["Aba North", "Aba South", "Arochukwu", "Bende", "Ikwuano", "Isiala Ngwa North", "Isiala Ngwa South", "Isuikwuato", "Obi Ngwa", "Ohafia", "Osisioma", "Ugwunagbo", "Ukwa East", "Ukwa West", "Umuahia North", "Umuahia South", "Umunneochi"],
    "Adamawa": ["Demsa", "Fufure", "Ganye", "Gayuk", "Gombi", "Girei", "Hong", "Jada", "Lamurde", "Madagali", "Maiha", "Mayo Belwa", "Michika", "Mubi North", "Mubi South", "Numan", "Shelleng", "Song", "Toungo", "Yola North", "Yola South"],
    "Akwa Ibom": ["Abak", "Eastern Obolo", "Eket", "Esit Eket", "Essien Udim", "Etim Ekpo", "Etinan", "Ibeno", "Ibesikpo Asutan", "Ibiono-Ibom", "Ika", "Ikono", "Ikot Abasi", "Ikot Ekpene", "Ini", "Itu", "Mbo", "Mkpat-Enin", "Nsit-Atai", "Nsit-Ibom", "Nsit-Ubium", "Obot Akara", "Okobo", "Onna", "Oron", "Oruk Anam", "Udung-Uko", "Ukanafun", "Uruan", "Urue-Offong/Oruko", "Uyo"],
    "Anambra": ["Aguata", "Anambra East", "Anambra West", "Anaocha", "Awka North", "Awka South", "Ayamelum", "Dunukofia", "Ekwusigo", "Idemili North", "Idemili South", "Ihiala", "Njikoka", "Nnewi North", "Nnewi South", "Ogbaru", "Onitsha North", "Onitsha South", "Orumba North", "Orumba South", "Oyi"],
    "Bauchi": ["Alkaleri", "Bauchi", "Bogoro", "Damban", "Darazo", "Dass", "Gamawa", "Ganjuwa", "Giade", "Itas/Gadau", "Jama'are", "Katagum", "Kirfi", "Misau", "Ningi", "Shira", "Tafawa Balewa", "Toro", "Warji", "Zaki"],
    "Bayelsa": ["Brass", "Ekeremor", "Kolokuma/Opokuma", "Nembe", "Ogbia", "Sagbama", "Southern Ijaw", "Yenagoa"],
    "Benue": ["Ado", "Agatu", "Apa", "Buruku", "Gboko", "Guma", "Gwer East", "Gwer West", "Katsina-Ala", "Konshisha", "Kwande", "Logo", "Makurdi", "Obi", "Ogbadibo", "Ohimini", "Oju", "Okpokwu", "Otukpo", "Tarka", "Ukum", "Ushongo", "Vandeikya"],
    "Borno": ["Abadam", "Askira/Uba", "Bama", "Bayo", "Biu", "Chibok", "Damboa", "Dikwa", "Gubio", "Guzamala", "Gwoza", "Hawul", "Jere", "Kaga", "Kala/Balge", "Konduga", "Kukawa", "Kwaya Kusar", "Mafa", "Magumeri", "Maiduguri", "Marte", "Mobbar", "Monguno", "Ngala", "Nganzai", "Shani"],
    "Cross River": ["Abi", "Akamkpa", "Akpabuyo", "Bakassi", "Bekwarra", "Biase", "Boki", "Calabar Municipal", "Calabar South", "Etung", "Ikom", "Obanliku", "Obubra", "Obudu", "Odukpani", "Ogoja", "Yakuur", "Yala"],
    "Delta": ["Aniocha North", "Aniocha South", "Bomadi", "Burutu", "Ethiope East", "Ethiope West", "Ika North East", "Ika South", "Isoko North", "Isoko South", "Ndokwa East", "Ndokwa West", "Okpe", "Oshimili North", "Oshimili South", "Patani", "Sapele", "Udu", "Ughelli North", "Ughelli South", "Ukwuani", "Uvwie", "Warri North", "Warri South", "Warri South West"],
    "Ebonyi": ["Abakaliki", "Afikpo North", "Afikpo South", "Ebonyi", "Ezza North", "Ezza South", "Ikwo", "Ishielu", "Ivo", "Izzi", "Ohaozara", "Ohaukwu", "Onicha"],
    "Edo": ["Akoko-Edo", "Egor", "Esan Central", "Esan North-East", "Esan South-East", "Esan West", "Etsako Central", "Etsako East", "Etsako West", "Igueben", "Ikpoba Okha", "Oredo", "Orhionmwon", "Ovia North-East", "Ovia South-West", "Owan East", "Owan West", "Uhunmwonde"],
    "Ekiti": ["Ado Ekiti", "Efon", "Ekiti East", "Ekiti South-West", "Ekiti West", "Emure", "Gbonyin", "Ido Osi", "Ijero", "Ikere", "Ikole", "Ilejemeje", "Irepodun/Ifelodun", "Ise/Orun", "Moba", "Oye"],
    "Enugu": ["Aninri", "Awgu", "Enugu East", "Enugu North", "Enugu South", "Ezeagu", "Igbo Etiti", "Igbo Eze North", "Igbo Eze South", "Isi Uzo", "Nkanu East", "Nkanu West", "Nsukka", "Oji River", "Udenu", "Udi", "Uzo Uwani"],
    "FCT": ["Abaji", "Bwari", "Gwagwalada", "Kuje", "Kwali", "Municipal Area Council"],
    "Gombe": ["Akko", "Balanga", "Billiri", "Dukku", "Funakaye", "Gombe", "Kaltungo", "Kwami", "Nafada", "Shongom", "Yamaltu/Deba"],
    "Imo": ["Aboh Mbaise", "Ahiazu Mbaise", "Ehime Mbano", "Ezinihitte", "Ideato North", "Ideato South", "Ihitte/Uboma", "Ikeduru", "Isiala Mbano", "Isu", "Mbaitoli", "Ngor Okpala", "Njaba", "Nkwerre", "Nwangele", "Obowo", "Oguta", "Ohaji/Egbema", "Okigwe", "Orlu", "Orsu", "Oru East", "Oru West", "Owerri Municipal", "Owerri North", "Owerri West"],
    "Jigawa": ["Auyo", "Babura", "Biriniwa", "Birnin Kudu", "Buji", "Dutse", "Gagarawa", "Garki", "Gumel", "Guri", "Gwaram", "Gwiwa", "Hadejia", "Jahun", "Kafin Hausa", "Kaugama", "Kazaure", "Kiri Kasama", "Kiyawa", "Maigatari", "Malam Madori", "Miga", "Ringim", "Roni", "Sule Tankarkar", "Taura", "Yankwashi"],
    "Kaduna": ["Birnin Gwari", "Chikun", "Giwa", "Igabi", "Ikara", "Jaba", "Jema'a", "Kachia", "Kaduna North", "Kaduna South", "Kagarko", "Kajuru", "Kaura", "Kauru", "Kubau", "Kudan", "Lere", "Makarfi", "Sabon Gari", "Sanga", "Soba", "Zangon Kataf", "Zaria"],
    "Kano": ["Ajingi", "Albasu", "Bagwai", "Bebeji", "Bichi", "Bunkure", "Dala", "Dambatta", "Dawakin Kudu", "Dawakin Tofa", "Doguwa", "Fagge", "Gabasawa", "Garko", "Garun Mallam", "Gaya", "Gezawa", "Gwale", "Gwarzo", "Kabo", "Kano Municipal", "Karaye", "Kibiya", "Kiru", "Kumbotso", "Kunchi", "Kura", "Madobi", "Makoda", "Minjibir", "Nasarawa", "Rano", "Rimin Gado", "Rogo", "Shanono", "Sumaila", "Takai", "Tarauni", "Tofa", "Tsanyawa", "Tudun Wada", "Ungogo", "Warawa", "Wudil"],
    "Katsina": ["Bakori", "Batagarawa", "Batsari", "Baure", "Bindawa", "Charanchi", "Dandume", "Danja", "Dan Musa", "Daura", "Dutsi", "Dutsin Ma", "Faskari", "Funtua", "Ingawa", "Jibia", "Kafur", "Kaita", "Kankara", "Kankia", "Katsina", "Kurfi", "Kusada", "Mai'Adua", "Malumfashi", "Mani", "Mashi", "Matazu", "Musawa", "Rimi", "Sabuwa", "Safana", "Sandamu", "Zango"],
    "Kebbi": ["Aleiro", "Arewa Dandi", "Argungu", "Augie", "Bagudo", "Birnin Kebbi", "Bunza", "Dandi", "Fakai", "Gwandu", "Jega", "Kalgo", "Koko/Besse", "Maiyama", "Ngaski", "Sakaba", "Shanga", "Suru", "Wasagu/Danko", "Yauri", "Zuru"],
    "Kogi": ["Adavi", "Ajaokuta", "Ankpa", "Bassa", "Dekina", "Ibaji", "Idah", "Igalamela Odolu", "Ijumu", "Kabba/Bunu", "Kogi", "Lokoja", "Mopa Muro", "Ofu", "Ogori/Magongo", "Okehi", "Okene", "Olamaboro", "Omala", "Yagba East", "Yagba West"],
    "Kwara": ["Asa", "Baruten", "Edu", "Ekiti", "Ifelodun", "Ilorin East", "Ilorin South", "Ilorin West", "Irepodun", "Isin", "Kaiama", "Moro", "Offa", "Oke Ero", "Oyun", "Pategi"],
    "Lagos": ["Agege", "Ajeromi-Ifelodun", "Alimosho", "Amuwo-Odofin", "Apapa", "Badagry", "Epe", "Eti Osa", "Ibeju-Lekki", "Ifako-Ijaiye", "Ikeja", "Ikorodu", "Kosofe", "Lagos Island", "Lagos Mainland", "Mushin", "Ojo", "Oshodi-Isolo", "Shomolu", "Surulere"],
    "Nasarawa": ["Akwanga", "Awe", "Doma", "Karu", "Keana", "Keffi", "Kokona", "Lafia", "Nasarawa", "Nasarawa Egon", "Obi", "Toto", "Wamba"],
    "Niger": ["Agaie", "Agwara", "Bida", "Borgu", "Bosso", "Chanchaga", "Edati", "Gbako", "Gurara", "Katcha", "Kontagora", "Lapai", "Lavun", "Magama", "Mariga", "Mashegu", "Mokwa", "Moya", "Paikoro", "Rafi", "Rijau", "Shiroro", "Suleja", "Tafa", "Wushishi"],
    "Ogun": ["Abeokuta North", "Abeokuta South", "Ado-Odo/Ota", "Egbado North", "Egbado South", "Ewekoro", "Ifo", "Ijebu East", "Ijebu North", "Ijebu North East", "Ijebu Ode", "Ikenne", "Imeko Afon", "Ipokia", "Obafemi Owode", "Odeda", "Odogbolu", "Ogun Waterside", "Remo North", "Shagamu"],
    "Ondo": ["Akoko North-East", "Akoko North-West", "Akoko South-East", "Akoko South-West", "Akure North", "Akure South", "Ese Odo", "Idanre", "Ifedore", "Ilaje", "Ile Oluji/Okeigbo", "Irele", "Odigbo", "Okitipupa", "Ondo East", "Ondo West", "Ose", "Owo"],
    "Osun": ["Atakunmosa East", "Atakunmosa West", "Ayedaade", "Ayedire", "Boluwaduro", "Boripe", "Ede North", "Ede South", "Egbedore", "Ejigbo", "Ife Central", "Ife East", "Ife North", "Ife South", "Ifedayo", "Ifelodun", "Ila", "Ilesa East", "Ilesa West", "Irepodun", "Irewole", "Isokan", "Iwo", "Obokun", "Odo Otin", "Ola Oluwa", "Olorunda", "Oriade", "Orolu", "Osogbo"],
    "Oyo": ["Afijio", "Akinyele", "Atiba", "Atisbo", "Egbeda", "Ibadan North", "Ibadan North-East", "Ibadan North-West", "Ibadan South-East", "Ibadan South-West", "Ibarapa Central", "Ibarapa East", "Ibarapa North", "Ido", "Irepo", "Iseyin", "Itesiwaju", "iwajowa", "Kajola", "Lagelu", "Ogbomosho North", "Ogbomosho South", "Ogo Oluwa", "Olorunsogo", "Oluyole", "Ona Ara", "Orelope", "Ori Ire", "Oyo East", "Oyo West", "Saki East", "Saki West", "Surulere"],
    "Plateau": ["Barkin Ladi", "Bassa", "Bokkos", "Jos East", "Jos North", "Jos South", "Kanam", "Kanke", "Langtang North", "Langtang South", "Mangu", "Mikang", "Pankshin", "Qua'an Pan", "Riyom", "Shendam", "Wase"],
    "Rivers": ["Abua/Odual", "Ahoada East", "Ahoada West", "Akuku-Toru", "Andoni", "Asari-Toru", "Bonny", "Degema", "Eleme", "Emohua", "Etche", "Gokana", "Ikwerre", "Khana", "Obio/Akpor", "Ogba/Egbema/Ndoni", "Ogu/Bolo", "Okrika", "Omuma", "Opobo/Nkoro", "Oyigbo", "Port Harcourt", "Tai"],
    "Sokoto": ["Binji", "Bodinga", "Dange Shuni", "Gada", "Goronyo", "Gudu", "Gwadabawa", "Illela", "Isa", "Kebbe", "Kware", "Rabah", "Sabon Birni", "Shagari", "Silame", "Sokoto North", "Sokoto South", "Tambuwal", "Tangaza", "Tureta", "Wamako", "Wurno", "Yabo"],
    "Taraba": ["Ardo Kola", "Bali", "Donga", "Gashaka", "Gassol", "Ibi", "Jalingo", "Karim Lamido", "Kurmi", "Lau", "Sardauna", "Takum", "Ussa", "Wukari", "Yorro", "Zing"],
    "Yobe": ["Bade", "Bursari", "Damaturu", "Fika", "Fune", "Geidam", "Gujba", "Gulani", "Jakusko", "Karasuwa", "Machina", "Nangere", "Nguru", "Potiskum", "Tarmuwa", "Yunusari", "Yusufari"],
    "Zamfara": ["Anka", "Bakura", "Birnin Magaji/Kiyaw", "Bukkuyum", "Bungudu", "Chafe", "Gummi", "Gusau", "Kaura Namoda", "Maradun", "Maru", "Shinkafi", "Talata Mafara", "Zurmi"]
};

let selectedTier = 'retailer';
let currentQty = 0;
let pricePerPack = 9500;
const bizOrderRef = `OA-BIZ-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
let bizActiveState = '';
let bizSelectedSex = 'Male';
let bizSelectedPayment = 'Pay on Delivery';

document.addEventListener('DOMContentLoaded', () => {
    const receiptEl = document.getElementById('receipt-id');
    if (receiptEl) receiptEl.innerText = `ID: ${bizOrderRef}`;
    
    const modal = document.getElementById('checkout-modal');
    if (modal) {
        modal.addEventListener('click', e => {
            if (e.target === e.currentTarget) closeCheckoutModal();
        });
    }

    currentQty = 5;
    selectTier('retailer', true);  // silent — init, no toast

    // Init dropdowns once here — prevents duplicate listener stacking
    populateDropdowns();
});

window.selectTier = function(tier, silent = false) {
    selectedTier = tier;
    
    const cardRetail = document.getElementById('card-retailer');
    const cardWholesale = document.getElementById('card-wholesaler');
    
    if (cardRetail && cardWholesale) {
        cardRetail.classList.remove('active');
        cardWholesale.classList.remove('active');

        const badge = document.getElementById('tier-badge');
        const label = document.getElementById('calc-label');
        const moqText = document.getElementById('moq-text');
        const title = document.getElementById('receipt-title');

        if (tier === 'retailer') {
            cardRetail.classList.add('active');
            pricePerPack = 9500;
            if(badge) badge.innerText = "Retailer Tier";
            if(label) label.innerText = "Your Selling Price (Per Bottle)";
            if(moqText) moqText.innerHTML = "<i>Range: 5–9 Packs &nbsp;&bull;&nbsp; 1 pack = 12 bottles</i>";
            if(title) title.innerText = "RETAILER INVOICE QUOTE";
            // Enforce retailer minimum
            if (currentQty < 5) {
                currentQty = 5;
                if (!silent) showToast('Minimum 5 packs for Retailer tier');
            }
        } else {
            cardWholesale.classList.add('active');
            pricePerPack = 9000;
            if(badge) badge.innerText = "Wholesale Tier";
            if(label) label.innerText = "Your Selling Price (Per Pack)";
            if(moqText) moqText.innerHTML = "<i>Minimum Order: 10 Packs</i>";
            if(title) title.innerText = "WHOLESALE INVOICE QUOTE";
            // Enforce wholesale minimum
            if (currentQty < 10) {
                currentQty = 10;
                if (!silent) showToast('Minimum 10 packs for Wholesale tier');
            }
        }
    }
    
    const qtyDisplay = document.getElementById('wholesale-qty');
    if(qtyDisplay) qtyDisplay.innerText = currentQty;

    // Update profit hook message per tier
    const hookEl = document.getElementById('brand-hook-msg');
    if (hookEl) {
        hookEl.textContent = tier === 'retailer'
            ? '5 packs = 60 bottles. Price each at ₦1,200 and pocket ₦24,500 profit before your next order arrives. One stock, one weekend, done.'
            : '10 packs at ₦90,000. Move them to your sub-dealers at ₦13,000 each — ₦40,000 margin, clean. Volume is where the real business happens.';
    }

    calculateProfit();
    renderBizBar();
}

window.updateStock = function(change) {
    let newQty = Math.max(0, currentQty + change);
    currentQty = newQty;
    const qtyDisplay = document.getElementById('wholesale-qty');
    if(qtyDisplay) qtyDisplay.innerText = currentQty;

    if (currentQty >= 10 && selectedTier === 'retailer') {
        selectTier('wholesaler');
        showToast('Switched to Wholesale Pricing!');
    } else if (currentQty <= 9 && currentQty > 0 && selectedTier === 'wholesaler') {
        selectTier('retailer');
        showToast('Switched to Retailer Pricing');
    }

    calculateProfit();
    renderBizBar();
}

let calculateProfitDebounce;
window.calculateProfit = function() {
    clearTimeout(calculateProfitDebounce);
    calculateProfitDebounce = setTimeout(() => {
        const saleInput = document.getElementById('sale-price');
        const salePrice = saleInput ? (parseFloat(saleInput.value) || 0) : 0;
        const totalCost = currentQty * pricePerPack;
        
        let totalRevenue = 0;
        if (selectedTier === 'retailer') {
            totalRevenue = (salePrice * 12) * currentQty;
        } else {
            totalRevenue = salePrice * currentQty;
        }

        const profit = Math.max(0, totalRevenue - totalCost);

        const costEl = document.getElementById('r-cost');
        const revEl = document.getElementById('r-rev');
        const profitEl = document.getElementById('r-profit');

        if (costEl) costEl.innerText = `₦${totalCost.toLocaleString()}`;
        if (revEl) revEl.innerText = `₦${totalRevenue.toLocaleString()}`;
        if (profitEl) profitEl.innerText = `₦${profit.toLocaleString()}`;
    }, 300);
}

window.renderBizBar = function() {
    const bar = document.getElementById('biz-bar');
    if (!bar) return;

    if (currentQty > 0) {
        bar.classList.add('active');

        const qtyEl = document.getElementById('biz-qty-count');
        const totalEl = document.getElementById('biz-total-amount');
        if (qtyEl) qtyEl.textContent = currentQty;
        if (totalEl) totalEl.textContent = `₦${(currentQty * pricePerPack).toLocaleString()}`;

        // Lock/unlock checkout button based on minimum order
        const min = (selectedTier === 'retailer') ? 5 : 10;
        const cta = document.getElementById('biz-checkout-cta');
        if (cta) {
            if (currentQty < min) {
                cta.classList.add('locked');
                cta.innerHTML = `Add ${min - currentQty} more pack${min - currentQty > 1 ? 's' : ''} to unlock
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
            } else {
                cta.classList.remove('locked');
                cta.innerHTML = `Request Supply
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
            }
        }
    } else {
        bar.classList.remove('active');
    }
}

window.hideBizBar = function() {
    const bar = document.getElementById('biz-bar');
    if (bar) bar.classList.remove('active');
}

window.copyReceipt = function() {
    const text = `${document.getElementById('receipt-title').innerText}\nID: ${bizOrderRef}\nQty: ${currentQty} Packs\nCost: ${document.getElementById('r-cost').innerText}\nProfit: ${document.getElementById('r-profit').innerText}`;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Quote Copied to Clipboard!');
    });
}

function showToast(message) {
    const existingToast = document.querySelector('.toast-popup');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-popup';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

window.openCheckoutModal = function() {
    const min = (selectedTier === 'retailer') ? 5 : 10;
    if (currentQty < min) {
        showToast(`Minimum order is ${min} packs`);
        return;
    }
    
    loadSavedData();

    const modal = document.getElementById('checkout-modal');
    const idEl = document.getElementById('modal-order-id');
    const timeEl = document.getElementById('modal-order-datetime');
    const list = document.getElementById('checkout-items-list');
    const totalEl = document.getElementById('checkout-total-amount');

    if(idEl) idEl.textContent = bizOrderRef;
    if(timeEl) timeEl.textContent = new Date().toLocaleString();

    if (list) {
        list.innerHTML = '';
        const itemTotal = currentQty * pricePerPack;
        
        const div = document.createElement('div');
        div.className = 'checkout-item';
        div.innerHTML = `
            <div class="checkout-item-left">
                <div>
                    <div class="checkout-item-name">${selectedTier === 'retailer' ? 'Retailer Bundle' : 'Wholesale Bundle'}</div>
                    <div class="checkout-item-qty">×${currentQty} Packs</div>
                </div>
            </div>
            <div class="checkout-item-price">₦${itemTotal.toLocaleString()}</div>
        `;
        list.appendChild(div);

        if(totalEl) totalEl.textContent = `₦${itemTotal.toLocaleString()}`;
    }

    // Reset popover inputs on each modal open
    const stateInput = document.getElementById('form-state');
    const lgaInput   = document.getElementById('form-lga');
    if (stateInput) stateInput.value = '';
    if (lgaInput)   lgaInput.value   = '';
    bizActiveState = '';
    ['biz-state-results','biz-lga-results'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('show'); el.style.display = 'none'; }
    });
    // Reset segmented controls to defaults
    bizSelectedSex = 'Male';
    bizSelectedPayment = 'Pay on Delivery';
    document.querySelectorAll('#biz-sex-seg .biz-segment-opt').forEach((el, i) => el.classList.toggle('active', i === 0));
    document.querySelectorAll('#biz-payment-seg .biz-segment-opt').forEach((el, i) => el.classList.toggle('active', i === 0));
    const hint = document.getElementById('payment-bank-hint');
    if (hint) hint.style.display = 'none';

    modal.classList.add('active');
    modal.style.display = 'flex';  // belt-and-suspenders: override any CSS cascade issue
    const bar = document.getElementById('biz-bar');
    if (bar) bar.classList.remove('active');
}

window.closeCheckoutModal = function() {
    const modal = document.getElementById('checkout-modal');
    if(modal) { modal.classList.remove('active'); modal.style.display = 'none'; }
    
    document.querySelectorAll('.shadcn-dropdown').forEach(d => d.classList.remove('open'));
    const hint = document.getElementById('payment-bank-hint');
    if (hint) hint.style.display = 'none';
    renderBizBar();
}

// ── Dropdown positioning helper ──────────────────────────────────────────
// Dropdowns live inside .checkout-scrollable which has overflow-y:auto.
// That overflow context clips absolutely-positioned children (the menus).
// Fix: anchor the open menu to position:fixed using the trigger's viewport rect,
// so it escapes the scroll container entirely and renders above everything.
function anchorMenuToTrigger(menu, trigger) {
    const rect = trigger.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top      = `${rect.bottom + 4}px`;
    menu.style.left     = `${rect.left}px`;
    menu.style.width    = `${rect.width}px`;
    menu.style.zIndex   = '10000';
    menu.style.maxHeight = '220px';
}
function releaseMenuAnchor(menu) {
    menu.style.position = '';
    menu.style.top      = '';
    menu.style.left     = '';
    menu.style.width    = '';
    menu.style.zIndex   = '';
    menu.style.maxHeight = '';
}

function closeAllDropdowns() {
    document.querySelectorAll('.shadcn-dropdown.open').forEach(d => {
        const m = d.querySelector('.shadcn-dropdown-menu');
        if (m) releaseMenuAnchor(m);
        d.classList.remove('open');
    });
}

function initDropdown(dropdownId, getItemsFn, onSelect) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    // Guard: skip re-attaching listeners if already initialized
    if (dropdown.dataset.initialized === 'true') return;
    dropdown.dataset.initialized = 'true';

    const trigger = dropdown.querySelector('.shadcn-dropdown-trigger');
    const menu    = dropdown.querySelector('.shadcn-dropdown-menu');
    const valueSpan = dropdown.querySelector('.selected-value');

    function populateMenu() {
        const items = getItemsFn();
        menu.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'shadcn-dropdown-item';
            div.textContent = item;
            div.dataset.value = item;
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                valueSpan.textContent = item;
                releaseMenuAnchor(menu);
                dropdown.classList.remove('open');
                if (onSelect) onSelect(item);
            });
            menu.appendChild(div);
        });
    }

    trigger.addEventListener('click', (e) => {
        if (trigger.disabled) return;
        e.stopPropagation();

        const isOpen = dropdown.classList.contains('open');

        // Close all others first
        closeAllDropdowns();

        if (!isOpen) {
            populateMenu();
            dropdown.classList.add('open');
            // Anchor AFTER adding open (so CSS opacity transition can still fire)
            anchorMenuToTrigger(menu, trigger);
        }
    });

    // Close on outside tap (works on both mouse and touch)
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !menu.contains(e.target)) {
            releaseMenuAnchor(menu);
            dropdown.classList.remove('open');
        }
    });
    document.addEventListener('touchstart', (e) => {
        if (!dropdown.contains(e.target) && !menu.contains(e.target)) {
            releaseMenuAnchor(menu);
            dropdown.classList.remove('open');
        }
    }, { passive: true });
}

function populateDropdowns() {
    // ── Popovers: close on outside click ─────────────────────────────────────
    document.addEventListener('click', (e) => {
        ['biz-state-results', 'biz-lga-results'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !e.target.closest(`[oninput*="handleBizSearch"]`) && !el.contains(e.target)) {
                el.classList.remove('show');
                el.style.display = 'none';
            }
        });
        // Legacy shadcn dropdowns (none remain but kept as guard)
        document.querySelectorAll('.shadcn-dropdown.open').forEach(d => {
            const m = d.querySelector('.shadcn-dropdown-menu');
            if (m) m.style.display = '';
            d.classList.remove('open');
        });
    });
}

// ── Phone formatter ──────────────────────────────────────────────────────────
function formatBizPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 7) {
        value = value.slice(0, 4) + ' ' + value.slice(4, 8) + ' ' + value.slice(8);
    } else if (value.length > 4) {
        value = value.slice(0, 4) + ' ' + value.slice(4);
    }
    input.value = value;
}

// ── Searchable popover — fixed positioning to escape overflow:auto container ─
function handleBizSearch(type, query) {
    const input = document.getElementById(`form-${type}`);
    const resultsDiv = document.getElementById(`biz-${type}-results`);
    resultsDiv.innerHTML = '';

    if (!query) { resultsDiv.classList.remove('show'); resultsDiv.style.display = 'none'; return; }

    // Position the popover over the input using fixed coordinates
    const rect = input.getBoundingClientRect();
    resultsDiv.style.top    = (rect.bottom + 3) + 'px';
    resultsDiv.style.left   = rect.left + 'px';
    resultsDiv.style.width  = rect.width + 'px';

    let items = [];
    if (type === 'state') {
        items = Object.keys(bizLocationData)
            .filter(s => s.toLowerCase().includes(query.toLowerCase()))
            .sort();
    } else if (type === 'lga' && bizActiveState) {
        items = bizLocationData[bizActiveState]
            .filter(r => r.toLowerCase().includes(query.toLowerCase()));
    }

    if (items.length > 0) {
        resultsDiv.classList.add('show');
        resultsDiv.style.display = 'block';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'popover-item';
            div.innerText = item;
            div.onmousedown = (e) => { e.preventDefault(); selectBizItem(type, item); };
            resultsDiv.appendChild(div);
        });
    } else {
        resultsDiv.classList.remove('show');
        resultsDiv.style.display = 'none';
    }
}

function selectBizItem(type, val) {
    document.getElementById(`form-${type}`).value = val;
    const resultsDiv = document.getElementById(`biz-${type}-results`);
    resultsDiv.classList.remove('show');
    resultsDiv.style.display = 'none';
    if (type === 'state') {
        bizActiveState = val;
        // Clear LGA when state changes
        const lgaInput = document.getElementById('form-lga');
        if (lgaInput) lgaInput.value = '';
    }
}

// ── Segmented control ────────────────────────────────────────────────────────
function selectBizSegment(type, value, el) {
    const parent = el.parentElement;
    parent.querySelectorAll('.biz-segment-opt').forEach(opt => opt.classList.remove('active'));
    el.classList.add('active');
    if (type === 'sex')     bizSelectedSex     = value;
    if (type === 'payment') {
        bizSelectedPayment = value;
        const hint = document.getElementById('payment-bank-hint');
        if (hint) hint.style.display = value === 'Pay Now' ? 'flex' : 'none';
    }
}

function loadSavedData() {
    try {
        const saved = JSON.parse(localStorage.getItem('oa_biz_user') || '{}');
        const shopInput = document.getElementById('form-shop-name');
        const addressInput = document.getElementById('form-address');
        const phoneInput = document.getElementById('form-phone');
        const contactInput = document.getElementById('form-contact-person');
        const dateInput = document.getElementById('form-date');
        const commentsInput = document.getElementById('form-comments');
        const stateInput = document.getElementById('form-state');
        const lgaInput   = document.getElementById('form-lga');

        if (shopInput && saved.shopName) shopInput.value = saved.shopName;
        if (addressInput && saved.address) addressInput.value = saved.address;
        if (phoneInput && saved.phone) phoneInput.value = saved.phone;
        if (contactInput && saved.contactPerson) contactInput.value = saved.contactPerson;
        if (dateInput && saved.preferredDate) dateInput.value = saved.preferredDate;
        if (commentsInput && saved.comments) commentsInput.value = saved.comments;
        if (stateInput && saved.state) {
            stateInput.value = saved.state;
            bizActiveState = saved.state;
        }
        if (lgaInput && saved.lga) lgaInput.value = saved.lga;
    } catch (e) {
        console.warn('Failed to load saved business data', e);
    }
}

window.processWhatsAppOrder = function() {
    const confirmBtn = document.querySelector('.checkout-confirm-btn');
    if (confirmBtn) {
        if (confirmBtn.disabled) return;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Preparing order…';
    }
    function restoreBtn() {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Complete Order';
        }
    }
    const shopName = document.getElementById('form-shop-name')?.value.trim() || '';
    const state = document.getElementById('form-state')?.value.trim() || '';
    const lga   = document.getElementById('form-lga')?.value.trim() || '';
    const contactPerson = document.getElementById('form-contact-person')?.value.trim() || '';
    const phone = document.getElementById('form-phone')?.value.replace(/\s/g, '').trim() || '';
    const preferredDate = document.getElementById('form-date')?.value || '';
    const address = document.getElementById('form-address')?.value.trim() || '';
    const comments = document.getElementById('form-comments')?.value.trim() || '';
    const payment = bizSelectedPayment;

    const phoneValid = /^\d{11}$/.test(phone) && phone.startsWith('0');
    if (!state || !lga || !address) {
        showToast('Please complete State, LGA and Delivery Address');
        restoreBtn(); return;
    }
    if (!phone || !phoneValid) {
        showToast('Enter a valid 11-digit Nigerian phone number');
        restoreBtn(); return;
    }

    let msg = `*New Wholesale Order ${bizOrderRef}*\n`;
    msg += `Date: ${new Date().toLocaleString()}\n\n`;
    
    msg += `*Business Details:*\n`;
    if (shopName) msg += `• Shop/Brand: ${shopName}\n`;
    msg += `• Location: ${address}, ${lga}, ${state}\n`;
    if (contactPerson) msg += `• Contact Person: ${contactPerson}\n`;
    msg += `• Phone: ${phone}\n`;
    if (preferredDate) msg += `• Preferred Date: ${preferredDate}\n`;
    if (comments) msg += `• Instructions: ${comments}\n`;
    msg += `• Payment Method: ${payment}\n\n`;

    msg += `*Order Summary:*\n`;
    msg += `• Tier: ${selectedTier === 'retailer' ? 'Retailer' : 'Wholesale'}\n`;
    msg += `• Quantity: ${currentQty} Packs\n`;
    msg += `• Total Cost: ₦${(currentQty * pricePerPack).toLocaleString()}\n\n`;

    msg += `Please confirm availability, delivery timeline, and next steps. Thank you!`;

    try {
        localStorage.setItem('oa_biz_user', JSON.stringify({
            shopName, address, phone, contactPerson,
            preferredDate, comments, state, lga: lga, sex: bizSelectedSex
        }));
    } catch (e) {}

    // Save to Business_Clients sheet silently before WhatsApp opens
    try {
        fetch(OA_BIZ_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'addLead',
                name: contactPerson || shopName || 'Unknown',
                phone: phone,
                email: '',
                bizName: shopName,
                state: state,
                lga: lga,
                type: selectedTier === 'retailer' ? 'retailer' : 'wholesale',
                interest: (selectedTier === 'retailer' ? 'Retailer' : 'Wholesale') + ' - ' + currentQty + ' packs @ N' + (currentQty * pricePerPack).toLocaleString(),
                referral_source: '',
                notes: comments || ''
            })
        }).catch(function() {});
    } catch(e) {}

    const waURL = `https://wa.me/2348140226282?text=${encodeURIComponent(msg)}`;
    const ctaBtn = document.getElementById('whatsapp-cta-btn');
    if (ctaBtn) ctaBtn.href = waURL;

    const checkoutModal = document.getElementById('checkout-modal');
    const successModal  = document.getElementById('success-modal');
    const bizBar = document.getElementById('biz-bar');
    if (checkoutModal) { checkoutModal.classList.remove('active'); checkoutModal.style.display = 'none'; }
    if (bizBar) { bizBar.classList.remove('active'); }
    if (successModal)  { successModal.classList.add('active'); successModal.style.display = 'flex'; }
}

window.handleWhatsAppSend = function() {
    setTimeout(() => {
        // Close success modal
        const successModal = document.getElementById('success-modal');
        if (successModal) { successModal.classList.remove('active'); successModal.style.display = 'none'; }

        // Reset all order state
        currentQty = 0;
        const qtyDisplay = document.getElementById('wholesale-qty');
        if (qtyDisplay) qtyDisplay.innerText = 0;
        const bizQtyCount = document.getElementById('biz-qty-count');
        if (bizQtyCount) bizQtyCount.textContent = '0';
        const bizTotalEl = document.getElementById('biz-total-amount');
        if (bizTotalEl) bizTotalEl.textContent = '₦0';

        // Reset sale price input
        const salePriceInput = document.getElementById('sale-price');
        if (salePriceInput) salePriceInput.value = '';

        // Reset receipt
        const costEl = document.getElementById('r-cost');
        const revEl  = document.getElementById('r-rev');
        const profitEl = document.getElementById('r-profit');
        if (costEl)   costEl.innerText   = '₦0';
        if (revEl)    revEl.innerText    = '₦0';
        if (profitEl) profitEl.innerText = '₦0';

        // Reset confirm button
        const confirmBtn = document.querySelector('.checkout-confirm-btn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Complete Order';
        }

        // Hide bar — no pending order
        renderBizBar();

        // Re-init to retailer tier (silent — post-order reset)
        currentQty = 5;
        selectTier('retailer', true);
    }, 600);
}