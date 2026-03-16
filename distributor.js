const nigerianData = {
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

let distQty      = 20;
const packPrice  = 6000;
const kitPrice   = 30000;
let selectedSex     = 'Male';
let selectedVehicle = 'No';
let activeState  = "";
let pendingWAMsg = "";
const trackingID = `OA-PART-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

// ── Sun / Moon SVGs for theme toggle ────────────────────────────────────────
const moonSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const sunSVG  = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

function updateThemeIcon() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    const isDark = document.body.classList.contains('dark-mode');
    toggle.innerHTML = isDark ? sunSVG : moonSVG;
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('dist-id').innerText = `ID: ${trackingID}`;
    loadSavedData();
    calculateDistTotal();
    document.getElementById('kit-toggle').checked = true;
    calculateDistTotal();

    // Set correct initial theme icon
    updateThemeIcon();

    // Patch index.js theme toggle to also swap icon
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            // index.js handles the class toggle — we just update icon after it fires
            setTimeout(updateThemeIcon, 10);
        });
    }
});

// ── Phone formatter ──────────────────────────────────────────────────────────
function formatPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 7) {
        value = value.slice(0, 4) + ' ' + value.slice(4, 8) + ' ' + value.slice(8);
    } else if (value.length > 4) {
        value = value.slice(0, 4) + ' ' + value.slice(4);
    }
    input.value = value;
}

// ── Searchable popover ───────────────────────────────────────────────────────
function handleSearch(type, query) {
    const resultsDiv = document.getElementById(`${type}-results`);
    resultsDiv.innerHTML = "";

    if (!query) { resultsDiv.classList.remove('show'); return; }

    let items = [];
    if (type === 'state') {
        items = Object.keys(nigerianData)
            .filter(s => s.toLowerCase().includes(query.toLowerCase()))
            .sort();
    } else if (type === 'region' && activeState) {
        items = nigerianData[activeState]
            .filter(r => r.toLowerCase().includes(query.toLowerCase()));
    }

    if (items.length > 0) {
        resultsDiv.classList.add('show');
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = "popover-item";
            div.innerText = item;
            div.onclick = () => selectItem(type, item);
            resultsDiv.appendChild(div);
        });
    } else {
        resultsDiv.classList.remove('show');
    }
}

function selectItem(type, val) {
    document.getElementById(`p-${type}`).value = val;
    document.getElementById(`${type}-results`).classList.remove('show');
    if (type === 'state') {
        activeState = val;
        // Auto-clear LGA when state changes
        document.getElementById('p-region').value = "";
    }
}

// Close popover when clicking outside
document.addEventListener('click', (e) => {
    ['state-results', 'region-results'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.closest('.form-group').contains(e.target)) {
            el.classList.remove('show');
        }
    });
});

// ── Segmented control ────────────────────────────────────────────────────────
function selectSegment(type, value, element) {
    const parent = element.parentElement;
    parent.querySelectorAll('.segment-option').forEach(opt => opt.classList.remove('active'));
    element.classList.add('active');
    if (type === 'sex')     selectedSex     = value;
    if (type === 'vehicle') selectedVehicle = value;
}

// ── Stock qty ────────────────────────────────────────────────────────────────
function updateDistStock(change) {
    distQty = Math.max(20, distQty + change);
    document.getElementById('dist-qty').innerText = distQty;
    const badge = document.getElementById('deal-badge-qty');
    if (badge) badge.innerText = `${distQty} packs`;
    calculateDistTotal();
}

// ── Investment calculator (no selling price — price set by brand) ────────────
function calculateDistTotal() {
    const hasKit   = document.getElementById('kit-toggle').checked;
    const stockCost = distQty * packPrice;
    const kitCost   = hasKit ? kitPrice : 0;
    const grandTotal = stockCost + kitCost;

    document.getElementById('d-cost').innerText  = `₦${stockCost.toLocaleString()}`;
    document.getElementById('d-kit').innerText   = `₦${kitCost.toLocaleString()}`;
    document.getElementById('d-total').innerText = `₦${grandTotal.toLocaleString()}`;

    const barTotal = document.getElementById('bar-total');
    if (barTotal) barTotal.innerText = `₦${grandTotal.toLocaleString()}`;
    const barQty = document.getElementById('bar-qty');
    if (barQty) barQty.innerText = distQty;

    if (!hasKit) {
        showToast("Success Kit includes banners, training & priority support – highly recommended!");
    }
}

// ── Copy receipt ─────────────────────────────────────────────────────────────
function copyDistReceipt() {
    const total = document.getElementById('d-total').innerText;
    const kit   = document.getElementById('kit-toggle').checked ? 'Yes (₦30,000)' : 'No (opted out)';
    const text  = [
        `OA PARTNER INVESTMENT QUOTE`,
        `ID: ${trackingID}`,
        `Volume: ${distQty} Packs`,
        `Success Kit: ${kit}`,
        `Total to Start: ${total}`
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => showToast('Quote Copied!'));
}

// ── Toast ────────────────────────────────────────────────────────────────────
function showToast(message) {
    const toast = document.getElementById('copy-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Open apply modal ─────────────────────────────────────────────────────────
function openApplyModal() {
    const name   = document.getElementById('p-name').value.trim();
    const state  = document.getElementById('p-state').value.trim();
    const region = document.getElementById('p-region').value.trim();
    const phone  = document.getElementById('p-phone').value.trim();

    if (!name)   { showToast("Please enter your full name"); return; }
    if (!state)  { showToast("Please search and select your state"); return; }
    if (!region) { showToast("Please search and select your LGA"); return; }
    if (!phone)  { showToast("Please enter your phone number"); return; }
    const cleanPhone = phone.replace(/\s/g, '');
    if (!/^\d{11}$/.test(cleanPhone) || !cleanPhone.startsWith('0')) {
        showToast("Please enter a valid 11-digit Nigerian phone number");
        return;
    }

    // Populate modal summary
    calculateDistTotal();
    const hasKit = document.getElementById('kit-toggle').checked;
    const stockCost  = distQty * packPrice;
    const kitCost    = hasKit ? kitPrice : 0;
    const grandTotal = stockCost + kitCost;

    const qtyLabel   = document.getElementById('modal-qty-label');
    const stockEl    = document.getElementById('modal-stock-cost');
    const kitEl      = document.getElementById('modal-kit-cost');
    const totalEl    = document.getElementById('modal-total');
    if (qtyLabel)  qtyLabel.innerText  = distQty;
    if (stockEl)   stockEl.innerText   = `₦${stockCost.toLocaleString()}`;
    if (kitEl)     kitEl.innerText     = `₦${kitCost.toLocaleString()}`;
    if (totalEl)   totalEl.innerText   = `₦${grandTotal.toLocaleString()}`;

    // Populate detail recap
    const recap = document.getElementById('modal-detail-recap');
    if (recap) {
        recap.innerHTML = `
            <div><strong>Name</strong><br>${name} (${selectedSex})</div>
            <div style="margin-top:8px"><strong>Location</strong><br>${region}, ${state}</div>
            <div style="margin-top:8px"><strong>Phone</strong><br>${phone}</div>
            <div style="margin-top:8px"><strong>Vehicle</strong><br>${selectedVehicle}</div>
        `;
    }

    const modal = document.getElementById('apply-modal');
    modal.classList.add('active');
    modal.style.display = 'flex';
    const bar = document.getElementById('dist-bar');
    if (bar) bar.classList.remove('active');
}

function closeApplyModal() {
    const modal = document.getElementById('apply-modal');
    if (modal) { modal.classList.remove('active'); modal.style.display = 'none'; }
    const bar = document.getElementById('dist-bar');
    if (bar) bar.classList.add('active');
}

// ── OA Sheets API ─────────────────────────────────────────────────────────────
// IMPORTANT: Replace the URL below with YOUR actual Apps Script Web App URL
var OA_API_URL = 'https://script.google.com/macros/s/AKfycbzPhQWpk6HJdzKX8sjXO1SkUMAMxygz7U8mBSQ9-rYTkct2C5-RRZ7LxP75ZvWwe15DFg/exec';

function saveDistributorLead(leadData) {
    // Silent background save — never blocks or breaks the WhatsApp flow
    try {
        var payload = {
            action: 'addLead',
            name: leadData.name,
            phone: leadData.phone,
            email: '',
            bizName: '',
            state: leadData.state,
            type: 'distributor',
            interest: 'Distributor — ' + leadData.qty + ' packs, Kit: ' + leadData.kit,
            notes: leadData.notes
        };
        fetch(OA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        }).catch(function() {
            // Silent fail — WhatsApp still opens regardless
        });
    } catch (e) {
        // Silent fail — never interrupt the customer experience
    }
}

// ── Build & send WhatsApp application ───────────────────────────────────────
function processWhatsAppApplication() {
    const name     = document.getElementById('p-name').value.trim();
    const state    = document.getElementById('p-state').value.trim();
    const region   = document.getElementById('p-region').value.trim();
    const phone    = document.getElementById('p-phone').value.trim().replace(/\s/g, '');
    const comments = document.getElementById('p-comments').value.trim();
    const hasKit   = document.getElementById('kit-toggle').checked ? "YES (Included)" : "NO (Opted out)";
    const total    = document.getElementById('d-total').innerText;

    if (!name || !state || !region || !phone) {
        showToast("Please complete all required fields");
        return;
    }

    saveData();

    // Save distributor lead to Google Sheets BEFORE opening WhatsApp (silent — never blocks)
    saveDistributorLead({
        name: name,
        phone: phone,
        state: state,
        qty: distQty,
        kit: document.getElementById('kit-toggle').checked ? 'Yes' : 'No',
        notes: comments || ''
    });

    let msg = `*NEW DISTRIBUTOR APPLICATION: ${trackingID}*\n`;
    msg += `----------------------------------\n`;
    msg += `*Partner:* ${name} (${selectedSex})\n`;
    msg += `*Phone:* ${phone}\n`;
    msg += `*Location:* ${region}, ${state}\n`;
    msg += `*Vehicle:* ${selectedVehicle}\n`;
    msg += `*Volume:* ${distQty} Packs\n`;
    msg += `*Success Kit:* ${hasKit}\n`;
    msg += `*Total Investment:* ${total}\n`;
    if (comments) msg += `*Note:* ${comments}\n`;
    msg += `----------------------------------\n`;
    msg += `Ready to secure my regional slot. Please confirm next steps.`;

    // Store message for CTA button
    pendingWAMsg = msg;
    const ctaBtn = document.getElementById('wa-apply-btn');
    if (ctaBtn) ctaBtn.href = `https://wa.me/2348140226282?text=${encodeURIComponent(msg)}`;

    // Close apply modal, show success
    closeApplyModal();
    const successModal = document.getElementById('success-modal');
    if (successModal) { successModal.classList.add('active'); successModal.style.display = 'flex'; }
}

// ── Called when user taps the WA CTA button on success screen ───────────────
window.handleWAApplicationSend = function() {
    setTimeout(() => {
        const successModal = document.getElementById('success-modal');
        if (successModal) { successModal.classList.remove('active'); successModal.style.display = 'none'; }
        // Reset
        distQty = 20;
        document.getElementById('dist-qty').innerText = 20;
        const badge = document.getElementById('deal-badge-qty');
        if (badge) badge.innerText = '20 packs';
        document.getElementById('kit-toggle').checked = true;
        calculateDistTotal();
        const bar = document.getElementById('dist-bar');
        if (bar) bar.classList.add('active');
    }, 600);
};

// ── Local storage ────────────────────────────────────────────────────────────
function loadSavedData() {
    try {
        const saved = JSON.parse(localStorage.getItem('oa_dist_user') || '{}');
        if (saved.name)     document.getElementById('p-name').value    = saved.name;
        if (saved.phone)    document.getElementById('p-phone').value   = saved.phone;
        if (saved.comments) document.getElementById('p-comments').value = saved.comments;
        if (saved.state) {
            document.getElementById('p-state').value = saved.state;
            activeState = saved.state;
        }
        if (saved.region)  document.getElementById('p-region').value  = saved.region;
        if (saved.sex) {
            selectedSex = saved.sex;
            document.querySelectorAll('[onclick*=\'sex\']').forEach(el => {
                el.classList.toggle('active', el.querySelector('span')?.innerText.trim() === saved.sex);
            });
        }
        if (saved.vehicle) {
            selectedVehicle = saved.vehicle;
            document.querySelectorAll('[onclick*=\'vehicle\']').forEach(el => {
                el.classList.toggle('active', el.querySelector('span')?.innerText.trim() === saved.vehicle);
            });
        }
    } catch(e) {}
}

function saveData() {
    try {
        localStorage.setItem('oa_dist_user', JSON.stringify({
            name:     document.getElementById('p-name').value.trim(),
            state:    document.getElementById('p-state').value.trim(),
            region:   document.getElementById('p-region').value.trim(),
            phone:    document.getElementById('p-phone').value.trim(),
            comments: document.getElementById('p-comments').value.trim(),
            sex:      selectedSex,
            vehicle:  selectedVehicle
        }));
    } catch(e) {}
}
