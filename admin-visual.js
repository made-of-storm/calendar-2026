/**
 * Визуальный редактор: тот же календарь, правки в открытой карточке.
 */
const CMS_STORAGE = 'sr_calendar_admin';

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
}

function cmsBindCards() {
  document.querySelectorAll('.event-card[data-event-id]').forEach(card => {
    const clone = card.cloneNode(true);
    card.parentNode.replaceChild(clone, card);
    clone.addEventListener('click', () => {
      const id = clone.getAttribute('data-event-id');
      if (!id) return;
      populateModal(id);
      openModal();
    });
  });
}

function cmsGetDraft() {
  if (!cms.draft || cms.draft.id !== cms.editingId) {
    cms.draft = JSON.parse(JSON.stringify(cms.events.find(e => e.id === cms.editingId) || {}));
  }
  return cms.draft;
}

function cmsInjectMetaPanel(ev) {
  let panel = cms$('#cmsMetaPanel');
  if (panel) panel.remove();

  panel = document.createElement('div');
  panel.id = 'cmsMetaPanel';
  panel.className = 'cms-meta-panel';
  panel.innerHTML = `
    <div class="cms-meta-panel__title">Поля карточки (как на сайте)</div>
    <div class="cms-meta-grid">
      <label><span>Даты (подпись)</span><input type="text" data-cms="datesLabel" value="${escAttr(ev.datesLabel || '')}" /></label>
      <label><span>Локация</span><input type="text" data-cms="locationLine" value="${escAttr(ev.locationLine || '')}" /></label>
      <label><span>Страна (код)</span><input type="text" data-cms="country" value="${escAttr(ev.country || '')}" maxlength="2" /></label>
      <label><span>Участников</span><input type="number" data-cms="attendees" value="${escAttr(ev.attendees || 0)}" /></label>
      <label><span>Дата начала</span><input type="date" data-cms="startDate" value="${escAttr(ev.startDate || '')}" /></label>
      <label><span>Дата конца</span><input type="date" data-cms="endDate" value="${escAttr(ev.endDate || '')}" /></label>
      <label><span>Промокод</span><input type="text" data-cms="promo" value="${escAttr(ev.promo || '')}" placeholder="пусто = скидка в работе" /></label>
      <label><span>Категория</span><input type="text" data-cms="category" value="${escAttr(ev.category || '')}" /></label>
      <label class="full"><span>Сайт</span><input type="url" data-cms="website" value="${escAttr(ev.website || '')}" /></label>
      <label class="full"><span>Telegram</span><input type="url" data-cms="telegramChannel" value="${escAttr(ev.telegramChannel || '')}" /></label>
      <label><span>Погода °C</span><input type="text" data-cms="weatherTemp" value="${escAttr(ev.weather?.temp || '')}" /></label>
      <label class="full"><span>Погода текст</span><input type="text" data-cms="weatherDesc" value="${escAttr(ev.weather?.description || '')}" /></label>
      <label class="full"><span>Обложка (URL)</span><input type="text" data-cms="heroImage" value="${escAttr(ev.heroImage || '')}" /></label>
    </div>
  `;

  const stats = cms$('#modalStats');
  if (stats) stats.after(panel);

  panel.querySelector('[data-cms="heroImage"]')?.addEventListener('change', (e) => {
    const url = e.target.value.trim();
    const hero = cms$('.modal-hero');
    if (hero && url) {
      hero.style.backgroundImage = `linear-gradient(to bottom, transparent 40%, rgba(27,27,27,0.95)), url('${url}')`;
    }
  });
}

function cmsInjectHeroUpload() {
  const heroWrap = cms$('#modalHero');
  if (!heroWrap || heroWrap.querySelector('.cms-hero-edit')) return;
  const bar = document.createElement('div');
  bar.className = 'cms-hero-edit';
  bar.innerHTML = `<button type="button" class="cms-btn" id="cmsHeroUploadBtn">📷 Фото</button>
    <input type="file" accept="image/*" id="cmsHeroFile" hidden />`;
  heroWrap.querySelector('.modal-hero')?.appendChild(bar);

  cms$('#cmsHeroUploadBtn')?.addEventListener('click', () => cms$('#cmsHeroFile')?.click());
  cms$('#cmsHeroFile')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file || !cms.canWrite) return;
    try {
      cmsToast('Загружаю фото…');
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const data = await cmsApiPost({ action: 'uploadImage', dataUrl, name: file.name });
      const inp = cms$('#cmsMetaPanel [data-cms="heroImage"]');
      if (inp) {
        inp.value = data.url;
        inp.dispatchEvent(new Event('change'));
      }
      cmsToast('Фото загружено');
    } catch (err) {
      alert(err.message);
    }
    e.target.value = '';
  });
}

function cmsInjectListEditors(ev) {
  cmsInjectRestaurantEditors(ev.restaurants || []);
  cmsInjectSideEventEditors(ev.sideEvents || []);
}

function cmsInjectRestaurantEditors(list) {
  const guide = cms$('#guide');
  if (!guide) return;

  let tools = guide.querySelector('.cms-list-tools--rest');
  if (!tools) {
    tools = document.createElement('div');
    tools.className = 'cms-list-tools cms-list-tools--rest';
    tools.innerHTML = `<button type="button" class="cms-btn" id="cmsAddRest">+ Ресторан</button>`;
    guide.prepend(tools);
    cms$('#cmsAddRest')?.addEventListener('click', () => {
      const d = cmsGetDraft();
      d.restaurants = d.restaurants || [];
      d.restaurants.push({ name: 'Новый ресторан', vibe: 'посидеть', avgCheck: '', description: '', img: '', website: '' });
      populateModal(cms.editingId);
      window.onCmsModalPopulated(cms.editingId, EVENTS[cms.editingId]);
    });
  }

  guide.querySelectorAll('.restaurant-card').forEach((card, i) => {
    if (card.closest('.cms-item-edit')) return;
    const wrap = document.createElement('div');
    wrap.className = 'cms-item-edit';
    const r = list[i] || {};
    wrap.innerHTML = `
      <div class="cms-item-edit__bar">
        <input data-r="name" value="${escAttr(r.name || '')}" placeholder="Название" />
        <select data-r="vibe">
          ${['посидеть','громко','тихо','потанцевать'].map(v =>
            `<option value="${v}" ${r.vibe === v ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
        <input data-r="avgCheck" value="${escAttr(r.avgCheck || '')}" placeholder="Чек" />
        <input data-r="website" value="${escAttr(r.website || '')}" placeholder="Ссылка" />
        <input data-r="img" value="${escAttr(r.img || '')}" placeholder="URL фото" />
        <textarea data-r="description" placeholder="Описание">${escHtml(r.description || '')}</textarea>
        <button type="button" data-r="del">Удалить</button>
      </div>`;
    card.parentNode.insertBefore(wrap, card);
    wrap.appendChild(card);
    wrap.querySelector('[data-r="del"]')?.addEventListener('click', () => {
      const d = cmsGetDraft();
      d.restaurants.splice(i, 1);
      populateModal(cms.editingId);
      window.onCmsModalPopulated(cms.editingId, EVENTS[cms.editingId]);
    });
  });
}

function cmsInjectSideEventEditors(list) {
  const tab = cms$('#events');
  if (!tab) return;

  let tools = tab.querySelector('.cms-list-tools--side');
  if (!tools) {
    tools = document.createElement('div');
    tools.className = 'cms-list-tools cms-list-tools--side';
    tools.innerHTML = `<button type="button" class="cms-btn" id="cmsAddSide">+ Сайд-ивент</button>`;
    tab.prepend(tools);
    cms$('#cmsAddSide')?.addEventListener('click', () => {
      const d = cmsGetDraft();
      d.sideEvents = d.sideEvents || [];
      d.sideEvents.push({ title: 'Новый ивент', date: '', location: '', type: 'party', description: '' });
      populateModal(cms.editingId);
      window.onCmsModalPopulated(cms.editingId, EVENTS[cms.editingId]);
    });
  }

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
        <select data-s="type">
          ${['party','dinner','meetup','awards','networking','sport'].map(t =>
            `<option value="${t}" ${se.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
        <input data-s="registerUrl" value="${escAttr(se.registerUrl || '')}" placeholder="Ссылка" />
        <input data-s="img" value="${escAttr(se.img || '')}" placeholder="URL картинки" />
        <textarea data-s="description" placeholder="Описание">${escHtml(se.description || '')}</textarea>
        <button type="button" data-s="del">Удалить</button>
      </div>`;
    card.parentNode.insertBefore(wrap, card);
    wrap.appendChild(card);
    wrap.querySelector('[data-s="del"]')?.addEventListener('click', () => {
      const d = cmsGetDraft();
      d.sideEvents.splice(i, 1);
      populateModal(cms.editingId);
      window.onCmsModalPopulated(cms.editingId, EVENTS[cms.editingId]);
    });
  });
}

function cmsReadListsFromDom() {
  const restaurants = [];
  cms$('#guide')?.querySelectorAll('.cms-item-edit').forEach(wrap => {
    const o = {
      name: wrap.querySelector('[data-r="name"]')?.value.trim() || '',
      vibe: wrap.querySelector('[data-r="vibe"]')?.value || 'посидеть',
      avgCheck: wrap.querySelector('[data-r="avgCheck"]')?.value.trim() || '',
      description: wrap.querySelector('[data-r="description"]')?.value.trim() || '',
      img: wrap.querySelector('[data-r="img"]')?.value.trim() || '',
    };
    const web = wrap.querySelector('[data-r="website"]')?.value.trim();
    if (web) o.website = web;
    if (o.name) restaurants.push(o);
  });

  const sideEvents = [];
  cms$('#events')?.querySelectorAll('.cms-item-edit').forEach(wrap => {
    const o = {
      title: wrap.querySelector('[data-s="title"]')?.value.trim() || '',
      date: wrap.querySelector('[data-s="date"]')?.value.trim() || '',
      location: wrap.querySelector('[data-s="location"]')?.value.trim() || '',
      type: wrap.querySelector('[data-s="type"]')?.value || 'party',
      description: wrap.querySelector('[data-s="description"]')?.value.trim() || '',
    };
    const url = wrap.querySelector('[data-s="registerUrl"]')?.value.trim();
    const img = wrap.querySelector('[data-s="img"]')?.value.trim();
    if (url) o.registerUrl = url;
    if (img) o.img = img;
    if (o.title || o.date) sideEvents.push(o);
  });

  return { restaurants, sideEvents };
}

function cmsCollectEvent() {
  const base = { ...cmsGetDraft() };
  const panel = cms$('#cmsMetaPanel');
  const val = (k) => panel?.querySelector(`[data-cms="${k}"]`)?.value.trim() ?? '';

  base.title = cms$('.modal-title')?.textContent.trim() || base.title;
  base.description = cms$('.modal-description')?.textContent.trim() || base.description;
  base.datesLabel = val('datesLabel');
  base.locationLine = val('locationLine');
  base.country = val('country').toUpperCase();
  base.attendees = Number(val('attendees')) || 0;
  base.startDate = val('startDate') || null;
  base.endDate = val('endDate') || null;
  base.promo = val('promo') || null;
  base.category = val('category') || 'iGaming';
  base.website = val('website') || '';
  base.telegramChannel = val('telegramChannel') || null;
  base.heroImage = val('heroImage') || '';

  const wTemp = val('weatherTemp');
  const wDesc = val('weatherDesc');
  base.weather = (wTemp || wDesc) ? { temp: wTemp, description: wDesc } : null;

  if (base.startDate) base.startISO = base.startDate + 'T09:00:00Z';
  if (base.endDate) base.endISO = base.endDate + 'T18:00:00Z';

  const lists = cmsReadListsFromDom();
  base.restaurants = lists.restaurants;
  base.sideEvents = lists.sideEvents;

  delete base._isNew;
  return base;
}

function escAttr(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

window.onCmsModalPopulated = function (eventId, event) {
  cms.editingId = eventId;
  cms.draft = JSON.parse(JSON.stringify(cms.events.find(e => e.id === eventId) || {}));

  document.body.classList.add('cms-edit-mode');

  let hint = cms$('#cmsModalHint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'cmsModalHint';
    hint.className = 'cms-modal-hint';
    cms$('.modal-tabs')?.before(hint);
  }
  hint.textContent = 'Кликай по тексту заголовка и описания — правь прямо на месте. Поля ниже и вкладки — как на сайте.';

  cms$('.modal-title')?.classList.add('cms-editable');
  cms$('.modal-description')?.classList.add('cms-editable');
  if (cms$('.modal-title')) cms$('.modal-title').contentEditable = 'true';
  if (cms$('.modal-description')) cms$('.modal-description').contentEditable = 'true';

  cmsInjectMetaPanel(cms.draft);
  cmsInjectHeroUpload();
  cmsInjectListEditors(cms.draft);
};

async function cmsSave() {
  if (!cms.canWrite) {
    alert('Нужны URL API и пароль для сохранения.');
    return;
  }
  if (!cms.editingId) {
    alert('Сначала открой карточку ивента на календаре.');
    return;
  }
  try {
    const updated = cmsCollectEvent();
    if (!updated.title) {
      alert('Укажи название');
      return;
    }
    const data = await cmsApiPost({ action: 'save', event: updated });
    cms.events = data.events || [];
    await cmsReloadCalendar();
    populateModal(updated.id);
    window.onCmsModalPopulated(updated.id, EVENTS[updated.id]);
    cmsToast('Сохранено');
  } catch (e) {
    alert(e.message);
  }
}

async function cmsHideCurrent() {
  if (!cms.editingId || !cms.canWrite) return;
  if (!confirm('Скрыть ивент с сайта? (visible = false)')) return;
  const ev = cmsCollectEvent();
  ev.visible = false;
  try {
    await cmsApiPost({ action: 'save', event: ev });
    await cmsReloadCalendar();
    closeModal();
    cmsToast('Ивент скрыт');
  } catch (e) {
    alert(e.message);
  }
}

function cmsNewEvent() {
  const ev = {
    id: 'new_event_' + Date.now(),
    month: new Date().getMonth() + 1,
    sortOrder: 0,
    visible: true,
    cardType: 'compact',
    tier: 'small',
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
    weather: null,
    awards: [],
    restaurants: [],
    sideEvents: []
  };
  cms.events.push(ev);
  cms.draft = ev;
  cms.editingId = ev.id;
  if (!EVENTS[ev.id]) {
    EVENTS[ev.id] = typeof toModalEvent === 'function' ? toModalEvent(ev) : ev;
  }
  populateModal(ev.id);
  openModal();
  window.onCmsModalPopulated(ev.id, EVENTS[ev.id]);
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
    document.body.classList.remove('cms-pending');
    document.body.classList.add('cms-ready');
    cmsBindCards();
    cmsToast('Редактор готов — кликни на ивент');
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
  cms$('#cmsLogin')?.classList.remove('hidden');
  document.body.classList.add('cms-pending');
  document.body.classList.remove('cms-ready');
}

document.addEventListener('DOMContentLoaded', () => {
  const session = loadCmsSession();
  const defaultApi = (window.CMS_CONFIG && window.CMS_CONFIG.eventsApiUrl) || '';
  if (cms$('#cmsApiUrl')) cms$('#cmsApiUrl').value = session.apiUrl || defaultApi;

  cms$('#cmsLoginBtn')?.addEventListener('click', cmsLogin);
  cms$('#cmsLogoutBtn')?.addEventListener('click', cmsLogout);
  cms$('#cmsSaveBtn')?.addEventListener('click', cmsSave);
  cms$('#cmsNewBtn')?.addEventListener('click', cmsNewEvent);
  cms$('#cmsHideBtn')?.addEventListener('click', cmsHideCurrent);

  if (session.apiUrl && session.password) {
    cms$('#cmsPassword').value = session.password;
    cmsLogin();
  }
});
