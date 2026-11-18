import {
  CfwCoreOsPartitionSpec,
  CfwResearchStage,
} from '../types/cfwResearch';

export const CFW_RESEARCH_STAGES_1360: readonly CfwResearchStage[] = [
  {
    id: 'stage-1-entry',
    stageNumber: 1,
    shortLabel: '01. Userland RCE',
    codeName: 'STAGE_01_USERLAND_ROP',
    title: 'Точка входа и побег из прикладной песочницы (Y2JB / WebKit / BD-J / Lua)',
    privilegeRing: 'Ring 3 (Sandboxed Userland Process)',
    completionPercent1360: 98,
    difficultyScore: 35,
    persistenceTier: 'Volatile (RAM / Tethered)',
    status1360: 'ACHIEVED',
    summary:
      'Первичный захват управления потоком исполнения (RIP) внутри подписанного пользовательского процесса. На прошивке 13.60 эталонной точкой входа является Y2JB (приложение YouTube PPSA01650 v01.009.253 через V8/Cobalt JS) и браузерный WebKit (FontFaceSet / UAF), переводящие баг памяти в ROP-цепочку по гаджетам системных библиотек.',
    attackVectors: [
      'Y2JB (Gezine / itsPLK v1.1.0): эксплуатация движка Cobalt/V8 внутри YouTube PPSA01650 (v01.009.253) через локальный DNS 127.0.0.2 и сохранённый профиль',
      'WebKit User’s Guide / Browser: Type Confusion / Use-After-Free в DOM/WebCore (закрыт Sony начиная с FW 14.00)',
      'Дисковый и эмуляторный вектор (BD-J / PS2 Mast1c0re / Luac0re): JIT-примитивы в эмуляторах и Java-машине Blu-Ray',
    ],
    hardwareMitigations: [
      'ASLR (Address Space Layout Randomization) пользовательских модулей .sprx',
      'W^X / DEP и аппаратный XOM (eXecute-Only Memory) на сегментах кода системных библиотек (нельзя прочитать код для поиска гаджетов вслепую)',
      'CFI (Control Flow Integrity) на уровне компилятора Clang в системных демонах',
      'Жёсткая FreeBSD jail-песочница процесса (/app0 только для чтения, урезанная таблица системных вызовов)',
    ],
    reverseEngineeringArtifacts: [
      {
        name: 'libkernel_web.sprx / libkernel.sprx',
        addressOrOffset: 'Импорт таблиц PLT/GOT + таблица syscall-обёрток',
        role: 'Источник базовых ROP-гаджетов (pop rdi; pop rsi; ret) и точек входа в системные вызовы FreeBSD 11',
      },
      {
        name: 'YouTube PPSA01650 download0 cache',
        addressOrOffset: '/user/download/PPSA01650/download0.dat',
        role: 'Точка инжекта автономного автолоадера Y2JB (запуск цепочки без интернета за ~4.2 с)',
      },
    ],
    keyPrimitives: [
      'addrof(obj) / fakeobj(addr) — чтение адреса JS-объекта и подделка указателя в куче',
      'Arbitrary Userland 64-bit R/W через модифицированный ArrayBuffer / TypedArray backing store',
      'Stack Pivot (xchg rsp, rax) в подготовленную ROP-цепочку и вызов цепочки ядерного эксплойта',
    ],
    blockersToNextStage: [
      'Из Ring 3 невозможна прямая модификация учетных данных процесса (ucred) или монтирование ФС без уязвимости в ядре FreeBSD',
    ],
    technicalSnippet: `// Примитив перевода WebKit/V8 R/W в вызов системного вызова через ROP (Ring 3):
// 1. Утечка базы libkernel_web.sprx из vtable / GOT указателя
uint64_t libkernel_base = leak_got_ptr(js_view) - OFFSET_LIBKERNEL_GETPID;
// 2. Подготовка фейкового стека для запуска Relapse kernel exploit потока
rop_chain.push(libkernel_base + GADGET_POP_RDI_RET);
rop_chain.push( payload_ctx_addr );
rop_chain.push(libkernel_base + SYSCALL_THR_NEW);`,
    crossGenComparison: {
      ps3Lv0: 'OtherOS гипервизорный глитч (FW 3.15) или USB-дескриптор PSJailbreak (FW 3.41)',
      ps4Orbis: 'WebKit / PPPoE (PPPwn) / BD-J с прямым переходом в JOP/ROP',
      ps5Prospero1360: 'Y2JB (YouTube Cobalt V8) + WebKit с обходом XOM-библиотек через предвычисленные таблицы гаджетов',
    },
  },
  {
    id: 'stage-2-kernel-rw',
    stageNumber: 2,
    shortLabel: '02. Kernel Data R/W',
    codeName: 'STAGE_02_KERNEL_DATA_RW',
    title: 'Эксплойт ядра FreeBSD, произвольный Kernel R/W и побег из песочницы (Relapse)',
    privilegeRing: 'Ring 0 (FreeBSD Kernel Data Space)',
    completionPercent1360: 95,
    difficultyScore: 55,
    persistenceTier: 'Volatile (RAM / Tethered)',
    status1360: 'ACHIEVED',
    summary:
      'Переход от пользовательского ROP к чтению и записи структур данных ядра FreeBSD (ntfargo/Relapse-Exploit для FW 7.00–13.60). Позволяет найти структуру текущего процесса proc, обнулить UID/GID, выйти из jail0, выставить максимальные права Sony AuthID и запустить фоновый загрузчик elfldr на порту 9021.',
    attackVectors: [
      'Relapse-Exploit (ntfargo): состояние гонки (Race Condition) и Use-After-Free в объектах ядра FreeBSD (поддержка FW 7.00–13.60)',
      'Классические примитивы IPv6 pktopts (IPV6_PKTINFO / IPV6_RTHDR) + pipebuf (f_data подмена указателя буфера пайпа)',
      'Подмена таблицы файловых дескрипторов (fd_ofiles) для создания мастер-пары сокетов/пайпов с прямым доступом к виртуальной памяти ядра',
    ],
    hardwareMitigations: [
      'KASLR (Kernel Address Space Layout Randomization) — рандомизация базы данных и текста ядра при каждой загрузке',
      'SMAP / SMEP — аппаратный запрет обращения ядра к пользовательским страницам и исполнения кода из userland',
      'Изоляция зон аллокатора UMA (uma_zone) и рандомизация фрилистов кучи ядра',
    ],
    reverseEngineeringArtifacts: [
      {
        name: 'Kernel Text & Data Base (FW 13.60)',
        addressOrOffset: 'Text: 0xffffffffce240000 / Data: 0xffffffffcef00000',
        role: 'Базовые адреса сегментов ядра FreeBSD (с учётом смещения KASLR сессии)',
      },
      {
        name: 'struct proc -> p_ucred',
        addressOrOffset: 'p_ucred +0x04 (cr_uid), +0x58 (sceAuthId), +0x60 (sceCaps)',
        role: 'Структура прав процесса: повышение до root и системного AuthID (0x4800000000000006)',
      },
      {
        name: 'rootvnode & prison0',
        addressOrOffset: 'Kernel Data Section offsets',
        role: 'Выход из песочницы /app0 в полный корень файловой системы (/, /data, /system, /mnt/sandbox)',
      },
    ],
    keyPrimitives: [
      'kread8(kva) / kwrite8(kva, val) через пару коррупченных pipe / master-slave IPv6 сокетов',
      'Обход списка allproc и патч ucred + снятие флагов песочницы для процесса elfldr (порт 9021)',
      'Чтение таблицы страниц PMAP (Kernel PMAP Root 0x12094000, DMAP Base 0xffff886000000000)',
    ],
    blockersToNextStage: [
      'В отличие от PS4, на PS5 запись в код ядра (.text) заблокирована гипервизором (Ring -1 NPT XOM) — любая попытка пропатчить инструкцию ядра напрямую вызывает мгновенный Kernel Panic / Hypervisor Fault',
    ],
    technicalSnippet: `// Патч учётных данных процесса (ucred) в памяти данных ядра (Data-Only Attack):
kwrite32(ucred + OFFSET_CR_UID, 0);               // root UID
kwrite32(ucred + OFFSET_CR_RUID, 0);              // real UID
kwrite32(ucred + OFFSET_CR_SVUID, 0);             // saved UID
kwrite64(ucred + OFFSET_CR_PRISON, prison0_addr); // выход из тюрьмы
kwrite64(ucred + OFFSET_SCE_AUTHID, 0x4800000000000006ULL); // SceShellCore / System AuthID
kwrite64(ucred + OFFSET_SCE_CAPS0, 0xffffffffffffffffULL);  // полные системные привилегии`,
    crossGenComparison: {
      ps3Lv0: 'Патч гипервизора lv2 в RAM (hvcall peek/poke)',
      ps4Orbis: 'Патч CR0.WP = 0 и прямая перезапись инструкций .text ядра OrbisOS',
      ps5Prospero1360: 'Чистый Data-Only эксплойт: модификация только структур в .data/.heap из-за защиты .text гипервизором',
    },
  },
  {
    id: 'stage-3-kcfi-exec',
    stageNumber: 3,
    shortLabel: '03. kCFI & kstuff',
    codeName: 'STAGE_03_KSTUFF_FSELF',
    title: 'Обход XOM/kCFI, перехват IDT/Syscall и подмена FSELF/FPKG (kstuff-lite)',
    privilegeRing: 'Ring 0+ (Interrupt / Debug Register Trap Emulation)',
    completionPercent1360: 82,
    difficultyScore: 72,
    persistenceTier: 'Volatile (RAM / Tethered)',
    status1360: 'ACHIEVED',
    summary:
      'Поскольку код ядра (.text) защищён гипервизором от чтения и записи (XOM), классические патчи проверок подписи невозможны. Сцена PS5 решает это через kstuff-lite v1.11: установку аппаратных точек останова / перехват таблицы прерываний (IDT #DB/#GP) и эмуляцию проверок FSELF/FPKG в управляемом обработчике (KEKCALL) без изменения байтов .text.',
    attackVectors: [
      'kstuff-lite v1.11 (EchoStretch): перехват верификации заголовков SELF и крипто-запросов SceSblAuthMgr через аппаратные регистры отладки и подмену указателей в .data',
      'Механизм KEKCALL: прокси-вызовы внутри ядра для прозрачного запуска неподписанных eboot.bin и .sprx',
      'R&D Gate G0 (devchmod на 13.60): установка хука sys_getuid+0xE, проверка Hypervisor Cookie (0xcafedead00001337) и восстановление IDT для исполнения собственного CPL0-стаба',
    ],
    hardwareMitigations: [
      'Hypervisor-enforced XOM (Execute-Only Memory) на всех страницах .text ядра',
      'kCFI (Kernel Control Flow Integrity) — проверка хешей сигнатур функций при косвенных вызовах (indirect calls)',
      'Защита управляющих регистров процессора (CR0, CR4, EFER, MSR_LSTAR) монитором гипервизора',
    ],
    reverseEngineeringArtifacts: [
      {
        name: 'Hypervisor Cookie & Data Cave (FW 13.60)',
        addressOrOffset: 'Cookie: 0xcafedead00001337 / Cave: 0xffffffffd0f79000',
        role: 'Маркер целостности контекста гипервизора и рабочая область данных для CPL0-стабов',
      },
      {
        name: 'SceSblAuthMgr & SceSblServiceMailbox',
        addressOrOffset: 'Kernel Data function pointers & mailbox rings',
        role: 'Точка перехвата проверки подписи FSELF перед отправкой команды в криптопроцессор AMD-SP',
      },
    ],
    keyPrimitives: [
      'Подмена ответов SceSblAuthMgr при загрузке FSELF (eboot.bin, libc.prx, libSceAmpr.sprx)',
      'Снятие ошибки CE-100008-9 при запуске неподписанных нативных приложений и игр',
      'Фоновое сосуществование с ShadowMountPlus 1.7beta12 и TITAN-CORE v1.0 Mod (защита от двойной инициализации kstuff/OnionHEN)',
    ],
    blockersToNextStage: [
      'Эмуляция через прерывания в kstuff создаёт накладные расходы CPU и не позволяет модифицировать сам код ядра или драйверов (например, снять блокировку /dev/mp4/dump напрямую в .text)',
    ],
    technicalSnippet: `// Логика перехвата верификации FSELF в kstuff-lite без модификации .text:
// 1. При обращении SceSblAuthMgr к почтовому ящику срабатывает перехват в .data / IDT
if (self_header->magic == FSELF_MAGIC_PROSPERO) {
    // Вместо обращения к аппаратному криптопроцессору SAMU/PSP за проверкой RSA/ECDSA подписи,
    // заполняем дескриптор сегментов напрямую физическими адресами расшифрованных страниц:
    populate_fake_sbl_block_table(auth_ctx, self_segments);
    return SCE_OK; // 0x0 — ядро считает бинарник официально подписанным Sony
}`,
    crossGenComparison: {
      ps3Lv0: 'Прямой патч проверок ECDSA в lv2_kernel.self',
      ps4Orbis: 'Прямой 4-байтовый патч mov eax, 0; ret в функциях sceSblAuthMgrIsLoadable2',
      ps5Prospero1360: 'Беспатчевый перехват в .data / IDT (kstuff-lite 1.11) в обход гипервизорного XOM',
    },
  },
  {
    id: 'stage-4-hypervisor',
    stageNumber: 4,
    shortLabel: '04. Hypervisor Ring -1',
    codeName: 'STAGE_04_SVM_BYEPERVISOR',
    title: 'Эксплуатация Гипервизора AMD SVM и снятие защиты NPT/XOM (Byepervisor-Reborn)',
    privilegeRing: 'Ring -1 (AMD-V / SVM Host Mode & Nested Page Tables)',
    completionPercent1360: 58,
    difficultyScore: 84,
    persistenceTier: 'Warm-Boot / S3 Resume',
    status1360: 'PARTIAL_RND',
    summary:
      'Ядро FreeBSD на PS5 работает внутри аппаратной виртуальной машины AMD SVM (VMRUN). Гипервизор в Ring -1 контролирует вложенные таблицы страниц (NPT / SLAT), запрещая чтение и запись .text ядра. На 13.60 проект Byepervisor-Reborn обходит это через уязвимость выхода из режима покоя (S3 Rest Mode Resume), отключая XOM и открывая полный R/W к коду ядра.',
    attackVectors: [
      'Byepervisor-Reborn (PS5Dev, поддержка 13.00 / 13.20 / 13.60): эксплуатация инициализации таблиц памяти при выходе из S3 Sleep / Rest Mode (требует активного питания USB в покое)',
      'Атака на таблицы вложенной трансляции адресов (NPT / RVI) до финальной блокировки прав доступа гипервизором',
      'R&D вектор без S3: поиск ошибки валидации физических адресов (PA) в обработчиках VMEXIT / VMMCALL гипервизора Sony',
    ],
    hardwareMitigations: [
      'AMD-V SVM (Secure Virtual Machine) с изоляцией VMCB (Virtual Machine Control Block)',
      'Nested Page Tables (NPT): физические адреса гостевого ядра (GPA) транслируются в системные физические адреса (SPA) с жёсткой маской R/W/X',
      'Шифрование состояния процессора при переключении контекста (SEV-подобные механизмы защиты регистров)',
    ],
    reverseEngineeringArtifacts: [
      {
        name: 'NPT Page Table Entries (Host PA)',
        addressOrOffset: 'Биты [2:0] (Read/Write/Execute) в PTE второго уровня трансляции',
        role: 'Установка битов Read=1, Write=1 на страницах .text ядра (PA 0x0e241000+) снимает XOM',
      },
      {
        name: 'ACPI S3 Resume Vector & SMM/HV Wakeup',
        addressOrOffset: 'Цепочка пробуждения APU из Rest Mode',
        role: 'Окно гонки, в котором Byepervisor-Reborn перехватывает конфигурацию защиты памяти ядра на 13.60',
      },
    ],
    keyPrimitives: [
      'Полный дамп расшифрованного кода ядра (.text) на прошивке 13.60 в чистом виде для анализа в IDA Pro / Ghidra',
      'Прямая установка inline-хуков в функции ядра FreeBSD без использования медленных прерываний IDT',
      'Доступ к физическим окнам DMAP и регистрам IOMMU (G1–G3 в исследованиях devchmod)',
    ],
    blockersToNextStage: [
      'На 13.60 Byepervisor-Reborn требует цикла входа/выхода из Rest Mode (S3) и пока не перехватывает сам код Ring -1 гипервизора налету при холодном старте',
    ],
    technicalSnippet: `// Снятие защиты XOM на страницах .text ядра после S3 Resume (концепция Byepervisor):
for (uint64_t gpa = KERNEL_TEXT_GPA_START; gpa < KERNEL_TEXT_GPA_END; gpa += PAGE_SIZE_2MB) {
    uint64_t *npt_pte = walk_npt_tables(hv_ncr3_pa, gpa);
    // Включаем биты Read (бит 0) и Write (бит 1) рядом с Execute (бит 2)
    *npt_pte |= (NPT_PTE_READ | NPT_PTE_WRITE);
}
__invlpga_all(); // Сброс TLB гипервизора — теперь .text ядра читается и пишется напрямую!`,
    crossGenComparison: {
      ps3Lv0: 'Эксплойт метаданных lv1 гипервизора и дамп hv',
      ps4Orbis: 'Отсутствует (на PS4 ядро FreeBSD работает напрямую в Ring 0 без гипервизора Ring -1)',
      ps5Prospero1360: 'Тонкий гипервизор AMD SVM в Ring -1; обход XOM на 13.60 работает через баг S3 Rest Mode (Byepervisor-Reborn)',
    },
  },
  {
    id: 'stage-5-a53-io-mmu',
    stageNumber: 5,
    shortLabel: '05. A53 MP4 & IOMMU',
    codeName: 'STAGE_05_A53_COPROC_MMU',
    title: 'Сопроцессор ARM Cortex-A53 (MP4), Syshub TLB и нативный конвейер PPR/FPKG',
    privilegeRing: 'Co-Processor EL3 (ARM64 A53 / Syshub MMIO / IOMMU CB3)',
    completionPercent1360: 44,
    difficultyScore: 89,
    persistenceTier: 'Volatile (RAM / Tethered)',
    status1360: 'PARTIAL_RND',
    summary:
      'В архитектуре PS5 подсистема ввода-вывода, аппаратной декомпрессии Kraken/Zstd и проверки контейнеров опирается на сопроцессор ARM Cortex-A53 (MP4 в режиме EL3) и таблицы IOMMU. Сейчас монтирование работает через userland-эмулятор ampr-emu-ng (256 MiB PRX в TITAN-CORE), а зонд a53_mmu0.elf исследует открытие окна GDDR6 (0x80000000) для полного контроля над сопроцессором.',
    attackVectors: [
      'Зонд a53_mmu0.elf (devchmod, 17.11.2026): снятие полного дампа 768 KiB SRAM сопроцессора [0x00000..0xC0000) и анализ вектора сброса ttbr0_el3 = PA 0x88000000',
      'Исследование регистров маршрутизации Syshub TLB (MMIO @ 0x03230000) для снятия маскировки 0xFF при чтении кода A53 в GDDR6 (el3.loader @ 0x80000000, controller.dev @ 0x80200000)',
      'Кольцевой буфер команд IOMMU CB3 (0xffffffffd1792000, Gate G1 PASS на 13.60): перенаправление DMA-трансляции для обхода аппаратных фильтров памяти',
    ],
    hardwareMitigations: [
      'Аппаратный межсетевой экран памяти Syshub: запросы x86 CPU к физическим адресам прошивки A53 в GDDR6 возвращают 0xFF',
      'Проверка прав доступа в драйвере /dev/mp4/dump (возвращает EPERM даже для root без патча ядра)',
      'Отдельная таблица трансляции ARMv8 MMU в режиме EL3 (ttbr0_el3 = 0x88000000)',
    ],
    reverseEngineeringArtifacts: [
      {
        name: 'A53 Reset Stub & MMU Root',
        addressOrOffset: 'SRAM 0x2180–0x21e0 -> ttbr0_el3 = PA 0x88000000',
        role: 'Стартовый код ARM64 в SRAM, настраивающий корень таблиц страниц A53 в GDDR6',
      },
      {
        name: 'A53 Firmware Segments in GDDR6',
        addressOrOffset: 'el3.loader @ 0x80000000 / controller.dev @ 0x80200000',
        role: 'Основные модули прошивки сопроцессора (487 из 489 инструкций системных регистров MSR/MRS)',
      },
      {
        name: 'IOMMU Softc & CB3 Ring (Gate G1)',
        addressOrOffset: 'Softc: 0xffffff8007368000 / MMIO: 0xffff8860fdd80000 / CB3: 0xffffffffd1792000',
        role: 'Полностью активный на 13.60 канал управления таблицами ввода-вывода IOMMU',
      },
    ],
    keyPrimitives: [
      'Userland-обход сегодня: ampr-emu-ng beta 3ced5c0 (256 MiB PRX пул, 204–208 MiB кэша) + TITAN-CORE v1.0 Mod + ShadowMountPlus 1.7beta12',
      'R&D примитив G1–G4: чтение 768 KiB SRAM и перебор mem_types (0x020000, 0x020200, 0x020100) через Syshub TLB',
      'Целевой примитив (a53_mmu1): патч таблицы ttbr0_el3 для нативного приёма неподписанных контейнеров без PRX-эмуляции',
    ],
    blockersToNextStage: [
      'Окно GDDR6 @ 0x80000000 со стороны x86 пока закрыто фильтром Syshub (читается как 0xFF) — требуется подбор управляющего регистра в MMIO 0x03230000 или DMA-чтение через IOMMU',
    ],
    technicalSnippet: `// Верификация ARM64 вектора сброса A53 в SRAM (0x2180..0x21e0) из зонда a53_mmu0.elf:
// d2b10001  mov x1, #0x88000000
// d51e2001  msr ttbr0_el3, x1
uint32_t insn_mov = sram_read32(0x2184);
uint32_t insn_msr = sram_read32(0x2188);
if (insn_mov == 0xd2b10001 && insn_msr == 0xd51e2001) {
    log("A53 EL3 MMU root confirmed at PA 0x88000000 on FW 13.60");
    probe_syshub_tlb_window(0x03230000, 0x88000000);
}`,
    crossGenComparison: {
      ps3Lv0: 'Изолированные SPU (Synergistic Processing Units) с локальным хранилищем 256 КБ',
      ps4Orbis: 'Южный мост Aeolia/Belize ARM без выноса проверок AMPR в отдельный GDDR6 EL3 домен',
      ps5Prospero1360: 'Выделенный ARM Cortex-A53 (MP4 EL3) + аппаратный декомпрессор I/O и Syshub TLB фильтр',
    },
  },
  {
    id: 'stage-6-psp-samu',
    stageNumber: 6,
    shortLabel: '06. AMD-SP / PSP Crypto',
    codeName: 'STAGE_06_PSP_CCP_KEYRING',
    title: 'Процессор безопасности AMD-SP (PSP / SAMU) и аппаратное хранилище ключей CCP',
    privilegeRing: 'TrustZone / Secure Processor (AMD-SP & Cryptographic Co-Processor)',
    completionPercent1360: 24,
    difficultyScore: 95,
    persistenceTier: 'Volatile (RAM / Tethered)',
    status1360: 'LOCKED_TARGET',
    summary:
      'Все корневые криптографические операции PS5 (расшифровка системных SELF, проверка подписи обновлений PS5UPDATE.PUP, генерация ключей диска EAP) выполняются внутри изолированного процессора безопасности AMD-SP (PSP / бывший SAMU) и криптодвижка CCP. На взломанной 13.60 мы можем использовать PSP как «оракул» для дампа расшифрованных файлов, но сами корневые ключи остаются внутри аппаратного сейфа.',
    attackVectors: [
      'Использование PSP в роли дешифрующего оракула (Decryption Oracle) из Ring 0: отправка валидных заголовков через SceSblServiceMailbox для дампа всех системных модулей и игр 13.60',
      'Фаззинг команд почтового ящика x86 <-> AMD-SP и дескрипторов DMA в общей памяти SMN (System Management Network)',
      'Аппаратный анализ побочных каналов (Side-Channel / EMFI / Voltage Glitching APU) при проверке заголовков загрузчика',
    ],
    hardwareMitigations: [
      'Ключи верхнего уровня прошиты в аппаратных слотах CCP (Key Slots) и никогда не копируются в оперативную память x86',
      'Версионирование ключей по поколениям прошивок (Key Epochs): консоль на 13.60 не может расшифровать бинарники, подписанные новыми ключами 14.00+',
      'Аппаратная проверка целостности кода самого AMD-SP по цепочке от внутрикристального BootROM',
    ],
    reverseEngineeringArtifacts: [
      {
        name: 'SceSblServiceMailbox & CCP Queues',
        addressOrOffset: 'SMN / MMIO Mailbox Registers',
        role: 'Канал обмена криптографическими запросами между ядром FreeBSD и процессором безопасности AMD-SP',
      },
      {
        name: 'PUP / SELF Header Key Slots',
        addressOrOffset: 'Hardware Key Slots inside CCP',
        role: 'Аппаратные слоты AES/HMAC/RSA ключей проверки системных контейнеров',
      },
    ],
    keyPrimitives: [
      'Полный дамп и расшифровка всех системных библиотек (.sprx/.self) и ядер вплоть до FW 13.60 через системный оракул',
      'Создание Fake-Signed (FSELF) бинарников для работы в связке с kstuff-lite / Byepervisor',
      'Искомый примитив для CFW: исполнение кода внутри AMD-SP для отключения проверки подписи CoreOS / PUP при загрузке',
    ],
    blockersToNextStage: [
      'Без эксплойта внутри прошивки AMD-SP невозможно переподписать официальный файл обновления PS5UPDATE.PUP собственным ключом так, чтобы стоковая консоль приняла его без аппаратного мода',
    ],
    technicalSnippet: `// Использование AMD-SP (SAMU/PSP) как оракула дешифровки сегментов SELF на 13.60:
struct sbl_authmgr_verify_req req = {
    .function_id = SBL_FUNC_VERIFY_HEADER,
    .self_header_pa = pmap_kextract(dmabuf_va),
    .header_size = self_hdr_len,
};
// PSP проверяет подпись внутри CCP и открывает сессию расшифровки блоков в физическую память:
sceSblServiceMailboxSend(sbl_mailbox_handle, &req, &resp);`,
    crossGenComparison: {
      ps3Lv0: 'Фатальная ошибка Sony с константным случайным числом k в ECDSA (полное раскрытие приватного ключа metldr/lv0 на FW 3.55)',
      ps4Orbis: 'SAMU использовался как оракул дешифровки; приватные ключи подписи Sony так и не утекли публично',
      ps5Prospero1360: 'Обновлённый AMD-SP (PSP) с аппаратным CCP; работает как оракул до 13.60 включительно',
    },
  },
  {
    id: 'stage-7-emc-bootrom',
    stageNumber: 7,
    shortLabel: '07. EMC & Coldboot',
    codeName: 'STAGE_07_EMC_SOUTHBRIDGE_BOOT',
    title: 'Южный мост (EMC / Titania), Syscon, NOR/SSD Flash и перехват Coldboot',
    privilegeRing: 'Hardware Root / Early Boot (EMC / Syscon / SPI NOR / CoreOS)',
    completionPercent1360: 18,
    difficultyScore: 97,
    persistenceTier: 'Semi-Tethered (Auto-Trigger)',
    status1360: 'LOCKED_TARGET',
    summary:
      'Первая ступень включения консоли: контроллер Syscon и чип южного моста Titania (EMC) инициализируют питание, считывают конфигурацию из SPI NOR флеш-памяти и запускают загрузчик AMD-SP, который поднимает раздел CoreOS с распаянного SSD. Уязвимость на этом этапе даёт Coldboot-постоянство (взлом срабатывает сам при нажатии кнопки включения).',
    attackVectors: [
      'Аппаратный дамп и модификация SPI NOR флеш-памяти (2 МБ) + диагностика через UART-порт EMC/Syscon',
      'Исследование переключения слотов CoreOS (A/B) для аппаратного отката прошивки (Revert мод при наличии бэкапа)',
      'Поиск ошибок парсинга таблиц разделов EMC / заголовков образов в раннем загрузчике (аналог BootROM / TOCTOU атак при чтении NAND/NOR)',
    ],
    hardwareMitigations: [
      'Аппаратные анти-откатные предохранители (eFuses / Anti-Rollback счетчики в Syscon и APU)',
      'Посекторное аппаратное шифрование контроллера встроенного SSD (ключ привязан к уникальному Per-Console ID)',
      'Криптографическая привязка хэшей слотов CoreOS A/B в защищённой области',
    ],
    reverseEngineeringArtifacts: [
      {
        name: 'SPI NOR Flash & EMC UART',
        addressOrOffset: '2 MiB Serial Flash (флаги IDU/Kiosk, UART Enable, MAC, Серийный номер)',
        role: 'Хранилище низкоуровневых флагов конфигурации платформы и кодов ошибок питания/загрузки',
      },
      {
        name: 'CoreOS Slots (Slot A / Slot B)',
        addressOrOffset: '/dev/da0x* (Зашифрованные системные разделы SSD)',
        role: 'Двойной банк хранения образа ядра FreeBSD, гипервизора и начального рамдиска',
      },
    ],
    keyPrimitives: [
      'Активация постоянного вывода логов ядра и загрузчика по аппаратному UART через патч NOR/Syscon',
      'Аппаратный даунгрейд (Slot Revert) на предыдущий слот прошивки (если например 13.60 была случайно обновлена на 14.00 в один шаг)',
      'Искомый примитив для Untethered CFW: модификация загрузочной цепочки EMC/PSP для старта патченного слота CoreOS без проверки подписи',
    ],
    blockersToNextStage: [
      'Вся цепочка загрузки (BootROM -> EMC -> PSP -> Hypervisor -> Kernel) верифицируется аппаратно до старта любого пользовательского кода',
    ],
    technicalSnippet: `// Схема верификации раннего старта PS5 (Coldboot Chain of Trust):
// [1. Syscon / Titania EMC] --(SPI NOR Проверка)-->
// [2. AMD-SP On-Chip BootROM] --(RSA-4096 / AES-GCM)-->
// [3. CoreOS Slot A/B: Hypervisor (Ring -1)] --(NPT Setup + XOM Lock)-->
// [4. FreeBSD 11 Kernel (Ring 0)] --(SceSblAuthMgr)-->
// [5. SceShellCore & SceShellUI (Ring 3)]`,
    crossGenComparison: {
      ps3Lv0: 'Полный взлом цепочки lv0 (на консолях до CECH-25xx с metldr1) позволил ставить постоянную CFW поверх 3.55',
      ps4Orbis: 'Доступен аппаратный Syscon/NOR Revert на предыдущий слот, но холодного BootROM-эксплойта нет',
      ps5Prospero1360: 'Аналогичная PS4 двухслотовая архитектура CoreOS A/B + защищённый контроллер Titania EMC',
    },
  },
  {
    id: 'stage-8-untethered-cfw',
    stageNumber: 8,
    shortLabel: '08. Endgame CFW',
    codeName: 'STAGE_08_PROSPERO_CFW_ENDGAME',
    title: 'Финальная Точка: Кастомная Прошивка (Prospero CFW) и Полный Untethered Взлом',
    privilegeRing: 'Full System Control (Ring -1 + Ring 0 + Co-Proc EL3 + ShellUI)',
    completionPercent1360: 31,
    difficultyScore: 99,
    persistenceTier: 'Untethered Coldboot (Full CFW)',
    status1360: 'ENDGAME_CFW',
    summary:
      'Абсолютная вершина реверс-инжиниринга консоли: объединение всех предыдущих 7 этапов в единую кастомную прошивку (Prospero CFW). Консоль загружается сразу с отключённым XOM в гипервизоре, встроенным в ядро патчем подписи FSELF/FPKG, разблокированным сопроцессором A53, меню *Debug Settings в ShellUI и фоновым демоном TITAN-CORE без необходимости запускать эксплойт после выключения.',
    attackVectors: [
      'Вариант А (True Untethered Coldboot CFW): перепак CoreOS и разделов system/system_ex при наличии эксплойта ранней загрузки (Этапы 6–7) или аппаратного модчипа инициализации',
      'Вариант Б (Semi-Untethered / Warm-Boot CFW Environment на 13.60 уже сегодня): автозапуск Y2JB (4 сек) -> Relapse -> Byepervisor S3 Resume -> постоянный в течение сессии пропатченный стек ядра + TITAN-CORE v1.0 Mod',
      'Интеграция кастомных плагинов в SceShellCore и SceShellUI (нативный установщик пакетов, оверлей телеметрии температур/FPS, блокировщик обновлений Sony)',
    ],
    hardwareMitigations: [
      'Требует одновременного удержания контроля над 4 доменами: AMD-SP (крипто), Ring -1 (гипервизор NPT), Ring 0 (ядро FreeBSD) и EL3 (сопроцессор A53)',
      'Защита целостности системных разделов /system и /system_ex (Read-Only крипто-образы с проверкой хеш-дерева)',
    ],
    reverseEngineeringArtifacts: [
      {
        name: 'CoreOS Patched Image (hv.self + kernel.self)',
        addressOrOffset: '/dev/da0x4x (CoreOS Slot A)',
        role: 'Образ ядра и гипервизора с предпропатченными флагами NPT RWX, ucred, sysent и отключённым kCFI',
      },
      {
        name: 'SceShellCore & SceShellUI CFW Hooks',
        addressOrOffset: '/system/vsh/app/NPXS40002 & SceShellCore',
        role: 'Постоянная регистрация кастомных TitleID, меню Debug Settings и автостарт TITAN-CORE / ShadowMountPlus',
      },
    ],
    keyPrimitives: [
      'Мгновенная готовность (0 секунд на ручной запуск эксплойта после включения консоли)',
      'Нативная установка и запуск любых дампов (.pkg, .ffpkg, .zst, распакованных папок), DLC и бэкпортов с прошивок 14.xx',
      'Безопасный Dual-Boot между игровой ОС Prospero CFW и Linux (SteamOS / Fedora с драйвером Mesa RADV Vulkan на GPU RDNA2)',
    ],
    blockersToNextStage: [
      'Финальный этап цепочки: для перехода от текущего Semi-Tethered/S3 стека 13.60 к холодному Untethered CFW требуется закрыть этапы 05 (A53 GDDR6), 06 (AMD-SP подпись) и 07 (EMC Coldboot)',
    ],
    technicalSnippet: `# Конфигурация целевого образа Prospero-CFW 13.60 (manifest.cfw.toml):
[cfw.coreos]
base_firmware = "13.60 (0x13600007)"
hypervisor_npt_xom = "disabled_at_boot"   # R/W/X для .text ядра с 0-й секунды
kernel_patches = ["fself_auth_bypass", "fpkg_ppr_native", "uart_verbose_enable", "dev_mp4_allow"]
a53_coproc = "syshub_tlb_unlocked"        # Открытое окно 0x80000000 + нативный AMPR

[cfw.userland]
shellcore_patches = ["debug_settings_menu", "disable_pup_updates", "permanent_title_db"]
autoload_daemons = ["/system_ex/cfw/bin/elfldr.elf", "/system_ex/cfw/bin/titan-core-mod.elf"]`,
    crossGenComparison: {
      ps3Lv0: 'Эталон: Rebug / Evilnat CFW (полный холодный старт с 0-й секунды благодаря ключам lv0)',
      ps4Orbis: 'Tethered / Auto-GoldHEN (через ESP32-S2 / PPPwn / BD-J + хранение состояния в Rest Mode)',
      ps5Prospero1360: 'Гибридный стек 13.60 (Y2JB 4с + Relapse + Byepervisor S3 + TITAN-CORE Mod) как предтеча полной CFW',
    },
  },
];

export const CFW_COREOS_PARTITIONS: readonly CfwCoreOsPartitionSpec[] = [
  {
    id: 'part-nor-syscon',
    partitionName: 'SPI NOR Flash & Syscon NVS',
    targetPathOrOffset: 'SPI 0x000000–0x1FFFFF (2 MiB)',
    cryptoLayer: 'Per-Console HMAC + Syscon Counter',
    stockBehavior: 'Хранит флаги UART=off, активный слот CoreOS (A/B) и счётчик анти-отката',
    cfwPatchAction: 'Включение аппаратного UART, фиксация активного слота 13.60 и блокировка инкремента eFuse при тестах',
    requiredStageId: 'stage-7-emc-bootrom',
  },
  {
    id: 'part-coreos-hv',
    partitionName: 'CoreOS :: Hypervisor (Ring -1)',
    targetPathOrOffset: '/dev/da0x4a (offset 0x00100000)',
    cryptoLayer: 'AMD-SP RSA-4096 + AES-GCM (CCP Slot)',
    stockBehavior: 'Настраивает таблицы NPT с битом Execute-Only (XOM) на весь сегмент .text ядра FreeBSD',
    cfwPatchAction: 'Снятие XOM в первичной инициализации NPT (Read/Write/Execute на код ядра без необходимости S3 Rest Mode)',
    requiredStageId: 'stage-4-hypervisor',
  },
  {
    id: 'part-coreos-kernel',
    partitionName: 'CoreOS :: FreeBSD 11 Kernel (Ring 0)',
    targetPathOrOffset: 'VA 0xffffffffce240000 (PA 0x0e241000)',
    cryptoLayer: 'Верифицируется гипервизором и AMD-SP при старте',
    stockBehavior: 'Проверяет подписи SELF через SceSblAuthMgr, изолирует процессы в песочнице и блокирует /dev/mp4/dump',
    cfwPatchAction: 'Встроенный в .text патч SceSblAuthMgr (нативный FSELF), отключение kCFI паник и открытие /dev/mp4/dump',
    requiredStageId: 'stage-3-kcfi-exec',
  },
  {
    id: 'part-a53-fw',
    partitionName: 'A53 MP4 Firmware & Syshub TLB',
    targetPathOrOffset: 'GDDR6 PA 0x80000000 / MMIO 0x03230000',
    cryptoLayer: 'ARMv8 EL3 MMU (ttbr0_el3 = 0x88000000)',
    stockBehavior: 'Блокирует чтение памяти сопроцессора со стороны x86 (0xFF) и проверяет крипто-метаданные контейнеров',
    cfwPatchAction: 'Открытие окна Syshub TLB и нативный приём перепакованных FPKG / .zst контейнеров на уровне контроллера',
    requiredStageId: 'stage-5-a53-io-mmu',
  },
  {
    id: 'part-system-ex',
    partitionName: '/system & /system_ex (VSH / ShellUI)',
    targetPathOrOffset: '/system/vsh/SceShellCore.self & NPXS40002',
    cryptoLayer: 'Read-Only mfs/ufs2 с проверкой хэшей',
    stockBehavior: 'Скрывает меню отладки, требует PSN-лицензии для DLC и скачивает обновления 14.22',
    cfwPatchAction: 'UnionFS/CoreOS инжект *Debug Settings, блокировка доменов обновлений Sony и автозапуск TITAN-CORE Mod v2.1',
    requiredStageId: 'stage-8-untethered-cfw',
  },
];
