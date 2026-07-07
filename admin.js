const STORAGE_KEY = 'sr_calendar_admin';
const MONTHS = ['', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

let state = {
  apiUrl: '',
  password: '',
  canWrite: false,
  events: [],
  selectedId: null
};

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveSession() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    apiUrl: state.apiUrl,
    password: state.password
  }));
}

function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

async function apiList() {
  const url = state.apiUrl;
  if (!url) {
    const res = await fetch('data/events.json?t=' + Date.now());
    return res.json();
  }
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(url + sep + 'action=list&t=' + Date.now());
  const data = await res.json();
  if (!data.ok && !data.events) throw new Error(data.error || 'Ошибка загрузки');
  return data;
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

function slugify(title) {
  return (title || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) + '_2026';
}

function renderList() {
  const list = document.getElementById('eventList');
  const byMonth = {};
  state.events.forEach(ev => {
    const m = ev.month || 1;
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(ev);
  });
  Object.values(byMonth).forEach(arr => arr.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));

  let html = '';
  for (let m = 1; m <= 12; m++) {
    const items = byMonth[m];
    if (!items || !items.length) continue;
    html += `<div class="month-group"><h3>${MONTHS[m]}</h3>`;
    for (const ev of items) {
      const active = ev.id === state.selectedId ? ' active' : '';
      const hidden = ev.visible === false ? ' is-hidden' : '';
      html += `<button type="button" class="event-item${active}${hidden}" data-id="${ev.id}">
        ${escapeHtml(ev.title || ev.id)}
        <small>${escapeHtml(ev.datesLabel || '')} · ${escapeHtml(ev.locationLine || '')}</small>
      </button>`;
    }
    html += '</div>';
  }
  list.innerHTML = html;
  list.querySelectorAll('.event-item').forEach(btn => {
    btn.addEventListener('click', () => selectEvent(btn.dataset.id));
  });
  document.getElementById('eventCount').textContent = `· ${state.events.length} ивентов`;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getEvent(id) {
  return state.events.find(e => e.id === id);
}

function selectEvent(id) {
  state.selectedId = id;
  renderList();
  renderEditor(getEvent(id));
}

function blankEvent() {
  return {
    id: '',
    month: new Date().getMonth() + 1,
    sortOrder: 0,
    visible: true,
    cardType: 'compact',
    cardStyle: 'elegant-dark',
    accentColor: '#2E39F7',
    tier: 'mid',
    attendees: 1000,
    country: 'ES',
    startDate: '',
    endDate: '',
    title: '',
    datesLabel: '',
    locationLine: '',
    category: 'iGaming',
    heroImage: '',
    description: '',
    website: '',
    telegramChannel: null,
    startISO: null,
    endISO: null,
    weather: null,
    promo: null,
    awards: [],
    restaurants: [],
    brands: [],
    sideEvents: []
  };
}

function renderEditor(ev) {
  const panel = document.getElementById('editorPanel');
  if (!ev) {
    panel.innerHTML = '<p class="muted editor__empty">Выбери ивент слева или создай новый</p>';
    return;
  }

  const sideRows = (ev.sideEvents || []).map((se, i) => sideEventRow(se, i)).join('');

  panel.innerHTML = `
    <div class="editor__head">
      <h2>${escapeHtml(ev.title || 'Новый ивент')}</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${state.canWrite ? `<button type="button" class="btn btn--primary" id="saveBtn">Сохранить</button>` : ''}
        ${state.canWrite && ev.id && !ev._isNew ? `<button type="button" class="btn btn--danger" id="deleteBtn">Удалить</button>` : ''}
      </div>
    </div>
    ${!state.canWrite ? '<div class="readonly-badge">Только просмотр — настрой URL API и пароль для редактирования</div>' : ''}

    <div class="section">
      <h3>Основное</h3>
      <div class="field--row">
        <label class="field"><span>Название</span><input id="f_title" value="${escapeAttr(ev.title)}" /></label>
        <label class="field"><span>ID (латиница)</span><input id="f_id" value="${escapeAttr(ev.id)}" /></label>
      </div>
      <label class="field"><span>Короткие даты на карточке (19–20 Янв)</span><input id="f_datesLabel" value="${escapeAttr(ev.datesLabel)}" /></label>
      <div class="field--row">
        <label class="field"><span>Место (Spain, Barcelona)</span><input id="f_locationLine" value="${escapeAttr(ev.locationLine)}" /></label>
        <label class="field"><span>Код страны (ES, UAE, BR)</span><input id="f_country" value="${escapeAttr(ev.country)}" maxlength="6" /></label>
      </div>
      <label class="field"><span>Описание в модалке</span><textarea id="f_description">${escapeHtml(ev.description)}</textarea></label>
      <div class="field--row">
        <label class="field"><span>Сайт</span><input id="f_website" type="url" value="${escapeAttr(ev.website)}" /></label>
        <label class="field"><span>Telegram канал</span><input id="f_telegram" value="${escapeAttr(ev.telegramChannel || '')}" /></label>
      </div>
    </div>

    <div class="section">
      <h3>Календарь и карточка</h3>
      <div class="field--row">
        <label class="field"><span>Месяц</span><select id="f_month">${monthOptions(ev.month)}</select></label>
        <label class="field"><span>Порядок в месяце</span><input id="f_sortOrder" type="number" value="${ev.sortOrder || 0}" /></label>
      </div>
      <div class="field--row">
        <label class="field"><span>Дата начала</span><input id="f_startDate" type="date" value="${escapeAttr(ev.startDate || '')}" /></label>
        <label class="field"><span>Дата окончания</span><input id="f_endDate" type="date" value="${escapeAttr(ev.endDate || '')}" /></label>
      </div>
      <div class="field--row">
        <label class="field"><span>Размер</span><select id="f_tier">${opt(['mega','large','mid','small'], ev.tier)}</select></label>
        <label class="field"><span>Участников</span><input id="f_attendees" type="number" value="${ev.attendees || 0}" /></label>
      </div>
      <div class="field--row">
        <label class="field"><span>Тип карточки</span><select id="f_cardType">${opt(['compact','major'], ev.cardType)}</select></label>
        <label class="field"><span>Стиль большой карточки</span><select id="f_cardStyle">${opt(['elegant-dark','elegant-green'], ev.cardStyle || 'elegant-dark')}</select></label>
      </div>
      <div class="field--row">
        <label class="field"><span>Категория</span><input id="f_category" value="${escapeAttr(ev.category)}" /></label>
        <label class="field"><span>Цвет полоски</span><input id="f_accentColor" value="${escapeAttr(ev.accentColor || '#2E39F7')}" /></label>
      </div>
      <label class="field"><span>Картинка (путь или ссылка)</span><input id="f_heroImage" value="${escapeAttr(ev.heroImage)}" placeholder="images/heroes/... или https://..." /></label>
      ${state.canWrite ? `<div class="field">
        <span>Загрузить свою картинку (16:9, до 400 КБ)</span>
        <input type="file" id="f_imageUpload" accept="image/jpeg,image/png,image/webp" />
        <span id="uploadStatus" class="muted"></span>
      </div>` : ''}
      <div class="img-preview" id="imgPreview">${ev.heroImage ? `<img src="${escapeAttr(ev.heroImage)}" alt="превью" />` : '<span class="muted">Нет картинки</span>'}</div>
      <label class="field"><span><input type="checkbox" id="f_visible" ${ev.visible !== false ? 'checked' : ''} /> Показывать на сайте</span></label>
    </div>

    <div class="section">
      <h3>Сайд-ивенты</h3>
      <div id="sideEventsList">${sideRows || '<p class="muted">Нет сайд-ивентов</p>'}</div>
      ${state.canWrite ? '<button type="button" class="btn btn--ghost" id="addSideBtn">+ Добавить сайд-ивент</button>' : ''}
    </div>
  `;

  document.getElementById('saveBtn')?.addEventListener('click', () => saveCurrent(ev));
  document.getElementById('deleteBtn')?.addEventListener('click', () => deleteCurrent(ev.id));
  document.getElementById('f_imageUpload')?.addEventListener('change', handleImageUpload);
  document.getElementById('f_heroImage')?.addEventListener('input', (e) => updateImgPreview(e.target.value));
  document.getElementById('addSideBtn')?.addEventListener('click', () => {
    ev.sideEvents = ev.sideEvents || [];
    ev.sideEvents.push({ title: '', date: '', location: '', type: 'party' });
    renderEditor(ev);
  });
  panel.querySelectorAll('[data-remove-side]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.removeSide);
      ev.sideEvents.splice(i, 1);
      renderEditor(ev);
    });
  });
}

function monthOptions(selected) {
  let h = '';
  for (let m = 1; m <= 12; m++) {
    h += `<option value="${m}" ${m === Number(selected) ? 'selected' : ''}>${MONTHS[m]}</option>`;
  }
  return h;
}

function opt(list, val) {
  return list.map(v => `<option value="${v}" ${v === val ? 'selected' : ''}>${v}</option>`).join('');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function sideEventRow(se, i) {
  return `<div class="side-row" data-side="${i}">
    <div class="field--row">
      <label class="field"><span>Название</span><input class="se-title" value="${escapeAttr(se.title)}" /></label>
      <label class="field"><span>Дата</span><input class="se-date" value="${escapeAttr(se.date)}" /></label>
    </div>
    <label class="field"><span>Место</span><input class="se-location" value="${escapeAttr(se.location)}" /></label>
    <div class="field--row">
      <label class="field"><span>Ссылка регистрации</span><input class="se-url" value="${escapeAttr(se.registerUrl || '')}" /></label>
      <label class="field"><span>Тип</span><select class="se-type">${opt(['party','dinner','awards','meetup'], se.type || 'party')}</select></label>
    </div>
    <div class="side-row__actions"><button type="button" class="btn btn--ghost" data-remove-side="${i}">Убрать</button></div>
  </div>`;
}

function collectForm(ev) {
  const g = id => document.getElementById(id);
  const title = g('f_title').value.trim();
  let id = g('f_id').value.trim();
  if (!id && title) id = slugify(title);

  const updated = { ...ev };
  updated.id = id;
  updated.title = title;
  updated.datesLabel = g('f_datesLabel').value.trim();
  updated.locationLine = g('f_locationLine').value.trim();
  updated.country = g('f_country').value.trim().toUpperCase();
  updated.description = g('f_description').value.trim();
  updated.website = g('f_website').value.trim();
  updated.telegramChannel = g('f_telegram').value.trim() || null;
  updated.month = Number(g('f_month').value);
  updated.sortOrder = Number(g('f_sortOrder').value) || 0;
  updated.startDate = g('f_startDate').value || null;
  updated.endDate = g('f_endDate').value || null;
  updated.tier = g('f_tier').value;
  updated.attendees = Number(g('f_attendees').value) || 0;
  updated.cardType = g('f_cardType').value;
  updated.cardStyle = g('f_cardStyle').value;
  updated.category = g('f_category').value.trim() || 'iGaming';
  updated.accentColor = g('f_accentColor').value.trim() || '#2E39F7';
  updated.heroImage = g('f_heroImage').value.trim();
  updated.visible = g('f_visible').checked;

  if (updated.startDate) updated.startISO = updated.startDate + 'T09:00:00Z';
  if (updated.endDate) updated.endISO = updated.endDate + 'T18:00:00Z';

  const sideRows = document.querySelectorAll('.side-row');
  updated.sideEvents = [];
  sideRows.forEach(row => {
    updated.sideEvents.push({
      title: row.querySelector('.se-title')?.value.trim() || '',
      date: row.querySelector('.se-date')?.value.trim() || '',
      location: row.querySelector('.se-location')?.value.trim() || '',
      registerUrl: row.querySelector('.se-url')?.value.trim() || undefined,
      type: row.querySelector('.se-type')?.value || 'party'
    });
  });

  delete updated._isNew;
  return updated;
}

function updateImgPreview(url) {
  const box = document.getElementById('imgPreview');
  if (!box) return;
  box.innerHTML = url
    ? `<img src="${escapeAttr(url)}" alt="превью" />`
    : '<span class="muted">Нет картинки</span>';
}

async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const status = document.getElementById('uploadStatus');
  if (file.size > 1.5 * 1024 * 1024) {
    if (!confirm('Файл больше 1.5 МБ — загрузка может быть долгой. Лучше сжать картинку. Всё равно загрузить?')) {
      e.target.value = '';
      return;
    }
  }
  try {
    if (status) status.textContent = 'Загружаю...';
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    const data = await apiPost({ action: 'uploadImage', dataUrl, name: file.name });
    document.getElementById('f_heroImage').value = data.url;
    updateImgPreview(data.url);
    if (status) status.textContent = 'Готово ✓ Не забудь нажать «Сохранить»';
  } catch (err) {
    if (status) status.textContent = '';
    alert('Ошибка загрузки: ' + err.message);
  }
}

async function saveCurrent(ev) {
  try {
    const updated = collectForm(ev);
    if (!updated.id || !updated.title) {
      alert('Нужны название и ID');
      return;
    }
    const data = await apiPost({ action: 'save', event: updated });
    state.events = data.events;
    state.selectedId = updated.id;
    renderList();
    renderEditor(getEvent(updated.id));
    showToast('Сохранено');
  } catch (e) {
    alert(e.message);
  }
}

async function deleteCurrent(id) {
  if (!confirm('Удалить ивент «' + id + '»?')) return;
  try {
    const data = await apiPost({ action: 'delete', id });
    state.events = data.events;
    state.selectedId = null;
    renderList();
    renderEditor(null);
    showToast('Удалено');
  } catch (e) {
    alert(e.message);
  }
}

async function login() {
  const apiUrl = document.getElementById('apiUrlInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  state.apiUrl = apiUrl || (window.CMS_CONFIG && window.CMS_CONFIG.eventsApiUrl) || '';
  state.password = password;
  state.canWrite = !!(state.apiUrl && state.password);

  document.getElementById('loginError').classList.add('hidden');
  try {
    const data = await apiList();
    state.events = data.events || [];
    saveSession();
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appScreen').classList.remove('hidden');
    renderList();
    if (state.events.length) selectEvent(state.events[0].id);
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
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('addEventBtn').addEventListener('click', () => {
  const ev = blankEvent();
  ev._isNew = true;
  ev.id = 'new_event_' + Date.now();
  state.events.push(ev);
  selectEvent(ev.id);
});

const session = loadSession();
const defaultApi = (window.CMS_CONFIG && window.CMS_CONFIG.eventsApiUrl) || '';
document.getElementById('apiUrlInput').value = session.apiUrl || defaultApi;
