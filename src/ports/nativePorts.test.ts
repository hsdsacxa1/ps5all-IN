import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NATIVE_PORT_CATALOG,
  PORT_GPU_BACKEND_META,
} from '../data/nativePortsCatalog';
import {
  buildNativePortAgentPrompt,
  evaluatePortMemoryImpact,
  filterNativePortsCatalog,
  generateNativePortArtifacts,
  PORT_STRATEGY_LIST,
  PORT_STRATEGY_REGISTRY,
} from './portStrategyRegistry';
import { NativePortConfig } from '../types/nativePorts';

const BASE_CONFIG: NativePortConfig = {
  portName: 'devilutionx_ps5',
  sourceProject: 'DevilutionX (C++17 / SDL2)',
  titleId: 'PPSA99501',
  contentVersion: '01.00',
  strategy: 'source-port',
  gpuBackend: 'ps5-vulkan-radv',
  flexibleMemoryMiB: 448,
  enableDualSensePad: true,
  enableAudioOut: true,
  enableJitDynarec: false,
  enableMbedTls: true,
  enableDownload0Fallback: true,
  enableS3ResumeHook: true,
  packageFormat: 'ffpfsc',
};

test('PORT_STRATEGY_REGISTRY covers all 5 porting strategies polymorphically', () => {
  assert.equal(PORT_STRATEGY_LIST.length, 5);
  for (const handler of PORT_STRATEGY_LIST) {
    assert.equal(PORT_STRATEGY_REGISTRY[handler.meta.id], handler);
    assert.ok(PORT_GPU_BACKEND_META[handler.meta.recommendedGpu]);
  }
});

test('generateNativePortArtifacts emits all 5 files with 13.60 safety constraints', () => {
  const artifacts = generateNativePortArtifacts(BASE_CONFIG);
  assert.equal(artifacts.length, 5);

  const cmake = artifacts.find((a) => a.id === 'cmake');
  const cpp = artifacts.find((a) => a.id === 'bridge');
  const param = artifacts.find((a) => a.id === 'param');
  const deploy = artifacts.find((a) => a.id === 'deploy');

  assert.ok(cmake && cmake.content.includes('check-title-imports.py'));
  assert.ok(cpp && cpp.content.includes('/download0/devilutionx_ps5'));
  assert.ok(cpp && cpp.content.includes('/system/common/cert/CA_LIST'));
  assert.ok(cpp && cpp.content.includes('ENOSPC'));
  assert.ok(param && JSON.parse(param.content).titleId === 'PPSA99501');
  assert.ok(deploy && deploy.content.includes('mkpfs --compress'));
});

test('evaluatePortMemoryImpact calculates exact Direct Memory loss above 448 MiB', () => {
  const base = evaluatePortMemoryImpact(448);
  assert.equal(base.directPenaltyMiB, 0);
  assert.equal(base.severity, 'nominal');

  const heavy = evaluatePortMemoryImpact(1024);
  assert.equal(heavy.directPenaltyMiB, 576);
  assert.equal(heavy.severity, 'caution');
});

test('filterNativePortsCatalog filters by category and search text accurately', () => {
  const gfx = filterNativePortsCatalog(NATIVE_PORT_CATALOG, 'graphics-sdk', '');
  assert.ok(gfx.length >= 3);
  assert.ok(gfx.every((entry) => entry.category === 'graphics-sdk'));

  const search = filterNativePortsCatalog(NATIVE_PORT_CATALOG, 'all', 'liberty');
  assert.equal(search.length, 1);
  assert.equal(search[0].id, 'liberty-recompiled');
});

test('buildNativePortAgentPrompt embeds strategy, GPU backend and 13.60 rules', () => {
  const prompt = buildNativePortAgentPrompt({
    ...BASE_CONFIG,
    strategy: 'static-recomp',
    sourceProject: 'N64Recomp Title',
  });
  assert.ok(prompt.includes('Static Recompilation'));
  assert.ok(prompt.includes('PS5_Vulkan'));
  assert.ok(prompt.includes('statvfs()'));
});
