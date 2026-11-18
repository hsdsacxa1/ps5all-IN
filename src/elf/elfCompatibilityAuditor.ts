import { ElfAuditIssue, ParsedElfReport } from '../types/elf';

type ReportWithoutAudit = Omit<ParsedElfReport, 'auditIssues'>;

interface ElfAuditRule {
  readonly id: string;
  evaluate(
    report: ReportWithoutAudit,
    targetMode: 'title-eboot' | 'payload-elf'
  ): ElfAuditIssue | null;
}

const ELF_AUDIT_RULES: ElfAuditRule[] = [
  {
    id: 'non-elf-warning',
    evaluate(report) {
      if (!report.header.is64Bit) {
        return {
          id: 'non-elf-warning',
          severity: 'critical',
          title: 'Загруженный файл не содержит заголовка ELF64 (x86-64)',
          detail: `Определён формат: ${report.header.formatLabel}. Для PS5 FW 13.60 требуются 64-битные ELF (или FSELF с вложенным заголовком ELF64).`,
          remediation: 'Проверьте, что бинарник скомпилирован clang-18 / lld-18 под таргет x86_64-scei-ps5 или ps5-payload-sdk.',
        };
      }
      return null;
    },
  },
  {
    id: 'forbidden-title-imports-statvfs',
    evaluate(report, targetMode) {
      const forbiddenSyms = report.symbols.filter((s) => s.forbiddenInTitle);
      if (forbiddenSyms.length > 0 && targetMode === 'title-eboot') {
        const names = forbiddenSyms.map((s) => s.name).join(', ');
        return {
          id: 'forbidden-title-imports-statvfs',
          severity: 'critical',
          title: `Обнаружены запрещённые импорты в Title-процессе: ${names}`,
          detail: `В таблице импортов (.dynsym) присутствуют символы [${names}]. Они отсутствуют в пользовательской libkernel на PS5 13.60 и вызывают мгновенный краш (Null Import) при запуске eboot.bin.`,
          remediation:
            'Удалите вызовы statvfs()/statfs() из основного бинарника: проверяйте место через errno == ENOSPC или делегируйте вызов в helper.elf (порт 9021).',
        };
      }
      if (forbiddenSyms.length > 0 && targetMode === 'payload-elf') {
        const names = forbiddenSyms.map((s) => s.name).join(', ');
        return {
          id: 'payload-statfs-allowed',
          severity: 'nominal',
          title: `Системный импорт ${names} разрешён в режиме ELF Payload`,
          detail: `Фоновый ELF-пэйлоад линкуется с системной libkernel_sys.so, где ${names} доступен.`,
          remediation: 'Не переносите этот объектный код напрямую в Title eboot.bin без обёртки.',
        };
      }
      return null;
    },
  },
  {
    id: 'rwx-segment-check',
    evaluate(report) {
      const rwxSegments = report.programHeaders.filter(
        (ph) => ph.pType === 1 && ph.flagsLabel === 'RWX'
      );
      if (rwxSegments.length > 0) {
        return {
          id: 'rwx-segment-check',
          severity: 'warning',
          title: `Обнаружен сегмент PT_LOAD с правами RWX (${rwxSegments.length} шт.)`,
          detail:
            'На PS5 13.60 включена аппаратная защита XOM/W^X (если не применён Byepervisor-Reborn). Сегменты с одновременными флагами Write + Execute могут быть отклонены загрузчиком FSELF.',
          remediation:
            'Разделите сегменты кода (.text -> R-X) и данных (.data/.bss -> RW-) при линковке lld-18.',
        };
      }
      return null;
    },
  },
  {
    id: 'readonly-app0-write-strings',
    evaluate(report) {
      const hasDataPath = report.extractedStrings.some((s) =>
        s.value.startsWith('/data/')
      );
      const hasDownload0 = report.extractedStrings.some((s) =>
        s.value.startsWith('/download0')
      );

      if (hasDataPath && !hasDownload0) {
        return {
          id: 'missing-download0-string',
          severity: 'warning',
          title: 'В секции строк найден путь /data/..., но отсутствует резервный /download0',
          detail:
            'Если приложение запускается под OnionHEN v0.9.0 без добавления Title ID в whitelist, запись в /data будет заблокирована песочницей.',
          remediation:
            'Добавьте в бинарник fallback-логику сохранения конфигурации в песочницу /download0/.',
        };
      }
      return null;
    },
  },
  {
    id: 'elf-shellui-memory-ceiling',
    evaluate(report, targetMode) {
      const sixteenHundredMiB = 1600 * 1024 * 1024;
      if (targetMode === 'payload-elf' && report.totalLoadMemBytes > sixteenHundredMiB) {
        return {
          id: 'elf-shellui-memory-ceiling',
          severity: 'critical',
          title: 'Превышен бюджет памяти ELF Payload (~1.6 GiB SceShellUI)',
          detail: `Сумма memsz сегментов PT_LOAD превышает лимит памяти фоновых процессов ShellUI.`,
          remediation:
            'Переведите приложение на архитектуру Native PS5 App (<TITLE_ID>/eboot.bin) для получения полного бюджета RAM.',
        };
      }
      return null;
    },
  },
];

export function auditParsedElf(
  report: ReportWithoutAudit,
  targetMode: 'title-eboot' | 'payload-elf'
): ElfAuditIssue[] {
  const issues: ElfAuditIssue[] = [];
  for (const rule of ELF_AUDIT_RULES) {
    const res = rule.evaluate(report, targetMode);
    if (res) {
      issues.push(res);
    }
  }

  if (issues.length === 0) {
    issues.push({
      id: 'elf-clean-1360',
      severity: 'nominal',
      title: 'Бинарник полностью совместим с правилами PS5 Firmware 13.60',
      detail:
        'Запрещённых импортов (statvfs/statfs), конфликтов RWX-сегментов и нарушений песочницы не обнаружено.',
      remediation: 'Бинарник готов к упаковке в FSELF / отправке в elfldr:9021.',
    });
  }

  return issues;
}
