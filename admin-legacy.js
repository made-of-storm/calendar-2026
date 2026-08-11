/** Редактор виз — только вкладка Visa (legacy). */
const STORAGE_KEY = 'sr_calendar_admin';

const CIT_LABELS = {
  EU: 'Евросоюз (Шенген)', RU: 'Россия', UA: 'Украина', BY: 'Беларусь',
  KZ: 'Казахстан', UZ: 'Узбекистан', AZ: 'Азербайджан', AM: 'Армения',
  GE: 'Грузия', MD: 'Молдова', TJ: 'Таджикистан', KG: 'Киргизия', TR: 'Турция'
};

const COUNTRY_LABELS = {
  AE: 'ОАЭ', UAE: 'ОАЭ (Дубай)', AM: 'Армения', BR: 'Бразилия', CA: 'Канада',
  CY: 'Кипр', ES: 'Испания', GB: 'Великобритания', GE: 'Грузия', HU: 'Венгрия',
  IT: 'Италия', MO: 'Макао', MT: 'Мальта', MX: 'Мексика', PH: 'Филиппины',
  PL: 'Польша', PT: 'Португалия', RU: 'Россия', SN: 'Сенегал', TH: 'Таиланд',
  UA: 'Украина', US: 'США', ZA: 'ЮАР'
};

const VISA_REQUIRED_OPTS = [
  ['нет', 'Без визы'], ['да', 'Нужна виза'],
  ['эл.разреш.', 'Эл. разрешение'], ['запрет', 'Въезд запрещён']
];

const VISA_TYPE_BY_REQUIRED = {
  'нет': 'Безвиз', 'да': 'Виза', 'эл.разреш.': 'Эл. разрешение', 'запрет': 'Закрыт'
};

const state = { apiUrl: '', password: '', canWrite: false, visa: {}, visaCitizenship: null };

function loadSession() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function saveSession() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ apiUrl: state.apiUrl, password: state.password }));
}

function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function escapeAttr(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function apiVisa() {
  if (!state.apiUrl) {
    const res = await fetch('data/visa.json?t=' + Date.now());
    const d = await res.json();
    return d.visa || {};
  }
  const sep = state.apiUrl.includes('?') ? '&' : '?';
  const res = await fetch(state.apiUrl + sep + 'action=visa&t=' + Date.now());
  const d = await res.json();
  return d.visa || {};
}

async function apiPost(body) {
  const res = await fetch(state.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, password: state.password })
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Ошибка сохранения');
  return data;
}

function renderVisaEditor() {
  const sel = document.getElementById('visaCitizenship');
  const cits = Object.keys(state.visa);
  if (!cits.length) {
    document.getElementById('visaRows').innerHTML = '<p class="muted">Нет данных. Загрузи визы в Google-таблицу.</p>';
    return;
  }
  if (!state.visaCitizenship || !state.visa[state.visaCitizenship]) state.visaCitizenship = cits[0];
  sel.innerHTML = cits.map(c =>
    `<option value="${c}" ${c === state.visaCitizenship ? 'selected' : ''}>${escapeHtml(CIT_LABELS[c] || c)} (${c})</option>`
  ).join('');
  renderVisaRows();
}

function renderVisaRows() {
  const cit = state.visaCitizenship;
  const map = state.visa[cit] || {};
  const countries = Object.keys(map).sort((a, b) =>
    (COUNTRY_LABELS[a] || a).localeCompare(COUNTRY_LABELS[b] || b, 'ru'));
  document.getElementById('visaRows').innerHTML = countries.map(cc => visaRow(cc, map[cc])).join('') ||
    '<p class="muted">Добавь страну ниже.</p>';
}

function visaRow(cc, info) {
  info = info || {};
  const opts = VISA_REQUIRED_OPTS.map(([v, t]) =>
    `<option value="${v}" ${v === info.required ? 'selected' : ''}>${t}</option>`).join('');
  return `<div class="visa-row" data-country="${escapeAttr(cc)}">
    <div class="visa-row__country"><strong>${escapeHtml(COUNTRY_LABELS[cc] || cc)}</strong><small>${escapeHtml(cc)}</small></div>
    <select class="visa-required">${opts}</select>
    <input class="visa-notes" value="${escapeAttr(info.notes || '')}" placeholder="Комментарий" />
    ${state.canWrite ? `<button type="button" class="btn btn--ghost visa-remove" data-country="${escapeAttr(cc)}">✕</button>` : ''}
  </div>`;
}

function readVisaRows() {
  const cit = state.visaCitizenship;
  if (!cit) return;
  const map = {};
  document.querySelectorAll('#visaRows .visa-row').forEach(row => {
    const cc = row.dataset.country;
    const required = row.querySelector('.visa-required').value;
    const notes = row.querySelector('.visa-notes').value.trim();
    map[cc] = { required, type: VISA_TYPE_BY_REQUIRED[required] || '', notes };
  });
  state.visa[cit] = map;
}

async function saveVisa() {
  if (!state.canWrite) { alert('Нужны API и пароль'); return; }
  readVisaRows();
  try {
    const data = await apiPost({ action: 'saveVisa', visa: state.visa });
    if (data.visa) state.visa = data.visa;
    renderVisaEditor();
    showToast('Визы сохранены');
  } catch (e) { alert(e.message); }
}

function addVisaCountry() {
  const code = (prompt('Код страны (ES, CY, UAE…):') || '').trim().toUpperCase();
  if (!code) return;
  readVisaRows();
  const cit = state.visaCitizenship;
  if (!state.visa[cit]) state.visa[cit] = {};
  state.visa[cit][code] = { required: 'нет', type: 'Безвиз', notes: '' };
  renderVisaRows();
}

// Старые деплои GAS без action=auth отвечают «Unknown action» уже ПОСЛЕ
// проверки пароля, так что «Неверный пароль» надёжно означает неверный пароль.
async function verifyPassword() {
  if (!state.apiUrl || !state.password) throw new Error('Введи пароль');
  const res = await fetch(state.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'auth', password: state.password })
  });
  const data = await res.json();
  if (!data.ok && /парол/i.test(data.error || '')) {
    throw new Error('Неверный пароль — проверь раскладку и лишние пробелы');
  }
}

async function login() {
  state.apiUrl = document.getElementById('apiUrlInput').value.trim() ||
    (window.CMS_CONFIG && window.CMS_CONFIG.eventsApiUrl) || '';
  state.password = document.getElementById('passwordInput').value;
  state.canWrite = !!(state.apiUrl && state.password);
  document.getElementById('loginError').classList.add('hidden');
  try {
    await verifyPassword();
    state.visa = await apiVisa();
    saveSession();
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appScreen').classList.remove('hidden');
    renderVisaEditor();
  } catch (e) {
    document.getElementById('loginError').textContent = e.message;
    document.getElementById('loginError').classList.remove('hidden');
  }
}

function logout() {
  state.password = '';
  saveSession();
  document.getElementById('appScreen').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
}

document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('passwordInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});
document.getElementById('passToggle').addEventListener('click', () => {
  const input = document.getElementById('passwordInput');
  const btn = document.getElementById('passToggle');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.querySelector('.eye').classList.toggle('hidden', show);
  btn.querySelector('.eye-off').classList.toggle('hidden', !show);
  btn.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
  btn.setAttribute('title', show ? 'Скрыть пароль' : 'Показать пароль');
  input.focus();
});
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('saveVisaBtn').addEventListener('click', saveVisa);
document.getElementById('addVisaCountryBtn').addEventListener('click', addVisaCountry);
document.getElementById('visaCitizenship').addEventListener('change', (e) => {
  readVisaRows();
  state.visaCitizenship = e.target.value;
  renderVisaRows();
});
document.getElementById('visaRows').addEventListener('click', (e) => {
  const btn = e.target.closest('.visa-remove');
  if (!btn) return;
  readVisaRows();
  delete state.visa[state.visaCitizenship][btn.dataset.country];
  renderVisaRows();
});

const session = loadSession();
document.getElementById('apiUrlInput').value = session.apiUrl ||
  (window.CMS_CONFIG && window.CMS_CONFIG.eventsApiUrl) || '';
