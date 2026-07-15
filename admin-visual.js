/**
 * Визуальный редактор календаря: сетка + боковая панель со всеми полями.
 */
const CMS_STORAGE = 'sr_calendar_admin';

const CMS_MONTHS = [
  '', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const CMS_ACCENT_COLORS = [
  ['#2E39F7', 'Синий'],
  ['#F5DA0F', 'Жёлтый'],
  ['#C8E712', 'Зелёный'],
  ['#F6ADE5', 'Розовый'],
  ['#EAB308', 'Золотой']
];

const cms = {
  apiUrl: '',
  password: '',
  canWrite: false,
  events: [],
  editingId: null,
  draft: null
};

function cms$(sel) { return document.querySelector(sel); }

function cmsToast(msg) {
  const el = document.createElement('div');
  el.className = 'cms-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function escAttr(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cmsOpt(list, val) {
  return list.map(v => `<option value="${v}" ${v === val ? 'selected' : ''}>${v}</option>`).join('');
}

function cmsMonthOptions(selected) {
  let h = '';
  for (let m = 1; m <= 12; m++) {
    h += `<option value="${m}" ${m === Number(selected) ? 'selected' : ''}>${CMS_MONTHS[m]}</option>`;
  }
  return h;
}

function cmsAccentOptions(val) {
  const cur = val || '#2E39F7';
  let h = CMS_ACCENT_COLORS.map(([c, l]) =>
    `<option value="${c}" ${c === cur ? 'selected' : ''}>${l} (${c})</option>`
  ).join('');
  if (!CMS_ACCENT_COLORS.some(([c]) => c === cur)) {
    h += `<option value="${escAttr(cur)}" selected>${escAttr(cur)}</option>`;
  }
  return h;
}

function toDateInput(v) {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function slugify(title) {
  return (title || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) + '_2026';
}

function loadCmsSession() {
  try { return JSON.parse(localStorage.getItem(CMS_STORAGE) || '{}'); }
  catch { return {}; }
}

function saveCmsSession() {
  localStorage.setItem(CMS_STORAGE, JSON.stringify({
    apiUrl: cms.apiUrl,
    password: cms.password
  }));
}

async function cmsApiList() {
  if (!cms.apiUrl) {
    const res = await fetch('data/events.json?t=' + Date.now());
    return res.json();
  }
  const sep = cms.apiUrl.includes('?') ? '&' : '?';
  const res = await fetch(cms.apiUrl + sep + 'action=list&t=' + Date.now());
  const data = await res.json();
  if (!data.ok && !data.events) throw new Error(data.error || 'Ошибка загрузки');
  return data;
}

async function cmsApiPost(body) {
  const res = await fetch(cms.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, password: cms.password })
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Ошибка сохранения');
  return data;
}

async function cmsReloadCalendar() {
  const data = await cmsApiList();
  cms.events = data.events || [];
  const visible = cms.events.filter(e => e.visible !== false);
  if (typeof buildEventsMap === 'function' && typeof renderCalendarGrid === 'function') {
    EVENTS = buildEventsMap(visible);
    renderCalendarGrid(visible);
    cmsBindCards();
    if (typeof updateAllVisaTags === 'function') updateAllVisaTags();
    if (typeof applyFilters === 'function') applyFilters();
  }
  if (cms.editingId) {
    const still = cms.events.find(e => e.id === cms.editingId);
    if (still) {
      cms.draft = JSON.parse(JSON.stringify(still));
      cmsRenderEditor(cms.draft);
      cmsHighlightCard(cms.editingId);
    }
  }
}

function cmsHighlightCard(id) {
  document.querySelectorAll('.event-card.cms-selected').forEach(c => c.classList.remove('cms-selected'));
  const card = document.querySelector(`.event-card[data-event-id="${CSS.escape(id)}"]`);
  if (card) card.classList.add('cms-selected');
}

function cmsBindCards() {
  document.querySelectorAll('.event-card[data-event-id]').forEach(card => {
    const clone = card.cloneNode(true);
    card.parentNode.replaceChild(clone, card);
    clone.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = clone.getAttribute('data-event-id');
      if (id) cmsSelectEvent(id);
    });
  });
}

function cmsSelectEvent(id) {
  const ev = cms.events.find(e => e.id === id);
  if (!ev) return;
  cms.editingId = id;
  cms.draft = JSON.parse(JSON.stringify(ev));
  cmsRenderEditor(cms.draft);
  cmsHighlightCard(id);
  cms$('#cmsPreviewBtn')?.removeAttribute('disabled');
  cms$('#cmsHideBtn')?.removeAttribute('disabled');
  const card = document.querySelector(`.event-card[data-event-id="${CSS.escape(id)}"]`);
  card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function cmsImgWidget(label, url, urlClass, inputId) {
  const safe = escAttr(url || '');
  const idAttr = inputId ? ` id="${escAttr(inputId)}"` : '';
  return `<label class="cms-fl cms-img-widget">
    <span>${label}</span>
    <input${idAttr} class="${urlClass} js-img-url" value="${safe}" placeholder="images/... или https://..." />
    ${cms.canWrite ? '<input type="file" class="js-img-file" accept="image/jpeg,image/png,image/webp,image/svg+xml" /><span class="cms-hint js-img-status"></span>' : ''}
    <div class="cms-img-preview cms-img-preview--sm js-img-preview">${url ? `<img src="${safe}" alt="" />` : '<span class="cms-hint">Нет</span>'}</div>
  </label>`;
}

function cmsRestaurantRow(r, i) {
  return `<div class="cms-sub rest-row" data-rest="${i}">
    <div class="cms-form-row">
      <label class="cms-fl"><span>Название</span><input class="rest-name" value="${escAttr(r.name)}" /></label>
      <label class="cms-fl"><span>Вайб</span><select class="rest-vibe">${cmsOpt(['посидеть', 'громко', 'тихо', 'потанцевать'], r.vibe || 'посидеть')}</select></label>
    </div>
    <div class="cms-form-row">
      <label class="cms-fl"><span>Средний чек</span><input class="rest-check" value="${escAttr(r.avgCheck || '')}" /></label>
      <label class="cms-fl"><span>Ссылка</span><input class="rest-website" value="${escAttr(r.website || '')}" /></label>
    </div>
    <label class="cms-fl"><span>Описание</span><textarea class="rest-desc">${escHtml(r.description || '')}</textarea></label>
    ${cmsImgWidget('Фото', r.img, 'rest-img')}
    <div class="cms-sub__actions"><button type="button" class="cms-btn cms-btn--sm cms-btn--ghost" data-remove-rest="${i}">Удалить</button></div>
  </div>`;
}

function cmsSideRow(se, i) {
  return `<div class="cms-sub side-row" data-side="${i}">
    <div class="cms-form-row">
      <label class="cms-fl"><span>Название</span><input class="se-title" value="${escAttr(se.title)}" /></label>
      <label class="cms-fl"><span>Дата</span><input class="se-date" value="${escAttr(se.date)}" /></label>
    </div>
    <label class="cms-fl"><span>Место</span><input class="se-location" value="${escAttr(se.location)}" /></label>
    <label class="cms-fl"><span>Описание</span><textarea class="se-desc">${escHtml(se.description || '')}</textarea></label>
    <div class="cms-form-row">
      <label class="cms-fl"><span>Тип</span><select class="se-type">${cmsOpt(['party', 'dinner', 'awards', 'meetup', 'networking', 'sport'], se.type || 'party')}</select></label>
      <label class="cms-fl"><span>Подпись кнопки</span><input class="se-label" value="${escAttr(se.registerLabel || '')}" placeholder="Билеты / По бейджу" /></label>
    </div>
    <label class="cms-fl"><span>Ссылка регистрации</span><input class="se-url" value="${escAttr(se.registerUrl || '')}" /></label>
    ${cmsImgWidget('Картинка', se.img, 'se-img')}
    <div class="cms-sub__actions"><button type="button" class="cms-btn cms-btn--sm cms-btn--ghost" data-remove-side="${i}">Удалить</button></div>
  </div>`;
}

function cmsAwardRow(a, i) {
  const cats = (a.categories || []).join('\n');
  return `<div class="cms-sub award-row" data-award="${i}">
    <label class="cms-fl"><span>Название</span><input class="aw-name" value="${escAttr(a.name)}" /></label>
    <label class="cms-fl"><span>Дата церемонии</span><input class="aw-date" value="${escAttr(a.date || '')}" /></label>
    <label class="cms-fl"><span>Категории (по одной на строку)</span><textarea class="aw-cats">${escHtml(cats)}</textarea></label>
    <label class="cms-fl"><span>Сайт</span><input class="aw-web" value="${escAttr(a.website || '')}" /></label>
    <div class="cms-sub__actions"><button type="button" class="cms-btn cms-btn--sm cms-btn--ghost" data-remove-award="${i}">Удалить</button></div>
  </div>`;
}

function cmsRenderEditor(ev) {
  const root = cms$('#cmsEditorRoot');
  if (!root || !ev) return;

  const w = ev.weather || { temp: '', description: '' };
  const restRows = (ev.restaurants || []).map(cmsRestaurantRow).join('');
  const sideRows = (ev.sideEvents || []).map(cmsSideRow).join('');
  const awardRows = (ev.awards || []).map(cmsAwardRow).join('');

  root.innerHTML = `
    <div class="cms-editor__head">
      <h2>${escHtml(ev.title || 'Новый ивент')}</h2>
      <div class="cms-editor__actions">
        ${cms.canWrite ? '<button type="button" class="cms-btn cms-btn--primary cms-btn--sm" id="cmsDrawerSave">Сохранить</button>' : ''}
        ${cms.canWrite && ev.id && !ev._isNew ? '<button type="button" class="cms-btn cms-btn--danger cms-btn--sm" id="cmsDrawerDelete">Удалить</button>' : ''}
      </div>
    </div>
    ${!cms.canWrite ? '<p class="cms-hint">Только просмотр — укажи API и пароль для сохранения</p>' : ''}

    <div class="cms-form" id="cmsEditorForm">
      <div class="cms-section">
        <h3>Карточка в сетке календаря</h3>
        <p class="cms-hint">То, что видно в маленькой/большой карточке на главной</p>
        <label class="cms-fl"><span>Название на карточке</span><input id="f_title" value="${escAttr(ev.title)}" /></label>
        <label class="cms-fl"><span>Короткие даты (19–20 Янв)</span><input id="f_datesLabel" value="${escAttr(ev.datesLabel)}" /></label>
        <div class="cms-form-row">
          <label class="cms-fl"><span>Место (Spain, Barcelona)</span><input id="f_locationLine" value="${escAttr(ev.locationLine)}" /></label>
          <label class="cms-fl"><span>Код страны</span><input id="f_country" value="${escAttr(ev.country)}" maxlength="6" /></label>
        </div>
        <div class="cms-form-row">
          <label class="cms-fl"><span>Участников (число)</span><input id="f_attendees" type="number" value="${ev.attendees || 0}" /></label>
          <label class="cms-fl"><span>Категория (тег)</span><input id="f_category" value="${escAttr(ev.category)}" /></label>
        </div>
        <div class="cms-form-row">
          <label class="cms-fl"><span>Тип карточки</span><select id="f_cardType">${cmsOpt(['compact', 'major'], ev.cardType || 'compact')}</select></label>
          <label class="cms-fl"><span>Стиль major-карточки</span><select id="f_cardStyle">${cmsOpt(['elegant-dark', 'elegant-green'], ev.cardStyle || 'elegant-dark')}</select></label>
        </div>
        <div class="cms-form-row">
          <label class="cms-fl"><span>Цвет полоски (compact)</span><select id="f_accentColor">${cmsAccentOptions(ev.accentColor)}</select></label>
          <label class="cms-fl"><span>Размер (tier)</span><select id="f_tier">${cmsOpt(['mega', 'large', 'mid', 'small'], ev.tier || 'mid')}</select></label>
        </div>
        ${cmsImgWidget('Обложка major-карточки', ev.heroImage, 'hero-img', 'f_heroImage')}
      </div>

      <div class="cms-section">
        <h3>Календарь и сортировка</h3>
        <div class="cms-form-row">
          <label class="cms-fl"><span>Месяц в сетке</span><select id="f_month">${cmsMonthOptions(ev.month)}</select></label>
          <label class="cms-fl"><span>Порядок в месяце</span><input id="f_sortOrder" type="number" value="${ev.sortOrder || 0}" /></label>
        </div>
        <div class="cms-form-row">
          <label class="cms-fl"><span>Дата начала</span><input id="f_startDate" type="date" value="${toDateInput(ev.startDate)}" /></label>
          <label class="cms-fl"><span>Дата окончания</span><input id="f_endDate" type="date" value="${toDateInput(ev.endDate)}" /></label>
        </div>
        <label class="cms-fl cms-check"><input type="checkbox" id="f_visible" ${ev.visible !== false ? 'checked' : ''} /> Показывать на сайте</label>
        <label class="cms-fl"><span>ID (латиница, не менять без нужды)</span><input id="f_id" value="${escAttr(ev.id)}" /></label>
      </div>

      <div class="cms-section">
        <h3>Модалка (полная карточка)</h3>
        <label class="cms-fl"><span>Описание</span><textarea id="f_description">${escHtml(ev.description || '')}</textarea></label>
        <div class="cms-form-row">
          <label class="cms-fl"><span>Оф. сайт</span><input id="f_website" type="url" value="${escAttr(ev.website)}" /></label>
          <label class="cms-fl"><span>Telegram</span><input id="f_telegram" value="${escAttr(ev.telegramChannel || '')}" /></label>
        </div>
        <div class="cms-form-row">
          <label class="cms-fl"><span>Погода — температура</span><input id="f_weatherTemp" value="${escAttr(w.temp || '')}" placeholder="18-22°C" /></label>
          <label class="cms-fl"><span>Погода — текст</span><input id="f_weatherDesc" value="${escAttr(w.description || '')}" /></label>
        </div>
        <div class="cms-form-row">
          <label class="cms-fl"><span>Промокод</span><input id="f_promo" value="${escAttr(ev.promo || '')}" placeholder="пусто = скидка в работе" /></label>
          <label class="cms-fl"><span>Примечание к промо</span><input id="f_promoNote" value="${escAttr(ev.promoNote || '')}" placeholder="−10%" /></label>
        </div>
      </div>

      <div class="cms-section">
        <h3>Рестораны (${(ev.restaurants || []).length})</h3>
        <div id="cmsRestList">${restRows || '<p class="cms-hint">Нет ресторанов</p>'}</div>
        ${cms.canWrite ? '<button type="button" class="cms-btn cms-btn--sm" id="cmsAddRest">+ Ресторан</button>' : ''}
      </div>

      <div class="cms-section">
        <h3>Сайд-ивенты (${(ev.sideEvents || []).length})</h3>
        <div id="cmsSideList">${sideRows || '<p class="cms-hint">Нет сайд-ивентов</p>'}</div>
        ${cms.canWrite ? '<button type="button" class="cms-btn cms-btn--sm" id="cmsAddSide">+ Сайд-ивент</button>' : ''}
      </div>

      <div class="cms-section">
        <h3>Awards (${(ev.awards || []).length})</h3>
        <div id="cmsAwardList">${awardRows || '<p class="cms-hint">Нет awards</p>'}</div>
        ${cms.canWrite ? '<button type="button" class="cms-btn cms-btn--sm" id="cmsAddAward">+ Award</button>' : ''}
      </div>
    </div>
  `;

  cms$('#cmsDrawerSave')?.addEventListener('click', cmsSave);
  cms$('#cmsDrawerDelete')?.addEventListener('click', cmsDeleteCurrent);

  cms$('#cmsAddRest')?.addEventListener('click', () => {
    cmsSyncDraftFromForm();
    cms.draft.restaurants = cms.draft.restaurants || [];
    cms.draft.restaurants.push({ name: '', vibe: 'посидеть', avgCheck: '', description: '', img: '', website: '' });
    cmsRenderEditor(cms.draft);
  });
  cms$('#cmsAddSide')?.addEventListener('click', () => {
    cmsSyncDraftFromForm();
    cms.draft.sideEvents = cms.draft.sideEvents || [];
    cms.draft.sideEvents.push({ title: '', date: '', location: '', type: 'party', description: '' });
    cmsRenderEditor(cms.draft);
  });
  cms$('#cmsAddAward')?.addEventListener('click', () => {
    cmsSyncDraftFromForm();
    cms.draft.awards = cms.draft.awards || [];
    cms.draft.awards.push({ name: '', date: '', categories: [], website: '' });
    cmsRenderEditor(cms.draft);
  });

  root.querySelectorAll('[data-remove-rest]').forEach(btn => {
    btn.addEventListener('click', () => {
      cmsSyncDraftFromForm();
      cms.draft.restaurants.splice(Number(btn.dataset.removeRest), 1);
      cmsRenderEditor(cms.draft);
    });
  });
  root.querySelectorAll('[data-remove-side]').forEach(btn => {
    btn.addEventListener('click', () => {
      cmsSyncDraftFromForm();
      cms.draft.sideEvents.splice(Number(btn.dataset.removeSide), 1);
      cmsRenderEditor(cms.draft);
    });
  });
  root.querySelectorAll('[data-remove-award]').forEach(btn => {
    btn.addEventListener('click', () => {
      cmsSyncDraftFromForm();
      cms.draft.awards.splice(Number(btn.dataset.removeAward), 1);
      cmsRenderEditor(cms.draft);
    });
  });

  cms$('#f_heroImage')?.addEventListener('input', (e) => {
    const widget = e.target.closest('.cms-img-widget');
    cmsUpdateImgPreview(e.target.value, widget?.querySelector('.js-img-preview'));
  });
  root.querySelectorAll('.js-img-url').forEach(inp => {
    inp.addEventListener('input', () => {
      const widget = inp.closest('.cms-img-widget');
      cmsUpdateImgPreview(inp.value, widget?.querySelector('.js-img-preview'));
    });
  });
}

function cmsUpdateImgPreview(url, box) {
  if (!box) return;
  box.innerHTML = url.trim()
    ? `<img src="${escAttr(url.trim())}" alt="" />`
    : '<span class="cms-hint">Нет</span>';
}

function cmsRowVal(row, sel) {
  const el = row.querySelector(sel);
  return el ? el.value.trim() : '';
}

function cmsReadRestaurants() {
  return [...(cms$('#cmsRestList')?.querySelectorAll('.rest-row') || [])].map(row => {
    const o = {
      name: cmsRowVal(row, '.rest-name'),
      vibe: row.querySelector('.rest-vibe')?.value || 'посидеть',
      avgCheck: cmsRowVal(row, '.rest-check'),
      description: cmsRowVal(row, '.rest-desc'),
      img: cmsRowVal(row, '.rest-img')
    };
    const web = cmsRowVal(row, '.rest-website');
    if (web) o.website = web;
    return o;
  }).filter(o => o.name);
}

function cmsReadSideEvents() {
  return [...(cms$('#cmsSideList')?.querySelectorAll('.side-row') || [])].map(row => {
    const o = {
      title: cmsRowVal(row, '.se-title'),
      date: cmsRowVal(row, '.se-date'),
      location: cmsRowVal(row, '.se-location'),
      type: row.querySelector('.se-type')?.value || 'party',
      description: cmsRowVal(row, '.se-desc')
    };
    const url = cmsRowVal(row, '.se-url');
    const label = cmsRowVal(row, '.se-label');
    const img = cmsRowVal(row, '.se-img');
    if (url) o.registerUrl = url;
    if (label) o.registerLabel = label;
    if (img) o.img = img;
    return o;
  }).filter(o => o.title || o.date || o.location);
}

function cmsReadAwards() {
  return [...(cms$('#cmsAwardList')?.querySelectorAll('.award-row') || [])].map(row => {
    const catsRaw = row.querySelector('.aw-cats')?.value || '';
    const categories = catsRaw.split('\n').map(s => s.trim()).filter(Boolean);
    const o = {
      name: cmsRowVal(row, '.aw-name'),
      date: cmsRowVal(row, '.aw-date'),
      categories,
      website: cmsRowVal(row, '.aw-web')
    };
    return o;
  }).filter(o => o.name);
}

function cmsReadWeather() {
  const temp = cms$('#f_weatherTemp')?.value.trim() || '';
  const desc = cms$('#f_weatherDesc')?.value.trim() || '';
  if (!temp && !desc) return null;
  return { temp, description: desc };
}

function cmsCollectEvent() {
  const g = id => cms$('#' + id);
  const title = g('f_title')?.value.trim() || '';
  let id = g('f_id')?.value.trim() || '';
  if (!id && title) id = slugify(title);

  const updated = { ...(cms.draft || {}) };
  updated.id = id;
  updated.title = title;
  updated.datesLabel = g('f_datesLabel')?.value.trim() || '';
  updated.locationLine = g('f_locationLine')?.value.trim() || '';
  updated.country = (g('f_country')?.value.trim() || '').toUpperCase();
  updated.description = g('f_description')?.value.trim() || '';
  updated.website = g('f_website')?.value.trim() || '';
  updated.telegramChannel = g('f_telegram')?.value.trim() || null;
  updated.month = Number(g('f_month')?.value) || 1;
  updated.sortOrder = Number(g('f_sortOrder')?.value) || 0;
  updated.startDate = g('f_startDate')?.value || null;
  updated.endDate = g('f_endDate')?.value || null;
  updated.tier = g('f_tier')?.value || 'mid';
  updated.attendees = Number(g('f_attendees')?.value) || 0;
  updated.cardType = g('f_cardType')?.value || 'compact';
  updated.cardStyle = g('f_cardStyle')?.value || 'elegant-dark';
  updated.category = g('f_category')?.value.trim() || 'iGaming';
  updated.accentColor = g('f_accentColor')?.value.trim() || '#2E39F7';
  updated.heroImage = g('f_heroImage')?.value.trim() || '';
  updated.visible = g('f_visible')?.checked !== false;
  updated.promo = g('f_promo')?.value.trim() || null;
  updated.promoNote = g('f_promoNote')?.value.trim() || null;

  if (updated.startDate) updated.startISO = updated.startDate + 'T09:00:00Z';
  if (updated.endDate) updated.endISO = updated.endDate + 'T18:00:00Z';

  updated.weather = cmsReadWeather();
  updated.restaurants = cmsReadRestaurants();
  updated.sideEvents = cmsReadSideEvents();
  updated.awards = cmsReadAwards();

  delete updated._isNew;
  return updated;
}

function cmsSyncDraftFromForm() {
  if (!cms$('#cmsEditorForm')) return;
  cms.draft = cmsCollectEvent();
}

async function cmsHandleImageUpload(fileInput) {
  const file = fileInput.files?.[0];
  if (!file || !cms.canWrite) return;
  const widget = fileInput.closest('.cms-img-widget');
  const urlInput = widget?.querySelector('.js-img-url');
  const preview = widget?.querySelector('.js-img-preview');
  const status = widget?.querySelector('.js-img-status');
  if (file.size > 1.5 * 1024 * 1024 && !confirm('Файл больше 1.5 МБ — продолжить?')) {
    fileInput.value = '';
    return;
  }
  try {
    if (status) status.textContent = 'Загружаю…';
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    const data = await cmsApiPost({ action: 'uploadImage', dataUrl, name: file.name });
    if (urlInput) urlInput.value = data.url;
    cmsUpdateImgPreview(data.url, preview);
    if (status) status.textContent = 'Готово ✓';
    cmsToast('Фото загружено');
  } catch (err) {
    if (status) status.textContent = '';
    alert(err.message);
  }
  fileInput.value = '';
}

async function cmsSave() {
  if (!cms.canWrite) {
    alert('Нужны URL API и пароль для сохранения.');
    return;
  }
  if (!cms.editingId && !cms$('#f_title')) {
    alert('Сначала выбери ивент в календаре или создай новый.');
    return;
  }
  try {
    const updated = cmsCollectEvent();
    if (!updated.id || !updated.title) {
      alert('Нужны название и ID');
      return;
    }
    const data = await cmsApiPost({ action: 'save', event: updated });
    cms.events = data.events || [];
    cms.editingId = updated.id;
    cms.draft = JSON.parse(JSON.stringify(updated));
    await cmsReloadCalendar();
    cmsSelectEvent(updated.id);
    cmsToast('Сохранено');
  } catch (e) {
    alert(e.message);
  }
}

async function cmsDeleteCurrent() {
  if (!cms.editingId || !cms.canWrite) return;
  if (!confirm('Удалить ивент «' + cms.editingId + '»?')) return;
  try {
    const data = await cmsApiPost({ action: 'delete', id: cms.editingId });
    cms.events = data.events || [];
    cms.editingId = null;
    cms.draft = null;
    await cmsReloadCalendar();
    cms$('#cmsEditorRoot').innerHTML = '<p class="cms-editor-empty">Кликни на ивент в календаре — все поля справа</p>';
    cms$('#cmsPreviewBtn')?.setAttribute('disabled', 'disabled');
    cmsToast('Удалено');
  } catch (e) {
    alert(e.message);
  }
}

async function cmsHideCurrent() {
  if (!cms.editingId || !cms.canWrite) return;
  if (!confirm('Скрыть ивент с сайта?')) return;
  cmsSyncDraftFromForm();
  cms.draft.visible = false;
  cmsRenderEditor(cms.draft);
  cms$('#f_visible').checked = false;
  await cmsSave();
}

function cmsNewEvent() {
  const ev = {
    id: 'new_event_' + Date.now(),
    _isNew: true,
    month: new Date().getMonth() + 1,
    sortOrder: 0,
    visible: true,
    cardType: 'compact',
    cardStyle: 'elegant-dark',
    accentColor: '#2E39F7',
    tier: 'mid',
    attendees: 500,
    country: 'CY',
    title: 'Новая конференция',
    datesLabel: '',
    locationLine: '',
    category: 'iGaming',
    description: '',
    website: '',
    telegramChannel: null,
    heroImage: '',
    promo: null,
    promoNote: null,
    weather: null,
    awards: [],
    restaurants: [],
    sideEvents: []
  };
  cms.events.push(ev);
  cms.editingId = ev.id;
  cms.draft = ev;
  cmsRenderEditor(ev);
  cms$('#cmsPreviewBtn')?.removeAttribute('disabled');
}

function cmsPreviewModal() {
  if (!cms.editingId) return;
  cmsSyncDraftFromForm();
  const d = cms.draft;
  if (typeof toModalEvent === 'function') {
    EVENTS[d.id] = toModalEvent(d);
  }
  if (typeof populateModal === 'function' && typeof openModal === 'function') {
    populateModal(d.id);
    openModal();
  }
}

async function cmsLogin() {
  const apiUrl = cms$('#cmsApiUrl')?.value.trim();
  const password = cms$('#cmsPassword')?.value || '';
  cms.apiUrl = apiUrl || (window.CMS_CONFIG && window.CMS_CONFIG.eventsApiUrl) || '';
  cms.password = password;
  cms.canWrite = !!(cms.apiUrl && cms.password);

  cms$('#cmsLoginError')?.classList.add('hidden');
  try {
    await cmsReloadCalendar();
    cms.events = (await cmsApiList()).events || [];
    saveCmsSession();
    cms$('#cmsLogin')?.classList.add('hidden');
    cms$('#cmsToolbar')?.classList.remove('hidden');
    cms$('#cmsDrawer')?.classList.remove('hidden');
    document.body.classList.remove('cms-pending');
    document.body.classList.add('cms-ready', 'cms-drawer-open');
    cmsBindCards();
    cmsToast('Кликни на ивент — все поля справа');
  } catch (e) {
    const err = cms$('#cmsLoginError');
    if (err) {
      err.textContent = e.message;
      err.classList.remove('hidden');
    }
  }
}

function cmsLogout() {
  cms.password = '';
  saveCmsSession();
  cms$('#cmsToolbar')?.classList.add('hidden');
  cms$('#cmsDrawer')?.classList.add('hidden');
  cms$('#cmsLogin')?.classList.remove('hidden');
  document.body.classList.add('cms-pending');
  document.body.classList.remove('cms-ready', 'cms-drawer-open', 'cms-edit-mode');
}

document.addEventListener('DOMContentLoaded', () => {
  const session = loadCmsSession();
  const defaultApi = (window.CMS_CONFIG && window.CMS_CONFIG.eventsApiUrl) || '';
  if (cms$('#cmsApiUrl')) cms$('#cmsApiUrl').value = session.apiUrl || defaultApi;

  cms$('#cmsLoginBtn')?.addEventListener('click', cmsLogin);
  cms$('#cmsLogoutBtn')?.addEventListener('click', cmsLogout);
  cms$('#cmsSaveBtn')?.addEventListener('click', cmsSave);
  cms$('#cmsPreviewBtn')?.addEventListener('click', cmsPreviewModal);
  cms$('#cmsNewBtn')?.addEventListener('click', cmsNewEvent);
  cms$('#cmsHideBtn')?.addEventListener('click', cmsHideCurrent);

  cms$('#cmsEditorRoot')?.addEventListener('change', (e) => {
    if (e.target.classList?.contains('js-img-file')) cmsHandleImageUpload(e.target);
  });

  if (session.apiUrl && session.password) {
    cms$('#cmsPassword').value = session.password;
    cmsLogin();
  }
});
