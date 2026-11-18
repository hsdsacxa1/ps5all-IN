export const CANONICAL_AGENTS_MD = `# PS5 13.60 Development Handoff (Актуально на 15.11.2026)

## 1. Статус целевой платформы (PS5 FW 13.60)
- Актуальность: Прошивка 13.60 (верхняя граница публичных эксплойтов на 15.11.2026; версии 14.00–14.22 закрыли уязвимость браузера и не имеют публичного джейлбрейка).
- Тип доступа: Джейлбрейк непостоянный (tethered) — сбрасывается при холодной перезагрузке.
- Цепочка эксплойтов на 13.60:
  - Ядро: ntfargo/Relapse-Exploit (поддержка FW 7.00–13.60, даёт R/W в ядро FreeBSD).
  - Точки входа:
    - WebKit (itsPLK/ps5-webkit-autoloader v0.7.1, samtheruby/Relapse-Exploit-Plus v0.2.25) — через User's Guide / браузер (DNS 62.210.38.117 или 45.56.67.85).
    - Y2JB (рекомендуемый для частых тестов) (Gezine/Y2JB, itsPLK/ps5-y2jb-autoloader v1.1.0, jamesst20/ps5-y2jb-installer v1.4.0 от 14.11.2026, dakotadawolfe/Y2JB-installer v2.0.0) — запуск через приложение YouTube (PPSA01650/1/2, для 13.40–13.60 версия v01.009.253) на оффлайн fake-активированном аккаунте (через notmaj0r/ProsperoMgr v1.2.1) с DNS 127.0.0.2. Намного стабильнее WebKit.
  - Гипервизор (опционально для R&D/Linux/будущего FPKG): PS5Dev/Byepervisor-Reborn (поддерживает 13.60, 13.20, 13.00, отключает XOM через баг S3 Resume / Rest Mode и даёт R/W к .text ядра; требует запуска через elfldr и включенного питания USB в режиме покоя; сам по себе не содержит HEN/FPKG-патчей).

## 2. Базовый Runtime-стек на консоли (13.60)
1. elfldr (ps5-payload-dev/elfldr v0.27) — слушает TCP-порт 9021 (приём и запуск .elf payload-ов).
2. kstuff-lite v1.11+ (EchoStretch/kstuff-lite) — обязателен для запуска сторонних приложений (без него возникает ошибка CE-100008-9). Важно: не использовать старый kstuff_v1.6.7.elf.
3. ShadowMountPlus v1.7 (drakmor/ShadowMountPlus, рекомендуется 1.7beta12 / 1.7beta11) — фоновый авто-монтировщик приложений с главного экрана (на FW 12.00+ использует SceShellCore / TitleDir bridge).
   - Мониторит /data/homebrew/ (а также USB/внешние носители и SMB).
   - Поддерживает форматы: распакованные папки, UFS2 .ffpkg, сжатые .ffpfsc (упаковка через pip install mkpfs). В 1.7beta12 использует формат конфигурации v2 (config.ini + profiles.ini).
   - Предоставляет локальный HTTP/JSON API: http://127.0.0.1:10101/api/v1 (POST /api/v1/scan с телом {}, GET /api/v1/games, POST /api/v1/games/mount).
4. ftpsrv (ps5-payload-dev/ftpsrv v0.22) — FTP-сервер на порту 2121 (либо zftpd на порту 2120).
5. Опционально: itsPLK/ps5-payload-manager (v0.6.3, веб-интерфейс на порту 8084).
6. Альтернативный монтировщик: quer3q/kraken-mount (v0.2.0 / v0.2.1) — минималистичный монтировщик игр (.pkg, включая sparse, folder, lz4, zstd) без полной установки через бэкенд ampr-emu-ng v0.4.1 (/data/krakenmount/ampr/) с WebUI на http://<ps5-ip>:8097/ и конфигом /data/krakenmount/config.toml.
7. Альтернативные HEN-сборки (использовать вместо ручного kstuff, НЕ одновременно):
   - aydencharles/onionHEN v0.9.0 — поддерживает 13.0–13.60, содержит kstuff-lite 1.11, логирует в /data/OnionHEN/OnionHEN.log.
   - Неофициальные порты etaHEN под 13.60 (GronedWaffel/etahen-13.60, etaHEN 2.5B/2.6b).
   - Запрещено запускать OnionHEN одновременно с etaHEN или отдельным kstuff.

## 3. Выбор архитектуры проекта (4 паттерна)
- Payload (*.elf, ps5-payload-dev/sdk v0.45): Фоновые демоны, серверы, дамперы, системные утилиты без консольного UI.
- Payload + HTTP WebUI (*.elf, ps5-payload-dev/sdk + libmicrohttpd / сокеты): Утилиты с быстрым UI на телефоне / ПК / браузере PS5.
- Native PS5 App (<TITLE_ID>/eboot.bin или .ffpkg / .ffpfsc, drakmor/ps5-native-app-boilerplate или MiladRTX/ps5-homebrew-starter): Полноценные GUI-приложения на главный экран, игры, эмуляторы, тяжёлые аппы (>1.6 ГБ RAM).
- Гибрид (Native App + Helper Payload, <TITLE_ID>/eboot.bin + helper.elf): GUI отправляет helper.elf на 127.0.0.1:9021 (elfldr) и общается по локальному TCP/HTTP.

## 4. Инструментарий и настройка окружения сборки (Linux / WSL2 / macOS)
- Системные пакеты: clang-18 lld-18 wget socat cmake meson ninja-build pkg-config python3 python3-pyelftools git make
- SDK: ps5-payload-dev/sdk v0.45 (/opt/ps5-payload-sdk) + ps5-payload-dev/pacbrew-repo
- Графика Native Apps: libSceVideoOut / SDL2 / ImGui, ps5-opengl (Mesa), Vulkan через RADV (PS5_Vulkan / PS5_Mesa от mihawk-99).

## 5. Структура Native App и правила деплоя
/data/homebrew/<TITLE_ID>/
├── eboot.bin              # Подписанный FSELF бинарник
├── sce_module/libc.prx    # Clean-room runtime shim
├── sce_sys/param.json     # Манифест (Title ID, contentVersion, память)
├── sce_sys/icon0.png      # СТРОГО 512x512 RGB БЕЗ альфа-канала (no alpha)
└── assets/                # Монтируется в runtime как /app0/assets/ (read-only)

## 6. Критические ограничения и «подводные камни»
1. Запрещённые импорты statvfs() и statfs() в eboot.bin (отсутствуют в пользовательской libkernel -> null import crash). Использовать ENOSPC при записи или выносить в helper-payload.
2. Ограничение системного TLS в повышенных привилегиях: статически линковать mbedTLS 3.6.7 + libcurl и проверять по /system/common/cert/CA_LIST.
3. Песочница (/app0 read-only, первичный путь /data/<app_name>/, обязателен fallback в /download0/ для OnionHEN).
4. Бюджет памяти: ELF делит ~1.6 ГБ с ShellUI; в param.json гибкая память по умолчанию 448 MiB (запрос 1 GiB отнимает 576 MiB у Direct memory).
5. Rest Mode: переживать S3 resume (переинициализация сокетов), нереализованные системные диалоги обязаны возвращать false.
6. Лицензирование: ps5-native-app-boilerplate распространяется под GPL-3.0-or-later.

## 7. Эталонные open-source репозитории
- SDK & Loaders: ps5-payload-dev/sdk (v0.45), ps5-payload-dev/elfldr, ps5-payload-dev/ftpsrv, ps5-payload-dev/websrv, ps5-payload-dev/pacbrew-repo.
- Templates: drakmor/ps5-native-app-boilerplate, MiladRTX/ps5-homebrew-starter.
- Verified 13.60: J7mbo/nasbridge-ps5, leolobato/playden-ps5, knutwurst/ps5-patchdl, ThatGuyKalvin/ProsperoTV, RafaelNGP/pico8-ps5, tsuramatsu1/psp5, quer3q/kraken-mount (v0.2.1).
`;
