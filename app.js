// app.js

// ------------------------------
// Utils
// ------------------------------
const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function formatK(n) {
  if (!Number.isFinite(n)) return "";
  if (n >= 1000) return (Math.round(n / 100) / 10).toString() + "k";
  return String(n);
}

// ------------------------------
// Telegram Mini App Integration
// ------------------------------
const TelegramWebApp = window.Telegram?.WebApp;
const isTelegramMiniApp = !!TelegramWebApp?.initData;

if (isTelegramMiniApp) {
  console.log('Running as Telegram Mini App!');
  TelegramWebApp.ready();
  TelegramWebApp.expand();
  
  // На десктопе — раскрываем на весь экран
  const tgPlatform = TelegramWebApp.platform || '';
  if (['tdesktop', 'macos', 'web', 'weba'].includes(tgPlatform)) {
    if (typeof TelegramWebApp.requestFullscreen === 'function') {
      try { TelegramWebApp.requestFullscreen(); } catch(e) { console.log('Fullscreen not supported'); }
    }
  }
  
  // Получаем данные пользователя из Telegram
  const tgUser = TelegramWebApp.initDataUnsafe?.user;
  if (tgUser) {
    console.log('Telegram user:', tgUser.id, tgUser.first_name, tgUser.username);
  }
  
  // Адаптируем цвета под тему Telegram
  document.documentElement.style.setProperty('--tg-theme-bg-color', TelegramWebApp.backgroundColor || '#1B1B1B');
  document.documentElement.style.setProperty('--tg-theme-text-color', TelegramWebApp.textColor || '#FBF2E8');
  
}

// ------------------------------
// State
// ------------------------------
let currentCitizenship = "";

// Для кнопки "Добавить в календарь": будем помнить, какое событие открыто в модалке
let currentEventId = null;

// ------------------------------
// Visa Matrix (данные из visa_overview_2026.xlsx)
// ------------------------------
// Структура: citizenship -> destination -> {required, type, notes}
// EU-страны (PT, PL, CY, ES, MT, IT, HU) используют колонку "EU" из таблицы
let VISA_MATRIX = {
  // ===================== EU =====================
  'EU': {
    'PT': { required: 'нет', type: 'Безвиз', notes: 'Свободное перемещение' },
    'PL': { required: 'нет', type: 'Безвиз', notes: 'Свободное перемещение' },
    'CY': { required: 'нет', type: 'Безвиз', notes: 'Свободное перемещение' },
    'ES': { required: 'нет', type: 'Безвиз', notes: 'Свободное перемещение' },
    'MT': { required: 'нет', type: 'Безвиз', notes: 'Свободное перемещение' },
    'IT': { required: 'нет', type: 'Безвиз', notes: 'Свободное перемещение' },
    'HU': { required: 'нет', type: 'Безвиз', notes: 'Свободное перемещение' },
    'AE': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'UAE': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'RU': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'BR': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'GB': { required: 'нет', type: 'Безвиз', notes: '6 месяцев' },
    'PH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'CA': { required: 'нет', type: 'Безвиз', notes: 'eTA' },
    'US': { required: 'нет', type: 'Безвиз', notes: 'ESTA' },
    'AM': { required: 'нет', type: 'Безвиз', notes: '180 дней' },
    'MX': { required: 'нет', type: 'Безвиз', notes: '180 дней' },
    'TH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'GE': { required: 'нет', type: 'Безвиз', notes: '365 дней' },
    'MO': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'ZA': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'UA': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'SN': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
  },
  // ===================== Россия =====================
  'RU': {
    'PT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PL': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'CY': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'ES': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'MT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'IT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'HU': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AE': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'UAE': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'RU': { required: 'нет', type: 'Безвиз', notes: 'Своя страна' },
    'BR': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'GB': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'CA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'US': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AM': { required: 'нет', type: 'Безвиз', notes: '180 дней' },
    'MX': { required: 'да', type: 'Виза', notes: 'eVisa' },
    'TH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'GE': { required: 'нет', type: 'Безвиз', notes: '365 дней' },
    'MO': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'ZA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'UA': { required: 'запрет', type: 'Закрыт', notes: 'Въезд запрещён' },
    'SN': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
  },
  // ===================== Украина =====================
  'UA': {
    'PT': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'PL': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'CY': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'ES': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'MT': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'IT': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'HU': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'AE': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'UAE': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'RU': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'BR': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'GB': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'CA': { required: 'нет', type: 'Безвиз', notes: 'eTA' },
    'US': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AM': { required: 'нет', type: 'Безвиз', notes: '180 дней' },
    'MX': { required: 'нет', type: 'Безвиз', notes: '180 дней' },
    'TH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'GE': { required: 'нет', type: 'Безвиз', notes: '365 дней' },
    'MO': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'ZA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'UA': { required: 'нет', type: 'Безвиз', notes: 'Своя страна' },
    'SN': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
  },
  // ===================== Беларусь =====================
  'BY': {
    'PT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PL': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'CY': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'ES': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'MT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'IT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'HU': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AE': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'UAE': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'RU': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'BR': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'GB': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'CA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'US': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AM': { required: 'нет', type: 'Безвиз', notes: '180 дней' },
    'MX': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'TH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'GE': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'MO': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'ZA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'UA': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'SN': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
  },
  // ===================== Казахстан =====================
  'KZ': {
    'PT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PL': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'CY': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'ES': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'MT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'IT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'HU': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AE': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'UAE': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'RU': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'BR': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'GB': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'CA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'US': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AM': { required: 'нет', type: 'Безвиз', notes: '180 дней' },
    'MX': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'TH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'GE': { required: 'нет', type: 'Безвиз', notes: '365 дней' },
    'MO': { required: 'нет', type: 'Безвиз', notes: '14 дней' },
    'ZA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'UA': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'SN': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
  },
  // ===================== Узбекистан =====================
  'UZ': {
    'PT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PL': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'CY': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'ES': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'MT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'IT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'HU': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AE': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'UAE': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'RU': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'BR': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'GB': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'CA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'US': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AM': { required: 'да', type: 'Виза', notes: 'eVisa' },
    'MX': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'TH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'GE': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'MO': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'ZA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'UA': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'SN': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
  },
  // ===================== Азербайджан =====================
  'AZ': {
    'PT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PL': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'CY': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'ES': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'MT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'IT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'HU': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AE': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'UAE': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'RU': { required: 'да', type: 'Виза', notes: 'eVisa' },
    'BR': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'GB': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'CA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'US': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AM': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'MX': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'TH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'GE': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'MO': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'ZA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'UA': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'SN': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
  },
  // ===================== Армения =====================
  'AM': {
    'PT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PL': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'CY': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'ES': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'MT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'IT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'HU': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AE': { required: 'нет', type: 'Безвиз', notes: '180 дней' },
    'UAE': { required: 'нет', type: 'Безвиз', notes: '180 дней' },
    'RU': { required: 'нет', type: 'Безвиз', notes: '180 дней' },
    'BR': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'GB': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'CA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'US': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AM': { required: 'нет', type: 'Безвиз', notes: 'Своя страна' },
    'MX': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'TH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'GE': { required: 'нет', type: 'Безвиз', notes: '180 дней' },
    'MO': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'ZA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'UA': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'SN': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
  },
  // ===================== Грузия =====================
  'GE': {
    'PT': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'PL': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'CY': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'ES': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'MT': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'IT': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'HU': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'AE': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'UAE': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'RU': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'BR': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'GB': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'CA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'US': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AM': { required: 'нет', type: 'Безвиз', notes: '180 дней' },
    'MX': { required: 'нет', type: 'Безвиз', notes: '180 дней' },
    'TH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'GE': { required: 'нет', type: 'Безвиз', notes: 'Своя страна' },
    'MO': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'ZA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'UA': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'SN': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
  },
  // ===================== Молдова =====================
  'MD': {
    'PT': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'PL': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'CY': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'ES': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'MT': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'IT': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'HU': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'AE': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'UAE': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'RU': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'BR': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'GB': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'CA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'US': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AM': { required: 'нет', type: 'Безвиз', notes: '180 дней' },
    'MX': { required: 'нет', type: 'Безвиз', notes: '180 дней' },
    'TH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'GE': { required: 'нет', type: 'Безвиз', notes: '365 дней' },
    'MO': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'ZA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'UA': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'SN': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
  },
  // ===================== Таджикистан =====================
  'TJ': {
    'PT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PL': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'CY': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'ES': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'MT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'IT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'HU': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AE': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'UAE': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'RU': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'BR': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'GB': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'CA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'US': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AM': { required: 'да', type: 'Виза', notes: 'eVisa' },
    'MX': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'TH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'GE': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'MO': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'ZA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'UA': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'SN': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
  },
  // ===================== Кыргызстан =====================
  'KG': {
    'PT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PL': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'CY': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'ES': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'MT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'IT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'HU': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AE': { required: 'нет', type: 'Безвиз', notes: '60 дней' },
    'UAE': { required: 'нет', type: 'Безвиз', notes: '60 дней' },
    'RU': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'BR': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'GB': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'CA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'US': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AM': { required: 'да', type: 'Виза', notes: 'eVisa' },
    'MX': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'TH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'GE': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'MO': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'ZA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'UA': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'SN': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
  },
  // ===================== Турция =====================
  'TR': {
    'PT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PL': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'CY': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'ES': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'MT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'IT': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'HU': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AE': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'UAE': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'RU': { required: 'нет', type: 'Безвиз', notes: '60 дней' },
    'BR': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'GB': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'PH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'CA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'US': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'AM': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'MX': { required: 'да', type: 'Виза', notes: 'eVisa' },
    'TH': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'GE': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'MO': { required: 'нет', type: 'Безвиз', notes: '30 дней' },
    'ZA': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
    'UA': { required: 'нет', type: 'Безвиз', notes: '90 дней' },
    'SN': { required: 'да', type: 'Виза', notes: 'Требуется виза' },
  },
};


// Маппинг conf_id -> country_code (для визовой логики)
const CONF_COUNTRIES = {
  'igb_live_2026_london': 'GB',
  'sbc_rio_2026': 'BR',
  'sbc_americas_2026': 'US',
  'sbc_lisbon_2026': 'PT',
  'affiliate_world_dubai_2026': 'AE',
  'mac_yerevan_2026': 'AM',
  'conversion_warsaw_2026': 'PL',
  'conversion_kyiv_2026': 'UA',
  'conversion_cyprus_2026': 'CY',
  'broconf_sochi_2026': 'RU',
  'ggate_tbilisi_2026': 'GE',
  'affpapa_madrid_2026': 'ES',
  'affpapa_cancun_2026': 'MX',
  'g2e_las_vegas_2026': 'US',
  'sbwa_dakar_2026': 'SN',
  'gm_events_brazil_2026': 'BR',
  'spice_sea_2026': 'TH',
  'conversion_forum_kyiv_2026': 'UA',
  'affiliate_world_asia_2026': 'TH',
  'aibc_eurasia_dubai_2026': 'AE',
  'sigma_americas_2026': 'BR',
  'igb_barcelona_2026': 'ES',
  'sigma_africa_2026': 'ZA',
  'sigma_asia_2026': 'PH',
  'sigma_euromed_2026': 'MT',
  'sigma_north_america_2026': 'MX',
  'sigma_south_asia_2026': 'TH',
  'sigma_world_2026': 'IT',
  'affiliate_world_americas_2026': 'MX',
  'affiliate_world_europe_2026': 'HU',
  'sbc_summit_malta_2026': 'MT',
  'sbc_summit_canada_2026': 'CA',
  'aibc_world_2026': 'IT',
  'aibc_asia_2026': 'PH',
  'g2e_asia_2026': 'MO',
};

// Старая функция для обратной совместимости (deprecated)
let VISA_RULES = {};
function rebuildVisaRules() {
  VISA_RULES = {};
  Object.keys(VISA_MATRIX).forEach(citizenship => {
    VISA_RULES[citizenship] = {};
    Object.keys(VISA_MATRIX[citizenship]).forEach(country => {
      const info = VISA_MATRIX[citizenship][country];
      VISA_RULES[citizenship][country] = info.required === 'нет' ? 'no' :
                                          info.required === 'да' ? 'yes' :
                                          'unknown';
    });
  });
}
rebuildVisaRules();

// Старая функция (для обратной совместимости)
function getVisaStatus(citizenship, country) {
  const c = (citizenship || "").toUpperCase();
  const cc = (country || "").toUpperCase();
  return VISA_RULES?.[c]?.[cc] || "unknown";
}

// Новая функция для расширенной визовой информации
function getVisaInfo(citizenship, country) {
  const c = (citizenship || "").toUpperCase();
  const cc = (country || "").toUpperCase();
  return VISA_MATRIX?.[c]?.[cc] || null;
}

// Генерация HTML для визового тега
function getVisaTagHTML(visaInfo, compact) {
  const sizeClass = compact
    ? 'text-[10px] font-bold px-1.5 rounded border'
    : 'px-2 py-1 rounded-full text-xs border';

  if (!visaInfo) {
    return `<span class="${sizeClass} bg-gray-500/20 text-gray-400" title="Информация уточняется">? Уточнить</span>`;
  }

  const colorClasses = {
    'нет': 'bg-green-500/20 text-green-400 border-green-500/30',
    'да': 'bg-red-500/20 text-red-400 border-red-500/30',
    'запрет': 'bg-red-700/30 text-red-300 border-red-700/40',
    'эл.разреш.': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };

  const labels = {
    'нет': '✓ Без визы',
    'да': '⚠ Виза',
    'запрет': '✕ Въезд запрещён',
    'эл.разреш.': '⚡ Эл. разрешение',
  };

  const colorClass = colorClasses[visaInfo.required] || 'bg-gray-500/20 text-gray-400';
  const label = labels[visaInfo.required] || visaInfo.type;
  const title = visaInfo.notes || visaInfo.type;

  return `<span class="${sizeClass} ${colorClass}" title="${title}">${label}</span>`;
}

function applyVisaTag(el, status, countryCode) {
  // el — это span с data-visa-tag="XX"
  el.classList.remove("tag-visa", "tag-no-visa");
  const flag = countryCode ? ` ${countryCode}` : "";

  if (status === "no") {
    el.classList.add("tag-no-visa");
    // оставим твой текстовый паттерн "No Visa ..."
    // если там уже есть эмодзи флага — не трогаем, иначе можно простым текстом
    if (!el.textContent.toLowerCase().includes("no visa")) el.textContent = `No Visa${flag}`;
  } else if (status === "yes") {
    el.classList.add("tag-visa");
    if (!el.textContent.toLowerCase().includes("visa")) el.textContent = `Visa${flag}`;
  } else {
    el.classList.add("tag-visa");
    el.textContent = "Check visa";
  }
}

function updateAllVisaTags() {
  qsa("[data-visa-tag]").forEach((tag) => {
    const cc = tag.getAttribute("data-visa-tag");
    const isCompact = tag.hasAttribute("data-visa-compact");

    // Попробовать использовать новую визовую матрицу
    const visaInfo = getVisaInfo(currentCitizenship, cc);
    if (visaInfo) {
      // Сохранить data-visa-tag атрибут
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = getVisaTagHTML(visaInfo, isCompact);
      const newTag = tempDiv.firstChild;

      // Добавить data-visa-tag обратно
      newTag.setAttribute('data-visa-tag', cc);
      if (isCompact) newTag.setAttribute('data-visa-compact', '1');

      // Заменить элемент
      tag.parentNode.replaceChild(newTag, tag);
    } else {
      // Fallback на старую логику
      const status = getVisaStatus(currentCitizenship, cc);
      applyVisaTag(tag, status, cc);
    }
  });
}

// ------------------------------
// Filters
// ------------------------------
const TIER_FILTERS = [
  { key: "any", label: "Все" },
  { key: "mega", label: "20k+" },
  { key: "large", label: "8k+" },
  { key: "mid", label: "<8k" }
];

const VISA_FILTERS = [
  { key: "any", label: "Не важно" },
  { key: "no", label: "Только без визы" },
  { key: "yes", label: "Только с визой" },
  { key: "unknown", label: "Уточнить" }
];

let tierFilterIndex = 0; // any
let visaFilterIndex = 0; // any

function updateFilterLabels() {
  const sizeBtn = qs("#filterSizeBtn");
  const visaBtn = qs("#filterVisaBtn");
  if (sizeBtn) sizeBtn.textContent = `Размер: ${TIER_FILTERS[tierFilterIndex].label}`;
  if (visaBtn) visaBtn.textContent = `Виза: ${VISA_FILTERS[visaFilterIndex].label}`;
}

function applyFilters() {
  const tierKey = TIER_FILTERS[tierFilterIndex].key;
  const visaKey = VISA_FILTERS[visaFilterIndex].key;

  qsa('[data-filterable="1"]').forEach((el) => {
    const elTier = (el.getAttribute("data-tier") || "").toLowerCase();
    const elCountry = (el.getAttribute("data-country") || "").toUpperCase();

    let tierOk = true;
    if (tierKey !== "any") tierOk = (elTier === tierKey);

    let visaOk = true;
    if (visaKey !== "any") {
      if (!elCountry) {
        // если страна не задана — не ломаем, оставляем видимым
        visaOk = true;
      } else {
        const status = getVisaStatus(currentCitizenship, elCountry);
        visaOk = (status === visaKey);
      }
    }

    if (tierOk && visaOk) el.classList.remove("hidden");
    else el.classList.add("hidden");
  });

  // Update button UI after filter change
  if (typeof updateButtonUI === 'function') {
    updateButtonUI();
  }
}

// Заглушка, когда реальный промокод ещё не согласован с организатором
const PROMO_PENDING_MESSAGE = "Усиленно добываем для вас скидку";

// ------------------------------
// Modal open/close + tabs
// ------------------------------
function openModal() {
  const overlay = qs("#modalOverlay");
  const bg = qs("#modalBg");
  const panel = qs("#modalPanel");
  if (!overlay || !bg || !panel) return;

  overlay.classList.remove("hidden");
  setTimeout(() => {
    bg.classList.remove("opacity-0");
    panel.classList.remove("translate-x-full");
  }, 10);

  document.body.classList.add("modal-open");
}

function closeModal() {
  const overlay = qs("#modalOverlay");
  const bg = qs("#modalBg");
  const panel = qs("#modalPanel");
  if (!overlay || !bg || !panel) return;

  bg.classList.add("opacity-0");
  panel.classList.add("translate-x-full");

  setTimeout(() => {
    overlay.classList.add("hidden");
  }, 300);

  document.body.classList.remove("modal-open");
  currentEventId = null; // сброс "текущего события"
  stopEventsTabPulse();
}

function setActiveTab(tabId) {
  qsa(".tab-content").forEach((el) => el.classList.remove("active"));
  qsa(".tab-btn").forEach((el) => el.classList.remove("active"));

  const tab = qs(`#${tabId}`);
  const btn = qs(`[data-tab-btn="${tabId}"]`);

  if (tab) tab.classList.add("active");
  if (btn) btn.classList.add("active");

  if (tabId === "events") stopEventsTabPulse({ markDone: true });
}

// Pulse-таймеры для таба «Сайд-ивенты» (3 пакета по 2 импульса с паузой 30с)
let _pulseTimers = [];

function stopEventsTabPulse(opts) {
  _pulseTimers.forEach((t) => clearTimeout(t));
  _pulseTimers = [];
  const btn = document.querySelector('[data-tab-btn="events"]');
  if (btn) {
    btn.classList.remove("tab-pulse");
    if (opts && opts.markDone) btn.dataset.pulseDone = "1";
  }
}

function startEventsTabPulse() {
  const btn = document.querySelector('[data-tab-btn="events"]');
  if (!btn) return;
  if (btn.dataset.pulseDone === "1") return;
  if (btn.classList.contains("active")) return;

  const PACKETS = 3;
  const FIRST_DELAY_MS = 600;
  const PACKET_GAP_MS = 30000;
  const PULSE_DURATION_MS = 1800;

  for (let i = 0; i < PACKETS; i++) {
    const startT = setTimeout(() => {
      const b = document.querySelector('[data-tab-btn="events"]');
      if (!b || b.classList.contains("active")) return;
      if (b.dataset.pulseDone === "1") return;
      b.classList.add("tab-pulse");
      const endT = setTimeout(() => b.classList.remove("tab-pulse"), PULSE_DURATION_MS);
      _pulseTimers.push(endT);
    }, FIRST_DELAY_MS + i * PACKET_GAP_MS);
    _pulseTimers.push(startT);
  }
}

// ------------------------------
// ------------------------------
// Event data — загружается из data/events.json или CMS (см. js/events-loader.js)
// ------------------------------
let EVENTS = {};

function populateModal(eventId) {
  const event = EVENTS[eventId];
  if (!event) return;

  currentEventId = eventId;

  // === HERO с погодой ===
  const heroEl = qs("#modalHero");
  if (heroEl) {
    const weatherHTML = event.weather && event.weather.temp !== '—' ? `
      <div class="weather-overlay">
        <div class="temp">🌡️ ${event.weather.temp}</div>
        <div>${event.weather.description}</div>
      </div>
    ` : '';

    heroEl.innerHTML = `
      <div class="modal-hero" style="background-image: linear-gradient(to bottom, transparent 40%, rgba(27,27,27,0.95)), url('${event.heroImage || ''}')">
        <button class="modal-close-btn" onclick="closeModal()" type="button">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        ${weatherHTML}
      </div>
    `;
  }

  // === INFO: название, место, даты, описание (БЕЗ тегов) ===
  const infoEl = qs("#modalInfo");
  if (infoEl) {
    let linksHTML = '';
    if (event.website || event.telegramChannel) {
      linksHTML = '<div class="modal-links">';
      if (event.website) {
        linksHTML += `<a href="${event.website}" target="_blank" rel="noopener" class="modal-link-btn modal-link-btn--website" title="Официальный сайт"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>Оф. сайт</a>`;
      }
      if (event.telegramChannel) {
        linksHTML += `<a href="${event.telegramChannel}" target="_blank" rel="noopener" class="modal-link-btn modal-link-btn--telegram" title="Telegram канал"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>Оф. канал</a>`;
      }
      linksHTML += '</div>';
    }

    infoEl.innerHTML = `
      <h2 class="modal-title">${event.title}</h2>
      <p class="modal-location">
        <svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        ${event.countryName}, ${event.city}
      </p>
      <p class="modal-dates">
        <svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
        ${event.dates}
      </p>
      ${linksHTML}
      <p class="modal-description">${event.description}</p>
    `;
  }

  // === ТРИ КАРТОЧКИ: участники, виза, промо ===
  const statsEl = qs("#modalStats");
  if (statsEl) {
    // Виза
    const visaInfo = getVisaInfo(currentCitizenship, event.country);
    let visaValue, visaClass;

    if (visaInfo) {
      if (visaInfo.required === 'нет') {
        visaValue = 'Без визы';
        visaClass = 'visa-free';
      } else if (visaInfo.required === 'да') {
        visaValue = 'Нужна виза';
        visaClass = 'visa-required';
      } else if (visaInfo.required === 'запрет') {
        visaValue = 'Закрыт';
        visaClass = 'visa-banned';
      } else if (visaInfo.required === 'эл.разреш.') {
        visaValue = 'Эл. виза';
        visaClass = 'visa-free';
      } else {
        visaValue = 'Уточняется';
        visaClass = 'no-promo';
      }
    } else {
      visaValue = 'Уточняется';
      visaClass = 'no-promo';
    }

    // Промо
    const hasPromoCode = Boolean(event.promo);
    const promoValue = hasPromoCode ? event.promo : PROMO_PENDING_MESSAGE;
    const promoClass = hasPromoCode ? "promo" : "no-promo promo-pending";
    const promoNote = hasPromoCode && event.promoNote ? `<div class="stat-note">${event.promoNote}</div>` : "";

    statsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-value attendees">${event.attendees}</div>
        <div class="stat-label">участников</div>
      </div>
      <div class="stat-card">
        <div class="stat-value ${visaClass}">${visaValue}</div>
        <div class="stat-label">виза</div>
      </div>
      <div class="stat-card">
        <div class="stat-value ${promoClass}">${promoValue}</div>
        <div class="stat-label">промо</div>
        ${promoNote}
      </div>
    `;
  }

  // Populate tabs
  populateRestaurantsTab(event.restaurants || [], event.partnerPromo || null);
  populateSideEventsTab(event.sideEvents || []);
  populateBrandsTab(event.brands || []);
  populateAwardsTab(event.awards || []);

  // Update tab button labels with counts
  const eventsBtn = qs('[data-tab-btn="events"]');
  const brandsBtn = qs('[data-tab-btn="brands"]');
  const awardsBtn = qs('[data-tab-btn="awards"]');

  if (eventsBtn) {
    const count = (event.sideEvents || []).length;
    eventsBtn.textContent = count > 0 ? `Сайд-ивенты (${count})` : "Сайд-ивенты";
  }

  if (brandsBtn) {
    const count = (event.brands || []).length;
    brandsBtn.textContent = count > 0 ? `Бренды (${count})` : "Бренды";
  }

  if (awardsBtn) {
    const count = (event.awards || []).length;
    awardsBtn.textContent = count > 0 ? `Awards (${count})` : "Awards";
  }

  setActiveTab("guide");

  stopEventsTabPulse();
  if (eventsBtn) eventsBtn.dataset.pulseDone = "";
  const richSideEvents = (event.sideEvents || []).some(
    (se) => se && (se.img || se.registerUrl)
  );
  if (richSideEvents) startEventsTabPulse();

  updateModalPromoButton(event);
}

function updateModalPromoButton(event) {
  const btn = qs("#modalPromoBtn");
  if (!btn) return;
  if (event.promo) {
    btn.textContent = "Получить промокод";
    btn.setAttribute("aria-label", "Получить промокод");
  } else {
    btn.textContent = "Скидка в работе";
    btn.setAttribute("aria-label", PROMO_PENDING_MESSAGE);
  }
}

function renderPartnerPromo(promo) {
  if (!promo) return '';
  return `
    <div class="partner-promo">
      <span class="partner-promo-badge">${promo.badge || 'PARTNER'}</span>
      <img src="${promo.img}" class="partner-promo-img" alt="${promo.title}" loading="lazy" decoding="async">
      <div class="partner-promo-body">
        <div class="partner-promo-title">${promo.title}</div>
        <div class="partner-promo-subtitle">${promo.subtitle}</div>
        <div class="partner-promo-desc">${promo.description}</div>
        <div class="partner-promo-meta">
          <span class="partner-promo-meta-item">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            ${promo.dates}
          </span>
          <span class="partner-promo-meta-item">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            ${promo.location}
          </span>
        </div>
        <div class="partner-promo-code">
          <span class="partner-promo-code-label">Промокод</span>
          <span class="partner-promo-code-value">${promo.promo}</span>
          <span class="partner-promo-code-note">${promo.promoNote}</span>
        </div>
        <div class="partner-promo-actions">
          <a href="${promo.ctaUrl}" target="_blank" rel="noopener" class="partner-promo-cta">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            ${promo.cta}
          </a>
          ${promo.telegram ? `<a href="${promo.telegram}" target="_blank" rel="noopener" class="partner-promo-tg">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            TG-канал
          </a>` : ''}
        </div>
      </div>
    </div>
  `;
}

function populateRestaurantsTab(restaurants, partnerPromo) {
  const container = qs("#guide");
  if (!container) return;

  let html = '';

  if (partnerPromo) {
    html += renderPartnerPromo(partnerPromo);
  }

  if (!restaurants || restaurants.length === 0) {
    if (!partnerPromo) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-400">
          <p class="text-sm">Скоро добавим рекомендации ближе к датам конференции</p>
        </div>
      `;
      return;
    }
    container.innerHTML = html;
    return;
  }

  const vibeMap = {
    'тихо': { label: '🤫 Тихо', class: 'vibe-tag-quiet' },
    'посидеть': { label: '☕ Посидеть', class: 'vibe-tag-sit' },
    'громко': { label: '🎵 Громко', class: 'vibe-tag-loud' },
    'потанцевать': { label: '💃 Потанцевать', class: 'vibe-tag-dance' }
  };

  html += `
    <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4" style="margin-top: 24px;">
      Рестораны для встреч
    </h3>
  `;

  restaurants.forEach(r => {
    const vibeInfo = vibeMap[r.vibe] || { label: r.vibe, class: 'vibe-tag-sit' };
    html += `
      <div class="restaurant-card relative flex gap-4 p-4 rounded-xl border border-[#333333] bg-[#1B1B1B] mb-3 cursor-pointer">
        ${r.avgCheck ? `<div class="absolute top-3 right-3"><span class="restaurant-check-pill">${r.avgCheck}</span></div>` : ''}
        <img src="${r.img || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=200&auto=format&fit=crop'}" class="w-20 h-20 rounded-xl object-cover flex-shrink-0 shadow-lg" alt="${r.name}" loading="lazy" decoding="async">
        <div class="flex-1 flex flex-col min-w-0">
          <div class="font-bold text-white text-[16px] mb-1.5">${r.name}</div>
          ${vibeInfo.label ? `<span class="vibe-tag ${vibeInfo.class} mb-2">${vibeInfo.label}</span>` : ''}
          <div class="restaurant-description text-xs text-gray-400 leading-relaxed mt-auto">${r.description || ''}</div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function populateSideEventsTab(sideEvents) {
  const container = qs("#events");
  if (!container) return;

  if (!sideEvents || sideEvents.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-400">
        <p class="text-sm">Скоро добавим информацию о side events и afterparty</p>
      </div>
    `;
    return;
  }

  const typeConfig = {
    party:      { gradient: 'from-purple-900/80 via-pink-900/60 to-fuchsia-900/40', icon: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>', label: 'PARTY', accent: '#F6ADE5' },
    awards:     { gradient: 'from-yellow-900/80 via-amber-900/60 to-orange-900/40', icon: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/>', label: 'AWARDS', accent: '#F5DA0F' },
    meetup:     { gradient: 'from-blue-900/80 via-indigo-900/60 to-violet-900/40', icon: '<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>', label: 'NETWORKING', accent: '#7B84FF' },
    dinner:     { gradient: 'from-emerald-900/80 via-teal-900/60 to-cyan-900/40', icon: '<path d="M8.1 13.34l2.83-2.83L3.91 3.5a4.008 4.008 0 000 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>', label: 'DINNER', accent: '#C8E712' },
    networking: { gradient: 'from-blue-900/80 via-indigo-900/60 to-violet-900/40', icon: '<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>', label: 'NETWORKING', accent: '#7B84FF' },
    sport:      { gradient: 'from-lime-900/80 via-emerald-900/60 to-green-900/40', icon: '<path d="M19.07 4.93a10 10 0 00-14.14 0 10 10 0 000 14.14 10 10 0 0014.14 0 10 10 0 000-14.14zM12 20a8 8 0 110-16 8 8 0 010 16zm0-13a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6z"/>', label: 'SPORT · NETWORKING', accent: '#C8E712' },
  };
  const defaultType = { gradient: 'from-gray-900/80 via-gray-800/60 to-gray-700/40', icon: '<path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>', label: 'EVENT', accent: '#F5DA0F' };

  let html = '';
  sideEvents.forEach(e => {
    if (e.cardVariant === 'partner') {
      const rawBadge = e.partnerBadge || 'PARTNER';
      const bIdx = rawBadge.indexOf(' · ');
      const badgeHTML =
        bIdx === -1
          ? rawBadge
          : `<span class="side-event-card--partner__badge-accent">${rawBadge.slice(0, bIdx)}</span>${rawBadge.slice(bIdx)}`;
      const registerHTML = e.registerUrl ? `
            <a href="${e.registerUrl}" target="_blank" rel="noopener" class="side-event-register-btn side-event-register-btn--partner-solid">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 5l7 7-7 7"/></svg>
              <span>${e.registerLabel || 'Принять участие'}</span>
            </a>` : '';
      const imgHTML = e.img ? `
          <img src="${e.img}" alt="${e.title.replace(/"/g, '&quot;')}" class="side-event-card--partner__thumb side-event-card--partner__thumb--logo" loading="lazy" decoding="async" onerror="this.style.display='none'">` : '';
      html += `
      <div class="side-event-card side-event-card--partner mb-4">
        <div class="side-event-card--partner__layout">
          ${imgHTML}
          <div class="side-event-card--partner__copy">
            <div class="side-event-card--partner__badge">${badgeHTML}</div>
            <h3 class="side-event-card--partner__title">${e.title}</h3>
            ${e.subtitle ? `<p class="side-event-card--partner__meta">${e.subtitle}</p>` : ''}
            ${e.description ? `<p class="side-event-card--partner__desc">${e.description}</p>` : ''}
            ${registerHTML}
          </div>
        </div>
      </div>`;
      return;
    }

    const cfg = typeConfig[e.type] || defaultType;
    const locationHTML = e.location && e.location !== 'TBA' ? `
            <p class="text-xs text-white/60 flex items-center gap-1.5 mt-1">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              ${e.location}
            </p>` : '';
    const descriptionHTML = e.description ? `
            <p class="text-xs text-white/70 leading-relaxed mt-2">${e.description}</p>` : '';
    const registerHTML = e.registerUrl ? `
            <a href="${e.registerUrl}" target="_blank" rel="noopener" class="side-event-register-btn" style="--accent:${cfg.accent}">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 5l7 7-7 7"/></svg>
              <span>${e.registerLabel || 'Регистрация'}</span>
            </a>` : '';
    const organizerLogosHTML =
      e.organizerLogos && e.organizerLogos.length
        ? `<div class="side-event-organizer-logos">${e.organizerLogos
            .map(
              (logo) =>
                `<img src="${logo.src}" alt="${(logo.alt || '').replace(/"/g, '&quot;')}" class="side-event-organizer-logo" loading="lazy" decoding="async">`
            )
            .join("")}</div>`
        : "";
    const titleHTML = organizerLogosHTML
      ? `<div class="side-event-title-block mb-1.5">${organizerLogosHTML}<h3 class="text-lg font-extrabold leading-tight">${e.title}</h3></div>`
      : `<h3 class="text-lg font-extrabold mb-1.5 leading-tight">${e.title}</h3>`;
    const innerContent = `
            <div class="flex items-center gap-2 mb-3">
              <span class="side-event-type-tag" style="color:${cfg.accent}; border-color:${cfg.accent}40; background:${cfg.accent}15">${cfg.label}</span>
              ${e.date ? `<span class="text-[11px] text-white/50 font-medium">${e.date}</span>` : ''}
            </div>
            ${titleHTML}
            ${locationHTML}
            ${descriptionHTML}
            ${registerHTML}`;
    const imgClass =
      e.imgLayout === "restaurant"
        ? "side-event-img-restaurant"
        : "w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-white/5";
    const bodyHTML = e.img ? `
        <div class="relative z-10 flex gap-3 items-start">
          <img src="${e.img}" alt="${e.title.replace(/"/g, "&quot;")}" class="${imgClass}" loading="lazy" decoding="async" onerror="this.style.display='none'">
          <div class="flex-1 min-w-0">${innerContent}
          </div>
        </div>` : `
        <div class="relative z-10">${innerContent}
        </div>`;
    html += `
      <div class="side-event-card side-event-${e.type || 'default'} bg-gradient-to-br ${cfg.gradient} text-white p-5 rounded-2xl relative overflow-hidden shadow-lg group mb-4">
        <svg class="side-event-bg-icon" viewBox="0 0 24 24" fill="${cfg.accent}" xmlns="http://www.w3.org/2000/svg">${cfg.icon}</svg>${bodyHTML}
      </div>
    `;
  });

  container.innerHTML = html;
}

function createBrandCard(brand) {
  const initials = brand.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return `
    <div class="brand-card">
      <img
        src="${brand.logo}"
        alt="${brand.name}"
        class="brand-logo"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
      >
      <div class="brand-icon-fallback" style="display: none;">${initials}</div>
      <div class="brand-name">${brand.name}</div>
      <div class="brand-category">${brand.category}</div>
    </div>
  `;
}

function populateAwardsTab(awards) {
  const container = qs("#awards");
  if (!container) return;

  if (!awards || awards.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-400">
        <p class="text-sm">Нет связанных awards-программ для этой конференции</p>
      </div>
    `;
    return;
  }

  let html = `
    <h3 class="text-lg font-bold text-white mb-4" style="margin-top: 24px;">
      Awards-программы
    </h3>
  `;

  awards.forEach(a => {
    const categoriesHTML = (a.categories || []).map(c =>
      `<span class="award-category-pill">${c}</span>`
    ).join('');

    const dateHTML = a.date ? `<div class="award-card-date">${a.date}</div>` : '';

    const linkHTML = a.website ? `
      <a href="${a.website}" target="_blank" rel="noopener" class="award-card-link">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
        Подробнее
      </a>
    ` : '';

    html += `
      <div class="award-card">
        <svg class="award-card-icon" viewBox="0 0 24 24" fill="#F5DA0F" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        <div class="award-card-header">
          <svg class="award-card-trophy" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <div>
            <div class="award-card-name">${a.name}</div>
            ${dateHTML}
          </div>
        </div>
        ${categoriesHTML ? `<div class="award-categories">${categoriesHTML}</div>` : ''}
        ${linkHTML}
      </div>
    `;
  });

  container.innerHTML = html;
}

function populateBrandsTab(brands) {
  const container = qs("#brands");
  if (!container) return;

  if (!brands || brands.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-400">
        <p class="text-sm">Скоро добавим список участников и брендов</p>
      </div>
    `;
    return;
  }

  let html = '<div class="brands-grid">';

  brands.forEach(brand => {
    html += createBrandCard(brand);
  });

  html += '</div>';

  container.innerHTML = html;
}

// ------------------------------
// ICS generation
// ------------------------------
function escapeICS(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toICSDateTime(iso) {
  // ожидаем "2026-02-25T09:00:00Z" или без Z
  // конвертируем в формат YYYYMMDDTHHMMSSZ
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const pad = (n) => String(n).padStart(2, "0");
  const YYYY = d.getUTCFullYear();
  const MM = pad(d.getUTCMonth() + 1);
  const DD = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${YYYY}${MM}${DD}T${hh}${mm}${ss}Z`;
}

// ------------------------------
// Init
// ------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const eventsData = await loadEventsData();
    const visibleEvents = (eventsData.events || []).filter(e => e.visible !== false);
    EVENTS = buildEventsMap(visibleEvents);
    renderCalendarGrid(visibleEvents);
  } catch (err) {
    console.error("Ошибка загрузки ивентов:", err);
  }

  try {
    const visa = await loadVisaMatrix();
    if (visa && Object.keys(visa).length) {
      VISA_MATRIX = visa;
      rebuildVisaRules();
    }
  } catch (err) {
    console.error("Ошибка загрузки виз (используем встроенные):", err);
  }

  // Citizenship
  const citizenshipSelect = qs("#citizenshipSelect");
  if (citizenshipSelect) {
    currentCitizenship = citizenshipSelect.value || "";
    citizenshipSelect.addEventListener("change", () => {
      currentCitizenship = citizenshipSelect.value || "";
      updateAllVisaTags();
      applyFilters();
      // если модалка открыта — обновим бейдж в ней
      if (currentEventId) populateModal(currentEventId);
    });
  }

  // Inject visa tags into small cards that don't have them yet
  qsa('.event-card[data-country]').forEach(card => {
    const isMajor = card.classList.contains('major-card');
    if (!card.querySelector('[data-visa-tag]')) {
      const cc = card.getAttribute('data-country');
      if (cc) {
        const flexRow = card.querySelector('.flex.gap-2');
        if (flexRow) {
          const visaSpan = document.createElement('span');
          visaSpan.className = 'text-[10px] font-bold px-1.5 rounded';
          visaSpan.setAttribute('data-visa-tag', cc);
          if (!isMajor) visaSpan.setAttribute('data-visa-compact', '1');
          visaSpan.textContent = '...';
          flexRow.appendChild(visaSpan);
        }
      }
    }
  });

  // Visa tags initial
  updateAllVisaTags();

  // Filters
  qs("#filterSizeBtn")?.addEventListener("click", () => {
    tierFilterIndex = (tierFilterIndex + 1) % TIER_FILTERS.length;
    updateFilterLabels();
    applyFilters();
  });

  qs("#filterVisaBtn")?.addEventListener("click", () => {
    visaFilterIndex = (visaFilterIndex + 1) % VISA_FILTERS.length;
    updateFilterLabels();
    applyFilters();
  });

  updateFilterLabels();
  applyFilters();

  // Mark past events (ended before today) as inactive
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  qsa(".event-card[data-event-id]").forEach((card) => {
    const id = card.getAttribute("data-event-id");
    const ev = EVENTS[id];
    if (!ev) return;
    const endIso = ev.endISO || ev.startISO;
    if (!endIso) return;
    const endDate = new Date(endIso);
    if (Number.isNaN(endDate.getTime())) return;
    if (endDate < startOfToday) {
      card.classList.add("past-event");
    }
  });

  initMobilePastMonths();

  // Modal open: bind all clickable event cards (skip past events)
  qsa(".event-card[data-event-id]:not(.past-event)").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-event-id");
      if (!id) return;
      populateModal(id);
      openModal();
    });
  });

  /* LOCAL_PARTNER_PROMO — раскомментируй вместе с блоками в index.html (баннер + тизер MAC)
  qsa("[data-open-mac-side-events]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const eventId = el.getAttribute("data-open-mac-side-events") || "mac_yerevan_2026";
      populateModal(eventId);
      openModal();
      setActiveTab("events");
    });
  });
  */

  // Modal close
  qs("#modalCloseBtn")?.addEventListener("click", closeModal);
  qs("#modalBg")?.addEventListener("click", closeModal);

  // Escape key closes modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  });

  // Tabs
  qsa("[data-tab-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab-btn");
      if (tab) setActiveTab(tab);
    });
  });

  // ------------------------------
  // Calendar Export Logic
  // ------------------------------
  initCalendarExport();

  // ------------------------------
  // Access Modal (Lead Capture)
  // ------------------------------
  initAccessModal();
});

// ------------------------------
// Mobile: hide past months under collapsible toggle
// ------------------------------
function initMobilePastMonths() {
  const grid = document.querySelector('.calendar-grid');
  if (!grid || grid.dataset.pastMonthsInit === '1') return;

  const currentMonthIdx = new Date().getMonth() + 1;
  const cells = Array.from(grid.querySelectorAll(':scope > .cell'));
  let pastMonthsCount = 0;

  cells.forEach((cell) => {
    const numEl = cell.querySelector('.month-num');
    const monthIdx = parseInt(numEl?.textContent?.trim() || '0', 10);
    if (!monthIdx) return;
    cell.dataset.monthIndex = String(monthIdx);
    if (monthIdx < currentMonthIdx) {
      cell.classList.add('cell--past');
      pastMonthsCount += 1;
    } else if (monthIdx === currentMonthIdx) {
      cell.classList.add('cell--current');
    } else {
      cell.classList.add('cell--future');
    }
  });

  const pastEventsCount = document.querySelectorAll('.event-card.past-event').length;

  if (pastMonthsCount === 0 || pastEventsCount === 0) {
    grid.dataset.pastMonthsInit = '1';
    return;
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'past-months-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'pastMonthsRegion');
  toggle.innerHTML =
    '<span class="past-months-toggle__label">Прошедшие ивенты</span>' +
    '<span class="past-months-toggle__count">' + pastEventsCount + '</span>' +
    '<span class="past-months-toggle__chev" aria-hidden="true">▾</span>';

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    grid.classList.toggle('past-months-open', !expanded);
  });

  grid.insertBefore(toggle, grid.firstChild);
  grid.dataset.pastMonthsInit = '1';
}

// ------------------------------
// Calendar Export Logic
// ------------------------------
const MONTH_MAP_EN = {
  'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
  'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
  'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
};

const MONTH_MAP_RU = {
  'янв': '01', 'фев': '02', 'мар': '03', 'апр': '04',
  'май': '05', 'июн': '06', 'июл': '07', 'авг': '08',
  'сен': '09', 'окт': '10', 'ноя': '11', 'дек': '12'
};

function getVisibleEvents() {
  const allCards = qsa('[data-filterable="1"]');
  return allCards.filter(card => {
    // Check if visible
    if (card.offsetParent === null) return false;
    const style = window.getComputedStyle(card);
    if (style.display === 'none') return false;
    if (card.classList.contains('hidden')) return false;
    return true;
  });
}

function initCalendarExport() {
  const addBtn = qs("#addToCalendarBtn");
  const modalAddBtn = qs("#modalAddToCalendarBtn");

  // Main button: smart behavior
  addBtn?.addEventListener("click", (e) => {
    e.preventDefault();

    const visibleCards = getVisibleEvents();

    if (visibleCards.length === 0) return;

    // Всегда открываем модалку с выбором событий и календаря
    showMultiEventModal(visibleCards);
  });

  // Modal button: add current event - direct calendar opening
  modalAddBtn?.addEventListener("click", () => {
    if (!currentEventId) return;

    const ev = EVENTS[currentEventId];
    if (!ev) return;

    // Используем новую функцию - сразу открывает нативный календарь
    addToCalendar(ev);
  });

  // Modal promo button
  const modalPromoBtn = qs("#modalPromoBtn");
  modalPromoBtn?.addEventListener("click", () => {
    if (!currentEventId) return;
    const ev = EVENTS[currentEventId];
    if (!ev) return;

    if (ev.promo) {
      showPromoToast(ev.promo, ev.promoNote);
    } else {
      showPromoToast(null, null, { pending: true });
    }
  });
}

// Promo Toast Functions
function showPromoToast(promoCode, note, options = {}) {
  const toast = qs("#promoToast");
  const codeValue = qs("#promoCodeValue");
  const copyBtn = qs("#promoCopyBtn");
  const noteEl = qs("#promoNoteDisplay");
  const titleEl = qs(".promo-toast-title");

  if (!toast || !codeValue) return;

  const isPending = options.pending || !promoCode;

  if (isPending) {
    if (titleEl) titleEl.textContent = "🎁 Промокод";
    codeValue.textContent = PROMO_PENDING_MESSAGE;
    codeValue.classList.add("promo-code-value--pending");
    if (noteEl) noteEl.style.display = "none";
    if (copyBtn) copyBtn.style.display = "none";
  } else {
    if (titleEl) titleEl.textContent = "🎉 Ваш промокод";
    codeValue.textContent = promoCode;
    codeValue.classList.remove("promo-code-value--pending");
    if (noteEl) {
      if (note) {
        noteEl.textContent = note;
        noteEl.style.display = "block";
      } else {
        noteEl.style.display = "none";
      }
    }
    if (copyBtn) {
      copyBtn.style.display = "";
      copyBtn.classList.remove("copied");
      copyBtn.textContent = "📋 Скопировать";
    }
  }

  toast.classList.add("show");

  // Auto hide after 10 seconds
  setTimeout(() => {
    hidePromoToast();
  }, 10000);
}

function hidePromoToast() {
  const toast = qs("#promoToast");
  if (toast) {
    toast.classList.remove("show");
  }
}

function copyPromoCode() {
  const codeValue = qs("#promoCodeValue");
  const copyBtn = qs("#promoCopyBtn");

  if (!codeValue) return;

  const code = codeValue.textContent;

  // Copy to clipboard
  navigator.clipboard.writeText(code).then(() => {
    copyBtn.classList.add("copied");
    copyBtn.textContent = "✓ Скопировано!";

    setTimeout(() => {
      copyBtn.classList.remove("copied");
      copyBtn.textContent = "📋 Скопировать";
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

// Multi-Event Modal Functions (for mobile)
// =====================================================
// Добавленные события (запоминаем в сессии)
// =====================================================
const addedEvents = new Set(JSON.parse(sessionStorage.getItem('sr_added_events') || '[]'));

function saveAddedEvents() {
  sessionStorage.setItem('sr_added_events', JSON.stringify([...addedEvents]));
}

// Храним выбранные события для модалки
let selectedEventsForBulk = {};

function updateBulkCount() {
  const count = Object.keys(selectedEventsForBulk).filter(k => selectedEventsForBulk[k]).length;
  const countEl = qs("#bulkAddCount");
  const appleBtn = qs("#addAppleCalBtn");
  const googleBtn = qs("#addGoogleCalBtn");
  
  if (count > 0) {
    const word = count === 1 ? 'событие' : count < 5 ? 'события' : 'событий';
    if (countEl) countEl.textContent = `Выбрано: ${count} ${word}`;
  } else {
    if (countEl) countEl.textContent = 'Выберите события';
  }
  
  if (appleBtn) appleBtn.disabled = count === 0;
  if (googleBtn) googleBtn.disabled = count === 0;
}

function showMultiEventModal(visibleCards) {
  const modal = qs("#multiEventModal");
  const eventList = qs("#multiEventList");

  if (!modal || !eventList) return;

  // Clear
  eventList.innerHTML = '';
  selectedEventsForBulk = {};

  // Список событий
  visibleCards.forEach(card => {
    const eventId = card.dataset.eventId;
    const event = EVENTS[eventId];
    if (!event) return;

    const eventItem = document.createElement('div');
    eventItem.className = 'multi-event-item';
    eventItem.dataset.eventId = eventId;

    // Чекбокс визуальный
    const cbDiv = document.createElement('div');
    cbDiv.className = 'event-checkbox';
    eventItem.appendChild(cbDiv);

    const info = document.createElement('div');
    info.className = 'multi-event-info';

    const titleEl = document.createElement('div');
    titleEl.className = 'multi-event-title';
    titleEl.textContent = event.title;

    const meta = document.createElement('div');
    meta.className = 'multi-event-dates';
    meta.textContent = `${event.dates} · ${event.city}`;

    info.appendChild(titleEl);
    info.appendChild(meta);
    eventItem.appendChild(info);

    // Tap по всей строке = выбрать
    eventItem.addEventListener('click', () => {
      eventItem.classList.toggle('selected');
      selectedEventsForBulk[eventId] = eventItem.classList.contains('selected');
      updateBulkCount();
    });

    eventList.appendChild(eventItem);
  });

  // "Выбрать все"
  const selectAllBtn = qs("#selectAllBtn");
  if (selectAllBtn) {
    selectAllBtn.onclick = () => {
      const items = qsa('#multiEventList .multi-event-item');
      const allSelected = items.every(el => el.classList.contains('selected'));
      items.forEach(item => {
        const id = item.dataset.eventId;
        if (allSelected) {
          item.classList.remove('selected');
          selectedEventsForBulk[id] = false;
        } else {
          item.classList.add('selected');
          selectedEventsForBulk[id] = true;
        }
      });
      selectAllBtn.textContent = allSelected ? 'Выбрать все' : 'Снять все';
      updateBulkCount();
    };
  }

  // Кнопка Google Calendar
  const googleBtn = qs("#addGoogleCalBtn");
  if (googleBtn) {
    googleBtn.onclick = () => {
      const selectedIds = Object.keys(selectedEventsForBulk).filter(k => selectedEventsForBulk[k]);
      if (selectedIds.length === 0) return;
      
      const events = selectedIds.map(id => EVENTS[id]).filter(Boolean);
      
      // Google Calendar не поддерживает bulk-add — открываем по одному
      if (events.length > 1) {
        // Предупреждаем и открываем по одному с большим интервалом
        const openNext = (index) => {
          if (index >= events.length) {
            googleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> Все добавлены';
            setTimeout(() => { googleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 14h2v2H8z" fill="currentColor"/></svg> Google Calendar'; }, 3000);
            return;
          }
          const ev = events[index];
          const url = buildGoogleCalendarUrl(ev);
          googleBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> ${index + 1} из ${events.length}...`;
          
          if (isTelegramMiniApp && TelegramWebApp?.openLink) {
            TelegramWebApp.openLink(url);
          } else {
            window.open(url, '_blank');
          }
          
          // Следующее событие через 2.5 секунды
          setTimeout(() => openNext(index + 1), 2500);
        };
        
        // Показываем предупреждение
        if (isTelegramMiniApp && TelegramWebApp?.showPopup) {
          TelegramWebApp.showPopup({
            title: 'Google Calendar',
            message: `Выбрано ${events.length} событий. Google Calendar добавляет по одному — каждое откроется отдельно. Нажмите «Сохранить» в каждом.`,
            buttons: [
              { id: 'go', type: 'default', text: 'Добавлять' },
              { id: 'cancel', type: 'cancel', text: 'Отмена' }
            ]
          }, (btnId) => {
            if (btnId === 'go') openNext(0);
          });
        } else {
          if (confirm(`Выбрано ${events.length} событий. Google Calendar добавляет по одному — каждое откроется в новой вкладке. Нажмите «Сохранить» в каждой. Продолжить?`)) {
            openNext(0);
          }
        }
      } else {
        // Одно событие — сразу открываем
        const url = buildGoogleCalendarUrl(events[0]);
        if (isTelegramMiniApp && TelegramWebApp?.openLink) {
          TelegramWebApp.openLink(url);
        } else {
          window.open(url, '_blank');
        }
        googleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> Готово';
        setTimeout(() => { googleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 14h2v2H8z" fill="currentColor"/></svg> Google Calendar'; }, 2000);
      }
      
      // Запоминаем
      selectedIds.forEach(id => addedEvents.add(id));
      saveAddedEvents();
    };
  }

  // Кнопка Apple Calendar
  const appleBtn = qs("#addAppleCalBtn");
  if (appleBtn) {
    appleBtn.onclick = () => {
      const selectedIds = Object.keys(selectedEventsForBulk).filter(k => selectedEventsForBulk[k]);
      if (selectedIds.length === 0) return;
      
      const events = selectedIds.map(id => EVENTS[id]).filter(Boolean);
      
      if (isTelegramMiniApp) {
        // Mini App: openLink к ICS серверу → Safari → нативный диалог
        const eventsParam = events.map(ev => {
          return `${encodeURIComponent(ev.title)}|${encodeURIComponent(ev.city + ', ' + (ev.countryName || ev.country))}|${isoToAllDay(ev.startISO)}|${isoToAllDayEnd(ev.endISO)}`;
        }).join(';;');
        const icsUrl = `https://sr-calendar-bot.onrender.com/ics-multi?events=${encodeURIComponent(eventsParam)}`;
        
        if (TelegramWebApp?.openLink) {
          TelegramWebApp.openLink(icsUrl);
        } else {
          window.open(icsUrl, '_blank');
        }
      } else {
        // Обычный браузер: генерируем ICS blob → window.location.href
        // Safari на iOS перехватывает text/calendar и показывает нативный диалог
        const conferences = events.map(ev => ({
          title: ev.title,
          location: `${ev.city}, ${ev.countryName || ev.country}`,
          country: ev.country,
          startDate: ev.startISO ? ev.startISO.split('T')[0] : null,
          endDate: ev.endISO ? ev.endISO.split('T')[0] : null,
          isTBD: false,
          description: ev.description || ''
        }));
        const icsData = generateMultiEventICS(conferences);
        if (icsData) {
          const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          window.location.href = url;
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      }
      
      // Запоминаем
      selectedIds.forEach(id => addedEvents.add(id));
      saveAddedEvents();
      
      appleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> Готово';
      setTimeout(() => { appleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg> Apple Calendar'; }, 2000);
    };
  }

  updateBulkCount();
  modal.classList.add('show');
}

function hideMultiEventModal() {
  const modal = qs("#multiEventModal");
  if (modal) {
    modal.classList.remove('show');
  }
}

// Init multi-event modal close button
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = qs("#closeMultiEventModal");
  const modal = qs("#multiEventModal");

  closeBtn?.addEventListener("click", hideMultiEventModal);

  // Close on overlay click
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      hideMultiEventModal();
    }
  });
});

function extractConferenceData(card) {
  const data = {
    title: "",
    location: "",
    country: card.getAttribute("data-country") || "",
    startDate: null,
    endDate: null,
    isTBD: false,
    description: ""
  };

  // Extract title
  const titleEl = card.querySelector("h3, .text-sm.font-bold, .font-bold");
  if (titleEl) data.title = titleEl.textContent.trim();

  // Extract location
  const locationEl = card.querySelector("p.text-xs, .text-\\[11px\\]");
  if (locationEl) {
    const locationText = locationEl.textContent.trim();
    data.location = locationText.split("•")[0].trim();
  }

  // Extract dates
  const dataStart = card.getAttribute("data-start");
  const dataEnd = card.getAttribute("data-end");

  if (dataStart && dataEnd) {
    data.startDate = dataStart;
    data.endDate = dataEnd;
  } else {
    // Try to parse from text
    const dateEl = card.querySelector("span.tag");
    if (dateEl) {
      const dateText = dateEl.textContent.trim();
      const parsed = parseDateText(dateText, card);
      data.startDate = parsed.start;
      data.endDate = parsed.end;
      data.isTBD = parsed.isTBD;
    }
  }

  return data;
}

function parseDateText(text, card) {
  const result = { start: null, end: null, isTBD: false };

  // Check for "DD–DD Month" format (Russian)
  const ruMatch = text.match(/(\d+)[–-](\d+)\s+(\S+)/);
  if (ruMatch) {
    const [, startDay, endDay, monthRu] = ruMatch;
    const monthLower = monthRu.toLowerCase().substring(0, 3);
    const month = MONTH_MAP_RU[monthLower];
    if (month) {
      result.start = `2026-${month}-${startDay.padStart(2, '0')}`;
      result.end = `2026-${month}-${endDay.padStart(2, '0')}`;
      return result;
    }
  }

  // Check for TBD format
  if (text.includes("TBD") || text.includes("Даты TBD")) {
    result.isTBD = true;

    // Try to extract month from text
    const monthMatch = text.match(/TBD\s+(\w+)/i);
    let month = null;

    if (monthMatch) {
      const monthStr = monthMatch[1].toLowerCase();
      month = MONTH_MAP_EN[monthStr];
    }

    // Fallback: get month from parent cell
    if (!month) {
      const cell = card.closest(".cell");
      if (cell) {
        const monthNum = cell.querySelector(".month-num");
        if (monthNum) {
          month = monthNum.textContent.trim().padStart(2, '0');
        }
      }
    }

    if (month) {
      result.start = `2026-${month}-01`;
      result.end = `2026-${month}-02`;
    }
  }

  return result;
}

function generateMultiEventICS(conferences) {
  if (!conferences || conferences.length === 0) return null;

  const now = toICSDateTime(new Date().toISOString());
  const events = conferences.map((conf, idx) => {
    if (!conf.startDate || !conf.endDate) return null;

    const uid = `${Date.now()}-${idx}@secretroom-calendar`;
    const dtStart = conf.startDate.replace(/-/g, '');
    const dtEnd = conf.endDate.replace(/-/g, '');

    let description = conf.description || "";
    if (conf.isTBD) {
      description = "⚠️ Дата ориентировочная (TBD). Уточните перед поездкой.\n\n" + description;
    }

    return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART;VALUE=DATE:${dtStart}
DTEND;VALUE=DATE:${dtEnd}
SUMMARY:${escapeICS(conf.title)}
LOCATION:${escapeICS(conf.location)}
DESCRIPTION:${escapeICS(description)}
END:VEVENT`;
  }).filter(Boolean);

  if (events.length === 0) return null;

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Secretroom//iGaming Calendar//RU
CALSCALE:GREGORIAN
METHOD:PUBLISH
${events.join('\n')}
END:VCALENDAR`;

  return ics;
}


// Генерация ICS для iOS (all-day события)
function generateICSForIOS(event) {
  const title = event.title || '';
  const location = `${event.city}, ${event.countryName || event.country}`;
  const description = event.description || event.title;
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Secretroom//Calendar//RU
BEGIN:VEVENT
UID:${event.title.replace(/\s+/g, '-')}-${Date.now()}@secretroom
DTSTAMP:${now}
DTSTART;VALUE=DATE:${isoToAllDay(event.startISO)}
DTEND;VALUE=DATE:${isoToAllDayEnd(event.endISO)}
SUMMARY:${title}
LOCATION:${location}
DESCRIPTION:${description}
END:VEVENT
END:VCALENDAR`;
}

// =====================================================
// ICS Server URL (Render)
// =====================================================
const ICS_SERVER = 'https://sr-calendar-bot.onrender.com/ics';

// =====================================================
// Toast-уведомление
// =====================================================
function showCalendarToast(eventTitle, status) {
  // Удаляем старый toast если есть
  const oldToast = document.getElementById('calendarToast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.id = 'calendarToast';
  toast.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(100px);
    background: #222; border: 1px solid #F5DA0F; border-radius: 16px;
    padding: 14px 20px; z-index: 99999; display: flex; align-items: center; gap: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5); max-width: 90vw;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    font-family: "Nunito", sans-serif;
  `;

  if (status === 'success') {
    toast.innerHTML = `<span style="font-size:20px">✅</span><span style="color:#FBF2E8;font-size:14px;font-weight:600">${eventTitle}</span>`;
  } else if (status === 'loading') {
    toast.innerHTML = `<span style="font-size:20px;animation:spin 1s linear infinite;display:inline-block">⏳</span><span style="color:#FBF2E8;font-size:14px;font-weight:600">Добавляю ${eventTitle}...</span>`;
  }

  document.body.appendChild(toast);

  // Анимация появления
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  // Автоудаление через 3 секунды
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// =====================================================
// Построить URL для ICS сервера
// =====================================================
// Извлечь дату (YYYYMMDD) из ISO строки для all-day событий
function isoToAllDay(isoStr) {
  if (!isoStr) return '';
  // "2026-03-04T09:00:00Z" → "20260304", "2026-03-04" → "20260304"
  return isoStr.split('T')[0].replace(/-/g, '');
}

// Для all-day событий endDate эксклюзивный — нужно прибавить 1 день
function isoToAllDayEnd(isoStr) {
  if (!isoStr) return '';
  const dateStr = isoStr.split('T')[0];
  const d = new Date(dateStr + 'T12:00:00Z'); // полдень чтобы не было проблем с DST
  d.setUTCDate(d.getUTCDate() + 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// Нормализация ISO даты в формат ICS (для обратной совместимости)
function normalizeISOtoICS(isoStr) {
  if (!isoStr) return '';
  return isoToAllDay(isoStr);
}

function buildICSUrl(event) {
  const title = encodeURIComponent(event.title || '');
  const location = encodeURIComponent(`${event.city || ''}, ${event.countryName || event.country || ''}`);
  const description = encodeURIComponent(event.description || event.title || '');
  const startDate = isoToAllDay(event.startISO);
  const endDate = isoToAllDayEnd(event.endISO);
  
  return `${ICS_SERVER}?title=${title}&location=${location}&description=${description}&start=${startDate}&end=${endDate}&allday=1`;
}

// =====================================================
// Построить URL для Google Calendar
// =====================================================
function buildGoogleCalendarUrl(event) {
  const title = encodeURIComponent(event.title || '');
  const location = encodeURIComponent(`${event.city || ''}, ${event.countryName || event.country || ''}`);
  const description = encodeURIComponent(event.description || '');
  // Google Calendar: для all-day событий используем формат YYYYMMDD/YYYYMMDD (endDate эксклюзивный)
  const startDate = isoToAllDay(event.startISO);
  const endDate = isoToAllDayEnd(event.endISO);
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&location=${location}&details=${description}`;
}

// =====================================================
// Массовое добавление событий в календарь
// =====================================================
function addMultipleToCalendar(events) {
  if (!events || events.length === 0) return;

  // Если одно событие — обычное добавление
  if (events.length === 1) {
    addToCalendar(events[0]);
    return;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  // В Telegram Mini App на iPhone: бот отправляет один .ics файл со всеми событиями
  if (isTelegramMiniApp && isIOS) {
    const chatId = TelegramWebApp.initDataUnsafe?.user?.id;
    if (!chatId) return;

    showCalendarToast(`${events.length} событий`, 'loading');

    const eventData = events.map(ev => ({
      title: ev.title || '',
      location: `${ev.city || ''}, ${ev.countryName || ev.country || ''}`,
      description: ev.description || ev.title || '',
      start: normalizeISOtoICS(ev.startISO),
      end: normalizeISOtoICS(ev.endISO)
    }));

    fetch('https://sr-calendar-bot.onrender.com/send-multi-ics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, events: eventData })
    })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        showCalendarToast(`${events.length} событий`, 'success');
        if (TelegramWebApp?.showPopup) {
          TelegramWebApp.showPopup({
            title: `📅 ${events.length} событий отправлено!`,
            message: 'Файл в чате. Нажмите на него — все события добавятся в календарь одним нажатием.',
            buttons: [
              { id: 'go_chat', type: 'default', text: 'Перейти в чат' },
              { id: 'stay', type: 'cancel', text: 'Остаться' }
            ]
          }, (btnId) => {
            if (btnId === 'go_chat') TelegramWebApp.close();
          });
        }
      }
    })
    .catch(() => {
      // Fallback: добавляем по одному
      events.forEach(ev => addToCalendar(ev));
    });

    return;
  }

  // В Telegram Mini App на Android/Desktop: Google Calendar по одному
  if (isTelegramMiniApp) {
    events.forEach((ev, i) => {
      setTimeout(() => addToCalendar(ev), i * 500);
    });
    return;
  }

  // Обычный браузер: скачиваем один ICS файл
  const conferences = events.map(ev => ({
    title: ev.title,
    location: `${ev.city}, ${ev.countryName || ev.country}`,
    country: ev.country,
    startDate: ev.startISO ? ev.startISO.split('T')[0] : null,
    endDate: ev.endISO ? ev.endISO.split('T')[0] : null,
    isTBD: false,
    description: ev.description || ''
  }));
  const icsData = generateMultiEventICS(conferences);
  if (icsData) {
    downloadICSFile(icsData, 'secretroom-calendar-2026');
  }
}

// =====================================================
// Основная функция добавления в календарь
// =====================================================
function addToCalendar(event) {
  if (!event || !event.title) return;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid;
  const icsUrl = buildICSUrl(event);
  const googleUrl = buildGoogleCalendarUrl(event);

  // ====================================================
  // TELEGRAM MINI APP
  // ====================================================
  if (isTelegramMiniApp) {

    // --- iPhone: Apple Calendar через Safari (ICS с сервера) ---
    if (isIOS) {
      if (TelegramWebApp?.openLink) {
        TelegramWebApp.openLink(icsUrl);
      } else {
        window.open(icsUrl, '_blank');
      }
      return;
    }

    // --- Android / Desktop: Google Calendar ---
    if (TelegramWebApp?.openLink) {
      TelegramWebApp.openLink(googleUrl);
    } else {
      window.open(googleUrl, '_blank');
    }
    return;
  }

  // ====================================================
  // ОБЫЧНЫЙ БРАУЗЕР (не Mini App)
  // ====================================================

  if (isIOS) {
    // iOS Safari: blob с text/calendar вызовет нативный диалог Calendar
    const icsContent = generateICSForIOS(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 1000);

  } else if (isAndroid) {
    // Android: Google Calendar URL
    window.location.href = googleUrl;

  } else {
    // Desktop: Google Calendar в новой вкладке
    window.open(googleUrl, '_blank');
  }
}

// Функция для скачивания ICS файла (только для множественных событий на десктопе)
function downloadICSFile(icsContent, basename) {
  const dataUrl = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsContent);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${basename || 'event'}.ics`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
  }, 100);
}

// ------------------------------
// Calendar Integration Functions
// ------------------------------

/**
 * Генерирует ICS контент для одного события
 */
function buildICS(event) {
  const conf = {
    title: event.title,
    location: `${event.city}, ${event.countryName || event.country}`,
    country: event.country,
    startDate: event.startISO ? event.startISO.split('T')[0] : null,
    endDate: event.endISO ? event.endISO.split('T')[0] : null,
    isTBD: false,
    description: event.description || ""
  };

  return generateMultiEventICS([conf]);
}

/**
 * Генерирует ссылки для добавления события в разные календари
 */
function generateCalendarLinks(event) {
  const title = event.title;
  const location = `${event.city}, ${event.countryName}`;
  const description = event.description || '';
  const startDate = event.startISO;
  const endDate = event.endISO;

  // Форматирование дат для разных сервисов
  const formatDateForGoogle = (isoDate) => {
    return isoDate.replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const formatDateForYahoo = (isoDate) => {
    return isoDate.replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const formatDateForOutlook = (isoDate) => {
    return isoDate;
  };

  // Google Calendar
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;

  // Outlook/Office 365
  const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${formatDateForOutlook(startDate)}&enddt=${formatDateForOutlook(endDate)}&location=${encodeURIComponent(location)}&body=${encodeURIComponent(description)}&path=/calendar/action/compose&rru=addevent`;

  // Yahoo Calendar
  const yahooUrl = `https://calendar.yahoo.com/?v=60&view=d&type=20&title=${encodeURIComponent(title)}&st=${formatDateForYahoo(startDate)}&et=${formatDateForYahoo(endDate)}&desc=${encodeURIComponent(description)}&in_loc=${encodeURIComponent(location)}`;

  // Office 365
  const office365Url = `https://outlook.office.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${formatDateForOutlook(startDate)}&enddt=${formatDateForOutlook(endDate)}&location=${encodeURIComponent(location)}&body=${encodeURIComponent(description)}&path=/calendar/action/compose&rru=addevent`;

  return {
    google: googleUrl,
    outlook: outlookUrl,
    yahoo: yahooUrl,
    office365: office365Url
  };
}

/**
 * Показывает модальное окно выбора календаря
 */
function showCalendarPicker(event) {
  const links = generateCalendarLinks(event);
  const icsContent = buildICS(event);

  // Создаем модальное окно
  const modal = document.createElement('div');
  modal.id = 'calendarPickerModal';
  modal.className = 'calendar-picker-modal';
  modal.innerHTML = `
    <div class="calendar-picker-overlay"></div>
    <div class="calendar-picker-content">
      <div class="calendar-picker-header">
        <h3>Добавить в календарь</h3>
        <button class="calendar-picker-close">&times;</button>
      </div>
      <div class="calendar-picker-body">
        <button class="calendar-option" data-type="google">
          <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>Google Calendar</span>
        </button>

        <button class="calendar-option" data-type="outlook">
          <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>Outlook Calendar</span>
        </button>

        <button class="calendar-option" data-type="office365">
          <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>Office 365 Calendar</span>
        </button>

        <button class="calendar-option" data-type="yahoo">
          <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>Yahoo Calendar</span>
        </button>

        <button class="calendar-option" data-type="apple">
          <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>Apple Calendar (iCal)</span>
        </button>

        <button class="calendar-option" data-type="ics">
          <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Скачать ICS файл</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Анимация появления
  setTimeout(() => modal.classList.add('show'), 10);

  // Обработчики закрытия
  const closeBtn = modal.querySelector('.calendar-picker-close');
  const overlay = modal.querySelector('.calendar-picker-overlay');

  const closeModal = () => {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  };

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  // Обработчики выбора календаря
  modal.querySelectorAll('.calendar-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;

      switch(type) {
        case 'google':
          window.open(links.google, '_blank');
          break;
        case 'outlook':
          window.open(links.outlook, '_blank');
          break;
        case 'office365':
          window.open(links.office365, '_blank');
          break;
        case 'yahoo':
          window.open(links.yahoo, '_blank');
          break;
        case 'apple':
          // Apple Calendar через data URL
          const dataUrl = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsContent);
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          if (isIOS) {
            window.location.href = dataUrl;
          } else {
            window.open(dataUrl, '_blank');
          }
          break;
        case 'ics':
          // Скачать ICS файл
          downloadICSFile(icsContent, event.title.replace(/\s+/g, '_'));
          break;
      }

      closeModal();
    });
  });
}

// ------------------------------
// Access Modal Logic
// ------------------------------
const STORAGE_KEY = "igcal_user";
const BOT_USERNAME = "YOUR_TELEGRAM_BOT_USERNAME"; // Replace with your bot username

function normalizeTelegram(input) {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function checkAccess() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    const data = JSON.parse(stored);
    return !!(data && data.telegram);
  } catch {
    return false;
  }
}

function saveAccess(name, telegram, createdAtISO) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, telegram, createdAtISO }));
  } catch (err) {
    console.error("Failed to save to localStorage:", err);
  }
}

function showAccessModal() {
  const overlay = qs("#accessModalOverlay");
  if (!overlay) return;
  overlay.classList.remove("hidden");
}

function hideAccessModal() {
  const overlay = qs("#accessModalOverlay");
  if (!overlay) return;
  overlay.classList.add("hidden");
}

function showError(message) {
  const el = qs("#accessError");
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden");
}

function hideError() {
  const el = qs("#accessError");
  if (!el) return;
  el.classList.add("hidden");
}

function showSuccess() {
  const el = qs("#accessSuccess");
  if (!el) return;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2000);
}

function setLoading(isLoading) {
  const btn = qs("#accessSubmitBtn");
  const spinner = qs("#accessBtnSpinner");
  const text = qs("#accessBtnText");
  if (!btn) return;

  if (isLoading) {
    btn.disabled = true;
    spinner?.classList.remove("hidden");
    text?.classList.add("hidden");
  } else {
    btn.disabled = false;
    spinner?.classList.add("hidden");
    text?.classList.remove("hidden");
  }
}

function initTelegramWidget() {
  // Check if bot username is configured
  if (BOT_USERNAME === "YOUR_TELEGRAM_BOT_USERNAME") {
    // Not configured, leave placeholder
    return;
  }

  // Hide placeholder
  const placeholder = qs("#telegramWidgetPlaceholder");
  if (placeholder) placeholder.style.display = "none";

  // Load Telegram Widget script
  const container = qs("#telegramLoginContainer");
  if (!container) return;

  const script = document.createElement("script");
  script.src = "https://telegram.org/js/telegram-widget.js?22";
  script.setAttribute("data-telegram-login", BOT_USERNAME);
  script.setAttribute("data-size", "medium");
  script.setAttribute("data-radius", "12");
  script.setAttribute("data-onauth", "onTelegramAuth(user)");
  script.setAttribute("data-request-access", "write");
  script.async = true;

  container.appendChild(script);
}

// Callback for Telegram Widget
window.onTelegramAuth = function(user) {
  if (!user) return;

  const nameInput = qs("#accessName");
  const telegramInput = qs("#accessTelegram");

  // Prefill fields
  if (user.username && telegramInput) {
    telegramInput.value = normalizeTelegram(user.username);
  }

  if (user.first_name && nameInput) {
    const lastName = user.last_name || "";
    nameInput.value = `${user.first_name} ${lastName}`.trim();
  }

  // Note: We don't auto-check consent, user must do it manually
};

function initAccessModal() {
  // Старая модалка регистрации (имя + Telegram). Отключена общим флагом AUTH_ENABLED.
  // Чтобы вернуть — поменяй AUTH_ENABLED → true в начале AUTH-секции ниже.
  if (typeof AUTH_ENABLED !== "undefined" && !AUTH_ENABLED) return;

  // Check if user already has access
  if (checkAccess()) {
    return; // Don't show modal
  }

  // Show modal
  showAccessModal();

  // Initialize Telegram Widget
  initTelegramWidget();

  // Handle form submission
  const accessForm = qs("#accessForm");
  accessForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    hideError();

    const nameInput = qs("#accessName");
    const telegramInput = qs("#accessTelegram");
    const consentInput = qs("#accessConsent");
    const createdAtInput = qs("#accessCreatedAt");
    const userAgentInput = qs("#accessUserAgent");

    const name = nameInput?.value || "";
    const telegram = telegramInput?.value || "";

    // Validation
    if (!name.trim()) {
      showError("Пожалуйста, введите ваше имя");
      return;
    }

    if (!telegram.trim()) {
      showError("Пожалуйста, введите ваш Telegram");
      return;
    }

    if (!consentInput?.checked) {
      showError("Необходимо согласие на обработку данных");
      return;
    }

    // Normalize telegram
    const normalizedTg = normalizeTelegram(telegram);
    if (telegramInput) telegramInput.value = normalizedTg;

    // Fill hidden fields
    const now = new Date().toISOString();
    if (createdAtInput) createdAtInput.value = now;
    if (userAgentInput) userAgentInput.value = navigator.userAgent;

    // Show loading
    setLoading(true);

    // Save to localStorage
    saveAccess(name.trim(), normalizedTg, now);

    // Submit form to iframe
    accessForm.submit();

    // Close modal after short delay
    setTimeout(() => {
      showSuccess();
      setTimeout(() => {
        hideAccessModal();
        setLoading(false);
      }, 1000);
    }, 500);
  });
}

// =====================================================
// TELEGRAM AUTH SYSTEM
// =====================================================

// =====================================================
// AUTH: server-validated sessions
// =====================================================
// ⚡ ФЛАГ РЕГИСТРАЦИИ
// false = регистрация ОТКЛЮЧЕНА (сайт открыт всем без авторизации)
// true  = регистрация ВКЛЮЧЕНА (требуется вход через Telegram-бота)
// Чтобы вернуть регистрацию — поменяй false → true.
const AUTH_ENABLED = false;

const API_BASE = 'https://sr-calendar-bot.onrender.com';
const SESSION_KEY = 'sr_session';

function authAllow() {
  document.body.classList.remove('auth-required');
  hideAuthOverlay();
  const tgReg = document.getElementById('tgRegOverlay');
  if (tgReg) tgReg.style.display = 'none';
}

function checkAuth() {
  // Регистрация отключена флагом — сразу пропускаем всех.
  if (!AUTH_ENABLED) {
    authAllow();
    return;
  }

  // --- Telegram Mini App ---
  if (isTelegramMiniApp) {
    const existingSession = localStorage.getItem(SESSION_KEY);
    if (existingSession) {
      // Validate existing session with backend
      fetch(API_BASE + '/api/check-session?session=' + existingSession)
        .then(r => r.json())
        .then(data => { data.ok ? authAllow() : miniAppFullAuth(); })
        .catch(() => miniAppFullAuth());
      return;
    }
    miniAppFullAuth();
    return;
  }

  // --- Browser with one-time token from bot ---
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('auth');

  if (urlToken) {
    window.history.replaceState({}, document.title, window.location.pathname);
    fetch(API_BASE + '/api/validate-token?token=' + urlToken)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          localStorage.setItem(SESSION_KEY, data.session);
          authAllow();
        } else {
          showAuthOverlay();
        }
      })
      .catch(() => showAuthOverlay());
    return;
  }

  // --- Browser returning visitor ---
  const session = localStorage.getItem(SESSION_KEY);
  if (session) {
    fetch(API_BASE + '/api/check-session?session=' + session)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          authAllow();
        } else {
          localStorage.removeItem(SESSION_KEY);
          showAuthOverlay();
        }
      })
      .catch(() => showAuthOverlay());
    return;
  }

  showAuthOverlay();
}

function miniAppFullAuth() {
  const initData = TelegramWebApp.initData;
  if (!initData) { showTgRegOverlay(); return; }

  fetch(API_BASE + '/api/validate-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData })
  })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        localStorage.setItem(SESSION_KEY, data.session);
        authAllow();
      } else {
        showTgRegOverlay();
      }
    })
    .catch(() => showTgRegOverlay());
}

function showTgRegOverlay() {
  document.body.classList.add('auth-required');
  hideAuthOverlay();
  let overlay = document.getElementById('tgRegOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tgRegOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#0D0D0D;padding:24px;';
    overlay.innerHTML = `
      <div style="text-align:center;max-width:340px;">
        <div style="font-size:48px;margin-bottom:16px;">🔐</div>
        <h2 style="color:#FBF2E8;font-size:20px;font-weight:700;margin-bottom:12px;">Нужна регистрация</h2>
        <p style="color:#999;font-size:14px;line-height:1.5;margin-bottom:24px;">
          Чтобы получить доступ к календарю, ответь на пару вопросов в чате с ботом — это займёт меньше минуты.
        </p>
        <button onclick="TelegramWebApp.close()" style="background:linear-gradient(135deg,#C8E712,#a5c00f);color:#0D0D0D;border:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;">
          ← Вернуться в чат
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
}

function showAuthOverlay() {
  document.body.classList.add('auth-required');
  const overlay = document.getElementById('authOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
    initTelegramWidget();
  }
}

function hideAuthOverlay() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});
