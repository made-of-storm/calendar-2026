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
const VISA_MATRIX = {
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
const VISA_RULES = {};
Object.keys(VISA_MATRIX).forEach(citizenship => {
  VISA_RULES[citizenship] = {};
  Object.keys(VISA_MATRIX[citizenship]).forEach(country => {
    const info = VISA_MATRIX[citizenship][country];
    VISA_RULES[citizenship][country] = info.required === 'нет' ? 'no' :
                                        info.required === 'да' ? 'yes' :
                                        'unknown';
  });
});

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
// Event data (MVP только для тех, кто открывается в модалке)
// ------------------------------
// Ты сейчас открываешь модалку только для карточек с data-event-id.
// Давай держать минимум данных тут. Позже вынесем в events.json.
const EVENTS = {
  "igb_live_2026_london": {
    title: "iGB L!VE", description: "Крупнейшая iGaming выставка Европы",
    city: "London", country: "GB", countryName: "Великобритания",
    dates: "1-2 июля 2026", attendees: "15,000", promo: null,
    weather: { temp: "18-22°C", description: "Тёплое лето, возможны дожди" },
    heroImage: "images/heroes/igb_london.jpg",
    startISO: "2026-07-01T09:00:00Z", endISO: "2026-07-02T18:00:00Z",
    website: "https://www.igblive.com/",
    telegramChannel: null,
    awards: [
      { name: "iGB Affiliate Awards 2026", date: "2 июля 2026", categories: ["Best Affiliate Programme", "Best New Programme", "SEO Superstar", "Best Affiliate Manager", "Best Employer"], website: "https://awards.igbaffiliate.com/" },
      { name: "EGR B2B Awards 2026", date: "3 июня 2026", categories: ["Best Platform Provider", "Best Payment Provider", "Marketing Campaign of the Year", "Best Casino Supplier", "Individual Achievement Award", "Team Achievement Award"], website: "https://awards.egr.global/egrb2bawards/en" },
      { name: "EGR Marketing & Innovation Awards 2026", date: "~июнь 2026", categories: ["Brand of the Year B2C", "Innovation of the Year", "Marketing Team of the Year", "Marketer of the Year", "Innovative Start-up"], website: "https://awards.egr.global/egrmarketinginnovationawards/en" },
    ],
    restaurants: [
      { name: "Roka Canary Wharf", vibe: "посидеть", avgCheck: "$100-300", description: "Японский ресторан с robata грилем", img: "images/restaurants/igb_live_roka_canary_wharf.jpg" },
      { name: "Boisdale Canary Wharf", vibe: "громко", avgCheck: "$100-300", description: "Шотландский ресторан с живым джазом", img: "images/restaurants/igb_live_boisdale.jpg" },
      { name: "Electric Shuffle", vibe: "потанцевать", avgCheck: "$50-100", description: "Бар с активной атмосферой и коктейлями", img: "images/restaurants/igb_live_electric_shuffle.jpg" },
      { name: "The Oiler Bar", vibe: "посидеть", avgCheck: "$60-120", description: "Коктейльный бар в Docklands", img: "images/restaurants/igb_live_oiler_bar.jpg" },
      { name: "Hawksmoor", vibe: "тихо", avgCheck: "$120-250", description: "Премиум стейкхаус", img: "images/restaurants/igb_live_hawksmoor.jpg" }
    ],
    brands: [
      { name: "CoolAffs", category: "Партнёрка", logo: "images/brands/coolaffs.png" },
      { name: "EcoPayz", category: "Платежи", logo: "https://logo.clearbit.com/ecopayz.com" },
      { name: "Betsson Group", category: "Оператор", logo: "https://logo.clearbit.com/betsson.com" },
      { name: "Evolution Gaming", category: "Провайдер", logo: "https://logo.clearbit.com/evolution.com" },
      { name: "Pragmatic Play", category: "Провайдер", logo: "https://logo.clearbit.com/pragmaticplay.com" },
      { name: "Melbet", category: "Оператор", logo: "https://logo.clearbit.com/melbet.com" },
      { name: "1Bet", category: "Оператор", logo: "https://logo.clearbit.com/1bet.com" },
      { name: "22Bet Partners", category: "Партнёрка", logo: "https://logo.clearbit.com/22bet.com" },
      { name: "Sportradar", category: "Технологии", logo: "https://logo.clearbit.com/sportradar.com" },
      { name: "Playtech", category: "Провайдер", logo: "https://logo.clearbit.com/playtech.com" }
    ],
    sideEvents: [
      {
        title: "ANS at Piccadilly",
        date: "30 июня, 19:00–23:00",
        location: "Fenix Mayfair, London",
        type: "dinner",
        img: "images/side-events/ans_london_piccadilly.png",
        imgLayout: "restaurant",
        organizerLogos: [
          { src: "images/side-events/ans_logo.svg", alt: "ANS" },
          { src: "images/side-events/wintevents_logo.svg", alt: "Wintevents" }
        ],
        description: "ANS — глобальная серия аффилейт-митапов для топов рынка и ecommerce-предпринимателей. Вечер нетворкинга в неформальной атмосфере: живое шоу, бар и дегустационный ужин в премиальном ресторане.",
        registerUrl: "https://wintevents.com/anslondon2026",
        registerLabel: "Билеты"
      },
      { title: "iGB Affiliate Awards", date: "1 июля", location: "ExCeL London", type: "awards" },
      { title: "Opening Night Party", date: "1 июля", location: "TBA", type: "party" },
      { title: "Affiliate Networking Drinks", date: "1 июля", location: "The Gun Docklands", type: "meetup" }
    ]
  },

  "sbc_rio_2026": {
    title: "SBC Summit Rio", description: "Крупнейшее событие в латиноамериканской индустрии iGaming",
    city: "Rio de Janeiro", country: "BR", countryName: "Бразилия",
    dates: "3-5 марта 2026", attendees: "15,000", promo: null,
    weather: { temp: "28-32°C", description: "Жарко и влажно, сезон дождей заканчивается" },
    heroImage: "images/heroes/sbc_rio.jpg",
    startISO: "2026-03-03T09:00:00Z", endISO: "2026-03-05T18:00:00Z",
    website: "https://sbcevents.com/sbc-summit-rio/",
    telegramChannel: "https://t.me/sbceurasia",
    awards: [
      { name: "SBC Awards Latinoamerica 2026", date: "4 марта 2026", categories: ["Casino Operator of the Year", "Sportsbook Operator of the Year", "Rising Star", "Best Affiliate Program", "Payment Solution of the Year"], website: "https://sbcevents.com/en/sbc-awards-latinoamerica/" },
    ],
    restaurants: [
      { name: "Shiso", vibe: "тихо", avgCheck: "$80-200", description: "Японский ресторан высокого класса", img: "images/restaurants/sbc_rio_shiso.jpg" },
      { name: "Zaza Bistro", vibe: "посидеть", avgCheck: "$60-150", description: "Bistro с органическими блюдами в Ipanema", img: "images/restaurants/sbc_rio_zaza_bistro.jpg" },
      { name: "Giuseppe Grill", vibe: "громко", avgCheck: "$100-250", description: "Премиальный стейкхаус", img: "images/restaurants/sbc_rio_giuseppe_grill.jpg" },
      { name: "Braseiro da Gávea", vibe: "громко", avgCheck: "$40-80", description: "Традиционная бразильская кухня", img: "images/restaurants/sbc_rio_braseiro_da_gavea.jpg" },
      { name: "Confeitaria Colombo", vibe: "посидеть", avgCheck: "$30-60", description: "Историческое кафе 1894 года", img: "images/restaurants/sbc_rio_confeitaria_colombo.jpg" }
    ],
    brands: [
      { name: "Betsson Group", category: "Оператор", logo: "https://logo.clearbit.com/betsson.com" },
      { name: "Betway", category: "Оператор", logo: "https://logo.clearbit.com/betway.com" },
      { name: "Pragmatic Play", category: "Провайдер", logo: "https://logo.clearbit.com/pragmaticplay.com" },
      { name: "Evolution Gaming", category: "Провайдер", logo: "https://logo.clearbit.com/evolution.com" },
      { name: "Stake", category: "Оператор", logo: "https://logo.clearbit.com/stake.com" },
      { name: "Sportradar", category: "Технологии", logo: "https://logo.clearbit.com/sportradar.com" },
      { name: "Betano", category: "Оператор", logo: "https://logo.clearbit.com/betano.com" },
      { name: "Superbet", category: "Оператор", logo: "https://logo.clearbit.com/superbet.com" },
      { name: "Aposta Ganha", category: "Оператор", logo: "images/brands/aposta_ganha.png" },
      { name: "PixBet", category: "Оператор", logo: "images/brands/pixbet.png" }
    ],
    sideEvents: [
      { title: "SBC Awards Latin America", date: "4 марта", location: "Riocentro", type: "awards" },
      { title: "Beach Party", date: "4 марта", location: "Copacabana", type: "party" }
    ]
  },

  "sbc_lisbon_2026": {
    title: "SBC Summit", description: "Главный саммит беттинг и iGaming индустрии",
    city: "Lisbon", country: "PT", countryName: "Португалия",
    dates: "29 сент - 1 окт 2026", attendees: "40,000", promo: null,
    weather: { temp: "20-25°C", description: "Тёплая осень, солнечно" },
    heroImage: "images/heroes/sbc_lisbon.jpg",
    startISO: "2026-09-29T09:00:00Z", endISO: "2026-10-01T18:00:00Z",
    website: "https://sbcevents.com/sbc-summit/",
    telegramChannel: "https://t.me/sbceurasia",
    awards: [
      { name: "SBC Awards 2026", date: "1 октября 2026", categories: ["Casino Operator of the Year", "Sportsbook Operator of the Year", "Game Studio of the Year", "Best Affiliate Program", "Leader of the Year", "Payment Solution of the Year"], website: "https://sbcevents.com/sbc-awards/" },
    ],
    restaurants: [
      { name: "Monte Mar Lisboa", vibe: "посидеть", avgCheck: "$80-180", description: "Морепродукты с видом на Тежу", img: "images/restaurants/sbc_lisbon_monte_mar.jpg" },
      { name: "JNcQUOI Avenida", vibe: "громко", avgCheck: "$100-250", description: "Элитный ресторан португальской кухни", img: "images/restaurants/sbc_lisbon_jncquoi.jpg" },
      { name: "Zambeze", vibe: "потанцевать", avgCheck: "$60-140", description: "Панорамный вид, терраса 300м²", img: "images/restaurants/sbc_lisbon_zambeze.jpg" },
      { name: "Doca Peixe", vibe: "посидеть", avgCheck: "$50-120", description: "Лучший рыбный ресторан, вид на марину", img: "images/restaurants/sbc_lisbon_doca_peixe.jpg" },
      { name: "Belcanto", vibe: "тихо", avgCheck: "$180-400", description: "2 звезды Мишлен от José Avillez", img: "images/restaurants/sbc_lisbon_belcanto.jpg" }
    ],
    brands: [
      { name: "Betsson Group", category: "Оператор", logo: "https://logo.clearbit.com/betsson.com" },
      { name: "Flutter Entertainment", category: "Оператор", logo: "https://logo.clearbit.com/flutter.com" },
      { name: "Entain", category: "Оператор", logo: "https://logo.clearbit.com/entain.com" },
      { name: "Evolution Gaming", category: "Провайдер", logo: "https://logo.clearbit.com/evolution.com" },
      { name: "Pragmatic Play", category: "Провайдер", logo: "https://logo.clearbit.com/pragmaticplay.com" },
      { name: "Playtech", category: "Провайдер", logo: "https://logo.clearbit.com/playtech.com" },
      { name: "Sportradar", category: "Технологии", logo: "https://logo.clearbit.com/sportradar.com" },
      { name: "Kambi", category: "Технологии", logo: "https://logo.clearbit.com/kambi.com" },
      { name: "SoftSwiss", category: "Технологии", logo: "https://logo.clearbit.com/softswiss.com" },
      { name: "Nuvei", category: "Платежи", logo: "https://logo.clearbit.com/nuvei.com" }
    ],
    sideEvents: [
      { title: "SBC Awards", date: "30 сентября", location: "MEO Arena", type: "awards" },
      { title: "Sunset Networking", date: "29 сентября", location: "LX Factory", type: "meetup" }
    ]
  },

  "affiliate_world_dubai_2026": {
    title: "Affiliate World Dubai", description: "Глобальная конференция аффилиатов и маркетологов",
    city: "Dubai", country: "AE", countryName: "ОАЭ",
    dates: "4-5 марта 2026", attendees: "6,000", promo: null,
    weather: { temp: "24-28°C", description: "Приятно тепло, низкая влажность" },
    heroImage: "images/heroes/aw_dubai.jpg",
    startISO: "2026-03-04T09:00:00Z", endISO: "2026-03-05T18:00:00Z",
    website: "https://www.affiliateworldconferences.com/dubai",
    telegramChannel: "https://t.me/affiliateworldconf",
    awards: [],
    restaurants: [
      { name: "Zuma Dubai", vibe: "громко", avgCheck: "$150-350", description: "Японский ресторан мирового класса", img: "images/restaurants/aw_dubai_zuma.jpg" },
      { name: "La Petite Maison", vibe: "тихо", avgCheck: "$120-280", description: "Французская кухня Ривьеры", img: "images/restaurants/aw_dubai_la_petite_maison.jpg" },
      { name: "Nobu Dubai", vibe: "тихо", avgCheck: "$150-400", description: "Японо-перуанский премиум", img: "images/restaurants/aw_dubai_nobu.jpg" },
      { name: "Coya Dubai", vibe: "потанцевать", avgCheck: "$100-250", description: "Перуанская кухня, живая музыка", img: "images/restaurants/aw_dubai_coya.jpg" },
      { name: "Tresind Studio", vibe: "тихо", avgCheck: "$200-400", description: "Индийская haute cuisine, 1 звезда Мишлен", img: "images/restaurants/aw_dubai_tresind_studio.jpg" }
    ],
    brands: [
      { name: "Clickbank", category: "Партнёрка", logo: "https://logo.clearbit.com/clickbank.com" },
      { name: "MaxBounty", category: "Партнёрка", logo: "https://logo.clearbit.com/maxbounty.com" },
      { name: "PropellerAds", category: "Технологии", logo: "https://logo.clearbit.com/propellerads.com" },
      { name: "Adsterra", category: "Технологии", logo: "https://logo.clearbit.com/adsterra.com" },
      { name: "Voluum", category: "Технологии", logo: "https://logo.clearbit.com/voluum.com" },
      { name: "Keitaro", category: "Технологии", logo: "https://logo.clearbit.com/keitaro.io" },
      { name: "Binom", category: "Технологии", logo: "https://logo.clearbit.com/binom.org" },
      { name: "RedTrack", category: "Технологии", logo: "https://logo.clearbit.com/redtrack.io" },
      { name: "ClickDealer", category: "Партнёрка", logo: "https://logo.clearbit.com/clickdealer.com" },
      { name: "Mobidea", category: "Партнёрка", logo: "https://logo.clearbit.com/mobidea.com" }
    ],
    sideEvents: [
      { title: "Opening Party", date: "4 марта", location: "TBA", type: "party" },
      { title: "Yacht Networking", date: "5 марта", location: "Dubai Marina", type: "meetup" }
    ]
  },

  "mac_yerevan_2026": {
    title: "MAC Yerevan", description: "СНГ конференция по партнёрскому маркетингу",
    city: "Yerevan", country: "AM", countryName: "Армения",
    dates: "26-27 мая 2026", attendees: "5,000", promo: "SECRETROOM", promoNote: "−10% на GOLD и VIP",
    weather: { temp: "22-28°C", description: "Тёплая весна, солнечно" },
    heroImage: "images/heroes/mac_yerevan.jpg",
    startISO: "2026-05-26T09:00:00Z", endISO: "2026-05-27T18:00:00Z",
    website: "https://mac-conference.com/",
    telegramChannel: "https://t.me/macpreparty",
    awards: [],
    partnerPromo: {
      title: "ABC Hotel",
      subtitle: "Комьюнити-отель MAC Yerevan",
      badge: "PARTNER",
      img: "images/promo/abc_hotel_mac.png",
      description: "Закрытый деловой отель для участников MAC — 140+ номеров, 250+ резидентов, 10+ сайд-ивентов от партнёров. Speed networking, бизнес-завтраки, митапы, gala-ужин и awards — всё под одной крышей в Radisson Blu.",
      dates: "25–28 мая",
      location: "Radisson Blu Hotel, Ереван",
      promo: "SECRETROOM",
      promoNote: "−10% на бронирование",
      cta: "Забронировать",
      ctaUrl: "https://hotel.affiliatebusinessclub.com/?utm_source=secretroom",
      telegram: "https://t.me/AffiliateBusinessClubRU",
      telegramChat: "https://t.me/+8JdzvvojB-k1Yjgy"
    },
    restaurants: [
      { name: "Dolmama", vibe: "посидеть", avgCheck: "$40-80", description: "Традиционная армянская кухня", img: "images/restaurants/mac_yerevan_dolmama.jpg" },
      { name: "The Club", vibe: "громко", avgCheck: "$60-120", description: "Живая музыка, популярен у экспатов", img: "images/restaurants/mac_yerevan_the_club.jpg" },
      { name: "Sherep", vibe: "посидеть", avgCheck: "$50-100", description: "Авторская армянская кухня", img: "images/restaurants/mac_yerevan_sherep.jpg" },
      { name: "Pandok Yerevan", vibe: "громко", avgCheck: "$30-70", description: "Традиционный ресторан с шоу", img: "images/restaurants/mac_yerevan_pandok.jpg" },
      { name: "Lavash", vibe: "посидеть", avgCheck: "$40-90", description: "Армянская кухня, вид на Арарат", img: "images/restaurants/mac_yerevan_lavash.jpg" }
    ],
    brands: [
      { name: "Pin-Up Partners", category: "Партнёрка", logo: "images/brands/pinup_partners.png" },
      { name: "1xBet Partners", category: "Партнёрка", logo: "https://logo.clearbit.com/1xbet.com" },
      { name: "Lucky Partners", category: "Партнёрка", logo: "images/brands/lucky_partners.png" },
      { name: "Mostbet Partners", category: "Партнёрка", logo: "images/brands/mostbet_partners.png" },
      { name: "Gambling.pro", category: "Медиа", logo: "images/brands/gambling_pro.png" },
      { name: "CPA Life", category: "Медиа", logo: "images/brands/cpa_life.png" },
      { name: "Leadgid", category: "Партнёрка", logo: "images/brands/leadgid.png" },
      { name: "Affstar", category: "Партнёрка", logo: "images/brands/affstar.png" },
      { name: "MetaCPA", category: "Партнёрка", logo: "images/brands/metacpa.png" },
      { name: "Mobidea", category: "Партнёрка", logo: "https://logo.clearbit.com/mobidea.com" }
    ],
    sideEvents: [
      {
        title: "Riddick's Padel Cup",
        cardVariant: "partner",
        partnerBadge: "PARTNER · RIDDICK'S PARTNERS · MAC WEEK",
        subtitle: "Ереван · 24 мая · старт 14:00",
        type: "sport",
        img: "images/side-events/riddicks_partners_logo.svg",
        description: "Открытый турнир по паделу для топов iGaming — аффилиатов, операторов и C-level. На корте группы по уровню и тренеры; за кортом — healthy-бар, кейтеринг и DJ. Места ограничены.",
        registerUrl: "https://riddickspartners.com/ru/meetup/riddicks-padel-cup/",
        registerLabel: "Принять участие"
      },
      {
        title: "partyJAN",
        date: "24 мая, 15:00",
        location: "Ереван (по регистрации)",
        type: "party",
        img: "images/side-events/mac_yerevan_partyjan.png",
        description: "Закрытый нетворкинг для owners, C-level и инфлюенсеров affiliate-рынка. Участие по предварительным спискам."
      },
      { title: "CIS Affiliates Meetup", date: "25 мая", location: "Meridian Expo", type: "meetup" },
      {
        title: "Armenian Nights by PIN-UP Partners",
        date: "26 мая, 20:30",
        location: "Ереван (invite-only, один из лучших клубов)",
        type: "party",
        img: "images/side-events/mac_yerevan_armenian_nights.svg",
        description: "Премиальная invite-only вечеринка от PIN-UP Partners в первый день MAC Yerevan 2026. Аудитория — действующие партнёры, медиабаинговые команды, топ-вебмастера и C-level индустрии. Вход строго по предварительной регистрации и ручному апруву. Гостей ждут DJ-сеты, премиальный бар, кейтеринг, кальяны и аутентичные армянские активности. Мест ограничено.",
        registerUrl: "https://partners-pu.com/ru/party/armenian-nights/",
        registerLabel: "Регистрация"
      },
      { title: "Closing Party", date: "27 мая", location: "TBA", type: "party" }
    ]
  },

  "ggate_tbilisi_2026": {
    title: "G Gate Tbilisi", description: "Восточноевропейский iGaming форум",
    city: "Tbilisi", country: "GE", countryName: "Грузия",
    dates: "26-27 июня 2026", attendees: "7,000", promo: "SECRETROOM",
    weather: { temp: "26-32°C", description: "Жаркое лето, сухо" },
    heroImage: "images/heroes/ggate_tbilisi.jpg",
    startISO: "2026-06-26T09:00:00Z", endISO: "2026-06-27T18:00:00Z",
    website: "https://ggate.ge/",
    telegramChannel: "https://t.me/ggatecommunity",
    awards: [],
    restaurants: [
      { name: "Funicular Complex", vibe: "потанцевать", avgCheck: "$50-120", description: "Панорамный вид на город", img: "images/restaurants/ggate_tbilisi_funicular.jpg" },
      { name: "Barbarestan", vibe: "тихо", avgCheck: "$60-140", description: "Исторические рецепты XIX века", img: "images/restaurants/ggate_tbilisi_barbarestan.jpg" },
      { name: "Café Stamba", vibe: "посидеть", avgCheck: "$40-90", description: "Модное место в дизайн-отеле", img: "images/restaurants/ggate_tbilisi_cafe_stamba.jpg" },
      { name: "Keto and Kote", vibe: "громко", avgCheck: "$30-70", description: "Современная грузинская кухня", img: "images/restaurants/ggate_tbilisi_keto_and_kote.jpg" },
      { name: "Shavi Lomi", vibe: "громко", avgCheck: "$40-90", description: "Инстаграмное место, авторская кухня", img: "images/restaurants/ggate_tbilisi_shavi_lomi.jpg" }
    ],
    brands: [
      { name: "Gambling.pro", category: "Медиа", logo: "images/brands/gambling_pro.png" },
      { name: "Traffic Cardinals", category: "Медиа", logo: "images/brands/traffic_cardinals.png" },
      { name: "Conversion", category: "Медиа", logo: "https://logo.clearbit.com/conversion.im" },
      { name: "SoftSwiss", category: "Технологии", logo: "https://logo.clearbit.com/softswiss.com" },
      { name: "BetConstruct", category: "Провайдер", logo: "https://logo.clearbit.com/betconstruct.com" },
      { name: "Digitain", category: "Провайдер", logo: "https://logo.clearbit.com/digitain.com" },
      { name: "Spribe", category: "Провайдер", logo: "https://logo.clearbit.com/spribe.co" },
      { name: "Slotegrator", category: "Технологии", logo: "https://logo.clearbit.com/slotegrator.com" },
      { name: "Endorphina", category: "Провайдер", logo: "https://logo.clearbit.com/endorphina.com" },
      { name: "Upgaming", category: "Провайдер", logo: "https://logo.clearbit.com/upgaming.com" }
    ],
    sideEvents: [
      { title: "Wine Tasting & Networking", date: "26 июня", location: "TBA", type: "dinner" },
      { title: "Closing Party", date: "27 июня", location: "TBA", type: "party" }
    ]
  },

  "broconf_sochi_2026": {
    title: "BROCONF-7", description: "Главная конференция по арбитражу трафика в СНГ",
    city: "Sochi", country: "RU", countryName: "Россия",
    dates: "25-26 апреля 2026", attendees: "3,500", promo: "SecretRoomBro", promoNote: "−15%",
    weather: { temp: "16-22°C", description: "Тёплая весна, возможны дожди" },
    heroImage: "images/heroes/broconf_sochi.jpg",
    startISO: "2026-04-25T09:00:00Z", endISO: "2026-04-26T18:00:00Z",
    website: "https://mybroconf.com/",
    telegramChannel: "https://t.me/broconf",
    awards: [],
    restaurants: [
      { name: "Хмели & Сунели", vibe: "громко", avgCheck: "$40-100", description: "Грузинский ресторан", img: "images/restaurants/broconf_sochi_hmeli_suneli.jpg" },
      { name: "Sanremo", vibe: "посидеть", avgCheck: "$80-200", description: "Итальянская кухня, вид на море", img: "images/restaurants/broconf_sochi_sanremo.jpg" },
      { name: "White Rabbit Sochi", vibe: "тихо", avgCheck: "$100-250", description: "Авторская русская кухня", img: "images/restaurants/broconf_sochi_white_rabbit.jpg" },
      { name: "Krasnaya Polyana", vibe: "посидеть", avgCheck: "$60-140", description: "Ресторан в горах", img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&q=80" },
      { name: "Barashka", vibe: "громко", avgCheck: "$50-120", description: "Кавказская кухня, вид на море", img: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=200&q=80" }
    ],
    brands: [
      { name: "Партнёркин", category: "Медиа", logo: "images/brands/partnerkin.png" },
      { name: "Conversion", category: "Медиа", logo: "https://logo.clearbit.com/conversion.im" },
      { name: "Кинза", category: "Медиа", logo: "images/brands/kinza.png" },
      { name: "Трафик Кардинал", category: "Медиа", logo: "images/brands/traffic_cardinals.png" },
      { name: "CPA.Club", category: "Партнёрка", logo: "images/brands/cpa_club.png" },
      { name: "Leadbit", category: "Партнёрка", logo: "https://logo.clearbit.com/leadbit.com" },
      { name: "Alfaleads", category: "Партнёрка", logo: "https://logo.clearbit.com/alfaleads.net" },
      { name: "Dr.Cash", category: "Партнёрка", logo: "images/brands/dr_cash.png" },
      { name: "Everad", category: "Партнёрка", logo: "https://logo.clearbit.com/everad.com" },
      { name: "MetaCPA", category: "Партнёрка", logo: "images/brands/metacpa.png" }
    ],
    sideEvents: [
      { title: "BROCONF-7 Party", date: "25 апреля", location: "Red Arena", type: "party" },
      { title: "Горный нетворкинг", date: "26 апреля", location: "Красная Поляна", type: "meetup" }
    ]
  },

  "g2e_las_vegas_2026": {
    title: "G2E Las Vegas", description: "Крупнейшая выставка казино индустрии",
    city: "Las Vegas", country: "US", countryName: "США",
    dates: "28 сент - 1 окт 2026", attendees: "25,000", promo: null,
    weather: { temp: "22-32°C", description: "Жарко днём, прохладно ночью" },
    heroImage: "images/heroes/g2e_vegas.jpg",
    startISO: "2026-09-28T09:00:00Z", endISO: "2026-10-01T18:00:00Z",
    website: "https://www.global-gaming-expo.com/",
    telegramChannel: null,
    awards: [
      { name: "Global Gaming Awards Americas 2026", date: "сентябрь 2026", categories: ["Casino Operator of the Year", "Digital Operator of the Year", "Casino Product of the Year", "Table Game Product of the Year", "Executive of the Year"], website: "https://www.globalgamingawards.com/" },
    ],
    restaurants: [
      { name: "TAO Asian Bistro", vibe: "громко", avgCheck: "$80-200", description: "Легендарный азиатский в Venetian", img: "images/restaurants/g2e_vegas_tao.jpg" },
      { name: "CUT by Wolfgang Puck", vibe: "тихо", avgCheck: "$120-300", description: "Премиум стейкхаус", img: "images/restaurants/g2e_vegas_cut.jpg" },
      { name: "Carnevino", vibe: "посидеть", avgCheck: "$100-250", description: "Итальянский стейкхаус в Palazzo", img: "images/restaurants/g2e_vegas_carnevino.jpg" },
      { name: "Buddakan", vibe: "потанцевать", avgCheck: "$70-150", description: "Азиатский фьюжн, впечатляющий интерьер", img: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=200&q=80" },
      { name: "Bazaar Meat", vibe: "громко", avgCheck: "$100-280", description: "Стейкхаус от José Andrés", img: "images/restaurants/g2e_vegas_bazaar_meat.jpg" }
    ],
    brands: [
      { name: "IGT", category: "Провайдер", logo: "https://logo.clearbit.com/igt.com" },
      { name: "Aristocrat", category: "Провайдер", logo: "https://logo.clearbit.com/aristocrat.com" },
      { name: "Light & Wonder", category: "Провайдер", logo: "https://logo.clearbit.com/lnw.com" },
      { name: "Konami Gaming", category: "Провайдер", logo: "https://logo.clearbit.com/konami.com" },
      { name: "Everi", category: "Технологии", logo: "https://logo.clearbit.com/everi.com" },
      { name: "AGS", category: "Провайдер", logo: "https://logo.clearbit.com/playags.com" },
      { name: "Ainsworth", category: "Провайдер", logo: "https://logo.clearbit.com/ainsworth.com" },
      { name: "JCM Global", category: "Технологии", logo: "https://logo.clearbit.com/jcmglobal.com" },
      { name: "Interblock", category: "Провайдер", logo: "https://logo.clearbit.com/interblockgaming.com" },
      { name: "Aruze Gaming", category: "Провайдер", logo: "https://logo.clearbit.com/aruzegaming.com" }
    ],
    sideEvents: [
      { title: "G2E Networking Reception", date: "29 сентября", location: "The Venetian", type: "meetup" },
      { title: "Casino Night", date: "30 сентября", location: "TBA", type: "party" }
    ]
  },

  "sbc_americas_2026": {
    title: "SBC Summit Americas", description: "Американский беттинг саммит",
    city: "Fort Lauderdale", country: "US", countryName: "США",
    dates: "9-11 июня 2026", attendees: "10,000", promo: null,
    weather: { temp: "28-33°C", description: "Жарко и влажно" },
    heroImage: "images/heroes/sbc_americas.jpg",
    startISO: "2026-06-09T09:00:00Z", endISO: "2026-06-11T18:00:00Z",
    website: "https://sbcevents.com/sbc-summit-americas/",
    telegramChannel: null,
    awards: [
      { name: "SBC Awards Americas 2026", date: "10 июня 2026", categories: ["Rising Star of the Year", "Casino Operator of the Year", "Sportsbook Operator of the Year", "Marketing Campaign of the Year", "Payment Solution of the Year"], website: "https://sbcevents.com/sbc-awards-americas/" },
    ],
    restaurants: [
      { name: "Steak 954", vibe: "тихо", avgCheck: "$100-250", description: "Премиум стейкхаус в W Hotel, вид на океан", img: "images/restaurants/sbc_americas_steak_954.jpg" },
      { name: "Timpano", vibe: "посидеть", avgCheck: "$70-150", description: "Итальянский с приватными комнатами", img: "images/restaurants/sbc_americas_timpano.jpg" },
      { name: "Shooters Waterfront", vibe: "громко", avgCheck: "$50-100", description: "Ресторан на воде, живая музыка", img: "images/restaurants/sbc_americas_shooters.jpg" },
      { name: "Louie Bossi's", vibe: "громко", avgCheck: "$60-140", description: "Итальянский с большой террасой", img: "images/restaurants/sbc_americas_louie_bossis.jpg" },
      { name: "Mastro's Ocean Club", vibe: "тихо", avgCheck: "$100-280", description: "Премиум стейки и морепродукты", img: "images/restaurants/sbc_americas_mastros.jpg" }
    ],
    brands: [
      { name: "DraftKings", category: "Оператор", logo: "https://logo.clearbit.com/draftkings.com" },
      { name: "FanDuel", category: "Оператор", logo: "https://logo.clearbit.com/fanduel.com" },
      { name: "BetMGM", category: "Оператор", logo: "https://logo.clearbit.com/betmgm.com" },
      { name: "Caesars Sportsbook", category: "Оператор", logo: "https://logo.clearbit.com/caesars.com" },
      { name: "Penn Entertainment", category: "Оператор", logo: "https://logo.clearbit.com/pennentertainment.com" },
      { name: "Genius Sports", category: "Технологии", logo: "https://logo.clearbit.com/geniussports.com" },
      { name: "Sportradar", category: "Технологии", logo: "https://logo.clearbit.com/sportradar.com" },
      { name: "IGT", category: "Провайдер", logo: "https://logo.clearbit.com/igt.com" },
      { name: "Light & Wonder", category: "Провайдер", logo: "https://logo.clearbit.com/lnw.com" },
      { name: "Paysafe", category: "Платежи", logo: "https://logo.clearbit.com/paysafe.com" }
    ],
    sideEvents: []
  },

  "conversion_warsaw_2026": {
    title: "Conversion Conf", description: "Конференция по лидогенерации и affiliate маркетингу",
    city: "Warsaw", country: "PL", countryName: "Польша",
    dates: "1-2 апреля 2026", attendees: "3,000", promo: "SECRETROOM5",
    weather: { temp: "8-14°C", description: "Прохладная весна" },
    heroImage: "images/heroes/conversion_warsaw.jpg",
    startISO: "2026-04-01T09:00:00Z", endISO: "2026-04-02T18:00:00Z",
    website: "https://www.conversion-conf.com/",
    telegramChannel: "https://t.me/conversionconf",
    awards: [
      { name: "Affiliate Space Awards 2026", date: "4 декабря 2026, Бангкок", categories: ["Best Gambling Affiliate Program", "Best CPA Affiliate Program", "Best Online Casino Operator", "Rising Star of the Year", "Best Brand of the Year", "Best CEO of the Year"], website: "https://www.conversion-conf.com/event-details/affiliate-space-awards-2026-bangkok-thailand" },
    ],
    restaurants: [
      { name: "Belvedere", vibe: "тихо", avgCheck: "$80-180", description: "В оранжерее парка Łazienki", img: "images/restaurants/conversion_warsaw_belvedere.jpg" },
      { name: "Warszawa Wschodnia", vibe: "громко", avgCheck: "$50-120", description: "Модный район Praga", img: "images/restaurants/conversion_warsaw_wschodnia.jpg" },
      { name: "Stary Dom", vibe: "посидеть", avgCheck: "$40-90", description: "Традиционная польская кухня", img: "images/restaurants/conversion_warsaw_stary_dom.jpg" },
      { name: "Atelier Amaro", vibe: "тихо", avgCheck: "$150-350", description: "Первый Мишлен в Польше", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&q=80" },
      { name: "U Kucharzy", vibe: "посидеть", avgCheck: "$60-140", description: "Открытая кухня, польская классика", img: "images/restaurants/conversion_warsaw_u_kucharzy.jpg" }
    ],
    brands: [
      { name: "PropellerAds", category: "Технологии", logo: "https://logo.clearbit.com/propellerads.com" },
      { name: "Adsterra", category: "Технологии", logo: "https://logo.clearbit.com/adsterra.com" },
      { name: "RichAds", category: "Технологии", logo: "https://logo.clearbit.com/richads.com" },
      { name: "Binom", category: "Технологии", logo: "https://logo.clearbit.com/binom.org" },
      { name: "Keitaro", category: "Технологии", logo: "https://logo.clearbit.com/keitaro.io" },
      { name: "Zeydoo", category: "Партнёрка", logo: "https://logo.clearbit.com/zeydoo.com" },
      { name: "Mobidea", category: "Партнёрка", logo: "https://logo.clearbit.com/mobidea.com" },
      { name: "Clickadu", category: "Технологии", logo: "https://logo.clearbit.com/clickadu.com" },
      { name: "TrafficStars", category: "Технологии", logo: "https://logo.clearbit.com/trafficstars.com" }
    ],
    sideEvents: [
      { title: "Pre-Party", date: "31 марта", location: "TBA", type: "party" }
    ]
  },

  "conversion_cyprus_2026": {
    title: "Conversion Conf", description: "Летняя конференция аффилиатов на Кипре",
    city: "Limassol", country: "CY", countryName: "Кипр",
    dates: "23-24 июля 2026", attendees: "1,500", promo: null,
    weather: { temp: "28-32°C", description: "Жаркое средиземноморское лето" },
    heroImage: "images/heroes/conversion_cyprus.jpg",
    startISO: "2026-07-23T09:00:00Z", endISO: "2026-07-24T18:00:00Z",
    website: "https://www.conversion-conf.com/",
    telegramChannel: "https://t.me/conversionconf",
    awards: [
      { name: "Affiliate Space Awards 2026", date: "4 декабря 2026, Бангкок", categories: ["Best Gambling Affiliate Program", "Best CPA Affiliate Program", "Best Online Casino Operator", "Rising Star of the Year"], website: "https://www.conversion-conf.com/event-details/affiliate-space-awards-2026-bangkok-thailand" },
    ],
    restaurants: [
      { name: "Pier One", vibe: "потанцевать", avgCheck: "$60-140", description: "На пляже, закаты", img: "images/restaurants/conversion_cyprus_pier_one.jpg" },
      { name: "Meze Taverna", vibe: "громко", avgCheck: "$40-80", description: "Традиционное мезе 20+ блюд", img: "images/restaurants/conversion_cyprus_meze_taverna.jpg" },
      { name: "Epsilon", vibe: "посидеть", avgCheck: "$50-120", description: "Современный европейский", img: "images/restaurants/conversion_cyprus_epsilon.jpg" },
      { name: "Kipriakon", vibe: "посидеть", avgCheck: "$40-90", description: "Кипрская таверна, мезе 25 блюд", img: "images/restaurants/conversion_cyprus_kipriakon.jpg" },
      { name: "Sailor's Rest", vibe: "потанцевать", avgCheck: "$60-140", description: "Лаунж на пляже", img: "images/restaurants/conversion_cyprus_sailors_rest.jpg" }
    ],
    brands: [
      { name: "PropellerAds", category: "Технологии", logo: "https://logo.clearbit.com/propellerads.com" },
      { name: "Exoclick", category: "Технологии", logo: "https://logo.clearbit.com/exoclick.com" },
      { name: "TwinRed", category: "Технологии", logo: "https://logo.clearbit.com/twinred.com" },
      { name: "Binom", category: "Технологии", logo: "https://logo.clearbit.com/binom.org" },
      { name: "Voluum", category: "Технологии", logo: "https://logo.clearbit.com/voluum.com" },
      { name: "Leadbit", category: "Партнёрка", logo: "https://logo.clearbit.com/leadbit.com" },
      { name: "Alfaleads", category: "Партнёрка", logo: "https://logo.clearbit.com/alfaleads.net" },
      { name: "Traffic Company", category: "Партнёрка", logo: "https://logo.clearbit.com/trafficcompany.com" }
    ],
    sideEvents: [
      { title: "Beach Party", date: "23 июля", location: "Limassol Beach", type: "party" }
    ]
  },

  "affpapa_madrid_2026": {
    title: "AffPapa Conference", description: "Конференция iGaming аффилиатов",
    city: "Madrid", country: "ES", countryName: "Испания",
    dates: "18-20 мая 2026", attendees: "1,500", promo: null,
    weather: { temp: "20-26°C", description: "Тёплая весна, солнечно" },
    heroImage: "images/heroes/affpapa_madrid.jpg",
    startISO: "2026-05-18T09:00:00Z", endISO: "2026-05-20T18:00:00Z",
    website: "https://affpapaconf.com/",
    telegramChannel: "https://t.me/affpapa",
    awards: [
      { name: "AffPapa iGaming Awards 2026", date: "20 мая 2026", categories: ["Woman Leader of the Year", "CEO of the Year", "Affiliate Manager of the Year", "Best Employer of the Year"], website: "https://affpapa.com/events/affpapa-igaming-awards-2026/" },
    ],
    restaurants: [
      { name: "Sobrino de Botín", vibe: "посидеть", avgCheck: "$60-140", description: "Старейший ресторан мира (с 1725)", img: "images/restaurants/affpapa_madrid_sobrino_de_botin.jpg" },
      { name: "Streetxo", vibe: "громко", avgCheck: "$50-100", description: "Азиатский стритфуд от DiverXO", img: "images/restaurants/affpapa_madrid_streetxo.jpg" },
      { name: "Lateral", vibe: "посидеть", avgCheck: "$40-90", description: "Современная испанская кухня", img: "images/restaurants/affpapa_madrid_lateral.jpg" },
      { name: "Casa Lucio", vibe: "посидеть", avgCheck: "$50-120", description: "Легендарные huevos rotos", img: "images/restaurants/affpapa_madrid_casa_lucio.jpg" },
      { name: "Ramón Freixa Madrid", vibe: "тихо", avgCheck: "$150-350", description: "2 звезды Мишлен", img: "images/restaurants/affpapa_madrid_ramon_freixa.jpg" }
    ],
    brands: [
      { name: "AffPapa", category: "Медиа", logo: "https://logo.clearbit.com/affpapa.com" },
      { name: "Soft2Bet", category: "Оператор", logo: "https://logo.clearbit.com/soft2bet.com" },
      { name: "Digitain", category: "Провайдер", logo: "https://logo.clearbit.com/digitain.com" },
      { name: "Income Access", category: "Технологии", logo: "https://logo.clearbit.com/incomeaccess.com" },
      { name: "Affilka", category: "Технологии", logo: "https://logo.clearbit.com/affilka.com" },
      { name: "SOFTSWISS", category: "Технологии", logo: "https://logo.clearbit.com/softswiss.com" },
      { name: "BetConstruct", category: "Провайдер", logo: "https://logo.clearbit.com/betconstruct.com" },
      { name: "SiGMA", category: "Медиа", logo: "https://logo.clearbit.com/sigma.world" }
    ],
    sideEvents: [
      { title: "Tapas & Networking", date: "18 мая", location: "TBA", type: "dinner" },
      { title: "Rooftop Party", date: "19 мая", location: "TBA", type: "party" }
    ]
  },

  "affpapa_cancun_2026": {
    title: "AffPapa iGaming Club", description: "Клубная встреча аффилиатов в Мексике",
    city: "Cancun", country: "MX", countryName: "Мексика",
    dates: "23-25 ноября 2026", attendees: "600", promo: null,
    weather: { temp: "26-30°C", description: "Тепло, конец сезона дождей" },
    heroImage: "images/heroes/affpapa_cancun.jpg",
    startISO: "2026-11-23T09:00:00Z", endISO: "2026-11-25T18:00:00Z",
    website: "https://affpapaconf.com/",
    telegramChannel: "https://t.me/affpapa",
    awards: [],
    restaurants: [
      { name: "Harry's Prime Steakhouse", vibe: "тихо", avgCheck: "$100-250", description: "Премиальный стейкхаус", img: "images/restaurants/affpapa_cancun_harrys.jpg" },
      { name: "Puerto Madero", vibe: "посидеть", avgCheck: "$70-160", description: "Морепродукты с видом на лагуну", img: "images/restaurants/affpapa_cancun_puerto_madero.jpg" },
      { name: "Lorenzillo's", vibe: "громко", avgCheck: "$60-140", description: "Легендарные морепродукты", img: "images/restaurants/affpapa_cancun_lorenzillos.jpg" },
      { name: "La Habichuela Sunset", vibe: "посидеть", avgCheck: "$80-180", description: "Мексиканская кухня, сад с пальмами", img: "images/restaurants/affpapa_cancun_la_habichuela.jpg" },
      { name: "Tacos Rigo", vibe: "громко", avgCheck: "$15-40", description: "Аутентичные тако, лучшая цена", img: "images/restaurants/affpapa_cancun_tacos_rigo.jpg" }
    ],
    brands: [
      { name: "AffPapa", category: "Медиа", logo: "https://logo.clearbit.com/affpapa.com" },
      { name: "Stake", category: "Оператор", logo: "https://logo.clearbit.com/stake.com" },
      { name: "Betway", category: "Оператор", logo: "https://logo.clearbit.com/betway.com" },
      { name: "Bitcasino", category: "Оператор", logo: "https://logo.clearbit.com/bitcasino.io" },
      { name: "Sportsbet.io", category: "Оператор", logo: "https://logo.clearbit.com/sportsbet.io" },
      { name: "Cloudbet", category: "Оператор", logo: "https://logo.clearbit.com/cloudbet.com" },
      { name: "Rollbit", category: "Оператор", logo: "https://logo.clearbit.com/rollbit.com" },
      { name: "Duelbits", category: "Оператор", logo: "https://logo.clearbit.com/duelbits.com" }
    ],
    sideEvents: [
      { title: "Welcome Party", date: "23 ноября", location: "Hotel Zone", type: "party" },
      { title: "Beach Club Day", date: "24 ноября", location: "TBA", type: "party" }
    ]
  },

  "conversion_kyiv_2026": {
    title: "Conversion Conf", description: "Украинская affiliate конференция",
    city: "Kyiv", country: "UA", countryName: "Украина",
    dates: "TBA 2026", attendees: "2,000", promo: null,
    weather: { temp: "—", description: "Даты уточняются" },
    heroImage: "images/heroes/conversion_kyiv.jpg",
    startISO: "2026-06-01T09:00:00Z", endISO: "2026-06-02T18:00:00Z",
    website: "https://www.conversion-conf.com/",
    telegramChannel: "https://t.me/conversionconf",
    awards: [],
    restaurants: [
      { name: "Kanapa", vibe: "посидеть", avgCheck: "$40-100", description: "Современная украинская кухня", img: "images/restaurants/conversion_kyiv_kanapa.jpg" },
      { name: "Beef", vibe: "тихо", avgCheck: "$50-120", description: "Стейкхаус премиум класса", img: "images/restaurants/conversion_kyiv_beef.jpg" },
      { name: "Очень Хорошо", vibe: "громко", avgCheck: "$30-70", description: "Модный ресторан, коктейли", img: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=200&q=80" },
      { name: "100 років тому вперед", vibe: "посидеть", avgCheck: "$35-80", description: "Ретро-атмосфера", img: "images/restaurants/conversion_kyiv_100_rokiv.jpg" },
      { name: "Ostannya Barykada", vibe: "громко", avgCheck: "$40-90", description: "Культовый бар на Майдане", img: "images/restaurants/conversion_kyiv_ostannya_barykada.jpg" }
    ],
    brands: [
      { name: "Conversion", category: "Медиа", logo: "https://logo.clearbit.com/conversion.im" },
      { name: "Revenuelab", category: "Партнёрка", logo: "https://logo.clearbit.com/revenuelab.co" },
      { name: "Clickdealer", category: "Партнёрка", logo: "https://logo.clearbit.com/clickdealer.com" },
      { name: "AdCombo", category: "Партнёрка", logo: "https://logo.clearbit.com/adcombo.com" },
      { name: "Yellana", category: "Партнёрка", logo: "https://logo.clearbit.com/yellana.com" },
      { name: "CPAMafia", category: "Партнёрка", logo: "images/brands/cpamafia.png" },
      { name: "Golden Goose", category: "Партнёрка", logo: "https://logo.clearbit.com/goldengoose.com" }
    ],
    sideEvents: []
  },

  // ==================== NEW CONFERENCES ====================

  "affiliate_world_asia_2026": {
    title: "Affiliate World Asia", description: "Крупнейшая affiliate конференция в Азии",
    city: "Bangkok", country: "TH", countryName: "Таиланд",
    dates: "9-10 декабря", attendees: "7,000", promo: null,
    weather: { temp: "22-32°C", description: "Прохладный сезон, комфортно" },
    heroImage: "images/heroes/aw_bangkok.jpg",
    startISO: "2026-12-09T00:00:00", endISO: "2026-12-10",
    website: "https://www.affiliateworldconferences.com/asia",
    telegramChannel: "https://t.me/affiliateworldconf",
    awards: [],
    restaurants: [
      { name: "Nahm", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/aw_asia_nahm.jpg" },
      { name: "Bo.lan", vibe: "посидеть", avgCheck: "$50-100", description: "", img: "images/restaurants/aw_asia_bolan.jpg" },
      { name: "Sorn", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/aw_asia_sorn.jpg" },
      { name: "Rooftop Bar at Vertigo", vibe: "громко", avgCheck: "$50-100", description: "", img: "images/restaurants/aw_asia_vertigo.jpg" },
      { name: "Jay Fai", vibe: "громко", avgCheck: "$50-100", description: "", img: "images/restaurants/aw_asia_jay_fai.jpg" },
    ],
    brands: [
      { name: "Betsson Group", category: "Оператор", logo: "images/brands/betsson_group.png" },
      { name: "Bet365", category: "Оператор", logo: "images/brands/bet365.png" },
      { name: "Flutter Entertainment", category: "Оператор", logo: "images/brands/flutter.png" },
      { name: "SOFTSWISS", category: "Технологии", logo: "images/brands/softswiss.png" },
      { name: "Sportradar", category: "Технологии", logo: "images/brands/sportradar.png" },
      { name: "BetConstruct", category: "Технологии", logo: "images/brands/betconstruct.png" },
      { name: "SBTech", category: "Технологии", logo: "images/brands/sbtech.png" },
      { name: "Kambi", category: "Технологии", logo: "images/brands/kambi.png" },
      { name: "AskGamblers", category: "Медиа", logo: "images/brands/askgamblers.png" },
      { name: "Gambling.com", category: "Медиа", logo: "images/brands/gambling_com.png" },
      { name: "Better Collective", category: "Медиа", logo: "images/brands/better_collective.png" },
      { name: "Catena Media", category: "Медиа", logo: "images/brands/catena_media.png" },
      { name: "Paysafe", category: "Платёжка", logo: "images/brands/paysafe.png" },
      { name: "Skrill", category: "Платёжка", logo: "images/brands/skrill.png" },
      { name: "Neteller", category: "Платёжка", logo: "images/brands/neteller.png" },
    ],
    sideEvents: [
      { title: "AW Asia Closing Party", date: "10 декабря", location: "Bangkok", type: "party" },
      { title: "Affiliate Networking Dinner", date: "9 декабря", location: "Sukhumvit", type: "dinner" },
    ]
  },

"aibc_eurasia_dubai_2026": {
    title: "AIBC Eurasia", description: "Blockchain и AI конференция на Ближнем Востоке",
    city: "Dubai", country: "UAE", countryName: "ОАЭ",
    dates: "9-11 февраля", attendees: "14,500", promo: null,
    weather: { temp: "22-28°C", description: "Приятная зима, идеальная погода" },
    heroImage: "images/heroes/aibc_dubai.jpg",
    startISO: "2026-02-09T00:00:00", endISO: "2026-02-11",
    website: "https://aibc.world/eurasia/",
    telegramChannel: "https://t.me/+iUgSeE1BID4yZTc0",
    awards: [
      { name: "AIBC Eurasia Awards 2026", date: "10 февраля 2026", categories: ["Best Crypto Operator", "Best Crypto Payment Provider", "Most Innovative Web3 Startup", "Best Centralized Exchange", "Entrepreneur of the Year"], website: "https://aibc.world/eurasia/awards/" },
      { name: "SiGMA Eurasia Awards 2026", date: "9 февраля 2026", categories: ["Best Operator", "Best Sports Operator", "Best Live Platform Provider", "Best Payment Provider", "Industry Rising Star", "Best AI Solution"], website: "https://sigma.world/eurasia/awards/" },
    ],
    restaurants: [
      { name: "Zuma Dubai", vibe: "громко", avgCheck: "$50-100", description: "", img: "images/restaurants/aw_dubai_zuma.jpg" },
      { name: "Nobu Dubai", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/aw_dubai_nobu.jpg" },
      { name: "La Petite Maison", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/aw_dubai_la_petite_maison.jpg" },
      { name: "Tresind Studio", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/aw_dubai_tresind_studio.jpg" },
      { name: "Coya Dubai", vibe: "громко", avgCheck: "$50-100", description: "", img: "images/restaurants/aw_dubai_coya.jpg" },
    ],
    brands: [
      { name: "Betsson Group", category: "Оператор", logo: "images/brands/betsson_group.png" },
      { name: "Bet365", category: "Оператор", logo: "images/brands/bet365.png" },
      { name: "Flutter Entertainment", category: "Оператор", logo: "images/brands/flutter.png" },
      { name: "Evolution Gaming", category: "Провайдер", logo: "images/brands/evolution_gaming.png" },
      { name: "Pragmatic Play", category: "Провайдер", logo: "images/brands/pragmatic_play.png" },
      { name: "NetEnt", category: "Провайдер", logo: "images/brands/netent.png" },
      { name: "SOFTSWISS", category: "Технологии", logo: "images/brands/softswiss.png" },
      { name: "Sportradar", category: "Технологии", logo: "images/brands/sportradar.png" },
      { name: "BetConstruct", category: "Технологии", logo: "images/brands/betconstruct.png" },
      { name: "AskGamblers", category: "Медиа", logo: "images/brands/askgamblers.png" },
      { name: "Gambling.com", category: "Медиа", logo: "images/brands/gambling_com.png" },
      { name: "Better Collective", category: "Медиа", logo: "images/brands/better_collective.png" },
      { name: "Paysafe", category: "Платёжка", logo: "images/brands/paysafe.png" },
      { name: "Skrill", category: "Платёжка", logo: "images/brands/skrill.png" },
      { name: "Neteller", category: "Платёжка", logo: "images/brands/neteller.png" },
    ],
    sideEvents: [
      { title: "AIBC Awards Ceremony", date: "10 февраля", location: "InterContinental Dubai", type: "awards" },
      { title: "Yacht Networking Party", date: "9 февраля", location: "Dubai Marina", type: "party" },
    ]
  },

  "bis_sigma_sao_paulo_2026": {
    title: "BiS SiGMA South America", description: "Главное событие iGaming в Южной Америке",
    city: "São Paulo", country: "BR", countryName: "Бразилия",
    dates: "6-9 апреля", attendees: "18,500", promo: null,
    weather: { temp: "20-26°C", description: "Осень, комфортная погода" },
    heroImage: "images/heroes/sigma_sao_paulo.jpg",
    startISO: "2026-04-06T00:00:00", endISO: "2026-04-09",
    website: "https://sigma.world/americas/",
    telegramChannel: "https://t.me/+iUgSeE1BID4yZTc0",
    awards: [
      { name: "SiGMA Americas Awards 2026", date: "6 апреля 2026", categories: ["Best Game Studio", "Most Played Game", "Best Operator", "Best Payment Provider", "Industry Rising Star"], website: "https://sigma.world/americas/awards/" },
    ],
    restaurants: [
      { name: "D.O.M.", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/bis_sigma_sp_dom.jpg" },
      { name: "Figueira Rubaiyat", vibe: "посидеть", avgCheck: "$50-100", description: "", img: "images/restaurants/bis_sigma_sp_figueira_rubaiyat.jpg" },
      { name: "Fasano", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/bis_sigma_sp_fasano.jpg" },
      { name: "A Casa do Porco", vibe: "громко", avgCheck: "$50-100", description: "", img: "images/restaurants/bis_sigma_sp_casa_do_porco.jpg" },
      { name: "Skye", vibe: "громко", avgCheck: "$50-100", description: "", img: "images/restaurants/bis_sigma_sp_skye.jpg" },
    ],
    brands: [
      { name: "Betano", category: "Оператор", logo: "images/brands/betano.png" },
      { name: "Superbet", category: "Оператор", logo: "images/brands/superbet.png" },
      { name: "Betsson Group", category: "Оператор", logo: "images/brands/betsson_group.png" },
      { name: "Evolution Gaming", category: "Провайдер", logo: "images/brands/evolution_gaming.png" },
      { name: "Pragmatic Play", category: "Провайдер", logo: "images/brands/pragmatic_play.png" },
      { name: "NetEnt", category: "Провайдер", logo: "images/brands/netent.png" },
      { name: "Microgaming", category: "Провайдер", logo: "images/brands/microgaming.png" },
      { name: "SOFTSWISS", category: "Технологии", logo: "images/brands/softswiss.png" },
      { name: "Sportradar", category: "Технологии", logo: "images/brands/sportradar.png" },
      { name: "BetConstruct", category: "Технологии", logo: "images/brands/betconstruct.png" },
      { name: "SBTech", category: "Технологии", logo: "images/brands/sbtech.png" },
      { name: "Paysafe", category: "Платёжка", logo: "images/brands/paysafe.png" },
      { name: "Skrill", category: "Платёжка", logo: "images/brands/skrill.png" },
      { name: "Neteller", category: "Платёжка", logo: "images/brands/neteller.png" },
      { name: "Trustly", category: "Платёжка", logo: "images/brands/trustly.png" },
    ],
    sideEvents: [
      { title: "SiGMA South America Awards", date: "8 апреля", location: "Transamerica Expo", type: "awards" },
      { title: "Samba Night Party", date: "7 апреля", location: "São Paulo", type: "party" },
    ]
  },

  "igb_affiliate_barcelona_2026": {
    title: "iGB Affiliate Barcelona", description: "Крупнейшая affiliate конференция в Европе",
    city: "Barcelona", country: "ES", countryName: "Испания",
    dates: "19-20 января", attendees: "8,000", promo: null,
    weather: { temp: "8-14°C", description: "Мягкая зима, возможны дожди" },
    heroImage: "images/heroes/igb_barcelona.jpg",
    startISO: "2026-01-19T00:00:00", endISO: "2026-01-20",
    website: "https://www.igbaffiliate.com/",
    telegramChannel: null,
    awards: [
      { name: "Global Gaming Awards EMEA 2026", date: "19 января 2026", categories: ["Casino Operator of the Year", "Digital Operator of the Year", "Casino Supplier of the Year", "Executive of the Year", "Corporate Social Responsibility"], website: "https://www.globalgamingawards.com/emea/2026/" },
      { name: "International Gaming Awards (IGA) 2026", date: "18 января 2026", categories: ["Online Casino Operator of the Year", "Rising Star of the Year", "Global Gaming Company of the Year", "Affiliate of the Year", "Game of the Year"], website: "https://gaming-awards.com/iga/iga-winners-2026/" },
    ],
    restaurants: [
      { name: "Cal Pep", vibe: "громко", avgCheck: "$50-100", description: "", img: "images/restaurants/igb_barcelona_cal_pep.jpg" },
      { name: "Quimet & Quimet", vibe: "громко", avgCheck: "$50-100", description: "", img: "images/restaurants/igb_barcelona_quimet_quimet.jpg" },
      { name: "Els Quatre Gats", vibe: "посидеть", avgCheck: "$50-100", description: "", img: "images/restaurants/igb_barcelona_els_quatre_gats.jpg" },
      { name: "Disfrutar", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/igb_barcelona_disfrutar.jpg" },
      { name: "La Mar Salada", vibe: "посидеть", avgCheck: "$50-100", description: "", img: "images/restaurants/igb_barcelona_la_mar_salada.jpg" },
    ],
    brands: [
      { name: "Betsson Group", category: "Оператор", logo: "images/brands/betsson_group.png" },
      { name: "Bet365", category: "Оператор", logo: "images/brands/bet365.png" },
      { name: "Flutter Entertainment", category: "Оператор", logo: "images/brands/flutter.png" },
      { name: "SOFTSWISS", category: "Технологии", logo: "images/brands/softswiss.png" },
      { name: "Sportradar", category: "Технологии", logo: "images/brands/sportradar.png" },
      { name: "BetConstruct", category: "Технологии", logo: "images/brands/betconstruct.png" },
      { name: "SBTech", category: "Технологии", logo: "images/brands/sbtech.png" },
      { name: "Kambi", category: "Технологии", logo: "images/brands/kambi.png" },
      { name: "AskGamblers", category: "Медиа", logo: "images/brands/askgamblers.png" },
      { name: "Gambling.com", category: "Медиа", logo: "images/brands/gambling_com.png" },
      { name: "Better Collective", category: "Медиа", logo: "images/brands/better_collective.png" },
      { name: "Catena Media", category: "Медиа", logo: "images/brands/catena_media.png" },
      { name: "Paysafe", category: "Платёжка", logo: "images/brands/paysafe.png" },
      { name: "Skrill", category: "Платёжка", logo: "images/brands/skrill.png" },
      { name: "Neteller", category: "Платёжка", logo: "images/brands/neteller.png" },
    ],
    sideEvents: [
      { title: "iGB Affiliate Awards", date: "20 января", location: "Fira Gran Via", type: "awards" },
      { title: "Barcelona Networking Night", date: "19 января", location: "Gothic Quarter", type: "party" },
    ]
  },

  "sigma_africa_2026": {
    title: "SiGMA Africa", description: "Первая SiGMA конференция в Африке",
    city: "Cape Town", country: "ZA", countryName: "ЮАР",
    dates: "3-5 марта", attendees: "3,000", promo: null,
    weather: { temp: "18-26°C", description: "Конец лета, тёплая погода" },
    heroImage: "images/heroes/sigma_africa.jpg",
    startISO: "2026-03-03T00:00:00", endISO: "2026-03-05",
    website: "https://sigma.world/africa/",
    telegramChannel: "https://t.me/+iUgSeE1BID4yZTc0",
    awards: [
      { name: "SiGMA Africa Awards 2026", date: "4 марта 2026", categories: ["Best Operator", "Best Sports Provider", "Best Payment Provider", "Industry Rising Star", "Best Affiliate"], website: "https://sigma.world/africa/awards/" },
    ],
    restaurants: [
      { name: "La Colombe", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_africa_la_colombe.jpg" },
      { name: "The Test Kitchen", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_africa_test_kitchen.jpg" },
      { name: "Harbour House V&A", vibe: "посидеть", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_africa_harbour_house.jpg" },
      { name: "Willoughby & Co", vibe: "громко", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_africa_willoughby.jpg" },
      { name: "Belthazar", vibe: "громко", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_africa_belthazar.jpg" },
    ],
    brands: [
      { name: "Betsson Group", category: "Оператор", logo: "images/brands/betsson_group.png" },
      { name: "Bet365", category: "Оператор", logo: "images/brands/bet365.png" },
      { name: "Flutter Entertainment", category: "Оператор", logo: "images/brands/flutter.png" },
      { name: "Evolution Gaming", category: "Провайдер", logo: "images/brands/evolution_gaming.png" },
      { name: "Pragmatic Play", category: "Провайдер", logo: "images/brands/pragmatic_play.png" },
      { name: "NetEnt", category: "Провайдер", logo: "images/brands/netent.png" },
      { name: "SOFTSWISS", category: "Технологии", logo: "images/brands/softswiss.png" },
      { name: "Sportradar", category: "Технологии", logo: "images/brands/sportradar.png" },
      { name: "BetConstruct", category: "Технологии", logo: "images/brands/betconstruct.png" },
      { name: "AskGamblers", category: "Медиа", logo: "images/brands/askgamblers.png" },
      { name: "Gambling.com", category: "Медиа", logo: "images/brands/gambling_com.png" },
      { name: "Better Collective", category: "Медиа", logo: "images/brands/better_collective.png" },
      { name: "Paysafe", category: "Платёжка", logo: "images/brands/paysafe.png" },
      { name: "Skrill", category: "Платёжка", logo: "images/brands/skrill.png" },
      { name: "Neteller", category: "Платёжка", logo: "images/brands/neteller.png" },
    ],
    sideEvents: [
      { title: "SiGMA Africa Awards", date: "4 марта", location: "GrandWest Casino", type: "awards" },
      { title: "Table Mountain Networking", date: "3 марта", location: "Table Mountain", type: "networking" },
    ]
  },

  "sigma_asia_manila_2026": {
    title: "SiGMA Asia", description: "SiGMA в Азиатско-Тихоокеанском регионе",
    city: "Manila", country: "PH", countryName: "Филиппины",
    dates: "1-3 июня", attendees: "16,000", promo: null,
    weather: { temp: "28-34°C", description: "Жарко и влажно, начало сезона дождей" },
    heroImage: "images/heroes/sigma_manila.jpg",
    startISO: "2026-06-01T00:00:00", endISO: "2026-06-03",
    website: "https://sigma.world/asia/",
    telegramChannel: "https://t.me/+iUgSeE1BID4yZTc0",
    awards: [
      { name: "SiGMA Asia Awards 2026", date: "2 июня 2026", categories: ["Best Operator", "Best Sports Provider", "Best Live Platform Provider", "Best Payment Provider", "Industry Rising Star"], website: "https://sigma.world/asia/awards/" },
      { name: "Global Gaming Awards Asia-Pacific 2026", date: "2 июня 2026", categories: ["Casino Operator of the Year", "Digital Operator of the Year", "Casino Supplier of the Year", "Digital Sports Betting Supplier", "Executive of the Year"], website: "https://www.globalgamingawards.com/asia/2026/" },
    ],
    restaurants: [
      { name: "Gallery by Chele", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_asia_gallery_by_chele.jpg" },
      { name: "Toyo Eatery", vibe: "посидеть", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_asia_toyo_eatery.jpg" },
      { name: "Blackbird", vibe: "громко", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_asia_blackbird.jpg" },
      { name: "Nobu Manila", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_asia_nobu_manila.jpg" },
      { name: "Wolfgang's Steakhouse", vibe: "посидеть", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_asia_wolfgangs.jpg" },
    ],
    brands: [
      { name: "Betsson Group", category: "Оператор", logo: "images/brands/betsson_group.png" },
      { name: "Bet365", category: "Оператор", logo: "images/brands/bet365.png" },
      { name: "Flutter Entertainment", category: "Оператор", logo: "images/brands/flutter.png" },
      { name: "Evolution Gaming", category: "Провайдер", logo: "images/brands/evolution_gaming.png" },
      { name: "Pragmatic Play", category: "Провайдер", logo: "images/brands/pragmatic_play.png" },
      { name: "NetEnt", category: "Провайдер", logo: "images/brands/netent.png" },
      { name: "SOFTSWISS", category: "Технологии", logo: "images/brands/softswiss.png" },
      { name: "Sportradar", category: "Технологии", logo: "images/brands/sportradar.png" },
      { name: "BetConstruct", category: "Технологии", logo: "images/brands/betconstruct.png" },
      { name: "AskGamblers", category: "Медиа", logo: "images/brands/askgamblers.png" },
      { name: "Gambling.com", category: "Медиа", logo: "images/brands/gambling_com.png" },
      { name: "Better Collective", category: "Медиа", logo: "images/brands/better_collective.png" },
      { name: "Paysafe", category: "Платёжка", logo: "images/brands/paysafe.png" },
      { name: "Skrill", category: "Платёжка", logo: "images/brands/skrill.png" },
      { name: "Neteller", category: "Платёжка", logo: "images/brands/neteller.png" },
    ],
    sideEvents: [
      { title: "SiGMA Asia Awards", date: "2 июня", location: "SMX Convention Center", type: "awards" },
      { title: "Manila Bay Sunset Party", date: "1 июня", location: "Manila Bay", type: "party" },
    ]
  },

  "sigma_euromed_malta_2026": {
    title: "SiGMA Euro-Med", description: "Крупное SiGMA событие на Мальте",
    city: "Ta' Qali", country: "MT", countryName: "Мальта",
    dates: "3-5 мая", attendees: "12,000", promo: null,
    weather: { temp: "18-22°C", description: "Тёплая весна, солнечно" },
    heroImage: "images/heroes/sigma_malta.jpg",
    startISO: "2026-05-03T00:00:00", endISO: "2026-05-05",
    website: "https://sigma.world/euromed/",
    telegramChannel: "https://t.me/+iUgSeE1BID4yZTc0",
    awards: [
      { name: "SiGMA Euro-Med Awards 2026", date: "4 мая 2026", categories: ["Best Operator", "Best Sports Provider", "Best Payment Provider", "Best Affiliate", "Industry Rising Star", "Best AI Solution"], website: "https://sigma.world/euromed/awards/" },
    ],
    restaurants: [
      { name: "Noni", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_malta_noni.jpg" },
      { name: "Under Grain", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_malta_under_grain.jpg" },
      { name: "Tarragon", vibe: "посидеть", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_malta_tarragon.jpg" },
      { name: "Sciacca Grill", vibe: "громко", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_malta_sciacca_grill.jpg" },
      { name: "Caviar & Bull", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_malta_caviar_and_bull.jpg" },
    ],
    brands: [
      { name: "Betsson Group", category: "Оператор", logo: "images/brands/betsson_group.png" },
      { name: "Bet365", category: "Оператор", logo: "images/brands/bet365.png" },
      { name: "Flutter Entertainment", category: "Оператор", logo: "images/brands/flutter.png" },
      { name: "Evolution Gaming", category: "Провайдер", logo: "images/brands/evolution_gaming.png" },
      { name: "Pragmatic Play", category: "Провайдер", logo: "images/brands/pragmatic_play.png" },
      { name: "NetEnt", category: "Провайдер", logo: "images/brands/netent.png" },
      { name: "SOFTSWISS", category: "Технологии", logo: "images/brands/softswiss.png" },
      { name: "Sportradar", category: "Технологии", logo: "images/brands/sportradar.png" },
      { name: "BetConstruct", category: "Технологии", logo: "images/brands/betconstruct.png" },
      { name: "AskGamblers", category: "Медиа", logo: "images/brands/askgamblers.png" },
      { name: "Gambling.com", category: "Медиа", logo: "images/brands/gambling_com.png" },
      { name: "Better Collective", category: "Медиа", logo: "images/brands/better_collective.png" },
      { name: "Paysafe", category: "Платёжка", logo: "images/brands/paysafe.png" },
      { name: "Skrill", category: "Платёжка", logo: "images/brands/skrill.png" },
      { name: "Neteller", category: "Платёжка", logo: "images/brands/neteller.png" },
    ],
    sideEvents: [
      { title: "SiGMA Euro-Med Awards", date: "2 марта", location: "MFCC", type: "awards" },
      { title: "Island Cruise Party", date: "1 марта", location: "Malta Harbour", type: "party" },
    ]
  },

  "sigma_north_america_mexico_2026": {
    title: "SiGMA North America", description: "SiGMA дебютирует в Северной Америке",
    city: "Mexico City", country: "MX", countryName: "Мексика",
    dates: "1-3 сентября", attendees: "4,000", promo: null,
    weather: { temp: "16-24°C", description: "Сезон дождей, прохладные вечера" },
    heroImage: "images/heroes/sigma_mexico.jpg",
    startISO: "2026-09-01T00:00:00", endISO: "2026-09-03",
    website: "https://sigma.world/northamerica/",
    telegramChannel: "https://t.me/+iUgSeE1BID4yZTc0",
    awards: [
      { name: "SiGMA North America Awards 2026", date: "2 сентября 2026", categories: ["Best Operator", "Best Sports Provider", "Best Payment Provider", "Best Affiliate", "Industry Rising Star"], website: "https://sigma.world/northamerica/awards/" },
    ],
    restaurants: [
      { name: "Pujol", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_mexico_pujol.jpg" },
      { name: "Quintonil", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_mexico_quintonil.jpg" },
      { name: "Contramar", vibe: "громко", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_mexico_contramar.jpg" },
      { name: "El Cardenal", vibe: "посидеть", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_mexico_el_cardenal.jpg" },
      { name: "Lardo", vibe: "громко", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_mexico_lardo.jpg" },
    ],
    brands: [
      { name: "Betano", category: "Оператор", logo: "images/brands/betano.png" },
      { name: "Superbet", category: "Оператор", logo: "images/brands/superbet.png" },
      { name: "Betsson Group", category: "Оператор", logo: "images/brands/betsson_group.png" },
      { name: "Evolution Gaming", category: "Провайдер", logo: "images/brands/evolution_gaming.png" },
      { name: "Pragmatic Play", category: "Провайдер", logo: "images/brands/pragmatic_play.png" },
      { name: "NetEnt", category: "Провайдер", logo: "images/brands/netent.png" },
      { name: "Microgaming", category: "Провайдер", logo: "images/brands/microgaming.png" },
      { name: "SOFTSWISS", category: "Технологии", logo: "images/brands/softswiss.png" },
      { name: "Sportradar", category: "Технологии", logo: "images/brands/sportradar.png" },
      { name: "BetConstruct", category: "Технологии", logo: "images/brands/betconstruct.png" },
      { name: "SBTech", category: "Технологии", logo: "images/brands/sbtech.png" },
      { name: "Paysafe", category: "Платёжка", logo: "images/brands/paysafe.png" },
      { name: "Skrill", category: "Платёжка", logo: "images/brands/skrill.png" },
      { name: "Neteller", category: "Платёжка", logo: "images/brands/neteller.png" },
      { name: "Trustly", category: "Платёжка", logo: "images/brands/trustly.png" },
    ],
    sideEvents: [
      { title: "SiGMA North America Awards", date: "2 сентября", location: "Mexico City", type: "awards" },
      { title: "Tequila Networking Night", date: "1 сентября", location: "Polanco", type: "party" },
    ]
  },

  "sigma_south_asia_bangkok_2026": {
    title: "SiGMA South Asia", description: "SiGMA в Юго-Восточной Азии",
    city: "Bangkok", country: "TH", countryName: "Таиланд",
    dates: "30-2 декабря", attendees: "5,000", promo: null,
    weather: { temp: "24-32°C", description: "Прохладный сезон, комфортно" },
    heroImage: "images/heroes/sigma_bangkok.jpg",
    startISO: "2026-11-30T00:00:00", endISO: "2026-12-02",
    website: "https://sigma.world/southasia/",
    telegramChannel: "https://t.me/+iUgSeE1BID4yZTc0",
    awards: [
      { name: "SiGMA South Asia Awards 2026", date: "1 декабря 2026", categories: ["Best Operator", "Best Sports Provider", "Best Payment Provider", "Industry Rising Star", "Best AI Solution"], website: "https://sigma.world/southasia/awards/" },
    ],
    restaurants: [
      { name: "Gaggan Anand", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_bangkok_gaggan.jpg" },
      { name: "Le Du", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_bangkok_le_du.jpg" },
      { name: "Sühring", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_bangkok_suhring.jpg" },
      { name: "Thip Samai", vibe: "громко", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_bangkok_thip_samai.jpg" },
      { name: "Sirocco", vibe: "посидеть", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_bangkok_sirocco.jpg" },
    ],
    brands: [
      { name: "Betsson Group", category: "Оператор", logo: "images/brands/betsson_group.png" },
      { name: "Bet365", category: "Оператор", logo: "images/brands/bet365.png" },
      { name: "Flutter Entertainment", category: "Оператор", logo: "images/brands/flutter.png" },
      { name: "Evolution Gaming", category: "Провайдер", logo: "images/brands/evolution_gaming.png" },
      { name: "Pragmatic Play", category: "Провайдер", logo: "images/brands/pragmatic_play.png" },
      { name: "NetEnt", category: "Провайдер", logo: "images/brands/netent.png" },
      { name: "SOFTSWISS", category: "Технологии", logo: "images/brands/softswiss.png" },
      { name: "Sportradar", category: "Технологии", logo: "images/brands/sportradar.png" },
      { name: "BetConstruct", category: "Технологии", logo: "images/brands/betconstruct.png" },
      { name: "AskGamblers", category: "Медиа", logo: "images/brands/askgamblers.png" },
      { name: "Gambling.com", category: "Медиа", logo: "images/brands/gambling_com.png" },
      { name: "Better Collective", category: "Медиа", logo: "images/brands/better_collective.png" },
      { name: "Paysafe", category: "Платёжка", logo: "images/brands/paysafe.png" },
      { name: "Skrill", category: "Платёжка", logo: "images/brands/skrill.png" },
      { name: "Neteller", category: "Платёжка", logo: "images/brands/neteller.png" },
    ],
    sideEvents: [
      { title: "SiGMA South Asia Awards", date: "1 декабря", location: "Bangkok", type: "awards" },
      { title: "Rooftop Party", date: "30 ноября", location: "Lebua State Tower", type: "party" },
    ]
  },

  "sigma_world_rome_2026": {
    title: "SiGMA World", description: "Глобальное SiGMA событие года",
    city: "Rome", country: "IT", countryName: "Италия",
    dates: "2-5 ноября", attendees: "15,000", promo: null,
    weather: { temp: "12-18°C", description: "Прохладная осень, возможны дожди" },
    heroImage: "images/heroes/sigma_rome.jpg",
    startISO: "2026-11-02T00:00:00", endISO: "2026-11-05",
    website: "https://sigma.world/world/",
    telegramChannel: "https://t.me/+iUgSeE1BID4yZTc0",
    awards: [
      { name: "SiGMA World Awards 2026", date: "4 ноября 2026", categories: ["Best Operator", "Best Sports Operator", "Best Live Platform Provider", "Best Payment Provider", "Crypto Casino of the Year", "Industry Rising Star", "Best AI Solution"], website: "https://sigma.world/europe/awards/" },
      { name: "Affiliate Grand Slam Europe Awards 2026", date: "4 ноября 2026", categories: ["Best Affiliate Programme", "Best Affiliate Network", "Rising Star Affiliate", "Best Affiliate Manager"], website: "https://affiliategrandslam.com/europe/awards/" },
      { name: "EGR Operator Awards 2026", date: "24 ноября 2026", categories: ["Casino Operator", "Sports Betting Operator", "Affiliate of the Year", "Innovator of the Year", "Employer of the Year", "Game of the Year"], website: "https://awards.egr.global/egroperatoraward/en" },
    ],
    restaurants: [
      { name: "La Pergola", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_rome_la_pergola.jpg" },
      { name: "Roscioli", vibe: "громко", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_rome_roscioli.jpg" },
      { name: "Armando al Pantheon", vibe: "посидеть", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_rome_armando_al_pantheon.jpg" },
      { name: "Pierluigi", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_rome_pierluigi.jpg" },
      { name: "Il Pagliaccio", vibe: "тихо", avgCheck: "$50-100", description: "", img: "images/restaurants/sigma_rome_il_pagliaccio.jpg" },
    ],
    brands: [
      { name: "Betsson Group", category: "Оператор", logo: "images/brands/betsson_group.png" },
      { name: "Bet365", category: "Оператор", logo: "images/brands/bet365.png" },
      { name: "Flutter Entertainment", category: "Оператор", logo: "images/brands/flutter.png" },
      { name: "Evolution Gaming", category: "Провайдер", logo: "images/brands/evolution_gaming.png" },
      { name: "Pragmatic Play", category: "Провайдер", logo: "images/brands/pragmatic_play.png" },
      { name: "NetEnt", category: "Провайдер", logo: "images/brands/netent.png" },
      { name: "SOFTSWISS", category: "Технологии", logo: "images/brands/softswiss.png" },
      { name: "Sportradar", category: "Технологии", logo: "images/brands/sportradar.png" },
      { name: "BetConstruct", category: "Технологии", logo: "images/brands/betconstruct.png" },
      { name: "AskGamblers", category: "Медиа", logo: "images/brands/askgamblers.png" },
      { name: "Gambling.com", category: "Медиа", logo: "images/brands/gambling_com.png" },
      { name: "Better Collective", category: "Медиа", logo: "images/brands/better_collective.png" },
      { name: "Paysafe", category: "Платёжка", logo: "images/brands/paysafe.png" },
      { name: "Skrill", category: "Платёжка", logo: "images/brands/skrill.png" },
      { name: "Neteller", category: "Платёжка", logo: "images/brands/neteller.png" },
    ],
    sideEvents: [
      { title: "SiGMA World Awards", date: "4 ноября", location: "Fiera Roma", type: "awards" },
      { title: "Rome Networking Dinner", date: "3 ноября", location: "Centro Storico", type: "dinner" },
    ]
  },

  "affiliate_world_americas_2026": {
    title: "Affiliate World Americas", description: "Конференция Affiliate World Americas",
    city: "Cancun", country: "MX", countryName: "Мексика",
    dates: "7-8 сентября", attendees: "7,000", promo: null,
    weather: { temp: "20-28°C", description: "Комфортная погода" },
    heroImage: "images/heroes/aw_americas_cancun.jpg",
    startISO: "2026-09-07", endISO: "2026-09-08",
    website: "https://www.affiliateworldconferences.com/americas",
    telegramChannel: "https://t.me/affiliateworldconf",
    awards: [],
    restaurants: [
      { name: "Taco y Tequila Grill & Bar", vibe: "громко", avgCheck: "$15-25", description: "Шумный мексиканский гриль-бар с музыкой и шотами", img: "images/restaurants/aw_americas_taco_y_tequila.jpg" },
      { name: "La Palapita", vibe: "посидеть", avgCheck: "$18-30", description: "Морепродукты с террасой и мягким вечерним движем", img: "images/restaurants/aw_americas_la_palapita.jpg" },
      { name: "Capri Pizzeria Moderna", vibe: "тихо", avgCheck: "$18-28", description: "Стильная итальянская пиццерия с видом на лагуну", img: "images/restaurants/aw_americas_capri_pizza.jpg" },
      { name: "Señor Frog's Cancún", vibe: "потанцевать", avgCheck: "$20-35", description: "Классический тусовочный ресторан-бар с танцами", img: "images/restaurants/aw_americas_senor_frog.jpg" },
      { name: "El Timón De Cancún", vibe: "тихо", avgCheck: "$15-25", description: "Спокойная марискерия с локальным настроением", img: "images/restaurants/aw_americas_el_timon.jpg" },
    ],
    brands: [
      { name: "PropellerAds", category: "Технологии", logo: "images/brands/propellerads.png" },
      { name: "ClickDealer", category: "Партнёрка", logo: "images/brands/clickdealer.png" },
      { name: "Voluum", category: "Технологии", logo: "images/brands/voluum.png" },
      { name: "Mobidea", category: "Партнёрка", logo: "images/brands/mobidea.png" },
    ],
    sideEvents: [
      { title: "Opening Party", date: "TBA", location: "TBA", type: "party" },
    ]
  },

  "affiliate_world_europe_2026": {
    title: "Affiliate World Europe", description: "Конференция Affiliate World Europe",
    city: "Budapest", country: "HU", countryName: "Венгрия",
    dates: "9-10 июля", attendees: "7,000", promo: null,
    weather: { temp: "20-28°C", description: "Комфортная погода" },
    heroImage: "images/heroes/aw_europe_budapest.jpg",
    startISO: "2026-07-09", endISO: "2026-07-10",
    website: "https://www.affiliateworldconferences.com/europe",
    telegramChannel: "https://t.me/affiliateworldconf",
    awards: [],
    restaurants: [
      { name: "Rosenstein Vendéglő", vibe: "посидеть", avgCheck: "$30-45", description: "Венгерские блюда в семейной атмосфере", img: "images/restaurants/aw_europe_rosentein.jpg" },
      { name: "Mazel Tov", vibe: "посидеть", avgCheck: "$35-55", description: "Стильный израильский ресторан-сад для вечерних встреч", img: "images/restaurants/aw_europe_mazel_tov.jpg" },
      { name: "Menza Étterem és Kávéház", vibe: "посидеть", avgCheck: "$30-45", description: "Центральноевропейская кухня на Liszt Ferenc tér", img: "images/restaurants/aw_europe_menza.jpg" },
      { name: "Santa's Kitchen", vibe: "тихо", avgCheck: "$25-40", description: "Индийско-бангладешский ресторан с насыщенными специями", img: "images/restaurants/aw_europe_santa_kitchen.jpg" },
      { name: "Restaurante Fuego", vibe: "громко", avgCheck: "$35-55", description: "Стильный гриль и мясо-бар с современным меню", img: "images/restaurants/aw_europe_fuego.jpg" },
    ],
    brands: [
      { name: "Adsterra", category: "Технологии", logo: "images/brands/adsterra.png" },
      { name: "Binom", category: "Технологии", logo: "images/brands/binom.png" },
      { name: "Keitaro", category: "Технологии", logo: "images/brands/keitaro.png" },
      { name: "RichAds", category: "Технологии", logo: "images/brands/richads.png" },
    ],
    sideEvents: [
      { title: "Opening Party", date: "TBA", location: "TBA", type: "party" },
    ]
  },

  "sbc_summit_malta_2026": {
    title: "SBC Summit Malta", description: "Конференция SBC Summit Malta",
    city: "St. Julian's", country: "MT", countryName: "Мальта",
    dates: "28-30 апреля", attendees: "6,000", promo: null,
    weather: { temp: "20-28°C", description: "Комфортная погода" },
    heroImage: "images/heroes/sbc_malta.jpg",
    startISO: "2026-04-28", endISO: "2026-04-30",
    website: "https://sbcevents.com/sbc-summit-malta/",
    telegramChannel: "https://t.me/sbceurasia",
    awards: [
      { name: "SBC Awards Europe 2026", date: "30 апреля 2026", categories: ["Casino Operator of the Year", "Sportsbook Operator of the Year", "Game Studio of the Year", "Best Affiliate Program", "Leader of the Year", "Employer of the Year"], website: "https://sbcevents.com/sbc-awards-europe/" },
      { name: "Casino Guru Awards 2026", date: "25 мая 2026", categories: ["Best Online Casino", "Best Crypto Casino", "Fairest Bonus Policy", "Players' Choice", "Voice of the People"], website: "https://casinoguruint.com/en/awards" },
      { name: "SiGMA Europe Awards 2026", date: "25 мая 2026", categories: ["Best Operator", "Best Affiliate", "Best Platform Provider", "Industry Rising Star", "Best Marketing Campaign"], website: "https://sigma.world/europe/awards/" },
    ],
    restaurants: [
      { name: "Paranga", vibe: "посидеть", avgCheck: "$55-90", description: "Морской ресторан с террасой и видом на Средиземное море", img: "images/restaurants/sbc_malta_paranga.jpg" },
      { name: "Waterbiscuit", vibe: "посидеть", avgCheck: "$50-85", description: "Современный ресторан с изысканной атмосферой", img: "images/restaurants/sbc_malta_waterbiscuit.jpg" },
      { name: "Lumi Malta", vibe: "громко", avgCheck: "$45-75", description: "Стильный ресторан с яркими блюдами и лаунж-атмосферой", img: "images/restaurants/sbc_malta_lumi_malta.jpg" },
      { name: "Toro Toro", vibe: "громко", avgCheck: "$70-100", description: "Паназиатский стейк-хаус на крыше с коктейлями", img: "images/restaurants/sbc_malta_toro_toro.jpg" },
      { name: "Sotto Pinsa Romana", vibe: "тихо", avgCheck: "$25-40", description: "Высококлассная пицца с итальянским вайбом", img: "images/restaurants/sbc_malta_sotto_pinsa.jpg" },
    ],
    brands: [
      { name: "Betsson Group", category: "Оператор", logo: "images/brands/betsson_group.png" },
      { name: "Evolution Gaming", category: "Провайдер", logo: "images/brands/evolution_gaming.png" },
      { name: "Pragmatic Play", category: "Провайдер", logo: "images/brands/pragmatic_play.png" },
      { name: "BetConstruct", category: "Провайдер", logo: "images/brands/betconstruct.png" },
    ],
    sideEvents: [
      { title: "Opening Party", date: "TBA", location: "TBA", type: "party" },
    ]
  },

  "sbc_summit_canada_2026": {
    title: "SBC Summit Canada", description: "Конференция SBC Summit Canada",
    city: "Toronto", country: "CA", countryName: "Канада",
    dates: "19-21 мая", attendees: "3,000", promo: null,
    weather: { temp: "20-28°C", description: "Комфортная погода" },
    heroImage: "images/heroes/sbc_canada_toronto.jpg",
    startISO: "2026-05-19", endISO: "2026-05-21",
    website: "https://sbcevents.com/sbc-summit-canada/",
    telegramChannel: null,
    awards: [],
    restaurants: [
      { name: "TOCA", vibe: "посидеть", avgCheck: "$60-90", description: "Элегантный ресторан в Ritz-Carlton с итальянскими блюдами", img: "images/restaurants/sbc_canada_toca.jpg" },
      { name: "Scaddabush", vibe: "посидеть", avgCheck: "$35-55", description: "Итальянская кухня с дружелюбной атмосферой и пиццами", img: "images/restaurants/sbc_canada_scaddabush.jpg" },
      { name: "Kellys Landing", vibe: "громко", avgCheck: "$40-70", description: "Канадский ресторан с отличными стейками и напитками", img: "images/restaurants/sbc_canada_kellysl_landing.jpg" },
      { name: "PAI", vibe: "тихо", avgCheck: "$30-50", description: "Популярный тайский ресторан с яркими вкусами", img: "images/restaurants/sbc_canada_pai.jpg" },
      { name: "Jack Astor's Bar & Grill", vibe: "потанцевать", avgCheck: "$25-40", description: "Бар-гриль с музыкой и вечеринками", img: "images/restaurants/sbc_canada_jack_astor.jpg" },
    ],
    brands: [
      { name: "Entain", category: "Оператор", logo: "images/brands/entain.png" },
      { name: "Sportradar", category: "Технологии", logo: "images/brands/sportradar.png" },
      { name: "Kambi", category: "Провайдер", logo: "images/brands/kambi.png" },
      { name: "Paysafe", category: "Технологии", logo: "images/brands/paysafe.png" },
    ],
    sideEvents: [
      { title: "Opening Party", date: "TBA", location: "TBA", type: "party" },
    ]
  },

  "aibc_world_rome_2026": {
    title: "AIBC World", description: "Конференция AIBC World",
    city: "Rome", country: "IT", countryName: "Италия",
    dates: "2-5 ноября", attendees: "30,000", promo: null,
    weather: { temp: "20-28°C", description: "Комфортная погода" },
    heroImage: "images/heroes/aibc_world_rome.jpg",
    startISO: "2026-11-02", endISO: "2026-11-05",
    website: "https://aibc.world/europe/",
    telegramChannel: "https://t.me/+iUgSeE1BID4yZTc0",
    awards: [
      { name: "AIBC Europe Awards 2026", date: "4 ноября 2026", categories: ["Best Crypto Operator", "Best Crypto Payment Provider", "Best Web3 Gaming Project", "Most Innovative Web3 Startup", "Best Centralized Exchange"], website: "https://aibc.world/europe/awards/" },
    ],
    restaurants: [
      { name: "L'Osteria Portuense", vibe: "тихо", avgCheck: "$30-45", description: "Итальянская остерия с домашними блюдами", img: "images/restaurants/aibc_rome_losteria.jpg" },
      { name: "La Porta del Principe", vibe: "посидеть", avgCheck: "$25-40", description: "Стильный ресторан с итальянским меню", img: "images/restaurants/aibc_rome_la_porta_del_principe.jpg" },
      { name: "Da Vittorio a Portuense", vibe: "посидеть", avgCheck: "$35-55", description: "Классический семейный ресторан с традиционной кухней", img: "images/restaurants/aibc_rome_da_viittorio.jpg" },
      { name: "OVALE PINSERIA", vibe: "громко", avgCheck: "$25-40", description: "Пинсерия с современной итальянской пиццей", img: "images/restaurants/aibc_rome_ovale_pinseria.jpg" },
    ],
    brands: [
      { name: "Softswiss", category: "Провайдер", logo: "images/brands/softswiss.png" },
      { name: "Playtech", category: "Провайдер", logo: "images/brands/playtech.png" },
      { name: "Digitain", category: "Провайдер", logo: "images/brands/digitain.png" },
      { name: "Endorphina", category: "Провайдер", logo: "images/brands/endorphina.png" },
    ],
    sideEvents: [
      { title: "Opening Party", date: "TBA", location: "TBA", type: "party" },
    ]
  },

  "aibc_asia_manila_2026": {
    title: "AIBC Asia", description: "Конференция AIBC Asia",
    city: "Manila", country: "PH", countryName: "Филиппины",
    dates: "1-3 июня", attendees: "16,000", promo: null,
    weather: { temp: "20-28°C", description: "Комфортная погода" },
    heroImage: "images/heroes/aibc_asia_manila.jpg",
    startISO: "2026-06-01", endISO: "2026-06-03",
    website: "https://aibc.world/asia/",
    telegramChannel: "https://t.me/+iUgSeE1BID4yZTc0",
    awards: [
      { name: "AIBC Asia Awards 2026", date: "2 июня 2026", categories: ["Best Live Betting Product", "Best Slot Game Provider", "Best Online Payment Services", "Best Live Casino Provider", "Industry Rising Star", "Outstanding Contribution to Gaming"], website: "https://aibc.world/asia/awards/" },
    ],
    restaurants: [
      { name: "Hard Rock Cafe Manila", vibe: "потанцевать", avgCheck: "$30-50", description: "Живые гитарные ритмы, коктейли и большая карта блюд", img: "images/restaurants/aibc_manila_hard_rock.jpg" },
      { name: "Sidechick MOA", vibe: "посидеть", avgCheck: "$20-35", description: "Современные филиппинские блюда в непринуждённой атмосфере", img: "images/restaurants/aibc_manila_sidechick_moa.jpg" },
      { name: "China Blue by Jereme Leung", vibe: "посидеть", avgCheck: "$40-70", description: "Высококлассный китайский ресторан с авторской кухней", img: "images/restaurants/aibc_manila_china_blue.jpg" },
      { name: "Olive Garden MOA", vibe: "тихо", avgCheck: "$25-40", description: "Проверенная итальянская классика с большим меню", img: "images/restaurants/aibc_manila_olive_garden.jpg" },
    ],
    brands: [
      { name: "QTech Games", category: "Провайдер", logo: "images/brands/qtech_games.png" },
      { name: "Spribe", category: "Провайдер", logo: "images/brands/spribe.png" },
      { name: "Booming Games", category: "Провайдер", logo: "images/brands/booming_games.png" },
      { name: "Slotegrator", category: "Провайдер", logo: "images/brands/slotegrator.png" },
    ],
    sideEvents: [
      { title: "Opening Party", date: "TBA", location: "TBA", type: "party" },
    ]
  },

  "g2e_asia_macau_2026": {
    title: "G2E Asia", description: "Конференция G2E Asia",
    city: "Macau", country: "MO", countryName: "Макао",
    dates: "12-14 мая", attendees: "16,000", promo: null,
    weather: { temp: "20-28°C", description: "Комфортная погода" },
    heroImage: "images/heroes/g2e_asia_macau.jpg",
    startISO: "2026-05-12", endISO: "2026-05-14",
    website: "https://www.g2easia.com/",
    telegramChannel: null,
    awards: [],
    restaurants: [
      { name: "Hiro by Hiroshi Kagata", vibe: "посидеть", avgCheck: "$80-120", description: "Японский ресторан с утончённой кухней и омакасэ от шефа", img: "images/restaurants/g2e_macau_hiro.jpg" },
      { name: "Jiang Nan by Jereme Leung", vibe: "тихо", avgCheck: "$70-110", description: "Современный китайский ресторан высокой кухни внутри Venetian", img: "images/restaurants/g2e_macau_jiang_nan.jpg" },
      { name: "Pin Yue Xuan", vibe: "посидеть", avgCheck: "$60-90", description: "Кантонская кухня с акцентом на деликатесы и изысканность", img: "images/restaurants/g2e_macau_pin_yue_xuan.jpg" },
      { name: "McSorley's Ale House", vibe: "потанцевать", avgCheck: "$30-50", description: "Паб-бар с мясом, закусками и напитками прямо в Venetian", img: "images/restaurants/g2e_macau_mcsorleys.jpg" },
    ],
    brands: [
      { name: "IGT", category: "Провайдер", logo: "images/brands/igt.png" },
      { name: "Aristocrat", category: "Провайдер", logo: "images/brands/aristocrat.png" },
      { name: "Konami Gaming", category: "Провайдер", logo: "images/brands/konami_gaming.png" },
      { name: "Interblock", category: "Провайдер", logo: "images/brands/interblock.png" },
    ],
    sideEvents: [
      { title: "Opening Party", date: "TBA", location: "TBA", type: "party" },
    ]
  },

  "sbwa_dakar_2026": {
    title: "SBWA+", description: "Sports Betting West Africa+ — ведущий саммит по спортивным ставкам и гейминг-индустрии Западной Африки",
    city: "Dakar", country: "SN", countryName: "Сенегал",
    dates: "14–16 октября 2026", attendees: "1,000", promo: null,
    weather: { temp: "27-32°C", description: "Тёплая и сухая погода, конец сезона дождей" },
    heroImage: "images/heroes/sbwa_dakar.jpg",
    startISO: "2026-10-14T09:00:00Z", endISO: "2026-10-16T18:00:00Z",
    website: "https://www.sportsbettingevents.com/sbwa",
    telegramChannel: null,
    awards: [
      { name: "SBWA+ Eventus Awards 2026", date: "15 октября 2026", categories: ["Operator of the Year", "Leader in Sports Betting", "Leader in Online Casino", "Innovation of the Year", "Supplier of the Year"], website: "https://www.sportsbettingevents.com/sbwa-eventus-awards-nomination" },
    ],
    restaurants: [
      { name: "La Calebasse", vibe: "тихо", avgCheck: "$30-60", description: "Сенегальская кухня с видом на океан", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&q=80" },
      { name: "Le Lagon 1", vibe: "посидеть", avgCheck: "$40-80", description: "Ресторан на воде, морепродукты", img: "images/restaurants/sbwa_dakar_le_lagon.jpg" },
      { name: "Noflaye Beach", vibe: "громко", avgCheck: "$30-60", description: "Пляжный ресторан для нетворкинга", img: "images/restaurants/sbwa_dakar_noflaye_beach.jpg" },
    ],
    brands: [
      { name: "Qtech Games", category: "Провайдер", logo: "images/brands/qtech_games.png" },
      { name: "DST Gaming", category: "Технологии", logo: "images/brands/dst_gaming.png" },
      { name: "pawaPay", category: "Платёжка", logo: "images/brands/pawapay.png" },
      { name: "LexisNexis Risk Solutions", category: "Технологии", logo: "images/brands/lexisnexis.png" },
      { name: "Siru Mobile", category: "Платёжка", logo: "images/brands/siru_mobile.png" },
      { name: "ComplyGuard", category: "Технологии", logo: "images/brands/complyguard.png" },
    ],
    sideEvents: [
      { title: "SBWA+ Eventus Awards", date: "15 октября", location: "Dakar", type: "awards" },
      { title: "Welcome Reception", date: "14 октября", location: "Dakar", type: "party" },
    ]
  },

  "gm_events_brazil_2026": {
    title: "G&M Events Brazil", description: "Встреча лидеров гейминг-индустрии Бразилии — операторов, провайдеров и ассоциаций",
    city: "São Paulo", country: "BR", countryName: "Бразилия",
    dates: "13 августа 2026", attendees: "200+", promo: null,
    weather: { temp: "16-24°C", description: "Зима в Бразилии, сухая и прохладная погода" },
    heroImage: "images/heroes/sigma_sao_paulo.jpg",
    startISO: "2026-08-13T08:00:00Z", endISO: "2026-08-13T20:00:00Z",
    website: null,
    telegramChannel: null,
    awards: [],
    restaurants: [
      { name: "Figueira Rubaiyat", vibe: "посидеть", avgCheck: "$60-120", description: "Знаменитый стейкхаус под деревом", img: "images/restaurants/bis_sigma_sp_figueira_rubaiyat.jpg" },
      { name: "Maní", vibe: "тихо", avgCheck: "$50-100", description: "Современная бразильская кухня", img: "images/restaurants/gm_brazil_mani.jpg" },
      { name: "Bar do Luiz Fernandes", vibe: "громко", avgCheck: "$20-50", description: "Ботеко для нетворкинга", img: "images/restaurants/gm_brazil_bar_do_luiz.jpg" },
    ],
    brands: [
      { name: "Oracle", category: "Технологии", logo: "images/brands/oracle.png" },
      { name: "Google", category: "Технологии", logo: "images/brands/google.png" },
      { name: "Bragg Gaming", category: "Провайдер", logo: "images/brands/bragg_gaming.png" },
      { name: "Optimove", category: "Технологии", logo: "images/brands/optimove.png" },
    ],
    sideEvents: [
      { title: "Networking Dinner & Asado", date: "13 августа", location: "Cubo Itaú, Vila Olímpia", type: "dinner" },
    ]
  },

  "spice_sea_2026": {
    title: "SPiCE Southeast Asia", description: "Ежегодный саммит гейминг-индустрии Юго-Восточной Азии от Eventus International",
    city: "Bangkok", country: "TH", countryName: "Таиланд",
    dates: "12–14 августа 2026", attendees: "1,500", promo: null,
    weather: { temp: "26-33°C", description: "Жарко и влажно, сезон дождей" },
    heroImage: "images/heroes/spice_sea_bangkok.jpg",
    startISO: "2026-08-12T09:00:00Z", endISO: "2026-08-14T18:00:00Z",
    website: "https://www.spiceseries.com/",
    telegramChannel: null,
    awards: [
      { name: "SPiCE Eventus Awards 2026", date: "13 августа 2026", categories: ["Developer of the Year", "Best Platform Provider", "Online Gaming Operator Award", "Sports Betting Operator Award", "Responsible Gambling Award"], website: "https://www.spiceseries.com/spice-international-awards-form" },
    ],
    restaurants: [
      { name: "Gaggan Anand", vibe: "тихо", avgCheck: "$80-150", description: "Прогрессивная индийская кухня, мировой топ", img: "images/restaurants/sigma_bangkok_gaggan.jpg" },
      { name: "Namsaah Bottling Trust", vibe: "посидеть", avgCheck: "$30-60", description: "Коктейль-бар с тайской кухней", img: "images/restaurants/spice_sea_namsaah.jpg" },
      { name: "Tep Bar", vibe: "громко", avgCheck: "$20-40", description: "Живая музыка и тайские настойки", img: "images/restaurants/spice_sea_tep_bar.jpg" },
      { name: "Sirocco at Lebua", vibe: "посидеть", avgCheck: "$80-150", description: "Ресторан на крыше с видом на город", img: "images/restaurants/spice_sea_sirocco.jpg" },
    ],
    brands: [
      { name: "Booming Games", category: "Провайдер", logo: "images/brands/booming_games.png" },
      { name: "Gaming Analytics", category: "Технологии", logo: "images/brands/gaming_analytics.png" },
      { name: "Trackier", category: "Технологии", logo: "images/brands/trackier.png" },
      { name: "Czar Gaming", category: "Провайдер", logo: "images/brands/czar_gaming.png" },
      { name: "1710 Gaming", category: "Технологии", logo: "images/brands/1710_gaming.png" },
    ],
    sideEvents: [
      { title: "SPiCE Breaker Welcome Reception", date: "12 августа", location: "The Landmark Bangkok", type: "party" },
      { title: "Networking Drinks", date: "13 августа", location: "The Landmark Bangkok", type: "party" },
    ]
  },

  "conversion_forum_kyiv_2026": {
    title: "Conversion Forum Kyiv", description: "Один день практических инсайтов и нетворкинга для affiliate и performance-маркетинга",
    city: "Kyiv", country: "UA", countryName: "Украина",
    dates: "Август 2026", attendees: "1,000", promo: null,
    weather: { temp: "20-28°C", description: "Тёплое лето, солнечно" },
    heroImage: "images/heroes/conversion_kyiv.jpg",
    startISO: "2026-08-01T10:00:00Z", endISO: "2026-08-01T20:00:00Z",
    website: "https://www.conversion-conf.com/",
    telegramChannel: "https://t.me/conversionconf",
    awards: [],
    restaurants: [
      { name: "Kanapa", vibe: "посидеть", avgCheck: "$40-100", description: "Современная украинская кухня", img: "images/restaurants/conversion_kyiv_kanapa.jpg" },
      { name: "Beef", vibe: "тихо", avgCheck: "$50-120", description: "Стейкхаус премиум класса", img: "images/restaurants/conversion_kyiv_beef.jpg" },
      { name: "Очень Хорошо", vibe: "громко", avgCheck: "$30-70", description: "Модный ресторан, коктейли", img: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=200&q=80" },
      { name: "100 років тому вперед", vibe: "посидеть", avgCheck: "$35-80", description: "Ретро-атмосфера", img: "images/restaurants/conversion_kyiv_100_rokiv.jpg" },
      { name: "Ostannya Barykada", vibe: "громко", avgCheck: "$40-90", description: "Культовый бар на Майдане", img: "images/restaurants/conversion_kyiv_ostannya_barykada.jpg" },
    ],
    brands: [
      { name: "Conversion Club", category: "Медиа", logo: "images/brands/conversion_club.png" },
      { name: "Revenuelab", category: "Партнёрка", logo: "https://logo.clearbit.com/revenuelab.co" },
      { name: "Clickdealer", category: "Партнёрка", logo: "https://logo.clearbit.com/clickdealer.com" },
      { name: "AdCombo", category: "Партнёрка", logo: "https://logo.clearbit.com/adcombo.com" },
      { name: "Yellana", category: "Партнёрка", logo: "https://logo.clearbit.com/yellana.com" },
    ],
    sideEvents: []
  },

};


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
    const promoValue = event.promo || 'Скоро';
    const promoClass = event.promo ? 'promo' : 'no-promo';
    const promoNote = event.promoNote ? `<div class="stat-note">${event.promoNote}</div>` : '';

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
document.addEventListener("DOMContentLoaded", () => {
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
      showPromoToast("СКОРО");
    }
  });
}

// Promo Toast Functions
function showPromoToast(promoCode, note) {
  const toast = qs("#promoToast");
  const codeValue = qs("#promoCodeValue");
  const copyBtn = qs("#promoCopyBtn");
  const noteEl = qs("#promoNoteDisplay");

  if (!toast || !codeValue) return;

  codeValue.textContent = promoCode;
  if (noteEl) {
    if (note) {
      noteEl.textContent = note;
      noteEl.style.display = "block";
    } else {
      noteEl.style.display = "none";
    }
  }
  copyBtn.classList.remove("copied");
  copyBtn.textContent = "📋 Скопировать";

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
