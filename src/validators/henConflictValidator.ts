import { RuntimeStackSelection, StackValidationIssue } from '../types/ps5';

interface StackValidationRule {
  readonly id: string;
  evaluate(stack: RuntimeStackSelection): StackValidationIssue | null;
}

const STACK_VALIDATION_RULES: StackValidationRule[] = [
  {
    id: 'hen-collision-check',
    evaluate(stack) {
      const activeHens = stack.henSelections.filter((h) => h !== 'none');
      if (activeHens.length > 1) {
        return {
          id: 'hen-collision',
          severity: 'critical',
          title: 'Конфликт HEN-сборок: одновременный запуск нескольких патчеров FSELF',
          detail: `Выбрано одновременно: ${activeHens.join(' + ')}. OnionHEN v0.9.0 уже включает kstuff-lite 1.11. Совместный запуск с etaHEN или отдельным kstuff вызывает панику ядра или зависание запуска Title.`,
          fixAction: 'Оставьте ровно один вариант: либо чистый kstuff-lite v1.11+, либо onionHEN v0.9.0, либо etaHEN 2.6b.',
        };
      }
      return null;
    },
  },
  {
    id: 'legacy-kstuff-ban',
    evaluate(stack) {
      if (stack.henSelections.includes('legacy-kstuff-1.6.7')) {
        return {
          id: 'legacy-kstuff',
          severity: 'critical',
          title: 'Обнаружен устаревший kstuff_v1.6.7.elf (несовместим с 13.60)',
          detail: 'Старый монолитный kstuff_v1.6.7.elf вызывает нестабильность и сбои на FW 13.60.',
          fixAction: 'Замените на EchoStretch/kstuff-lite v1.11+ (или используйте onionHEN v0.9.0).',
        };
      }
      return null;
    },
  },
  {
    id: 'missing-kstuff-ce-100008-9',
    evaluate(stack) {
      const hasValidHen = stack.henSelections.some(
        (h) => h === 'kstuff-lite-1.11' || h === 'onionhen-0.9.0' || h === 'etahen-2.6b'
      );
      if (!hasValidHen) {
        return {
          id: 'missing-kstuff',
          severity: 'critical',
          title: 'Ошибка CE-100008-9 при запуске Native Apps: не выбран kstuff-lite v1.11+ / HEN',
          detail: 'Без активного kstuff-lite v1.11+ (или совместимого HEN) консоль отклоняет запуск любого стороннего eboot.bin с кодом CE-100008-9.',
          fixAction: 'Активируйте EchoStretch/kstuff-lite v1.11+ после старта elfldr.',
        };
      }
      return null;
    },
  },
  {
    id: 'missing-elfldr-port-9021',
    evaluate(stack) {
      if (!stack.elfldrEnabled) {
        return {
          id: 'missing-elfldr',
          severity: 'critical',
          title: 'Отключён базовый загрузчик elfldr (TCP 9021)',
          detail: 'Без ps5-payload-dev/elfldr невозможна загрузка фоновых демонов, kstuff-lite и работа гибридных приложений (127.0.0.1:9021).',
          fixAction: 'Включите elfldr на порту 9021 в автозагрузчике Y2JB / WebKit.',
        };
      }
      return null;
    },
  },
  {
    id: 'shadowmount-version-check',
    evaluate(stack) {
      if (!stack.shadowMountEnabled && !stack.krakenMountEnabled) {
        return {
          id: 'missing-shadowmount',
          severity: 'warning',
          title: 'Монтировщики отключены: ни ShadowMountPlus v1.7, ни Kraken Mount v0.0.1-beta не активны',
          detail: 'Для монтирования папок <TITLE_ID>/eboot.bin, .ffpkg/.ffpfsc или .pkg/lz4/zstd на главный экран PS5 FW 13.60 необходим drakmor/ShadowMountPlus v1.7 (10101) либо quer3q/kraken-mount v0.0.1-beta (8097).',
          fixAction: 'Запустите ShadowMountPlus v1.7 (10101) или Kraken Mount v0.0.1-beta (8097, ampr-emu-ng v0.4.0).',
        };
      }
      if (stack.shadowMountEnabled && stack.krakenMountEnabled) {
        return {
          id: 'dual-mounter-overlap',
          severity: 'warning',
          title: 'Одновременная работа ShadowMountPlus v1.7 (10101) и Kraken Mount v0.0.1-beta (8097)',
          detail: 'Оба демона регистрируют плитки на главном экране через SceShellCore (Kraken Mount также использует ampr-emu-ng v0.4.0 в /data/krakenmount/ampr/). Сканирование одних и тех же папок приведёт к дублированию иконок или конфликту монтирования /app0.',
          fixAction: 'Разделите сканируемые каталоги в /data/krakenmount/config.toml или используйте один основной монтировщик.',
        };
      }
      if (stack.shadowMountEnabled && stack.shadowMountVersion === '1.6-legacy') {
        return {
          id: 'legacy-shadowmount',
          severity: 'warning',
          title: 'Рекомендуется обновить ShadowMountPlus до v1.7beta6-fix2+ / beta 11',
          detail: 'На прошивках 12.00–13.60 версия 1.7 использует стабильный мост SceShellCore / TitleDir и локальный HTTP API на порту 10101.',
          fixAction: 'Обновите бинарник до ShadowMountPlus v1.7beta11.',
        };
      }
      return null;
    },
  },
  {
    id: 'byepervisor-s3-usb-requirement',
    evaluate(stack) {
      if (stack.byepervisorEnabled && !stack.usbPowerInRestMode) {
        return {
          id: 'byepervisor-usb-rest',
          severity: 'critical',
          title: 'Byepervisor-Reborn требует включённого питания USB в режиме покоя (Rest Mode)',
          detail: 'Отключение XOM на 13.60 срабатывает через баг S3 Resume. Без включённого питания USB в настройках энергосбережения цепочка S3 Resume не отработает.',
          fixAction: 'Включите подачу питания на порты USB в Rest Mode и убедитесь, что elfldr запущен.',
        };
      }
      return null;
    },
  },
  {
    id: 'webkit-vs-y2jb-recommendation',
    evaluate(stack) {
      if (stack.exploitEntry === 'webkit-relapse') {
        return {
          id: 'webkit-stability-note',
          severity: 'warning',
          title: 'Точка входа WebKit менее стабильна при частых циклах отладки, чем Y2JB',
          detail: 'Для интенсивной разработки на 13.60 рекомендуется связка Y2JB (YouTube v01.009.253 + ProsperoMgr fake-активация + DNS 127.0.0.2).',
          fixAction: 'Для ускорения перезапусков установите jamesst20/ps5-y2jb-installer v1.3.0.',
        };
      }
      return null;
    },
  },
];

export function validateRuntimeStack(
  stack: RuntimeStackSelection
): StackValidationIssue[] {
  const issues: StackValidationIssue[] = [];
  for (const rule of STACK_VALIDATION_RULES) {
    const result = rule.evaluate(stack);
    if (result) {
      issues.push(result);
    }
  }

  if (issues.length === 0) {
    issues.push({
      id: 'stack-nominal',
      severity: 'nominal',
      title: 'Конфигурация Runtime-стека PS5 FW 13.60 полностью валидна',
      detail: 'Все компоненты (Y2JB, elfldr:9021, kstuff-lite v1.11+, ShadowMountPlus v1.7, FTP) согласованы без конфликтов.',
      fixAction: 'Консоль готова к приёму сборок.',
    });
  }

  return issues;
}
