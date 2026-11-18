export interface KrakenFailureRule {
  readonly id: string;
  readonly category: 'detection' | 'launch';
  readonly symptom: string;
  readonly sourceLocation: string;
  readonly logSignature: string;
  readonly rootCause: string;
  readonly fixSteps: string[];
  matchesInput(pathOrLog: string): boolean;
}

export const KRAKEN_DIAGNOSTIC_RULES: KrakenFailureRule[] = [
  {
    id: 'sparse-extent-pkg',
    category: 'detection',
    symptom: 'PKG найден, но статус "error" и плитка не появляется на главном экране',
    sourceLocation: 'crates/kraken-mount-pkg/src/kraken.rs · Issue #4, #5, #8, #12, #13',
    logSignature: 'unsupported package: the layout has a sparse extent at mount 0x...; repack with --kraken stored',
    rootCause:
      'В старом бинарнике v0.0.1-beta (от 13.11.2026) парсер PKG отклонял любые FPKG с разреженными блоками (sparse extents, граница типа 0x40). В релизе Kraken Mount v0.2.0 (от 15.11.2026, с ampr-emu-ng v0.4.1) поддержка sparse FPKG включена официально из коробки!',
    fixSteps: [
      'Обновитесь до Kraken Mount v0.2.0 (15.11.2026) или используйте наш объединённый билд kraken-shadow-mix.elf — теперь все sparse FPKG монтируются напрямую без перепаковки.',
      'Если вы остаётесь на старом v0.0.1-beta: перепакуйте через ps5-dump-forge с флагом --kraken stored.',
    ],
    matchesInput(input) {
      const lower = input.toLowerCase();
      return lower.includes('sparse extent') || lower.includes('--kraken stored');
    },
  },
  {
    id: 'wrong-scan-root-or-nested-dir',
    category: 'detection',
    symptom: 'Kraken Mount вообще не видит ни .pkg, ни папку с игрой в списке :8097',
    sourceLocation: 'src/storage.rs (default_scan_roots) & src/scan.rs (lines 90–129)',
    logSignature: 'Игры нет даже со статусом error в http://<ps5-ip>:8097/',
    rootCause:
      'В src/scan.rs обход каталогов НЕ рекурсивный (только 1 уровень вглубь корня сканирования!). По умолчанию сканируются ТОЛЬКО: /data/homebrew, /data/etaHEN/games, /mnt/ext0/homebrew, /mnt/ext0/etaHEN/games, /mnt/ext0, /mnt/usb0..7/homebrew, /mnt/usb0..7/etaHEN/games и корень /mnt/usb0..7. Если .pkg лежит внутри подпапки (например, /mnt/usb0/homebrew/GameName/game.pkg или /data/games/game.pkg), сканер видит папку без eboot.bin и молча её пропускает.',
    fixSteps: [
      'Для .pkg: положите файл .pkg НАПРЯМУЮ в /data/homebrew/game.pkg, /data/etaHEN/games/game.pkg или прямо в корень флешки /mnt/usb0/game.pkg (без вложенной папки!).',
      'Для папок (Folder): папка игры должна лежать на 1 уровне (/data/homebrew/PPSA12345/) и содержать внутри себя файл eboot.bin и sce_sys/param.json.',
    ],
    matchesInput(input) {
      const lower = input.toLowerCase();
      return (
        lower.includes('/data/games') ||
        lower.includes('/pkgs/') ||
        /\/homebrew\/[^/]+\/[^/]+\.pkg/i.test(input)
      );
    },
  },
  {
    id: 'ffpkg-ffpfsc-or-raw-archive',
    category: 'detection',
    symptom: 'Игры от ShadowMountPlus (.ffpkg, .ffpfsc) или одиночные архивы .zst / .lz4 не видны',
    sourceLocation: 'src/scan.rs (lines 109–128)',
    logSignature: 'Контейнеры .ffpkg / .ffpfsc / одиночные .zst полностью игнорируются',
    rootCause:
      'Kraken Mount НЕ поддерживает форматы ShadowMountPlus (.ffpkg UFS2 и .ffpfsc mkpfs). А поддержка Zstd и LZ4 в Kraken Mount работает НЕ через одиночный файл .zst/.lz4, а только через папку игры, содержащую eboot.bin, sce_sys/param.json и индексный файл ampr_zstd.index (для Zstd) или ampr_assets.index (для LZ4).',
    fixSteps: [
      'Для образов .ffpkg и .ffpfsc используйте ShadowMountPlus v1.7.',
      'Для Zstd/LZ4 в Kraken Mount создавайте папку дампа через ps5-dump-forge (внутри папки должны быть eboot.bin, sce_sys/param.json и ampr_zstd.index / ampr_assets.index).',
    ],
    matchesInput(input) {
      const lower = input.toLowerCase();
      return (
        lower.endsWith('.ffpkg') ||
        lower.endsWith('.ffpfsc') ||
        lower.endsWith('.zst') ||
        lower.endsWith('.lz4')
      );
    },
  },
  {
    id: 'retail-or-ampr-inside-pkg',
    category: 'detection',
    symptom: 'Ошибка чтения .pkg: not a PS5 package / encrypted / contains ampr_assets.index',
    sourceLocation: 'crates/kraken-mount-pkg/src/lib.rs & src/cache.rs (line 206)',
    logSignature: 'the pkg contains ampr_assets.index (ampr packs) / unsupported package',
    rootCause:
      'Kraken Mount принимает только незашифрованные Debug FPKG (PPRPLAIN-NOAUTH!), собранные через ps5-dump-forge из распакованной папки. Обычные PS4 FPKG, retail PKG или PKG, собранные поверх уже запакованных ampr-паков, отклоняются.',
    fixSteps: [
      'Собирайте .pkg исключительно через ps5-dump-forge из чистой распакованной папки игры (без вложенных ampr_zstd.index / ampr_assets.index).',
    ],
    matchesInput(input) {
      const lower = input.toLowerCase();
      return (
        lower.includes('ampr_assets.index') ||
        lower.includes('ampr_zstd.index') ||
        lower.includes('pprplain') ||
        lower.includes('not a ps5 package')
      );
    },
  },
  {
    id: 'shadowmount-unionfs-collision',
    category: 'launch',
    symptom: 'Игра видна, плитка появилась, но при запуске вылетает через 1 секунду ("Something went wrong")',
    sourceLocation: 'src/launch.rs (lines 319–321 & 386–388) · Issue #15, #16, #18',
    logSignature: 'common/lib occupied by unionfs from ...; not mounting',
    rootCause:
      'Прямой конфликт с запущенным ShadowMountPlus (или его global fakelib)! При старте игры поток launch.rs в Kraken Mount ждёт появления /mnt/sandbox/<TID>_<n>/<x>/common/lib, чтобы смонтировать туда unionfs с libSceAmpr.sprx (ampr-emu-ng v0.4.0) и /app0/kraken. Если ShadowMountPlus запущен параллельно, он первым вешает свой unionfs на common/lib. Kraken Mount видит чужой unionfs и ОТМЕНЯЕТ монтирование ampr-emu-ng!',
    fixSteps: [
      'Не запускайте ShadowMountPlus.elf и kraken-mount.elf одновременно (либо отключите global fakelib в ShadowMountPlus).',
      'Перезагрузите консоль, запустите только elfldr + kstuff-lite v1.11+ и отправьте kraken-mount.elf.',
    ],
    matchesInput(input) {
      const lower = input.toLowerCase();
      return (
        lower.includes('occupied by unionfs') ||
        lower.includes('not mounting') ||
        lower.includes('something went wrong') ||
        lower.includes('shadowmount')
      );
    },
  },
  {
    id: 'daemon-not-running-after-reboot',
    category: 'launch',
    symptom: 'Плитка игры осталась на главном экране после перезагрузки, но игра не стартует (0x80940033 / CE-108255-1)',
    sourceLocation: 'src/launch.rs & src/register.rs (mount_title_nullfs)',
    logSignature: 'launch fails with 0x80940033 / missing /system_ex/app/<TID> nullfs',
    rootCause:
      'Плитка на главном экране указывает лишь на кэш /data/krakenmount/caches/<TID> (где лежат только eboot.bin и sce_sys). После перезагрузки PS5 слетают и nullfs-монтирование в /system_ex/app/<TID>, и фоновый перехватчик launch.rs (который подставляет libSceAmpr.sprx и данные игры на лету). Без активного процесса kraken-mount.elf и kstuff-lite v1.11+ игра запуститься не может.',
    fixSteps: [
      'После каждого применения эксплойта (Y2JB / WebKit) убедитесь, что запущены elfldr (9021) и kstuff-lite v1.11+.',
      'Нажмите на плитку "Kraken Mount" на главном экране (или отправьте kraken-mount.elf на порт 9021), дождитесь уведомления и только после этого запускайте игру.',
    ],
    matchesInput(input) {
      const lower = input.toLowerCase();
      return (
        lower.includes('0x80940033') ||
        lower.includes('ce-108255-1') ||
        lower.includes('ce-100008-9') ||
        lower.includes('reboot')
      );
    },
  },
];

export function diagnoseKrakenIssue(query: string): KrakenFailureRule[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return KRAKEN_DIAGNOSTIC_RULES;
  }
  const matched = KRAKEN_DIAGNOSTIC_RULES.filter((rule) => rule.matchesInput(trimmed));
  return matched.length > 0 ? matched : KRAKEN_DIAGNOSTIC_RULES;
}
