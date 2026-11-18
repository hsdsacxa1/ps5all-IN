# PS5 13.60 Development Handoff (Актуально на 15.11.2026)

## 1. Статус целевой платформы (PS5 FW 13.60)

- **Актуальность**: Прошивка 13.60 (верхняя граница публичных эксплойтов на 15.11.2026; версии 14.00–14.22 закрыли уязвимость браузера и не имеют публичного джейлбрейка).
- **Тип доступа**: Джейлбрейк непостоянный (tethered) — сбрасывается при холодной перезагрузке.
- **Цепочка эксплойтов на 13.60**:
  - **Ядро**: `ntfargo/Relapse-Exploit` (поддержка FW 7.00–13.60, даёт R/W в ядро FreeBSD).
  - **Точки входа**:
    - **WebKit** (`itsPLK/ps5-webkit-autoloader v0.7.1`, `samtheruby/Relapse-Exploit-Plus v0.2.25`) — через User's Guide / браузер (DNS `62.210.38.117` или `45.56.67.85`).
    - **Y2JB (рекомендуемый для частых тестов)** (`Gezine/Y2JB`, `itsPLK/ps5-y2jb-autoloader v1.1.0`, `jamesst20/ps5-y2jb-installer` v1.4.0 от 14.11.2026, `dakotadawolfe/Y2JB-installer v2.0.0`) — запуск через приложение YouTube (`PPSA01650/1/2`, для 13.40–13.60 версия `v01.009.253`) на оффлайн fake-активированном аккаунте (через `notmaj0r/ProsperoMgr v1.2.1`) с DNS `127.0.0.2`. Намного стабильнее WebKit.
  - **Гипервизор (опционально для R&D/Linux/будущего FPKG)**: `PS5Dev/Byepervisor-Reborn` (поддерживает 13.60, 13.20, 13.00, отключает XOM через баг S3 Resume / Rest Mode и даёт R/W к `.text` ядра; требует запуска через `elfldr` и включенного питания USB в режиме покоя; сам по себе не содержит HEN/FPKG-патчей).

## 2. Базовый Runtime-стек на консоли (13.60)

Перед началом разработки и тестирования целевая PS5 должна запускать следующую проверенную связку:

1. **`elfldr`** (`ps5-payload-dev/elfldr v0.27`) — слушает TCP-порт `9021` (приём и запуск `.elf` payload-ов).
2. **`kstuff-lite v1.11+`** (`EchoStretch/kstuff-lite`) — обязателен для запуска сторонних приложений (без него возникает ошибка `CE-100008-9`). **Важно**: не использовать старый `kstuff_v1.6.7.elf`.
3. **`ShadowMountPlus v1.7`** (`drakmor/ShadowMountPlus`, рекомендуется `1.7beta12` / `1.7beta11`) — фоновый авто-монтировщик приложений с главного экрана (на FW 12.00+ использует `SceShellCore` / `TitleDir` bridge).
   - Мониторит `/data/homebrew/` (а также USB/внешние носители и SMB).
   - Поддерживает форматы: распакованные папки, UFS2 `.ffpkg`, сжатые `.ffpfsc` (упаковка через `pip install mkpfs`). В `1.7beta12` использует формат конфигурации v2 (`config.ini` + `profiles.ini`).
   - Предоставляет локальный HTTP/JSON API: `http://127.0.0.1:10101/api/v1` (в некоторых бетах 1.7 также доступен по IP консоли; эндпоинты включают `POST /api/v1/scan` с телом `{}`, `GET /api/v1/games`, `POST /api/v1/games/mount`).
4. **`ftpsrv`** (`ps5-payload-dev/ftpsrv v0.22`) — FTP-сервер на порту `2121` (либо `zftpd` на порту `2120`).
5. **Опционально**: `itsPLK/ps5-payload-manager` (v0.6.3, веб-интерфейс на порту `8084`).
6. **Альтернативный монтировщик**: `quer3q/kraken-mount` (`v0.2.0` от 15.11.2026 / `v0.0.1-beta`) — минималистичный монтировщик игр под PS5 без полной установки:
   - Монтирует Debug FPKG (`.pkg`, включая sparse FPKG в `v0.2.0`!), распакованные папки (`folder`), сжатые архивы `LZ4` (`.lz4`) и `Zstandard` (`.zst`) напрямую с внутренней памяти, M.2 SSD и USB.
   - Использует встроенный бэкенд-эмулятор `ampr-emu-ng v0.4.1` (снят лимит 48 MiB на индекс файлов; распаковывается в `/data/krakenmount/ampr/`).
   - В `v0.2.0` автоматически ждёт запуска `kstuff` и остановки `ShadowMount+` перед монтированием и работает на чистом `elfldr` (PR #22).
   - Поднимает веб-панель управления на `http://<PS5_IP>:8097/`, хранит настройки в `/data/krakenmount/config.toml` и логи в `/data/krakenmount/kraken.log`.
7. **Альтернативные HEN-сборки (использовать вместо ручного kstuff, НЕ одновременно)**:
   - `aydencharles/onionHEN v0.9.0` (и свежие Nightly от 15.11.2026) — поддерживает 13.0–13.60, содержит `kstuff-lite 1.11`, логирует в `/data/OnionHEN/OnionHEN.log`.
   - Неофициальные порты `etaHEN` под 13.60 (`GronedWaffel/etahen-13.60`, `etaHEN 2.5B/2.6b`).
   - **Запрещено** запускать OnionHEN одновременно с etaHEN или отдельным kstuff.

## 3. Выбор архитектуры проекта (4 паттерна)

Агент должен выбирать архитектуру строго под задачу:

| Тип задачи | Архитектура | Формат вывода | Ключевой стек |
| :--- | :--- | :--- | :--- |
| **Фоновые демоны, серверы, дамперы, системные утилиты без консольного UI** | **Payload** | `*.elf` | `ps5-payload-dev/sdk` (`v0.45`) |
| **Утилиты с быстрым UI на телефоне / ПК / браузере PS5** | **Payload + HTTP WebUI** | `*.elf` | `ps5-payload-dev/sdk` + `libmicrohttpd` / сокеты |
| **Полноценные GUI-приложения на главный экран, игры, эмуляторы, тяжёлые аппы (>1.6 ГБ RAM)** | **Native PS5 App** | Папка `<TITLE_ID>/eboot.bin` (или `.ffpkg` / `.ffpfsc`) | `drakmor/ps5-native-app-boilerplate` или `MiladRTX/ps5-homebrew-starter` |
| **GUI-аппа + операции с ядром / ФС вне песочницы** | **Гибрид (Native App + Helper Payload)** | `<TITLE_ID>/eboot.bin` + `helper.elf` | GUI отправляет `helper.elf` на `127.0.0.1:9021` (`elfldr`) и общается по локальному TCP/HTTP |

## 4. Инструментарий и настройка окружения сборки (Linux / WSL2 / macOS)

### 4.1. Системные зависимости (Ubuntu / Debian / WSL2)

```bash
sudo apt-get update && sudo apt-get install -y \
  bash clang-18 lld-18 wget socat cmake meson ninja-build \
  pkg-config python3 python3-pyelftools git make
```

### 4.2. Установка `ps5-payload-dev/sdk` (v0.45)

```bash
wget https://github.com/ps5-payload-dev/sdk/releases/latest/download/ps5-payload-sdk.zip
sudo unzip -d /opt ps5-payload-sdk.zip
export PS5_PAYLOAD_SDK=/opt/ps5-payload-sdk
export PS5_HOST=<PS5_IP>
export PS5_PORT=9021
```

### 4.3. Стек для Native PS5 Apps
- Базовый шаблон: `drakmor/ps5-native-app-boilerplate` (GPL-3.0-or-later).
- Стартер с PC-симулятором: `MiladRTX/ps5-homebrew-starter`.
- Графические бэкенды: `libSceVideoOut` / `SDL2` / `ImGui`, `ps5-opengl` (Mesa), `Vulkan` через RADV (`PS5_Vulkan` / `PS5_Mesa` от `mihawk-99`).

## 5. Структура Native App и правила деплоя

```text
/data/homebrew/<TITLE_ID>/
├── eboot.bin              # Подписанный FSELF бинарник
├── sce_module/
│   └── libc.prx           # Clean-room runtime shim
├── sce_sys/
│   ├── param.json         # Манифест (Title ID, contentVersion, память)
│   ├── icon0.png          # СТРОГО 512x512 RGB БЕЗ альфа-канала (no alpha)
│   └── pic0.png / pic1.png / snd0.at9 (опционально)
└── assets/                # Монтируется в runtime как /app0/assets/ (read-only)
```

- Отправка ELF Payload: `nc -w 10 $PS5_HOST 9021 < build/my_payload.elf`
- Деплой Native App по FTP (порт 2121): приложение должно быть закрыто, иначе перезапись `eboot.bin` заблокирована; для обновления инкрементировать `contentVersion` в `sce_sys/param.json`.

## 6. Критические ограничения и «подводные камни»

1. **Запрещённые/отсутствующие импорты в Title-процессах (`eboot.bin`)**: `statvfs()` и `statfs()` отсутствуют в пользовательской `libkernel` (вызывают null import crash). Использовать `ENOSPC` при записи или выносить в helper-payload. Проверять таблицу импортов (`check-title-imports.py`).
2. **Ограничение системного TLS в повышенных привилегиях**: При повышении привилегий (для записи в `/data`) платформенный TLS недоступен. Статически линковать `mbedTLS 3.6.7 + libcurl` и проверять сертификаты по `/system/common/cert/CA_LIST`.
3. **Запись данных и песочница (`/app0` vs `/data` vs `/download0`)**: `/app0/` только чтение; основной путь `/data/<app_name>/`; обязателен fallback в `/download0/` на случай блокировки песочницей (`OnionHEN` без whitelist).
4. **Бюджет памяти (Payload vs Native App)**: ELF Payload делит ~1.6 ГБ RAM с ShellUI. Native App имеет полный бюджет; гибкая память (`Flexible memory`) в `sce_sys/param.json` по умолчанию 448 MiB (увеличение до 1 GiB отнимает 576 MiB у `Direct memory`).
5. **Rest Mode и жизненный цикл**: Обрабатывать S3 resume (переинициализация сокетов); нереализованные системные диалоги обязаны явно возвращать `false`.
6. **Лицензирование**: `ps5-native-app-boilerplate` распространяется под `GPL-3.0-or-later`.

## 7. Эталонные open-source репозитории

- **SDK & Loaders**: `ps5-payload-dev/sdk` (v0.45), `ps5-payload-dev/elfldr`, `ps5-payload-dev/ftpsrv`, `ps5-payload-dev/websrv`, `ps5-payload-dev/pacbrew-repo`.
- **Native App Templates**: `drakmor/ps5-native-app-boilerplate`, `MiladRTX/ps5-homebrew-starter`.
- **Проверенные на 13.60 проекты**: `J7mbo/nasbridge-ps5`, `leolobato/playden-ps5`, `knutwurst/ps5-patchdl`, `ThatGuyKalvin/ProsperoTV`, `RafaelNGP/pico8-ps5`, `tsuramatsu1/psp5`, `quer3q/kraken-mount` (`v0.0.1-beta`).
