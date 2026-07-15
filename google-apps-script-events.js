// =====================================================
// SECRET ROOM CALENDAR — CMS (Google Sheets)
// Хранение и редактирование ивентов календаря
// =====================================================
//
// НАСТРОЙКА (один раз, ~10 мин):
// 1. Создай Google Таблицу «Secret Room Calendar CMS»
// 2. Меню: Расширения → Apps Script → вставь этот код
// 3. Замени ADMIN_PASSWORD на свой пароль
// 4. Запусти функцию setupSheet (разрешения → выполнить)
// 5. Меню: setupSheet → importFromJson — вставь содержимое data/events.json
//    (поле payload в диалоге) ИЛИ используй кнопку «Импорт» в админке после деплоя
// 6. Deploy → New deployment → Web app
//    Execute as: Me | Who has access: Anyone
// 7. Скопируй URL в data/cms-config.js → eventsApiUrl
//    и в admin.html (поле сохраняется в браузере автоматически)

const CONFIG = {
  SHEET_NAME: 'Events',
  VISA_SHEET: 'Visa',
  ADMIN_PASSWORD: 'CHANGE_ME_sr2026', // ⬅️ ОБЯЗАТЕЛЬНО смени!
  SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId()
};

const HEADERS = [
  'id', 'month', 'sortOrder', 'visible', 'cardType', 'cardStyle', 'accentColor',
  'tier', 'attendees', 'country', 'startDate', 'endDate', 'title', 'datesLabel',
  'locationLine', 'category', 'heroImage', 'description', 'website', 'telegramChannel',
  'startISO', 'endISO', 'weather', 'promo', 'awards', 'restaurants', 'sideEvents'
];

const VISA_HEADERS = ['citizenship', 'country', 'required', 'type', 'notes'];

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  }
  sheet.clear();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange('A:A').setNote('Уникальный ID, латиница: my_event_2026');
  SpreadsheetApp.getUi().alert('Лист Events готов. Импортируй данные через importFromJson или админку.');
}

// Автозагрузка ивентов прямо с сайта — запусти эту функцию из редактора (▶)
function importFromSite() {
  const url = 'https://igaming-calendar.com/data/events.json';
  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const data = JSON.parse(resp.getContentText());
  writeAllEvents(data.events || []);
  Logger.log('Импортировано: ' + (data.events || []).length + ' ивентов');
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('Импортировано: ' + (data.events || []).length + ' ивентов', 'Готово', 5);
  } catch (e) {}
}

function importFromJson() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('Вставь JSON', 'Вставь содержимое файла events.json (весь объект с events)', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  try {
    const data = JSON.parse(resp.getResponseText());
    writeAllEvents(data.events || []);
    ui.alert('Импортировано: ' + (data.events || []).length + ' ивентов');
  } catch (e) {
    ui.alert('Ошибка JSON: ' + e);
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Calendar CMS')
    .addItem('Создать лист Events', 'setupSheet')
    .addItem('Загрузить ивенты с сайта', 'importFromSite')
    .addItem('Импорт из JSON', 'importFromJson')
    .addSeparator()
    .addItem('Загрузить визы с сайта', 'importVisaFromSite')
    .addToUi();
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'list';
  if (action === 'list') {
    return jsonResponse({ ok: true, events: readAllEvents() });
  }
  if (action === 'visa') {
    return jsonResponse({ ok: true, visa: readVisaMatrix() });
  }
  return jsonResponse({ ok: false, error: 'Unknown action' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.password !== CONFIG.ADMIN_PASSWORD) {
      return jsonResponse({ ok: false, error: 'Неверный пароль' });
    }
    const action = body.action;
    if (action === 'save') {
      saveEvent(body.event);
      return jsonResponse({ ok: true, events: readAllEvents() });
    }
    if (action === 'delete') {
      deleteEvent(body.id);
      return jsonResponse({ ok: true, events: readAllEvents() });
    }
    if (action === 'import') {
      writeAllEvents(body.events || []);
      return jsonResponse({ ok: true, events: readAllEvents() });
    }
    if (action === 'uploadImage') {
      return jsonResponse({ ok: true, url: uploadImage(body) });
    }
    if (action === 'saveVisa') {
      writeVisaMatrix(body.visa || {});
      return jsonResponse({ ok: true, visa: readVisaMatrix() });
    }
    return jsonResponse({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

// ===== Визовая матрица =====
function getVisaSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.VISA_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.VISA_SHEET);
    sheet.getRange(1, 1, 1, VISA_HEADERS.length).setValues([VISA_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readVisaMatrix() {
  const sheet = getVisaSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  const rows = sheet.getRange(2, 1, lastRow - 1, VISA_HEADERS.length).getValues();
  const matrix = {};
  rows.forEach(r => {
    const cit = String(r[0] || '').trim().toUpperCase();
    const country = String(r[1] || '').trim().toUpperCase();
    if (!cit || !country) return;
    if (!matrix[cit]) matrix[cit] = {};
    matrix[cit][country] = {
      required: String(r[2] || '').trim(),
      type: String(r[3] || '').trim(),
      notes: String(r[4] || '').trim()
    };
  });
  return matrix;
}

function writeVisaMatrix(matrix) {
  const sheet = getVisaSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, VISA_HEADERS.length).clearContent();
  }
  const rows = [];
  Object.keys(matrix).forEach(cit => {
    Object.keys(matrix[cit]).forEach(country => {
      const info = matrix[cit][country] || {};
      rows.push([cit, country, info.required || '', info.type || '', info.notes || '']);
    });
  });
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, VISA_HEADERS.length).setValues(rows);
  }
}

// Автозагрузка визовой матрицы с сайта — запусти из редактора (▶)
function importVisaFromSite() {
  const url = 'https://raw.githubusercontent.com/made-of-storm/calendar-2026/main/data/visa.json';
  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const data = JSON.parse(resp.getContentText());
  writeVisaMatrix(data.visa || {});
  const n = Object.keys(data.visa || {}).length;
  Logger.log('Импортировано виз для ' + n + ' гражданств');
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('Визы загружены: ' + n + ' гражданств', 'Готово', 5);
  } catch (e) {}
}

// ===== Загрузка картинок в Google Drive =====
const IMAGE_FOLDER_NAME = 'Calendar Images';

function getImageFolder() {
  const folders = DriveApp.getFoldersByName(IMAGE_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(IMAGE_FOLDER_NAME);
}

// Запусти ОДИН РАЗ из редактора, чтобы выдать доступ к Google Drive
function authorizeDrive() {
  const folder = getImageFolder();
  Logger.log('Drive готов, папка: ' + folder.getName());
}

function uploadImage(body) {
  const dataUrl = body.dataUrl || '';
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) throw new Error('Некорректный файл картинки');
  const contentType = m[1];
  const bytes = Utilities.base64Decode(m[2]);
  let ext = 'jpg';
  if (contentType.indexOf('png') >= 0) ext = 'png';
  else if (contentType.indexOf('webp') >= 0) ext = 'webp';
  const base = (body.name || ('img_' + Date.now()))
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9_-]+/gi, '_')
    .slice(0, 40);
  const name = base + '_' + Date.now() + '.' + ext;
  const blob = Utilities.newBlob(bytes, contentType, name);
  const file = getImageFolder().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://lh3.googleusercontent.com/d/' + file.getId() + '=w1600';
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    setupSheet();
    sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  }
  return sheet;
}

function readAllEvents() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return data.map(rowToEvent).filter(Boolean);
}

function rowToEvent(row) {
  const id = row[0];
  if (!id) return null;
  const ev = {};
  HEADERS.forEach((h, i) => {
    ev[h] = parseCell(h, row[i]);
  });
  return ev;
}

function parseCell(key, val) {
  if (val === '' || val === null || val === undefined) {
    if (['awards', 'restaurants', 'sideEvents'].indexOf(key) >= 0) return [];
    if (key === 'visible') return true;
    return null;
  }
  if (key === 'visible') return val === true || val === 'TRUE' || val === 'true' || val === 1 || val === '1';
  if (['month', 'sortOrder', 'attendees'].indexOf(key) >= 0) return Number(val);
  if (['startDate', 'endDate'].indexOf(key) >= 0) {
    if (Object.prototype.toString.call(val) === '[object Date]') {
      var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
      return Utilities.formatDate(val, tz, 'yyyy-MM-dd');
    }
    return String(val);
  }
  if (['weather', 'awards', 'restaurants', 'sideEvents'].indexOf(key) >= 0) {
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch (e) { return null; }
  }
  return String(val);
}

function eventToRow(ev) {
  return HEADERS.map(h => {
    const v = ev[h];
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    if (h === 'visible') return v ? 'TRUE' : 'FALSE';
    return v;
  });
}

function writeAllEvents(events) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent();
  }
  if (!events.length) return;
  const rows = events.map(eventToRow);
  sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
}

function saveEvent(event) {
  if (!event || !event.id) throw new Error('event.id required');
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  const ids = lastRow >= 2
    ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(r => r[0])
    : [];
  const idx = ids.indexOf(event.id);
  const row = eventToRow(event);
  if (idx >= 0) {
    sheet.getRange(idx + 2, 1, 1, HEADERS.length).setValues([row]);
  } else {
    sheet.getRange(lastRow + 1, 1, 1, HEADERS.length).setValues([row]);
  }
}

function deleteEvent(id) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) {
      sheet.deleteRow(i + 2);
      return;
    }
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
