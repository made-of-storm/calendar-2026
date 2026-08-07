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
