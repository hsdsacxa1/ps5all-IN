import assert from 'node:assert/strict';
import test from 'node:test';
import { generateProjectArtifacts } from '../generators/strategyRegistry';
import { validateRuntimeStack } from './henConflictValidator';
import { calculateMemoryBudget } from './memoryBudgetCalculator';
import { auditProjectSourceAndConfig } from './sourceCodeAuditor';

test('calculateMemoryBudget computes exact Direct memory loss when Flexible memory exceeds 448 MiB', () => {
  const defaultBudget = calculateMemoryBudget('native-app', 448);
  assert.equal(defaultBudget.status, 'nominal');
  assert.equal(defaultBudget.directMemoryLostMiB, 0);

  const inflatedBudget = calculateMemoryBudget('native-app', 1024);
  assert.equal(inflatedBudget.status, 'warning');
  assert.equal(inflatedBudget.directMemoryLostMiB, 576);
});

test('calculateMemoryBudget warns when ELF payload approaches 1.6 GiB SceShellUI limit', () => {
  const nominalElf = calculateMemoryBudget('payload', 256);
  assert.equal(nominalElf.status, 'nominal');

  const heavyElf = calculateMemoryBudget('payload', 1400);
  assert.equal(heavyElf.status, 'critical');
});

test('validateRuntimeStack detects OnionHEN + kstuff-lite collision and legacy kstuff_v1.6.7', () => {
  const collisionIssues = validateRuntimeStack({
    exploitEntry: 'y2jb-1.3.0',
    henSelections: ['kstuff-lite-1.11', 'onionhen-0.9.0'],
    elfldrEnabled: true,
    shadowMountEnabled: true,
    shadowMountVersion: '1.7beta11',
    ftpServer: 'ftpsrv-2121',
    byepervisorEnabled: false,
    usbPowerInRestMode: true,
  });
  assert.equal(
    collisionIssues.some((i) => i.id === 'hen-collision' && i.severity === 'critical'),
    true
  );

  const legacyIssues = validateRuntimeStack({
    exploitEntry: 'y2jb-1.3.0',
    henSelections: ['legacy-kstuff-1.6.7'],
    elfldrEnabled: true,
    shadowMountEnabled: true,
    shadowMountVersion: '1.7beta11',
    ftpServer: 'ftpsrv-2121',
    byepervisorEnabled: false,
    usbPowerInRestMode: true,
  });
  assert.equal(
    legacyIssues.some((i) => i.id === 'legacy-kstuff' && i.severity === 'critical'),
    true
  );
});

test('auditProjectSourceAndConfig catches forbidden statvfs() and RGBA icon0.png in Native App', () => {
  const findings = auditProjectSourceAndConfig({
    architecture: 'native-app',
    sourceCode: `
      #include <sys/statvfs.h>
      void check() {
        struct statvfs s;
        statvfs("/data", &s);
        FILE* f = fopen("/app0/assets/cfg.json", "w");
      }
    `,
    titleId: 'PPSA99808',
    contentVersion: '01.00',
    flexibleMemoryMiB: 448,
    iconWidth: 512,
    iconHeight: 512,
    iconHasAlpha: true,
    elevatedPrivileges: true,
  });

  const statvfsFinding = findings.find((f) => f.id === 'rule-statvfs-import');
  assert.equal(statvfsFinding?.severity, 'critical');

  const app0Finding = findings.find((f) => f.id === 'rule-app0-write');
  assert.equal(app0Finding?.severity, 'critical');

  const iconFinding = findings.find((f) => f.id === 'rule-icon0-format');
  assert.equal(iconFinding?.severity, 'critical');
});

test('generateProjectArtifacts produces valid files for all 4 architecture strategies', () => {
  const architectures = ['payload', 'payload-webui', 'native-app', 'hybrid-app'] as const;
  for (const arch of architectures) {
    const files = generateProjectArtifacts({
      projectName: 'ProsperoTest',
      titleId: 'PPSA99808',
      contentVersion: '01.00',
      ps5Ip: '192.168.1.50',
      elfldrPort: 9021,
      ftpPort: 2121,
      webuiPort: 8080,
      architecture: arch,
      graphicsBackend: 'vulkan-radv',
      packageFormat: 'unpacked-folder',
      flexibleMemoryMiB: 448,
      useElevatedPrivileges: false,
      useHttpsTls: true,
      includeS3ResumeHandler: true,
      includeDownload0Fallback: true,
      openSourceGpl: true,
    });
    assert.equal(files.length >= 2, true);
  }
});

test('validateRuntimeStack warns on simultaneous ShadowMountPlus and Kraken Mount and accepts standalone Kraken Mount', () => {
  const overlapIssues = validateRuntimeStack({
    exploitEntry: 'y2jb-1.3.0',
    henSelections: ['kstuff-lite-1.11'],
    elfldrEnabled: true,
    shadowMountEnabled: true,
    shadowMountVersion: '1.7beta11',
    krakenMountEnabled: true,
    ftpServer: 'ftpsrv-2121',
    byepervisorEnabled: false,
    usbPowerInRestMode: true,
  });
  assert.equal(
    overlapIssues.some((i) => i.id === 'dual-mounter-overlap' && i.severity === 'warning'),
    true
  );

  const krakenStandaloneIssues = validateRuntimeStack({
    exploitEntry: 'y2jb-1.3.0',
    henSelections: ['kstuff-lite-1.11'],
    elfldrEnabled: true,
    shadowMountEnabled: false,
    shadowMountVersion: '1.7beta11',
    krakenMountEnabled: true,
    ftpServer: 'ftpsrv-2121',
    byepervisorEnabled: false,
    usbPowerInRestMode: true,
  });
  assert.equal(
    krakenStandaloneIssues.some((i) => i.id === 'stack-nominal' && i.severity === 'nominal'),
    true
  );
});

