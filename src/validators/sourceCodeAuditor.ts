import { AuditFinding, SourceAuditInput } from '../types/ps5';

interface SourceAuditRule {
  readonly id: string;
  evaluate(input: SourceAuditInput): AuditFinding;
}

const AUDIT_RULES: SourceAuditRule[] = [
  {
    id: 'rule-statvfs-import',
    evaluate(input) {
      const isTitleProcess =
        input.architecture === 'native-app' || input.architecture === 'hybrid-app';
      const hasForbiddenCall = /\b(f?statvfs|f?statfs)\s*\(/.test(input.sourceCode);

      if (isTitleProcess && hasForbiddenCall) {
        return {
          id: 'rule-statvfs-import',
          ruleName: 'Запрещённые импорты statvfs() / statfs() в Title-процессе',
          severity: 'critical',
          category: 'Imports',
          message:
            'В коде нативного приложения обнаружен вызов statvfs()/statfs(). Эти функции отсутствуют в пользовательской libkernel и вызывают мгновенный краш (null import) в eboot.bin.',
          remediation:
            'Удалите вызов statvfs()/statfs() из eboot.bin. Обрабатывайте нехватку места через errno == ENOSPC при вызове write() или вынесите проверку в helper.elf (TCP 9021).',
        };
      }

      return {
        id: 'rule-statvfs-import',
        ruleName: 'Таблица импортов Title (отсутствие statvfs/statfs)',
        severity: 'pass',
        category: 'Imports',
        message: 'Запрещённые системные вызовы statvfs/statfs в Title-коде не обнаружены.',
        remediation: 'Продолжайте проверять бинарник через scripts/check-title-imports.py при сборке.',
      };
    },
  },
  {
    id: 'rule-app0-write',
    evaluate(input) {
      const writesToApp0 = /fopen\s*\(\s*"\/app0\/[^"]*"\s*,\s*"(w|a|r\+|w\+|a\+)"/.test(
        input.sourceCode
      );
      if (writesToApp0) {
        return {
          id: 'rule-app0-write',
          ruleName: 'Попытка записи в каталог только для чтения /app0/',
          severity: 'critical',
          category: 'Sandbox & I/O',
          message:
            'Обнаружена попытка открыть файл в /app0/ на запись. В runtime PS5 каталог /app0/ монтируется строго в режиме read-only.',
          remediation:
            'Читаемые ассеты держите в /app0/assets/, а все изменяемые конфиги и базы сохраняйте в /data/<app_name>/ с fallback в /download0/.',
        };
      }
      return {
        id: 'rule-app0-write',
        ruleName: 'Соблюдение режима Read-Only для /app0/',
        severity: 'pass',
        category: 'Sandbox & I/O',
        message: 'Некорректных операций записи в каталог /app0/ не найдено.',
        remediation: 'Используйте /app0/assets/ исключительно для чтения ресурсов.',
      };
    },
  },
  {
    id: 'rule-download0-fallback',
    evaluate(input) {
      const usesDataPath = /\/data\//.test(input.sourceCode);
      const hasDownload0Fallback = /\/download0/.test(input.sourceCode);

      if (usesDataPath && !hasDownload0Fallback) {
        return {
          id: 'rule-download0-fallback',
          ruleName: 'Отсутствует fallback в /download0/ при записи в /data/',
          severity: 'warning',
          category: 'Sandbox & I/O',
          message:
            'Код обращается к /data/, но не содержит резервного пути /download0/. Под OnionHEN v0.9.0 доступ к /data блокируется песочницей, если Title ID не в whitelist.',
          remediation:
            'Добавьте проверку access("/data/<app>", W_OK) == 0 с автоматическим переключением на "/download0".',
        };
      }
      return {
        id: 'rule-download0-fallback',
        ruleName: 'Устойчивость к песочнице OnionHEN (/data -> /download0 fallback)',
        severity: 'pass',
        category: 'Sandbox & I/O',
        message: 'Резервный путь песочницы /download0/ предусмотрен (или прямая запись в /data не используется).',
        remediation: 'Схема сохранения данных совместима с kstuff-lite и OnionHEN.',
      };
    },
  },
  {
    id: 'rule-elevated-tls',
    evaluate(input) {
      const usesPlatformSsl = /\b(sceSslInit|libSceSsl|sceHttpInit)\b/.test(input.sourceCode);
      const hasCaList = /\/system\/common\/cert\/CA_LIST/.test(input.sourceCode);

      if (input.elevatedPrivileges && usesPlatformSsl) {
        return {
          id: 'rule-elevated-tls',
          ruleName: 'Конфликт повышенных привилегий и системного TLS (libSceSsl)',
          severity: 'critical',
          category: 'TLS & Privileges',
          message:
            'При повышении привилегий (для выхода из песочницы в /data) платформенный TLS (sceSslInit) перестаёт работать.',
          remediation:
            'Статически слинкуйте mbedTLS 3.6.7 + libcurl и укажите CURLOPT_CAINFO -> "/system/common/cert/CA_LIST".',
        };
      }

      if (input.elevatedPrivileges && !hasCaList && /https:\/\//.test(input.sourceCode)) {
        return {
          id: 'rule-elevated-tls',
          ruleName: 'HTTPS-запросы без явной привязки к /system/common/cert/CA_LIST',
          severity: 'warning',
          category: 'TLS & Privileges',
          message:
            'Обнаружены HTTPS-вызовы при повышенных привилегиях без явного указания системного пула сертификатов CA_LIST.',
          remediation:
            'Передайте путь "/system/common/cert/CA_LIST" в настройки mbedTLS / libcurl (CURLOPT_CAINFO).',
        };
      }

      return {
        id: 'rule-elevated-tls',
        ruleName: 'Конфигурация TLS и корневых сертификатов CA_LIST',
        severity: 'pass',
        category: 'TLS & Privileges',
        message: 'Конфликтов между уровнем привилегий и платформенным TLS не обнаружено.',
        remediation: 'Для HTTPS в повышенных привилегиях используйте статический mbedTLS 3.6.7 + CA_LIST.',
      };
    },
  },
  {
    id: 'rule-icon0-format',
    evaluate(input) {
      const isNative =
        input.architecture === 'native-app' || input.architecture === 'hybrid-app';
      if (!isNative) {
        return {
          id: 'rule-icon0-format',
          ruleName: 'Спецификация иконки sce_sys/icon0.png',
          severity: 'pass',
          category: 'Assets & Packaging',
          message: 'Для ELF Payload файл icon0.png не требуется.',
          remediation: 'Не применимо к фоновым ELF-пэйлоадам.',
        };
      }

      if (input.iconWidth !== 512 || input.iconHeight !== 512 || input.iconHasAlpha) {
        return {
          id: 'rule-icon0-format',
          ruleName: 'Нарушение формата sce_sys/icon0.png (512x512 RGB без Alpha)',
          severity: 'critical',
          category: 'Assets & Packaging',
          message: `Текущие параметры icon0.png: ${input.iconWidth}x${input.iconHeight}, Alpha=${input.iconHasAlpha ? 'ДА (RGBA)' : 'НЕТ (RGB)'}. SceShellUI требует СТРОГО 512x512 24-bit RGB без альфа-канала.`,
          remediation:
            'Сконвертируйте иконку командой: convert icon.png -resize 512x512 -background black -alpha remove -alpha off sce_sys/icon0.png',
        };
      }

      return {
        id: 'rule-icon0-format',
        ruleName: 'Формат sce_sys/icon0.png (512x512 24-bit RGB)',
        severity: 'pass',
        category: 'Assets & Packaging',
        message: 'Иконка соответствует требованиям SceShellUI: 512x512 RGB без альфа-канала.',
        remediation: 'Готово к упаковке в /data/homebrew/<TITLE_ID>/sce_sys/icon0.png.',
      };
    },
  },
  {
    id: 'rule-title-id-manifest',
    evaluate(input) {
      const isNative =
        input.architecture === 'native-app' || input.architecture === 'hybrid-app';
      if (!isNative) {
        return {
          id: 'rule-title-id-manifest',
          ruleName: 'Манифест sce_sys/param.json',
          severity: 'pass',
          category: 'Memory & Manifest',
          message: 'Манифест param.json используется только в Native и Hybrid приложениях.',
          remediation: 'Не требуется для чистых .elf пэйлоадов.',
        };
      }

      const validTitleId = /^[A-Z]{4}[0-9]{5}$/.test(input.titleId);
      const validVersion = /^[0-9]{2}\.[0-9]{2}$/.test(input.contentVersion);

      if (!validTitleId || !validVersion) {
        return {
          id: 'rule-title-id-manifest',
          ruleName: 'Некорректный формат titleId или contentVersion в sce_sys/param.json',
          severity: 'critical',
          category: 'Memory & Manifest',
          message: `titleId="${input.titleId}" (ожидается 4 заглавные буквы + 5 цифр, например PPSA99808) или contentVersion="${input.contentVersion}" (ожидается XX.XX, например 01.00).`,
          remediation:
            'Укажите корректный titleId (PPSA99808 / FAKE00001) и инкрементируйте contentVersion (01.01) при каждом FTP-обновлении.',
        };
      }

      return {
        id: 'rule-title-id-manifest',
        ruleName: 'Валидность sce_sys/param.json (titleId и contentVersion)',
        severity: 'pass',
        category: 'Memory & Manifest',
        message: `Манифест корректен: titleId=${input.titleId}, contentVersion=${input.contentVersion}.`,
        remediation: 'Не забывайте инкрементировать contentVersion перед заливкой обновлённого eboot.bin по FTP.',
      };
    },
  },
];

export function auditProjectSourceAndConfig(
  input: SourceAuditInput
): AuditFinding[] {
  return AUDIT_RULES.map((rule) => rule.evaluate(input));
}
