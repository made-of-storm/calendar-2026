// Рендер сетки календаря из массива ивентов

const MONTH_LABELS = [
  '', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const ACCENT_BORDER = {
  '#F6ADE5': 'border-[#F6ADE5]',
  '#C8E712': 'border-[#C8E712]',
  '#2E39F7': 'border-[#2E39F7]',
  '#F5DA0F': 'border-[#F5DA0F]',
  '#EAB308': 'border-yellow-500'
};

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCardAttendees(n) {
  const num = Number(n) || 0;
  if (num >= 1000) {
    const k = Math.round(num / 100) / 10;
    return (k % 1 === 0 ? k.toFixed(0) : k.toString()) + 'k+';
  }
  return num + '+';
}

function categoryTagClass(category) {
  const c = (category || 'iGaming').toLowerCase();
  if (c.includes('affiliate')) return 'text-[10px] text-white/70 font-bold border border-white/20 px-1.5 rounded';
  if (c.includes('b2b') || c.includes('latam')) return 'text-[10px] text-yellow-300 font-bold border border-yellow-900/50 px-1.5 rounded';
  if (c.includes('blockchain')) return 'text-[10px] text-blue-300 font-bold border border-blue-900/50 px-1.5 rounded';
  if (c.includes('land')) return 'text-[10px] text-[#F6ADE5] font-bold border border-[#F6ADE5]/30 px-1.5 rounded';
  if (c.includes('conversion')) return 'text-[10px] text-blue-300 font-bold border border-blue-900/50 px-1.5 rounded';
  if (c.includes('betting')) return 'text-[10px] text-white/70 font-bold border border-white/20 px-1.5 rounded';
  if (c.includes('cis') || c.includes('eastern')) return 'text-[10px] text-white/70 font-bold border border-white/20 px-1.5 rounded';
  if (c.includes('leader')) return 'text-[10px] text-white/70 font-bold border border-white/30 px-1.5 rounded';
  return 'text-[10px] text-white/70 font-bold border border-[#F5DA0F]/30 px-1.5 rounded';
}

function majorCategoryClass(category) {
  return 'tag border border-white/30 text-white/80';
}

function renderMajorCard(ev) {
  const style = ev.cardStyle || 'elegant-dark';
  const dataStart = ev.startDate ? ` data-start="${esc(ev.startDate)}"` : '';
  const dataEnd = ev.endDate ? ` data-end="${esc(ev.endDate)}"` : '';
  const img = ev.heroImage
    ? `<img src="${esc(ev.heroImage)}" class="event-img" alt="${esc(ev.title)}" loading="lazy" decoding="async">`
    : '';

  return `<div class="major-card ${esc(style)} event-card"
           data-filterable="1"
           data-event-id="${esc(ev.id)}"
           data-tier="${esc(ev.tier)}"
           data-attendees="${esc(ev.attendees)}"
           data-country="${esc(ev.country)}"${dataStart}${dataEnd}>
        ${img}
        <div class="flex justify-between items-start mb-2">
          <span class="tag bg-white/10 backdrop-blur">${esc(ev.datesLabel)}</span>
          <span class="tag tag-no-visa" data-visa-tag="${esc(ev.country)}">...</span>
        </div>
        <h3 class="font-bold text-lg mb-1 text-white">${esc(ev.title)}</h3>
        <p class="text-xs text-white/60 mb-3">${esc(ev.locationLine)}</p>
        <div class="flex items-center gap-2">
          <span class="tag bg-[#F5DA0F] text-[#1B1B1B] font-extrabold">${formatCardAttendees(ev.attendees)}</span>
          <span class="${majorCategoryClass(ev.category)}">${esc(ev.category)}</span>
        </div>
      </div>`;
}

function renderCompactCard(ev) {
  const border = ACCENT_BORDER[ev.accentColor] || 'border-[#2E39F7]';
  const dataStart = ev.startDate ? ` data-start="${esc(ev.startDate)}"` : '';
  const dataEnd = ev.endDate ? ` data-end="${esc(ev.endDate)}"` : '';
  const sub = ev.datesLabel
    ? `${esc(ev.locationLine)} • ${esc(ev.datesLabel)}`
    : esc(ev.locationLine);

  return `<div class="pl-3 border-l-2 ${border} hover:bg-[#333333] p-2 rounded-r transition cursor-pointer event-card"
           data-filterable="1"
           data-event-id="${esc(ev.id)}"
           data-tier="${esc(ev.tier)}"
           data-attendees="${esc(ev.attendees)}"
           data-country="${esc(ev.country)}"${dataStart}${dataEnd}>
        <div class="text-sm font-bold text-white">${esc(ev.title)}</div>
        <div class="text-[11px] text-white/50 mt-1">${sub}</div>
        <div class="flex gap-2 mt-2">
          <span class="text-[10px] text-[#F5DA0F] font-extrabold bg-[#333333] px-1.5 rounded">${formatCardAttendees(ev.attendees)}</span>
          <span class="${categoryTagClass(ev.category)}">${esc(ev.category)}</span>
        </div>
      </div>`;
}

function renderEventCard(ev) {
  if (ev.cardType === 'major') return renderMajorCard(ev);
  return renderCompactCard(ev);
}

function renderCalendarGrid(events) {
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;

  const visible = events.filter(e => e.visible !== false);
  const byMonth = {};
  for (const ev of visible) {
    const m = ev.month || 1;
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(ev);
  }
  Object.values(byMonth).forEach(arr => arr.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));

  let html = '';
  for (let m = 1; m <= 12; m++) {
    const num = String(m).padStart(2, '0');
    const nameClass = m === 12 ? 'month-name text-gray-500' : 'month-name';
    html += `<div class="cell">
      <div class="month-num">${num}</div>
      <div class="${nameClass}">${MONTH_LABELS[m]}</div>`;
    const monthEvents = byMonth[m] || [];
    for (const ev of monthEvents) {
      html += renderEventCard(ev);
    }
    html += '</div>';
  }
  grid.innerHTML = html;
}
