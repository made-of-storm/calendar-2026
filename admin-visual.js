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
  const previewHtml = url
    ? `<img src="${safe}" alt="" />`
    : '<span class="cms-img-drop__empty">📷</span><span class="cms-img-drop__text">Перетащи фото или нажми «Загрузить»</span>';

  if (!cms.canWrite) {
    return `<label class="cms-fl cms-img-widget">
      <span>${label}</span>
      <div class="cms-img-preview cms-img-preview--sm js-img-preview">${url ? `<img src="${safe}" alt="" />` : '<span class="cms-hint">Нет</span>'}</div>
    </label>`;
  }

  return `<label class="cms-fl cms-img-widget">
    <span>${label}</span>
    <div class="cms-img-drop js-img-drop">
      <div class="cms-img-preview js-img-preview">${previewHtml}</div>
      <button type="button" class="cms-btn cms-btn--sm js-img-pick">Загрузить</button>
      <input type="file" class="js-img-file hidden" accept="image/jpeg,image/png,image/webp,image/svg+xml" />
    </div>
    <span class="cms-hint js-img-status"></span>
    <input${idAttr} class="${urlClass} js-img-url cms-img-url-field" value="${safe}" placeholder="или вставь ссылку" />
  </label>`;
}

function cmsItemImgUpload(dataKey, url) {
  const safe = escAttr(url || '');
  const previewHtml = url
    ? `<img src="${safe}" alt="" />`
    : '<span class="cms-img-drop__empty">📷</span>';

  if (!cms.canWrite) {
    return `<input data-${dataKey}="img" class="js-img-url" value="${safe}" readonly />`;
  }

  return `<div class="cms-img-widget cms-img-widget--bar">
    <div class="cms-img-drop js-img-drop cms-img-drop--compact">
      <div class="cms-img-preview cms-img-preview--sm js-img-preview">${previewHtml}</div>
      <button type="button" class="cms-btn cms-btn--sm js-img-pick">Загрузить</button>
      <input type="file" class="js-img-file hidden" accept="image/jpeg,image/png,image/webp,image/svg+xml" />
    </div>
    <input data-${dataKey}="img" class="js-img-url cms-img-url-inline" value="${safe}" placeholder="или ссылка" />
    <span class="cms-hint js-img-status"></span>
  </div>`;
}

async function cmsUploadImageFile(file) {
  if (!file || !cms.canWrite) return null;
  if (!file.type.startsWith('image/')) {
    alert('Нужен файл изображения');
    return null;
  }
  if (file.size > 1.5 * 1024 * 1024 && !confirm('Файл больше 1.5 МБ — продолжить?')) {
    return null;
  }
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const data = await cmsApiPost({ action: 'uploadImage', dataUrl, name: file.name });
  return data.url;
}

function cmsApplyImgUrl(widget, url) {
  const urlInput = widget?.querySelector('.js-img-url');
  const preview = widget?.querySelector('.js-img-preview');
  if (urlInput) urlInput.value = url;
  cmsUpdateImgPreview(url, preview);

  const cardImg = widget?.closest('.cms-item-edit')?.querySelector('.restaurant-card img, .side-event-card img, .side-event-card--partner__thumb');
  if (cardImg && url) {
    cardImg.src = url;
    cardImg.style.display = '';
  }
}

async function cmsUploadToWidget(file, widget) {
  if (!widget) return;
  const status = widget.querySelector('.js-img-status');
  try {
    if (status) status.textContent = 'Загружаю…';
    const url = await cmsUploadImageFile(file);
    if (!url) {
      if (status) status.textContent = '';
      return;
    }
    cmsApplyImgUrl(widget, url);
    if (status) status.textContent = 'Готово ✓';
    cmsToast('Фото загружено');
  } catch (err) {
    if (status) status.textContent = '';
    alert(err.message);
  }
  const fileInput = widget.querySelector('.js-img-file');
  if (fileInput) fileInput.value = '';
}

function cmsBindImgWidgets(scope) {
  (scope || document).querySelectorAll('.cms-img-widget').forEach(widget => {
    if (widget.dataset.cmsImgBound === '1') return;
    widget.dataset.cmsImgBound = '1';

    const drop = widget.querySelector('.js-img-drop');
    const fileInput = widget.querySelector('.js-img-file');
    const urlInput = widget.querySelector('.js-img-url');
    const preview = widget.querySelector('.js-img-preview');

    widget.querySelector('.js-img-pick')?.addEventListener('click', (e) => {
      e.preventDefault();
      fileInput?.click();
    });

    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) cmsUploadToWidget(file, widget);
    });

    urlInput?.addEventListener('input', () => {
      cmsUpdateImgPreview(urlInput.value, preview);
      cmsApplyImgUrl(widget, urlInput.value.trim());
    });

    if (!drop || !cms.canWrite) return;

    const onDrag = (e) => { e.preventDefault(); e.stopPropagation(); };
    drop.addEventListener('dragenter', onDrag);
    drop.addEventListener('dragover', (e) => {
      onDrag(e);
      drop.classList.add('is-drag');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-drag'));
    drop.addEventListener('drop', (e) => {
      onDrag(e);
      drop.classList.remove('is-drag');
      const file = e.dataTransfer?.files?.[0];
      if (file) cmsUploadToWidget(file, widget);
    });
  });
}

function cmsBindHeroDrop(heroEl) {
  if (!heroEl || heroEl.dataset.cmsHeroDrop === '1' || !cms.canWrite) return;
  heroEl.dataset.cmsHeroDrop = '1';

  const onDrag = (e) => { e.preventDefault(); e.stopPropagation(); };
  heroEl.addEventListener('dragenter', onDrag);
  heroEl.addEventListener('dragover', (e) => {
    onDrag(e);
    heroEl.classList.add('cms-hero-drag');
  });
  heroEl.addEventListener('dragleave', () => heroEl.classList.remove('cms-hero-drag'));
  heroEl.addEventListener('drop', async (e) => {
    onDrag(e);
    heroEl.classList.remove('cms-hero-drag');
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    try {
      cmsToast('Загружаю фото…');
      const url = await cmsUploadImageFile(file);
      if (!url) return;
      cms.draft.heroImage = url;
      heroEl.style.backgroundImage = `linear-gradient(to bottom, transparent 40%, rgba(27,27,27,0.95)), url('${url}')`;
      const inp = cms$('#f_heroImage');
      if (inp) inp.value = url;
      cmsToast('Фото загружено');
    } catch (err) {
      alert(err.message);
    }
  });
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
        <p class="cms-hint">Маленькая/большая карточка на главной. Описание, рестораны, сайд-ивенты — в модалке.</p>
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
        <p class="cms-hint">Открой модалку — поля с карточки подставятся автоматически. Редактируй прямо в окне как на сайте.</p>
        <button type="button" class="cms-btn cms-btn--primary" id="cmsDrawerModalBtn" style="width:100%">Открыть модалку для редактирования</button>
      </div>
    </div>
  `;

  cms$('#cmsDrawerSave')?.addEventListener('click', cmsSave);
  cms$('#cmsDrawerDelete')?.addEventListener('click', cmsDeleteCurrent);
  cms$('#cmsDrawerModalBtn')?.addEventListener('click', cmsOpenModal);

  cms$('#f_heroImage')?.addEventListener('input', (e) => {
    const widget = e.target.closest('.cms-img-widget');
    cmsUpdateImgPreview(e.target.value, widget?.querySelector('.js-img-preview'));
    if (cms.draft) cms.draft.heroImage = e.target.value.trim();
  });
  root.querySelectorAll('.js-img-url').forEach(inp => {
    inp.addEventListener('input', () => {
      const widget = inp.closest('.cms-img-widget');
      cmsUpdateImgPreview(inp.value, widget?.querySelector('.js-img-preview'));
    });
  });
  cmsBindImgWidgets(root);
}

function cmsUpdateImgPreview(url, box) {
  if (!box) return;
  const trimmed = (url || '').trim();
  box.innerHTML = trimmed
    ? `<img src="${escAttr(trimmed)}" alt="" />`
    : '<span class="cms-img-drop__empty">📷</span><span class="cms-img-drop__text">Перетащи фото или нажми «Загрузить»</span>';
  if (trimmed && box.closest('.cms-img-drop--compact')) {
    box.innerHTML = `<img src="${escAttr(trimmed)}" alt="" />`;
  }
}

function cmsRowVal(row, sel) {
  const el = row.querySelector(sel);
  return el ? el.value.trim() : '';
}

function cmsModalPlainText(el) {
  if (!el) return '';
  return el.textContent.replace(/\s+/g, ' ').trim();
}

function cmsApplyDraftToEventMap(d) {
  if (!d || !d.id || typeof toModalEvent !== 'function') return;
  const modal = toModalEvent(d);
  modal.promoNote = d.promoNote || null;
  modal.heroImage = d.heroImage || modal.heroImage || '';
  modal.restaurants = d.restaurants || [];
  modal.sideEvents = d.sideEvents || [];
  modal.awards = d.awards || [];
  modal.weather = d.weather || null;
  modal.promo = d.promo || null;
  modal.website = d.website || '';
  modal.telegramChannel = d.telegramChannel || null;
  modal.description = d.description || '';
  EVENTS[d.id] = modal;
}

function cmsReadRestaurants() {
  return [...(cms$('#guide')?.querySelectorAll('.cms-item-edit') || [])].map(wrap => {
    const o = {
      name: cmsRowVal(wrap, '[data-r="name"]'),
      vibe: wrap.querySelector('[data-r="vibe"]')?.value || 'посидеть',
      avgCheck: cmsRowVal(wrap, '[data-r="avgCheck"]'),
      description: cmsRowVal(wrap, '[data-r="description"]'),
      img: cmsRowVal(wrap, '[data-r="img"]')
    };
    const web = cmsRowVal(wrap, '[data-r="website"]');
    if (web) o.website = web;
    return o;
  }).filter(o => o.name);
}

function cmsReadSideEvents() {
  return [...(cms$('#events')?.querySelectorAll('.cms-item-edit') || [])].map(wrap => {
    const o = {
      title: cmsRowVal(wrap, '[data-s="title"]'),
      date: cmsRowVal(wrap, '[data-s="date"]'),
      location: cmsRowVal(wrap, '[data-s="location"]'),
      type: wrap.querySelector('[data-s="type"]')?.value || 'party',
      description: cmsRowVal(wrap, '[data-s="description"]')
    };
    const url = cmsRowVal(wrap, '[data-s="registerUrl"]');
    const label = cmsRowVal(wrap, '[data-s="registerLabel"]');
    const img = cmsRowVal(wrap, '[data-s="img"]');
    if (url) o.registerUrl = url;
    if (label) o.registerLabel = label;
    if (img) o.img = img;
    return o;
  }).filter(o => o.title || o.date || o.location);
}

function cmsReadAwards() {
  return [...(cms$('#awards')?.querySelectorAll('.cms-item-edit') || [])].map(wrap => {
    const catsRaw = wrap.querySelector('[data-a="cats"]')?.value || '';
    return {
      name: cmsRowVal(wrap, '[data-a="name"]'),
      date: cmsRowVal(wrap, '[data-a="date"]'),
      categories: catsRaw.split('\n').map(s => s.trim()).filter(Boolean),
      website: cmsRowVal(wrap, '[data-a="web"]')
    };
  }).filter(o => o.name);
}

function cmsReadWeatherFromModal() {
  const temp = cms$('#cmsM_weatherTemp')?.value.trim() || '';
  const desc = cms$('#cmsM_weatherDesc')?.value.trim() || '';
  if (!temp && !desc) return null;
  return { temp, description: desc };
}

function cmsCollectFromModal() {
  const promoRaw = cmsModalPlainText(cms$('.stat-value.promo, .stat-value.no-promo'));
  const promoPending = typeof PROMO_PENDING_MESSAGE !== 'undefined' ? PROMO_PENDING_MESSAGE : 'Скидка в работе';
  const attRaw = cmsModalPlainText(cms$('.stat-value.attendees')).replace(/[^\d]/g, '');

  return {
    title: cmsModalPlainText(cms$('.modal-title')) || cms.draft?.title || '',
    description: cmsModalPlainText(cms$('.modal-description')) || '',
    locationLine: cms$('#cmsM_location')?.value.trim() || cmsModalPlainText(cms$('.modal-location')) || '',
    datesLabel: cms$('#cmsM_dates')?.value.trim() || cmsModalPlainText(cms$('.modal-dates')) || '',
    attendees: Number(attRaw) || Number(cms$('#cmsM_attendees')?.value) || cms.draft?.attendees || 0,
    website: cms$('#cmsM_website')?.value.trim() || '',
    telegramChannel: cms$('#cmsM_telegram')?.value.trim() || null,
    promo: (promoRaw && promoRaw !== promoPending) ? promoRaw : (cms$('#cmsM_promo')?.value.trim() || null),
    promoNote: cms$('#cmsM_promoNote')?.value.trim() || null,
    weather: cmsReadWeatherFromModal(),
    restaurants: cmsReadRestaurants(),
    sideEvents: cmsReadSideEvents(),
    awards: cmsReadAwards(),
    heroImage: cms.draft?.heroImage || ''
  };
}

function cmsCollectCardFields() {
  const g = id => cms$('#' + id);
  const title = g('f_title')?.value.trim() || '';
  let id = g('f_id')?.value.trim() || '';
  if (!id && title) id = slugify(title);

  const updated = {
    id,
    title,
    datesLabel: g('f_datesLabel')?.value.trim() || '',
    locationLine: g('f_locationLine')?.value.trim() || '',
    country: (g('f_country')?.value.trim() || '').toUpperCase(),
    month: Number(g('f_month')?.value) || 1,
    sortOrder: Number(g('f_sortOrder')?.value) || 0,
    startDate: g('f_startDate')?.value || null,
    endDate: g('f_endDate')?.value || null,
    tier: g('f_tier')?.value || 'mid',
    attendees: Number(g('f_attendees')?.value) || 0,
    cardType: g('f_cardType')?.value || 'compact',
    cardStyle: g('f_cardStyle')?.value || 'elegant-dark',
    category: g('f_category')?.value.trim() || 'iGaming',
    accentColor: g('f_accentColor')?.value.trim() || '#2E39F7',
    heroImage: g('f_heroImage')?.value.trim() || '',
    visible: g('f_visible')?.checked !== false
  };

  if (updated.startDate) updated.startISO = updated.startDate + 'T09:00:00Z';
  if (updated.endDate) updated.endISO = updated.endDate + 'T18:00:00Z';

  return updated;
}

function cmsCollectFullDraft() {
  cmsSyncDraftFromForm();
  if (document.body.classList.contains('cms-modal-open')) {
    Object.assign(cms.draft, cmsCollectFromModal());
  }
  const out = { ...cms.draft };
  delete out._isNew;
  return out;
}

function cmsSyncDraftFromForm() {
  if (!cms$('#cmsEditorForm') || !cms.draft) return;
  Object.assign(cms.draft, cmsCollectCardFields());
}

function cmsSyncModalToSidebar() {
  if (!cms.draft) return;
  Object.assign(cms.draft, cmsCollectFromModal());
  cmsRenderEditor(cms.draft);
}

function cmsRefreshModalEdit() {
  if (!cms.editingId || !document.body.classList.contains('cms-modal-open')) return;
  Object.assign(cms.draft, cmsCollectFromModal());
  cmsSyncDraftFromForm();
  cmsApplyDraftToEventMap(cms.draft);
  if (typeof populateModal === 'function') populateModal(cms.editingId);
}

function cmsInjectModalExtraFields(ev) {
  cms$('#cmsModalExtra')?.remove();
  const w = ev.weather || { temp: '', description: '' };
  const box = document.createElement('div');
  box.id = 'cmsModalExtra';
  box.className = 'cms-modal-extra';
  box.innerHTML = `
    <div class="cms-form-row">
      <label><span>Место (как в модалке)</span><input id="cmsM_location" value="${escAttr(ev.locationLine || '')}" /></label>
      <label><span>Даты (подпись)</span><input id="cmsM_dates" value="${escAttr(ev.datesLabel || '')}" /></label>
    </div>
    <div class="cms-form-row">
      <label><span>Участников</span><input id="cmsM_attendees" type="number" value="${ev.attendees || 0}" /></label>
      <label><span>Промокод</span><input id="cmsM_promo" value="${escAttr(ev.promo || '')}" placeholder="пусто = скидка в работе" /></label>
    </div>
    <div class="cms-form-row">
      <label><span>Оф. сайт</span><input id="cmsM_website" type="url" value="${escAttr(ev.website || '')}" /></label>
      <label><span>Telegram</span><input id="cmsM_telegram" value="${escAttr(ev.telegramChannel || '')}" /></label>
    </div>
    <div class="cms-form-row">
      <label><span>Погода °C</span><input id="cmsM_weatherTemp" value="${escAttr(w.temp || '')}" /></label>
      <label><span>Погода текст</span><input id="cmsM_weatherDesc" value="${escAttr(w.description || '')}" /></label>
    </div>
    <label><span>Примечание к промо</span><input id="cmsM_promoNote" value="${escAttr(ev.promoNote || '')}" /></label>
  `;
  cms$('#modalStats')?.after(box);

  box.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => {
      if (inp.id === 'cmsM_location') {
        const loc = cms$('.modal-location');
        if (loc) loc.lastChild.textContent = ' ' + inp.value;
      }
      if (inp.id === 'cmsM_dates') {
        const d = cms$('.modal-dates');
        if (d) d.lastChild.textContent = ' ' + inp.value;
      }
      if (inp.id === 'cmsM_attendees') {
        const n = Number(inp.value) || 0;
        const el = cms$('.stat-value.attendees');
        if (el) el.textContent = n >= 1000 ? (Math.round(n / 100) / 10).toString().replace(/\.0$/, '') + ',000' : String(n);
      }
      if (inp.id === 'cmsM_weatherTemp' || inp.id === 'cmsM_weatherDesc') {
        cmsUpdateModalWeatherPreview();
      }
    });
  });
}

function cmsUpdateModalWeatherPreview() {
  const temp = cms$('#cmsM_weatherTemp')?.value.trim();
  const desc = cms$('#cmsM_weatherDesc')?.value.trim();
  let overlay = cms$('.weather-overlay');
  if (!temp && !desc) {
    overlay?.remove();
    return;
  }
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'weather-overlay';
    cms$('.modal-hero')?.appendChild(overlay);
  }
  overlay.innerHTML = `<div class="temp">🌡️ ${escHtml(temp || '—')}</div><div>${escHtml(desc || '')}</div>`;
}

function cmsInjectModalHeroUpload() {
  const heroWrap = cms$('#modalHero');
  if (!heroWrap || heroWrap.querySelector('.cms-hero-edit')) return;
  const hero = heroWrap.querySelector('.modal-hero');
  const bar = document.createElement('div');
  bar.className = 'cms-hero-edit';
  bar.innerHTML = `<button type="button" class="cms-btn cms-btn--sm" id="cmsHeroUploadBtn">📷 Загрузить</button>
    <span class="cms-hero-edit__hint">или перетащи на обложку</span>
    <input type="file" accept="image/*" id="cmsHeroFile" hidden />`;
  hero?.appendChild(bar);

  cms$('#cmsHeroUploadBtn')?.addEventListener('click', () => cms$('#cmsHeroFile')?.click());
  cms$('#cmsHeroFile')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file || !cms.canWrite) return;
    try {
      cmsToast('Загружаю фото…');
      const url = await cmsUploadImageFile(file);
      if (!url) return;
      cms.draft.heroImage = url;
      if (hero) hero.style.backgroundImage = `linear-gradient(to bottom, transparent 40%, rgba(27,27,27,0.95)), url('${url}')`;
      const inp = cms$('#f_heroImage');
      if (inp) inp.value = url;
      cmsToast('Фото загружено');
    } catch (err) {
      alert(err.message);
    }
    e.target.value = '';
  });
  if (hero) cmsBindHeroDrop(hero);
}

function cmsInjectModalListEditors(ev) {
  cmsInjectModalRestaurants(ev.restaurants || []);
  cmsInjectModalSideEvents(ev.sideEvents || []);
  cmsInjectModalAwards(ev.awards || []);
}

function cmsInjectModalRestaurants(list) {
  const guide = cms$('#guide');
  if (!guide) return;

  guide.querySelectorAll('.cms-list-tools--rest, .cms-item-edit').forEach(el => el.remove());

  const tools = document.createElement('div');
  tools.className = 'cms-list-tools cms-list-tools--rest';
  tools.innerHTML = `<button type="button" class="cms-btn cms-btn--sm" id="cmsAddRest">+ Ресторан</button>`;
  guide.prepend(tools);
  cms$('#cmsAddRest')?.addEventListener('click', () => {
    Object.assign(cms.draft, cmsCollectFromModal());
    cmsSyncDraftFromForm();
    cms.draft.restaurants = cms.draft.restaurants || [];
    cms.draft.restaurants.push({ name: 'Новый ресторан', vibe: 'посидеть', avgCheck: '', description: '', img: '', website: '' });
    cmsRefreshModalEdit();
  });

  guide.querySelectorAll('.restaurant-card').forEach((card, i) => {
    if (card.closest('.cms-item-edit')) return;
    const wrap = document.createElement('div');
    wrap.className = 'cms-item-edit';
    const r = list[i] || {};
    wrap.innerHTML = `
      <div class="cms-item-edit__bar">
        <input data-r="name" value="${escAttr(r.name || '')}" placeholder="Название" />
        <select data-r="vibe">${['посидеть','громко','тихо','потанцевать'].map(v =>
          `<option value="${v}" ${r.vibe === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <input data-r="avgCheck" value="${escAttr(r.avgCheck || '')}" placeholder="Чек" />
        <input data-r="website" value="${escAttr(r.website || '')}" placeholder="Ссылка" />
        ${cmsItemImgUpload('r', r.img || '')}
        <textarea data-r="description" placeholder="Описание">${escHtml(r.description || '')}</textarea>
        <button type="button" data-r="del">Удалить</button>
      </div>`;
    card.parentNode.insertBefore(wrap, card);
    wrap.appendChild(card);
    wrap.querySelector('[data-r="del"]')?.addEventListener('click', () => {
      Object.assign(cms.draft, cmsCollectFromModal());
      cms.draft.restaurants.splice(i, 1);
      cmsRefreshModalEdit();
    });
    cmsBindImgWidgets(wrap);
  });
}

function cmsInjectModalSideEvents(list) {
  const tab = cms$('#events');
  if (!tab) return;

  tab.querySelectorAll('.cms-list-tools--side, .cms-item-edit').forEach(el => el.remove());

  const tools = document.createElement('div');
  tools.className = 'cms-list-tools cms-list-tools--side';
  tools.innerHTML = `<button type="button" class="cms-btn cms-btn--sm" id="cmsAddSide">+ Сайд-ивент</button>`;
  tab.prepend(tools);
  cms$('#cmsAddSide')?.addEventListener('click', () => {
    Object.assign(cms.draft, cmsCollectFromModal());
    cms.draft.sideEvents = cms.draft.sideEvents || [];
    cms.draft.sideEvents.push({ title: 'Новый ивент', date: '', location: '', type: 'party', description: '' });
    cmsRefreshModalEdit();
  });

  tab.querySelectorAll('.side-event-card').forEach((card, i) => {
    if (card.closest('.cms-item-edit')) return;
    const wrap = document.createElement('div');
    wrap.className = 'cms-item-edit';
    const se = list[i] || {};
    wrap.innerHTML = `
      <div class="cms-item-edit__bar">
        <input data-s="title" value="${escAttr(se.title || '')}" placeholder="Название" />
        <input data-s="date" value="${escAttr(se.date || '')}" placeholder="Дата" />
        <input data-s="location" value="${escAttr(se.location || '')}" placeholder="Место" />
        <select data-s="type">${['party','dinner','meetup','awards','networking','sport'].map(t =>
          `<option value="${t}" ${se.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <input data-s="registerUrl" value="${escAttr(se.registerUrl || '')}" placeholder="Ссылка" />
        <input data-s="registerLabel" value="${escAttr(se.registerLabel || '')}" placeholder="Подпись кнопки" />
        ${cmsItemImgUpload('s', se.img || '')}
        <textarea data-s="description" placeholder="Описание">${escHtml(se.description || '')}</textarea>
        <button type="button" data-s="del">Удалить</button>
      </div>`;
    card.parentNode.insertBefore(wrap, card);
    wrap.appendChild(card);
    wrap.querySelector('[data-s="del"]')?.addEventListener('click', () => {
      Object.assign(cms.draft, cmsCollectFromModal());
      cms.draft.sideEvents.splice(i, 1);
      cmsRefreshModalEdit();
    });
    cmsBindImgWidgets(wrap);
  });
}

function cmsInjectModalAwards(list) {
  const tab = cms$('#awards');
  if (!tab) return;

  tab.querySelectorAll('.cms-list-tools--awards, .cms-item-edit').forEach(el => el.remove());

  const tools = document.createElement('div');
  tools.className = 'cms-list-tools cms-list-tools--awards';
  tools.innerHTML = `<button type="button" class="cms-btn cms-btn--sm" id="cmsAddAward">+ Award</button>`;
  tab.prepend(tools);
  cms$('#cmsAddAward')?.addEventListener('click', () => {
    Object.assign(cms.draft, cmsCollectFromModal());
    cms.draft.awards = cms.draft.awards || [];
    cms.draft.awards.push({ name: '', date: '', categories: [], website: '' });
    cmsRefreshModalEdit();
  });

  tab.querySelectorAll('.award-card').forEach((card, i) => {
    if (card.closest('.cms-item-edit')) return;
    const wrap = document.createElement('div');
    wrap.className = 'cms-item-edit';
    const a = list[i] || {};
    wrap.innerHTML = `
      <div class="cms-item-edit__bar">
        <input data-a="name" value="${escAttr(a.name || '')}" placeholder="Название" />
        <input data-a="date" value="${escAttr(a.date || '')}" placeholder="Дата" />
        <textarea data-a="cats" placeholder="Категории (по строке)">${escHtml((a.categories || []).join('\n'))}</textarea>
        <input data-a="web" value="${escAttr(a.website || '')}" placeholder="Сайт" />
        <button type="button" data-a="del">Удалить</button>
      </div>`;
    card.parentNode.insertBefore(wrap, card);
    wrap.appendChild(card);
    wrap.querySelector('[data-a="del"]')?.addEventListener('click', () => {
      Object.assign(cms.draft, cmsCollectFromModal());
      cms.draft.awards.splice(i, 1);
      cmsRefreshModalEdit();
    });
  });
}

window.onCmsModalPopulated = function (eventId) {
  cms.editingId = eventId;
  if (!cms.draft || cms.draft.id !== eventId) {
    cms.draft = JSON.parse(JSON.stringify(cms.events.find(e => e.id === eventId) || {}));
  }

  document.body.classList.add('cms-edit-mode');

  let hint = cms$('#cmsModalHint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'cmsModalHint';
    hint.className = 'cms-modal-hint';
    cms$('#modalPanel')?.insertBefore(hint, cms$('#cmsModalScroll'));
  }
  hint.textContent = 'Редактируй как на сайте. Поля с карточки слева уже подставлены.';

  const title = cms$('.modal-title');
  const desc = cms$('.modal-description');
  if (title) { title.classList.add('cms-editable'); title.contentEditable = 'true'; }
  if (desc) { desc.classList.add('cms-editable'); desc.contentEditable = 'true'; }

  cms$('.stat-value.attendees')?.classList.add('cms-stat-edit');
  cms$$('.stat-value.promo, .stat-value.no-promo, .stat-value.promo-pending').forEach(el => el.classList.add('cms-stat-edit'));
  cms$$('.cms-stat-edit').forEach(el => { el.contentEditable = 'true'; });

  cmsInjectModalExtraFields(cms.draft);
  cmsInjectModalHeroUpload();
  cmsInjectModalListEditors(cms.draft);
  cmsBindImgWidgets(cms$('#cmsModalScroll'));
};

function cms$$(sel) { return [...document.querySelectorAll(sel)]; }

function cmsOpenModal() {
  if (!cms.editingId) return;
  cmsSyncDraftFromForm();
  cmsApplyDraftToEventMap(cms.draft);
  if (typeof populateModal === 'function') populateModal(cms.editingId);
  if (typeof openModal === 'function') openModal();
  document.body.classList.add('cms-modal-open');
}

function cmsHookModalClose() {
  const original = window.closeModal;
  if (typeof original !== 'function') return;
  window.closeModal = function () {
    if (window.CMS_EDIT_MODE && document.body.classList.contains('cms-modal-open')) {
      cmsSyncModalToSidebar();
    }
    document.body.classList.remove('cms-modal-open', 'cms-edit-mode');
    cms$('#cmsModalHint')?.remove();
    cms$('#cmsModalExtra')?.remove();
    original();
  };
}

async function cmsHandleImageUpload(fileInput) {
  const file = fileInput.files?.[0];
  const widget = fileInput.closest('.cms-img-widget');
  if (file && widget) await cmsUploadToWidget(file, widget);
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
    const updated = cmsCollectFullDraft();
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

function cmsHideCurrent() {
  if (!cms.editingId || !cms.canWrite) return;
  if (!confirm('Скрыть ивент с сайта?')) return;
  cmsSyncDraftFromForm();
  cms.draft.visible = false;
  const vis = cms$('#f_visible');
  if (vis) vis.checked = false;
  cmsSave();
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

// Проверка пароля на сервере. Старые деплои GAS без action=auth отвечают
// «Unknown action» уже ПОСЛЕ проверки пароля, так что «Неверный пароль»
// в любом случае означает именно неверный пароль.
async function cmsVerifyPassword() {
  if (!cms.apiUrl || !cms.password) {
    throw new Error('Введи пароль');
  }
  const res = await fetch(cms.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'auth', password: cms.password })
  });
  const data = await res.json();
  if (!data.ok && /парол/i.test(data.error || '')) {
    throw new Error('Неверный пароль — проверь раскладку и лишние пробелы');
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
    await cmsVerifyPassword();
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
  cms$('#cmsPassword')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') cmsLogin();
  });
  cms$('#cmsPassToggle')?.addEventListener('click', () => {
    const input = cms$('#cmsPassword');
    const btn = cms$('#cmsPassToggle');
    if (!input || !btn) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.querySelector('.cms-eye')?.classList.toggle('hidden', show);
    btn.querySelector('.cms-eye-off')?.classList.toggle('hidden', !show);
    btn.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
    btn.setAttribute('title', show ? 'Скрыть пароль' : 'Показать пароль');
    input.focus();
  });
  cms$('#cmsLogoutBtn')?.addEventListener('click', cmsLogout);
  cms$('#cmsSaveBtn')?.addEventListener('click', cmsSave);
  cms$('#cmsPreviewBtn')?.addEventListener('click', cmsOpenModal);
  cms$('#cmsNewBtn')?.addEventListener('click', cmsNewEvent);
  cms$('#cmsHideBtn')?.addEventListener('click', cmsHideCurrent);

  cmsHookModalClose();

  cms$('#cmsEditorRoot')?.addEventListener('change', (e) => {
    if (e.target.classList?.contains('js-img-file')) cmsHandleImageUpload(e.target);
  });

  if (session.apiUrl && session.password) {
    cms$('#cmsPassword').value = session.password;
    cmsLogin();
  }
});
