import {
  FirmwareMitigationTimelinePoint,
  SecurityLayerComparisonMetric,
} from '../types/cfwResearch';

export const FIRMWARE_MITIGATION_TIMELINE: readonly FirmwareMitigationTimelinePoint[] = [
  {
    fwRange: 'FW 1.00–2.70',
    releaseEra: '2020–2021 (HV Golden Era)',
    entryVectorScore: 95,
    kernelRwScore: 95,
    hvBypassScore: 92,
    hardwareLockdownIndex: 38,
    keyVectorsAndPatches:
      'WebKit + BD-J + UMTX1 + прямой эксплойт гипервизора Byepervisor (полный дамп ядра и Ring -1 без S3).',
  },
  {
    fwRange: 'FW 3.00–4.51',
    releaseEra: '2021–2022 (IPV6 / UMTX Era)',
    entryVectorScore: 94,
    kernelRwScore: 92,
    hvBypassScore: 70,
    hardwareLockdownIndex: 54,
    keyVectorsAndPatches:
      'Закрыт первый вектор гипервизора; стабильный WebKit (FontFaceSet) + IPv6/UMTX kernel R/W + kstuff FSELF/FPKG.',
  },
  {
    fwRange: 'FW 5.00–5.50',
    releaseEra: '2022 (UMTX2 & kstuff Era)',
    entryVectorScore: 88,
    kernelRwScore: 88,
    hvBypassScore: 55,
    hardwareLockdownIndex: 64,
    keyVectorsAndPatches:
      'Усиление изоляции UMA-зон ядра и kCFI; работают WebKit, BD-J, Lua и kstuff.',
  },
  {
    fwRange: 'FW 6.00–7.61',
    releaseEra: '2022–2023 (BD-J / Relapse Start)',
    entryVectorScore: 86,
    kernelRwScore: 86,
    hvBypassScore: 52,
    hardwareLockdownIndex: 72,
    keyVectorsAndPatches:
      'Частичное закрытие старых WebKit-багов; старт поддержки цепочки Relapse-Exploit (7.00+) + Y2JB + BD-J.',
  },
  {
    fwRange: 'FW 8.00–10.01',
    releaseEra: '2023–2024 (Lua / Y2JB / Relapse)',
    entryVectorScore: 84,
    kernelRwScore: 85,
    hvBypassScore: 50,
    hardwareLockdownIndex: 78,
    keyVectorsAndPatches:
      'Патчи BD-J песочницы; основными точками входа становятся Y2JB (YouTube) и Lua-сейвы + Relapse.',
  },
  {
    fwRange: 'FW 11.00–13.60',
    releaseEra: '2025–11.2026 (Current Frontier)',
    entryVectorScore: 92,
    kernelRwScore: 90,
    hvBypassScore: 60,
    hardwareLockdownIndex: 85,
    keyVectorsAndPatches:
      'Верхняя граница джейлбрейка: Y2JB v1.1.0 + WebKit + Relapse-Exploit + Byepervisor-Reborn (S3 Resume XOM bypass) + TITAN-CORE / Kraken / SMP 1.7.',
  },
  {
    fwRange: 'FW 14.00–14.22',
    releaseEra: 'Late 2026 (Patched Frontier)',
    entryVectorScore: 22,
    kernelRwScore: 15,
    hvBypassScore: 10,
    hardwareLockdownIndex: 96,
    keyVectorsAndPatches:
      'Sony пропатчила браузерный WebKit и ядерную уязвимость Relapse; публичного джейлбрейка на 14.00+ нет (обновление строго запрещено).',
  },
];

export const SECURITY_LAYER_COMPARISON_MATRIX: readonly SecurityLayerComparisonMetric[] = [
  {
    layerId: 'layer-userland-rop',
    layerName: '1. Userland RCE & ROP',
    ps3Cfw355: 100,
    ps4GoldHen900: 98,
    ps5Fw1360Current: 98,
    ps5CfwTarget: 100,
    technicalNote: 'Y2JB (PPSA01650) и WebKit на 13.60 обеспечивают ~98% стабильность входа за 4–6 секунд.',
  },
  {
    layerId: 'layer-kernel-data',
    layerName: '2. Kernel Data R/W & Jailbreak',
    ps3Cfw355: 100,
    ps4GoldHen900: 96,
    ps5Fw1360Current: 95,
    ps5CfwTarget: 100,
    technicalNote: 'Relapse-Exploit даёт полный R/W к структурам .data/.heap ядра FreeBSD и права root/SYSTEM.',
  },
  {
    layerId: 'layer-kernel-code-xom',
    layerName: '3. Kernel .text Exec & FSELF',
    ps3Cfw355: 100,
    ps4GoldHen900: 100,
    ps5Fw1360Current: 82,
    ps5CfwTarget: 100,
    technicalNote: 'kstuff-lite v1.11 обходит XOM через прерывания IDT, а Byepervisor-Reborn снимает XOM после S3 сна.',
  },
  {
    layerId: 'layer-hypervisor-svm',
    layerName: '4. Ring -1 Hypervisor & NPT',
    ps3Cfw355: 100,
    ps4GoldHen900: 100,
    ps5Fw1360Current: 58,
    ps5CfwTarget: 95,
    technicalNote: 'На PS4 гипервизора не было; на PS5 13.60 NPT патчатся через баг S3 Resume (Byepervisor-Reborn).',
  },
  {
    layerId: 'layer-coproc-a53',
    layerName: '5. I/O Co-Proc (A53 MP4 / AMPR)',
    ps3Cfw355: 100,
    ps4GoldHen900: 95,
    ps5Fw1360Current: 44,
    ps5CfwTarget: 92,
    technicalNote: 'В userland работает ampr-emu-ng (256 MiB PRX); зонд a53_mmu0.elf штурмует окно GDDR6 @ 0x80000000.',
  },
  {
    layerId: 'layer-crypto-coldboot',
    layerName: '6. Crypto Keys & Coldboot CFW',
    ps3Cfw355: 100,
    ps4GoldHen900: 25,
    ps5Fw1360Current: 21,
    ps5CfwTarget: 90,
    technicalNote: 'Только PS3 имела полный взлом приватных ключей lv0; на PS5 для холодной CFW нужен вектор в EMC/AMD-SP.',
  },
];
