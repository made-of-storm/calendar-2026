#!/usr/bin/env node
/**
 * Одноразовый экспорт: app.js (EVENTS) + index.html (карточки) → data/events.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const eventsMatch = appJs.match(/const EVENTS = (\{[\s\S]*?\n\};)/);
if (!eventsMatch) throw new Error('EVENTS not found in app.js');
const EVENTS = Function(`"use strict"; return (${eventsMatch[1].slice(0, -1)})`)();

const MONTH_NAMES = [
  '', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const BORDER_COLORS = {
  'border-[#F6ADE5]': '#F6ADE5',
  'border-[#C8E712]': '#C8E712',
  'border-[#2E39F7]': '#2E39F7',
  'border-[#F5DA0F]': '#F5DA0F',
  'border-yellow-500': '#EAB308',
};

function extractBorderColor(classStr) {
  for (const [cls, hex] of Object.entries(BORDER_COLORS)) {
    if (classStr.includes(cls)) return hex;
  }
  return '#2E39F7';
}

function parseCards(html) {
  const cards = [];
  const cellRe = /<!-- \d+ (\w+) -->[\s\S]*?<div class="cell">([\s\S]*?)<\/div>\s*(?=\n\s*<!--|\n\s*<\/div>\s*\n\s*<\/main)/g;
  let m;
  const cells = [...html.matchAll(/<div class="cell">([\s\S]*?)<\/div>\s*(?=\n\s*<!-- \d+ |\n\s*<\/div>\s*\n<\/main>)/g)];

  for (const cellMatch of cells) {
    const cellHtml = cellMatch[1];
    const monthNum = parseInt(cellHtml.match(/month-num">(\d+)/)?.[1] || '0', 10);
    if (!monthNum) continue;

    const cardRe = /<div class="([^"]*event-card[^"]*)"([^>]*)>([\s\S]*?)<\/div>\s*(?=<div class="|<\/div>)/g;
    let cardMatch;
    let sortOrder = 0;
    const inner = cellHtml;

    const parts = inner.split(/(?=<div class="(?:major-card|pl-3))/).filter(p => p.includes('event-card'));
    for (const part of parts) {
      const attrs = part.match(/^<div class="([^"]*)"([\s\S]*?)>/)?.[0] || part;
      const id = attrs.match(/data-event-id="([^"]+)"/)?.[1];
      if (!id) continue;

      const isMajor = attrs.includes('major-card');
      const cardStyle = attrs.match(/elegant-(dark|green)/)?.[0] || 'elegant-dark';
      const tier = attrs.match(/data-tier="([^"]+)"/)?.[1] || 'mid';
      const attendees = parseInt(attrs.match(/data-attendees="(\d+)"/)?.[1] || '0', 10);
      const country = attrs.match(/data-country="([^"]+)"/)?.[1] || '';
      const start = attrs.match(/data-start="([^"]+)"/)?.[1] || '';
      const end = attrs.match(/data-end="([^"]+)"/)?.[1] || '';

      let title = '';
      let datesLabel = '';
      let locationLine = '';
      let category = 'iGaming';
      let heroImage = '';
      let accentColor = '#2E39F7';

      if (isMajor) {
        title = part.match(/<h3[^>]*>([^<]+)<\/h3>/)?.[1]?.trim() || '';
        datesLabel = part.match(/tag bg-white\/10[^>]*>([^<]+)</)?.[1]?.trim() || '';
        locationLine = part.match(/text-xs text-white\/60[^>]*>([^<]+)</)?.[1]?.trim() || '';
        const catTag = part.match(/border border-white\/30[^>]*>([^<]+)</)?.[1]?.trim();
        if (catTag) category = catTag;
        heroImage = part.match(/<img src="([^"]+)"/)?.[1] || '';
      } else {
        title = part.match(/text-sm font-bold[^>]*>([^<]+)</)?.[1]?.trim() || '';
        const sub = part.match(/text-\[11px\][^>]*>([^<]+)</)?.[1]?.trim() || '';
        const subParts = sub.split('•');
        locationLine = subParts[0]?.trim() || '';
        datesLabel = subParts[1]?.trim() || '';
        const classLine = attrs.match(/class="([^"]+)"/)?.[1] || part.match(/class="([^"]*pl-3[^"]*)"/)?.[1] || '';
        accentColor = extractBorderColor(classLine);
        const catMatches = [...part.matchAll(/border border-[^"]*"[^>]*>([^<]+)</g)];
        if (catMatches.length) {
          category = catMatches[catMatches.length - 1][1].trim();
        }
      }

      cards.push({
        id, month: monthNum, sortOrder: sortOrder++,
        cardType: isMajor ? 'major' : 'compact',
        cardStyle: isMajor ? cardStyle : null,
        accentColor: isMajor ? null : accentColor,
        tier, attendees, country,
        startDate: start || null,
        endDate: end || null,
        title, datesLabel, locationLine, category, heroImage,
      });
    }
  }
  return cards;
}

const cards = parseCards(html);
const events = [];

for (const card of cards) {
  const detail = EVENTS[card.id] || {};
  events.push({
    id: card.id,
    month: card.month,
    sortOrder: card.sortOrder,
    visible: true,
    cardType: card.cardType,
    cardStyle: card.cardStyle,
    accentColor: card.accentColor,
    tier: card.tier,
    attendees: card.attendees,
    country: card.country || detail.country || '',
    startDate: card.startDate || (detail.startISO ? detail.startISO.slice(0, 10) : null),
    endDate: card.endDate || (detail.endISO ? detail.endISO.slice(0, 10) : null),
    title: detail.title || card.title,
    datesLabel: card.datesLabel || detail.dates || '',
    locationLine: card.locationLine || `${detail.countryName || ''}, ${detail.city || ''}`.replace(/^, |, $/g, ''),
    category: card.category,
    heroImage: card.heroImage || detail.heroImage || '',
    description: detail.description || '',
    website: detail.website || '',
    telegramChannel: detail.telegramChannel || null,
    startISO: detail.startISO || null,
    endISO: detail.endISO || null,
    weather: detail.weather || null,
    promo: detail.promo || null,
    awards: detail.awards || [],
    restaurants: detail.restaurants || [],
    brands: detail.brands || [],
    sideEvents: detail.sideEvents || [],
  });
}

events.sort((a, b) => a.month - b.month || a.sortOrder - b.sortOrder);

const outDir = path.join(root, 'data');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'events.json'), JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), events }, null, 2));

console.log(`Exported ${events.length} events to data/events.json`);
