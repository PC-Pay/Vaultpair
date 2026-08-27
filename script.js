// UBAH INI: 'user_1' untuk HP Kamu, 'user_2' untuk HP Partner
const MY_DEVICE_ROLE = 'user_1'; 

let currentUser = MY_DEVICE_ROLE;
let currentTipe = 'masuk';

// Nama & Tema disimpan di HP masing-masing
let nameUser1 = localStorage.getItem('vp_name_u1') || 'Pengguna 1';
let nameUser2 = localStorage.getItem('vp_name_u2') || 'Pengguna 2';
let isLightTheme = localStorage.getItem('vp_theme_light') === 'true';
let isVibrateActive = localStorage.getItem('vp_vibrate_active') !== 'false';

// PIN diambil dari Cloud Supabase (Masing-masing User Punya PIN Sendiri)
let pinCode = '1234';
let isPinActive = false;

let selectedTxId = null;
let riwayatDataCache = [];

const MASTER_RESET_CODE = '999999';

const SUPABASE_URL = 'https://rmctwexaovyuveuogevv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_pU0AyNN4Xjc-Uwc2iUjC3g_GPiZD3yj';

let db;
try {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) { console.warn("Supabase tidak aktif"); }

window.addEventListener('load', async function() {
  updateTampilanNama();
  applyPreferencesUI();
  
  if (db) {
    await loadKeamananServer();
    initDatabase();
  } else {
    applyPinUI();
  }

  setTimeout(function() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(function() { splash.style.visibility = 'hidden'; }, 500);
    }
  }, 1200);
});

function triggerVibration(duration = 20) {
  if (isVibrateActive && navigator.vibrate) {
    navigator.vibrate(duration);
  }
}

async function loadKeamananServer() {
  try {
    const res = await db.from('pengaturan').select('*').eq('id', 'config').single();
    if (res.data) {
      if (MY_DEVICE_ROLE === 'user_1') {
        pinCode = String(res.data.pin_u1 || '1234');
        isPinActive = res.data.is_pin_active_u1 === true || res.data.is_pin_active_u1 === 'true';
      } else {
        pinCode = String(res.data.pin_u2 || '1234');
        isPinActive = res.data.is_pin_active_u2 === true || res.data.is_pin_active_u2 === 'true';
      }
    }
  } catch(e) {
    console.warn("Gagal memuat pengaturan keamanan server");
  }

  applyPinUI();
}

function applyPreferencesUI() {
  if (isLightTheme) document.body.classList.add('light-mode');
  else document.body.classList.remove('light-mode');

  const tTheme = document.getElementById('toggle-theme');
  if (tTheme) tTheme.checked = isLightTheme;

  const tVib = document.getElementById('toggle-vibrate');
  if (tVib) tVib.checked = isVibrateActive;
}

function applyPinUI() {
  const toggleEl = document.getElementById('toggle-pin');
  if (toggleEl) {
    toggleEl.checked = isPinActive;
  }
  
  const lockEl = document.getElementById('lock-screen');
  if (lockEl) {
    if (isPinActive) {
      lockEl.classList.add('active');
    } else {
      lockEl.classList.remove('active');
    }
  }
}

function toggleTemaAplikasi() {
  const checkboxEl = document.getElementById('toggle-theme');
  isLightTheme = checkboxEl ? checkboxEl.checked : false;
  localStorage.setItem('vp_theme_light', isLightTheme ? 'true' : 'false');

  if (isLightTheme) document.body.classList.add('light-mode');
  else document.body.classList.remove('light-mode');

  showToast(isLightTheme ? 'Tema Terang Aktif' : 'Tema Gelap Aktif', 'success');
}

function toggleGetarAplikasi() {
  const checkboxEl = document.getElementById('toggle-vibrate');
  isVibrateActive = checkboxEl ? checkboxEl.checked : false;
  localStorage.setItem('vp_vibrate_active', isVibrateActive ? 'true' : 'false');

  showToast(isVibrateActive ? 'Getar Aktif' : 'Getar Dinonaktifkan', 'success');
}

function bukaModalPreferences() {
  triggerVibration(20);
  const modal = document.getElementById('modal-preferences');
  if (modal) modal.classList.add('active');
}

function tutupModalPreferences() {
  const modal = document.getElementById('modal-preferences');
  if (modal) modal.classList.remove('active');
}

function verifikasiPinLock() {
  const inputEl = document.getElementById('input-pin-lock');
  const val = inputEl ? inputEl.value : '';
  if (val === pinCode) {
    showToast('Akses diterima', 'success');
    const lockEl = document.getElementById('lock-screen');
    if (lockEl) lockEl.classList.remove('active');
    if (inputEl) inputEl.value = '';
  } else {
    showToast('PIN salah!', 'error');
    if (inputEl) inputEl.value = '';
  }
}

async function lupaPinReset() {
  const inputBypass = prompt('Masukkan Kode Reset Darurat (Master Code):');
  if (inputBypass === null) return;

  if (inputBypass === MASTER_RESET_CODE) {
    isPinActive = false;
    pinCode = '1234';
    
    let updatePayload = {};
    if (MY_DEVICE_ROLE === 'user_1') {
      updatePayload = { pin_u1: '1234', is_pin_active_u1: false };
    } else {
      updatePayload = { pin_u2: '1234', is_pin_active_u2: false };
    }

    await db.from('pengaturan').update(updatePayload).eq('id', 'config');

    applyPinUI();
    showToast('PIN di-reset ke 1234!', 'success');
  } else {
    showToast('Kode Reset Darurat Salah!', 'error');
  }
}

function bukaModalSecurity() {
  triggerVibration(20);
  const modal = document.getElementById('modal-security-settings');
  if (modal) modal.classList.add('active');
}

function tutupModalSecurity() {
  const modal = document.getElementById('modal-security-settings');
  if (modal) modal.classList.remove('active');
}

async function toggleFiturPin() {
  const checkboxEl = document.getElementById('toggle-pin');
  if (!checkboxEl) return;
  
  isPinActive = checkboxEl.checked;

  let updatePayload = {};
  if (MY_DEVICE_ROLE === 'user_1') {
    updatePayload = { is_pin_active_u1: isPinActive };
  } else {
    updatePayload = { is_pin_active_u2: isPinActive };
  }

  try {
    await db.from('pengaturan').update(updatePayload).eq('id', 'config');
    applyPinUI();
    showToast(isPinActive ? 'PIN diaktifkan' : 'PIN dinonaktifkan', 'success');
  } catch(e) {
    showToast('Gagal mengupdate PIN ke server!', 'error');
  }
}

function bukaModalPin() {
  triggerVibration(20);
  const modal = document.getElementById('modal-edit-pin');
  if (modal) modal.classList.add('active');
}

function tutupModalPin() {
  const modal = document.getElementById('modal-edit-pin');
  if (modal) modal.classList.remove('active');
  const pLama = document.getElementById('pin-lama');
  const pBaru = document.getElementById('pin-baru');
  if (pLama) pLama.value = '';
  if (pBaru) pBaru.value = '';
}

async function simpanPinBaru() {
  const pLamaEl = document.getElementById('pin-lama');
  const pBaruEl = document.getElementById('pin-baru');
  const lama = pLamaEl ? pLamaEl.value : '';
  const baru = pBaruEl ? pBaruEl.value : '';

  if (lama !== pinCode) return showToast('PIN lama salah!', 'error');
  if (!baru || baru.length < 4) return showToast('PIN minimal 4 angka!', 'error');

  pinCode = baru;

  let updatePayload = {};
  if (MY_DEVICE_ROLE === 'user_1') {
    updatePayload = { pin_u1: baru };
  } else {
    updatePayload = { pin_u2: baru };
  }

  await db.from('pengaturan').update(updatePayload).eq('id', 'config');
  tutupModalPin();
  showToast('PIN berhasil diganti!', 'success');
}

function showToast(msg = '', type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = msg;
  toast.className = 'toast show ' + type;
  if (type === 'error') triggerVibration(50);
  else triggerVibration(30);
  setTimeout(function() { toast.className = 'toast'; }, 3000);
}

function bukaModalNama() {
  triggerVibration(20);
  const inputU1 = document.getElementById('edit-name-u1');
  const inputU2 = document.getElementById('edit-name-u2');
  if (inputU1) inputU1.value = nameUser1;
  if (inputU2) inputU2.value = nameUser2;
  const modal = document.getElementById('modal-edit-nama');
  if (modal) modal.classList.add('active');
}

function tutupModalNama() {
  const modal = document.getElementById('modal-edit-nama');
  if (modal) modal.classList.remove('active');
}
function simpanProfilNama() {
  const elU1 = document.getElementById('edit-name-u1');
  const elU2 = document.getElementById('edit-name-u2');
  const u1New = elU1 ? elU1.value.trim() : '';
  const u2New = elU2 ? elU2.value.trim() : '';

  if (!u1New || !u2New) return showToast('Nama tidak boleh kosong!', 'error');

  nameUser1 = u1New;
  nameUser2 = u2New;
  
  localStorage.setItem('vp_name_u1', nameUser1);
  localStorage.setItem('vp_name_u2', nameUser2);

  updateTampilanNama();
  fetchRiwayat();
  tutupModalNama();
  showToast('Nama profil diperbarui!', 'success');
}

function updateTampilanNama() {
  const lblU1 = document.getElementById('label-u1');
  const lblU2 = document.getElementById('label-u2');
  const btnU1 = document.getElementById('btn-u1');
  const btnU2 = document.getElementById('btn-u2');
  const subText = document.getElementById('profile-sub-text');

  if (lblU1) lblU1.innerText = nameUser1;
  if (lblU2) lblU2.innerText = nameUser2;
  if (btnU1) btnU1.innerText = nameUser1;
  if (btnU2) btnU2.innerText = nameUser2;
  if (subText) subText.innerText = nameUser1 + ' & ' + nameUser2;
}

const viewsMenu = ['saldo', 'input', 'riwayat', 'akun'];
let currentIdx = 0;
let touchStartX = 0;
let touchEndX = 0;

const swipeArea = document.getElementById('swipe-area');
if (swipeArea) {
  swipeArea.addEventListener('touchstart', function(e) { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
  swipeArea.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, {passive: true});
}

function handleSwipe() {
  const swipeTreshold = 50;
  if (touchEndX < touchStartX - swipeTreshold) {
    if (currentIdx < viewsMenu.length - 1) switchView(viewsMenu[++currentIdx]);
  }
  if (touchEndX > touchStartX + swipeTreshold) {
    if (currentIdx > 0) switchView(viewsMenu[--currentIdx]);
  }
}

function switchView(viewName = 'saldo') {
  currentIdx = viewsMenu.indexOf(viewName);
  triggerVibration(30);
  document.querySelectorAll('.view-section').forEach(function(el) { el.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(el) { el.classList.remove('active'); });

  const vEl = document.getElementById('view-' + viewName);
  const nEl = document.getElementById('nav-' + viewName);
  if (vEl) vEl.classList.add('active');
  if (nEl) nEl.classList.add('active');
}

setInterval(function() {
  const now = new Date();
  const clockEl = document.getElementById('live-clock');
  if (clockEl) {
    clockEl.innerText = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  }
}, 1000);

function setDefaultDate() { 
  const tglEl = document.getElementById('input-tanggal');
  if (tglEl) tglEl.value = new Date().toLocaleDateString('en-CA'); 
}
setDefaultDate();

function pilihUser(val = 'user_1') {
  triggerVibration(20);
  currentUser = val;
  const b1 = document.getElementById('btn-u1');
  const b2 = document.getElementById('btn-u2');
  if (b1) b1.classList.remove('active');
  if (b2) b2.classList.remove('active');
  const activeBtn = document.getElementById(val === 'user_1' ? 'btn-u1' : 'btn-u2');
  if (activeBtn) activeBtn.classList.add('active');
}

function pilihTipe(val = 'masuk') {
  triggerVibration(20);
  currentTipe = val;
  const bM = document.getElementById('btn-t-masuk');
  const bK = document.getElementById('btn-t-keluar');
  const inp = document.getElementById('input-nominal-text');
  const lbl = document.getElementById('label-nominal');

  if (bM) bM.classList.remove('active', 'green');
  if (bK) bK.classList.remove('active', 'red');

  if (val === 'masuk') {
    if (bM) bM.classList.add('active', 'green');
    if (inp) inp.style.color = 'var(--text)';
    if (lbl) lbl.innerText = 'Nominal Setor';
  } else {
    if (bK) bK.classList.add('active', 'red');
    if (inp) inp.style.color = 'var(--danger)';
    if (lbl) lbl.innerText = 'Nominal Tarik';
  }
}

const inputNominalEl = document.getElementById('input-nominal-text');
if (inputNominalEl) {
  inputNominalEl.addEventListener('input', function() {
    let raw = this.value.replace(/[^0-9]/g, '');
    this.value = raw ? parseInt(raw, 10).toLocaleString('id-ID') : '';
  });
}

const editTxNominalEl = document.getElementById('edit-tx-nominal');
if (editTxNominalEl) {
  editTxNominalEl.addEventListener('input', function() {
    let raw = this.value.replace(/[^0-9]/g, '');
    this.value = raw ? parseInt(raw, 10).toLocaleString('id-ID') : '';
  });
}

function initDatabase() {
  fetchSaldo(); 
  fetchRiwayat();
}

async function fetchSaldo() {
  try {
    const res = await db.from('tabungan').select('*');
    if (res.error || !res.data) return;
    let u1 = 0, u2 = 0;
    for (let idx = 0; idx < res.data.length; idx++) {
      let item = res.data[idx];
      if (item.user === 'user_1') u1 = item.saldo;
      if (item.user === 'user_2') u2 = item.saldo;
    }
    const s1 = document.getElementById('saldo-user1');
    const s2 = document.getElementById('saldo-user2');
    const st = document.getElementById('total-saldo');
    if (s1) s1.innerText = formatRupiah(u1);
    if (s2) s2.innerText = formatRupiah(u2);
    if (st) st.innerText = formatRupiah(u1 + u2);
  } catch(e) {}
}

async function fetchRiwayat() {
  try {
    const res = await db.from('riwayat').select('*');
    const list = document.getElementById('list-riwayat');
    if (!list) return;
    list.innerHTML = '';
    if (res.data && res.data.length > 0) {
      riwayatDataCache = res.data;

      for (let x = 0; x < riwayatDataCache.length; x++) {
        for (let y = x + 1; y < riwayatDataCache.length; y++) {
          if (Number(riwayatDataCache[x].id) < Number(riwayatDataCache[y].id)) {
            let temp = riwayatDataCache[x];
            riwayatDataCache[x] = riwayatDataCache[y];
            riwayatDataCache[y] = temp;
          }
        }
      }

      for (let idx = 0; idx < riwayatDataCache.length; idx++) {
        let item = riwayatDataCache[idx];
        const isPlus = item.tipe === 'masuk';
        const displayName = item.user === 'user_1' ? nameUser1 : nameUser2;
        list.innerHTML += `
          <div class="history-wrapper">
            <div class="history-actions">
              <button class="swipe-btn edit" onclick="window.bukaModalEditTx('${item.id}')">Edit</button>
              <button class="swipe-btn delete" onclick="window.hapusTransaksiDirect('${item.id}')">Hapus</button>
            </div>
            <div class="history-item" id="tx-item-${item.id}">
              <div class="h-left">
                <div class="h-title">${displayName}</div>
                <div class="h-desc">${item.catatan || (isPlus ? 'Setor Dana' : 'Tarik Dana')}</div>
              </div>
              <div class="h-right">
                <div class="h-amount" style="color: ${isPlus ? 'var(--success)' : 'var(--danger)'}">
                  ${isPlus ? '+' : '-'} ${formatRupiah(item.nominal)}
                </div>
                <div class="h-date">${formatTanggal(item.id)}</div>
              </div>
            </div>
          </div>`;
      }
      setTimeout(attachSwipeToItems, 100);
    } else {
      riwayatDataCache = [];
      list.innerHTML = '<div style="text-align:center;font-size:13px;color:gray;padding:20px;">Belum ada mutasi.</div>';
    }
  } catch(e) {}
}

function attachSwipeToItems() {
  let items = document.querySelectorAll('.history-item');
  items.forEach(function(el) {
    let startX = 0;
    let currentX = 0;
    let isOpen = false;

    el.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
      e.stopPropagation();
    }, {passive: true});

    el.addEventListener('touchmove', function(e) {
      currentX = e.touches[0].clientX;
      let diff = currentX - startX;
      e.stopPropagation();

      if (diff < 0 && diff > -140) {
        el.style.transform = `translateX(${diff}px)`;
      } else if (diff > 0 && isOpen) {
        el.style.transform = `translateX(${-120 + diff}px)`;
      }
    }, {passive: true});

    el.addEventListener('touchend', function(e) {
      let diff = currentX - startX;
      e.stopPropagation();
      if (currentX === 0) return;

      if (diff < -50) {
        el.style.transform = 'translateX(-120px)';
        isOpen = true;
        triggerVibration(15);
      } else {
        el.style.transform = 'translateX(0px)';
        isOpen = false;
      }
      currentX = 0;
    }, {passive: true});
  });
}

function bukaModalEditTx(id = '') {
  triggerVibration(20);
  selectedTxId = id;
  let target = null;
  for (let i = 0; i < riwayatDataCache.length; i++) {
    if (String(riwayatDataCache[i].id) === String(id)) {
      target = riwayatDataCache[i];
      break;
    }
  }
  if (!target) return;

  const nomEl = document.getElementById('edit-tx-nominal');
  const catEl = document.getElementById('edit-tx-catatan');
  if (nomEl) nomEl.value = Number(target.nominal).toLocaleString('id-ID');
  if (catEl) catEl.value = target.catatan || '';

  const modal = document.getElementById('modal-edit-transaksi');
  if (modal) modal.classList.add('active');
}

function tutupModalEditTx() {
  selectedTxId = null;
  const modal = document.getElementById('modal-edit-transaksi');
  if (modal) modal.classList.remove('active');
}

async function hitungUlangSaldoPenuh() {
  const res = await db.from('riwayat').select('*');
  if (res.error || !res.data) return;
  let u1 = 0, u2 = 0;
  for (let i = 0; i < res.data.length; i++) {
    let item = res.data[i];
    let nom = Number(item.nominal);
    if (item.user === 'user_1') {
      u1 += (item.tipe === 'masuk') ? nom : -nom;
    } else {
      u2 += (item.tipe === 'masuk') ? nom : -nom;
    }
  }
  await db.from('tabungan').update({ saldo: u1 }).eq('user', 'user_1');
  await db.from('tabungan').update({ saldo: u2 }).eq('user', 'user_2');
}

async function simpanEditTransaksi() {
  if (!db || !selectedTxId) return;
  const nomEl = document.getElementById('edit-tx-nominal');
  const catEl = document.getElementById('edit-tx-catatan');

  let raw = nomEl ? nomEl.value.replace(/\./g, '') : '';
  let newNominal = parseInt(raw, 10);
  let newCatatan = catEl ? catEl.value : '';

  if (!newNominal || newNominal <= 0) return showToast('Nominal tidak valid!', 'error');

  try {
    await db.from('riwayat').update({ 
      nominal: newNominal, 
      catatan: newCatatan 
    }).eq('id', selectedTxId);

    await hitungUlangSaldoPenuh();
    tutupModalEditTx();
    showToast('Transaksi diperbarui!', 'success');
    await fetchSaldo();
    await fetchRiwayat();
  } catch (e) {
    showToast('Gagal mengubah transaksi!', 'error');
  }
}

async function hapusTransaksiDirect(id = '') {
  if (!db || !id) return;
  if (!confirm('Yakin ingin menghapus transaksi ini?')) return;

  try {
    await db.from('riwayat').delete().eq('id', id);
    await hitungUlangSaldoPenuh();
    showToast('Transaksi dihapus!', 'success');
    await fetchSaldo();
    await fetchRiwayat();
  } catch (e) {
    showToast('Gagal menghapus transaksi!', 'error');
  }
}

async function prosesTransaksi() {
  if(!db) return showToast("Database tidak terhubung!", "error");
  if(!inputNominalEl) return;

  let rawNominal = inputNominalEl.value.replace(/\./g, '');
  const nominal = parseInt(rawNominal, 10);
  if (!nominal || nominal <= 0) return showToast('Harap masukkan nominal uang!', 'error');

  const btn = document.getElementById('btn-submit');
  const catEl = document.getElementById('input-catatan');
  const catatan = catEl ? catEl.value : '';

  if (btn) { btn.disabled = true; btn.innerText = 'MEMPROSES...'; }

  try {
    const resSelect = await db.from('tabungan').select('saldo').eq('user', currentUser);
    let currentSaldo = (resSelect.data && resSelect.data.length > 0) ? resSelect.data[0].saldo : 0;

    if (currentTipe === 'masuk') { 
      currentSaldo += nominal; 
    } else {
      if (currentSaldo < nominal) {
        if (btn) { btn.disabled = false; btn.innerText = 'KIRIM TRANSAKSI'; }
        return showToast('Saldo tidak cukup untuk ditarik!', 'error');
      }
      currentSaldo -= nominal;
    }

    let resUpdate = await db.from('tabungan').update({ saldo: currentSaldo }).eq('user', currentUser);

    if (resUpdate.error || !resSelect.data || resSelect.data.length === 0) {
      await db.from('tabungan').insert([{ user: currentUser, saldo: currentSaldo }]);
    }

    await db.from('riwayat').insert([{ 
      id: Date.now(),
      user: currentUser, 
      tipe: currentTipe, 
      nominal: nominal, 
      catatan: catatan 
    }]);

    inputNominalEl.value = '';
    if (catEl) catEl.value = '';
    pilihUser(MY_DEVICE_ROLE); 
    pilihTipe('masuk'); 
    setDefaultDate();

    showToast('Transaksi berhasil!', 'success');
    await fetchSaldo();
    await fetchRiwayat();
    switchView('riwayat');

  } catch (e) { 
    showToast("Gagal menyimpan ke database!", "error"); 
  }

  if (btn) { btn.disabled = false; btn.innerText = 'KIRIM TRANSAKSI'; }
}

function formatRupiah(val = 0) { return 'Rp ' + Number(val).toLocaleString('id-ID'); }
function formatTanggal(timestamp = 0) {
  if (!timestamp) return '-'; const d = new Date(Number(timestamp));
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ' • ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' });
}

window.toggleTemaAplikasi = toggleTemaAplikasi;
window.toggleGetarAplikasi = toggleGetarAplikasi;
window.bukaModalPreferences = bukaModalPreferences;
window.tutupModalPreferences = tutupModalPreferences;
window.verifikasiPinLock = verifikasiPinLock;
window.lupaPinReset = lupaPinReset;
window.bukaModalSecurity = bukaModalSecurity;
window.tutupModalSecurity = tutupModalSecurity;
window.toggleFiturPin = toggleFiturPin;
window.bukaModalPin = bukaModalPin;
window.tutupModalPin = tutupModalPin;
window.simpanPinBaru = simpanPinBaru;
window.bukaModalNama = bukaModalNama;
window.tutupModalNama = tutupModalNama;
window.simpanProfilNama = simpanProfilNama;
window.pilihUser = pilihUser;
window.pilihTipe = pilihTipe;
window.switchView = switchView;
window.simpanEditTransaksi = simpanEditTransaksi;
window.tutupModalEditTx = tutupModalEditTx;
window.bukaModalEditTx = bukaModalEditTx;
window.hapusTransaksiDirect = hapusTransaksiDirect;
window.prosesTransaksi = prosesTransaksi;
    
