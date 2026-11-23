// Загрузка ивентов: CMS (Google Sheets) → fallback data/events.json

function toModalEvent(ev) {
  const locParts = (ev.locationLine || '').split(',').map(s => s.trim()).filter(Boolean);
  const countryName = locParts[0] || ev.country || '';
  const city = locParts.length > 1 ? locParts.slice(1).join(', ') : (locParts[0] || '');

  let attendeesStr = '—';
  if (ev.attendees) {
    const n = Number(ev.attendees);
    attendeesStr = n >= 1000
      ? (Math.round(n / 100) / 10).toString().replace(/\.0$/, '') + ',000'
      : String(n);
    if (n < 1000) attendeesStr = String(n);
  }

  return {
    title: ev.title,
    description: ev.description || '',
    city,
    country: ev.country,
    countryName,
    dates: ev.datesLabel || '',
    attendees: attendeesStr,
    weather: ev.weather || null,
    heroImage: ev.heroImage || '',
    heroPosition: getHeroPosition(ev),
    startISO: ev.startISO || (ev.startDate ? ev.startDate + 'T09:00:00Z' : null),
    endISO: ev.endISO || (ev.endDate ? ev.endDate + 'T18:00:00Z' : null),
    website: ev.website || '',
    telegramChannel: ev.telegramChannel || null,
    awards: ev.awards || [],
    restaurants: ev.restaurants || [],
    brands: ev.brands || [],
    sideEvents: ev.sideEvents || [],
    promo: ev.promo || null,
    promoNote: ev.promoNote || null
  };
}

function buildEventsMap(eventList) {
  const map = {};
  for (const ev of eventList) {
    map[ev.id] = toModalEvent(ev);
  }
  return map;
}

function normalizeDate(v) {
  if (!v) return v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v);
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function normalizeEventsData(data) {
  if (data && Array.isArray(data.events)) {
    data.events.forEach(ev => {
      ev.startDate = normalizeDate(ev.startDate);
      ev.endDate = normalizeDate(ev.endDate);
    });
  }
  return data;
}

async function loadVisaMatrix() {
  const apiUrl = (window.CMS_CONFIG && window.CMS_CONFIG.eventsApiUrl) || '';
  if (apiUrl) {
    try {
      const sep = apiUrl.includes('?') ? '&' : '?';
      const res = await fetch(apiUrl + sep + 'action=visa&t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (data && data.visa && Object.keys(data.visa).length) return data.visa;
      }
    } catch (e) {
      console.warn('Визы из CMS недоступны, используем встроенные', e);
    }
  }
  try {
    const res = await fetch('data/visa.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data && data.visa) return data.visa;
    }
  } catch (e) {}
  return null;
}

async function loadEventsData() {
  const apiUrl = (window.CMS_CONFIG && window.CMS_CONFIG.eventsApiUrl) || '';
  if (apiUrl) {
    try {
      const sep = apiUrl.includes('?') ? '&' : '?';
      const res = await fetch(apiUrl + sep + 'action=list&t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.events)) return normalizeEventsData(data);
      }
    } catch (e) {
      console.warn('CMS недоступен, используем локальный events.json', e);
    }
  }
  const res = await fetch('data/events.json?t=' + Date.now());
  if (!res.ok) throw new Error('Не удалось загрузить events.json');
  return normalizeEventsData(await res.json());
}

// ------------------------------
// Выбор года (2026 / 2027)
// Год берётся из адреса страницы: ?year=2027. По умолчанию 2026.
// Ивенты 2027 лежат в data/events-2027.json; ивенты из CMS тоже
// раскладываются по годам — по полю year, дате начала или окончанию id (_2027).
// loadEventsData() не меняется — её же использует админка.
// ------------------------------
const CALENDAR_YEARS = [2026, 2027];
const DEFAULT_CALENDAR_YEAR = 2026;

function getSelectedYear() {
  try {
    // Отдельная страница года: igaming-calendar.com/2027
    const pm = location.pathname.match(/^\/(\d{4})\/?(?:index\.html)?$/);
    if (pm && CALENDAR_YEARS.includes(Number(pm[1]))) return Number(pm[1]);
    const y = parseInt(new URLSearchParams(location.search).get('year'), 10);
    if (CALENDAR_YEARS.includes(y)) return y;
    // Ссылка на конкретный ивент (?event=sbc_rio_2027) сама открывает нужный год
    const em = String(new URLSearchParams(location.search).get('event') || '').match(/_(\d{4})$/);
    if (em && CALENDAR_YEARS.includes(Number(em[1]))) return Number(em[1]);
  } catch (e) {}
  return DEFAULT_CALENDAR_YEAR;
}

function getEventYear(ev) {
  if (ev.year) return Number(ev.year);
  const d = ev.startDate || ev.endDate || ev.startISO || '';
  const m = String(d).match(/^(\d{4})-/);
  if (m) return Number(m[1]);
  const idm = String(ev.id || '').match(/_(\d{4})$/);
  if (idm) return Number(idm[1]);
  return DEFAULT_CALENDAR_YEAR;
}

async function loadExtraYearEvents(year) {
  if (year === DEFAULT_CALENDAR_YEAR) return [];
  try {
    const res = await fetch('data/events-' + year + '.json?t=' + Date.now());
    if (!res.ok) return [];
    const data = normalizeEventsData(await res.json());
    return (data && data.events) || [];
  } catch (e) {
    console.warn('Не удалось загрузить ивенты ' + year, e);
    return [];
  }
}

async function loadEventsForYear(year) {
  let base = [];
  try {
    const data = await loadEventsData();
    base = (data && data.events) || [];
  } catch (e) {
    console.warn('Основные ивенты недоступны', e);
  }
  const fromCms = base.filter(e => getEventYear(e) === year);
  // Запасной файл data/events-YYYY.json нужен, только пока ивенты года
  // не перенесены в Google Таблицу (кнопка «Перенести 2027 в таблицу» в админке)
  if (fromCms.length || year === DEFAULT_CALENDAR_YEAR) return { events: fromCms };
  return { events: await loadExtraYearEvents(year) };
}

// Какую часть картинки показывать в узкой карточке. Хранится прямо в ссылке
// на картинку (…jpg#pos=center 85%), чтобы пережить сохранение через админку.
function getHeroPosition(ev) {
  if (ev && ev.heroPosition) return ev.heroPosition;
  const m = String((ev && ev.heroImage) || '').match(/#pos=([^#]+)$/);
  if (!m) return '';
  try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
}
