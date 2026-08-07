#!/usr/bin/env python3
"""
Утилита для прямой работы с CMS-таблицей календаря (Google Apps Script API),
минуя ручную работу в admin.html.

Пароль читается из data/.cms-secret (файл в .gitignore, не попадает в репозиторий).

Использование:
  python3 scripts/cms_sync.py list                     # список ивентов из живой таблицы
  python3 scripts/cms_sync.py save <id-в-events.json>   # залить/обновить один ивент из data/events.json в таблицу
  python3 scripts/cms_sync.py delete <id>               # удалить ивент из таблицы
  python3 scripts/cms_sync.py hide <id>                 # скрыть ивент (visible=false) без удаления
"""
import json
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
API_URL = "https://script.google.com/macros/s/AKfycbx6bSkYURvam0cpdpyQ58lQxLlCOZDJygj4VTVmDmukONZ8Tpr_dlmIsoxAdqYXBJdS/exec"
SECRET_FILE = ROOT / "data" / ".cms-secret"
EVENTS_FILE = ROOT / "data" / "events.json"


def get_password():
    if not SECRET_FILE.exists():
        sys.exit(f"Не найден файл с паролем: {SECRET_FILE}")
    return SECRET_FILE.read_text(encoding="utf-8").strip()


def api_get(action):
    r = requests.get(API_URL, params={"action": action}, timeout=30)
    r.raise_for_status()
    return r.json()


def api_post(body):
    body = {**body, "password": get_password()}
    r = requests.post(
        API_URL,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "text/plain;charset=utf-8"},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def load_local_event(event_id):
    data = json.loads(EVENTS_FILE.read_text(encoding="utf-8"))
    for ev in data["events"]:
        if ev["id"] == event_id:
            return ev
    sys.exit(f"Ивент '{event_id}' не найден в {EVENTS_FILE}")


def cmd_list():
    res = api_get("list")
    if not res.get("ok"):
        sys.exit(f"Ошибка: {res}")
    for ev in res["events"]:
        print(f"{ev['id']:<35} month={ev.get('month')!s:<3} {ev.get('title')}")
    print(f"\nВсего: {len(res['events'])}")


def cmd_save(event_id):
    event = load_local_event(event_id)
    res = api_post({"action": "save", "event": event})
    if not res.get("ok"):
        sys.exit(f"Ошибка: {res}")
    print(f"Сохранено в CMS: {event_id} — {event.get('title')}")


def cmd_delete(event_id):
    res = api_post({"action": "delete", "id": event_id})
    if not res.get("ok"):
        sys.exit(f"Ошибка: {res}")
    print(f"Удалено из CMS: {event_id}")


def cmd_hide(event_id):
    res = api_get("list")
    if not res.get("ok"):
        sys.exit(f"Ошибка: {res}")
    event = next((e for e in res["events"] if e["id"] == event_id), None)
    if not event:
        sys.exit(f"Ивент '{event_id}' не найден в CMS")
    event["visible"] = False
    res2 = api_post({"action": "save", "event": event})
    if not res2.get("ok"):
        sys.exit(f"Ошибка: {res2}")
    print(f"Скрыт в CMS (visible=false): {event_id} — {event.get('title')}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == "list":
        cmd_list()
    elif cmd == "save" and args:
        cmd_save(args[0])
    elif cmd == "delete" and args:
        cmd_delete(args[0])
    elif cmd == "hide" and args:
        cmd_hide(args[0])
    else:
        print(__doc__)
        sys.exit(1)
