import { CriticalPitfallSpec } from '../types/ps5';

export const CRITICAL_PITFALLS_1360: CriticalPitfallSpec[] = [
  {
    id: 'null-import-statvfs',
    number: '01',
    title: 'Запрещённые импорты statvfs() / statfs() в Title-процессах (eboot.bin)',
    affectedTarget: 'Native PS5 App & Hybrid App (eboot.bin)',
    symptom: 'Мгновенный краш приложения при старте или вызове функции (Null Import Dereference)',
    rootCause: 'Символы statvfs() и statfs() отсутствуют в пользовательской libkernel для Title-процессов — они экспортируются только в системной libkernel_sys.so.',
    mandatoryFix: 'Контролировать место на диске через обработку errno == ENOSPC при записи, либо делегировать вызов statfs() в фоновый helper.elf на порт 9021. Добавить check-title-imports.py в сборку.',
    codeSnippetBad: `// ❌ CRASH: Вызывает null import в eboot.bin (Title process)
struct statvfs buf;
if (statvfs("/data", &buf) == 0) {
    uint64_t freeBytes = buf.f_bavail * buf.f_frsize;
}`,
    codeSnippetGood: `// ✅ SAFE: Обработка ENOSPC при записи без запрещённых импортов
ssize_t written = write(fd, buffer, size);
if (written < 0 && errno == ENOSPC) {
    log_error("Disk full on target partition");
    return false;
}`,
  },
  {
    id: 'elevated-tls-restriction',
    number: '02',
    title: 'Отказ системного TLS при повышенных привилегиях',
    affectedTarget: 'Native PS5 App с выходом из песочницы для доступа к /data',
    symptom: 'Ошибки инициализации SSL/HTTPS в libSceSsl / платформенном сетевом стеке',
    rootCause: 'Когда нативное приложение повышает привилегии (jailbreak/root cred) для прямой записи в /data, системные демоны PS5 отклоняют запросы к платформенному TLS.',
    mandatoryFix: 'Статически линковать собственный TLS-стек (mbedTLS 3.6.7 + libcurl) и указывать путь к системному хранилищу корневых сертификатов /system/common/cert/CA_LIST.',
    codeSnippetBad: `// ❌ FAILS: Использование системного SceSsl после эскалации привилегий
sceSslInit(poolSize); // Возвращает ошибку привилегий после побега из песочницы`,
    codeSnippetGood: `// ✅ SAFE: Статический libcurl + mbedTLS 3.6.7 с системным CA_LIST
curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 1L);
curl_easy_setopt(curl, CURLOPT_CAINFO, "/system/common/cert/CA_LIST");`,
  },
  {
    id: 'sandbox-data-fallback',
    number: '03',
    title: 'Песочница файловой системы (/app0 vs /data vs /download0)',
    affectedTarget: 'Все Native PS5 Apps (особенно под OnionHEN v0.9.0)',
    symptom: 'EACCES / EPERM при попытке сохранить конфиг или базу данных в /data/<app_name>/',
    rootCause: 'Каталог /app0/ всегда read-only. Под некоторыми HEN-сборками (например, OnionHEN) запись в /data блокируется песочницей, если Title ID приложения не внесён в whitelist.',
    mandatoryFix: 'Использовать /data/<app_name>/ как первичный путь, но ОБЯЗАТЕЛЬНО реализовать автоматический fallback в собственную песочницу приложения /download0/.',
    codeSnippetBad: `// ❌ FRAGILE: Жёсткая привязка к /data без fallback или попытка записи в /app0
FILE* fp = fopen("/app0/assets/config.ini", "w"); // Всегда завершится ошибкой (read-only)`,
    codeSnippetGood: `// ✅ RESILIENT: Автоматический fallback из /data/<app> в /download0
const char* resolve_writable_dir(const char* appName) {
    static char path[256];
    snprintf(path, sizeof(path), "/data/%s", appName);
    if (mkdir(path, 0777) == 0 || errno == EEXIST) {
        if (access(path, W_OK) == 0) return path;
    }
    return "/download0"; // Гарантированно доступная песочница Title
}`,
  },
  {
    id: 'memory-budget-param-json',
    number: '04',
    title: 'Бюджет памяти (1.6 ГБ лимит ELF vs Direct/Flexible баланс в param.json)',
    affectedTarget: 'ELF Payloads и sce_sys/param.json нативных приложений',
    symptom: 'OOM-убийство ELF-демона со стороны ShellUI или нехватка памяти под текстуры/Vulkan буферы в Native App',
    rootCause: 'ELF Payload делит пул памяти с SceShellUI (~1.6 ГБ макс). В Native App гибкая память (Flexible memory) по умолчанию равна 448 MiB; завышение Flexible до 1 GiB отнимает 576 MiB у Direct memory.',
    mandatoryFix: 'Тяжёлые приложения (>1.6 ГБ) делать строго как Native App. В sce_sys/param.json не завышать flexibleMemorySize без реального профилирования.',
    codeSnippetBad: `// ❌ BAD param.json: Запрос 1024 MiB Flexible отнимает 576 MiB у Direct Memory (GPU/JIT)
"flexibleMemorySize": 1073741824`,
    codeSnippetGood: `// ✅ OPTIMAL param.json: Стандартный баланс 448 MiB Flexible, максимум Direct Memory
"flexibleMemorySize": 469762048`,
  },
  {
    id: 'rest-mode-s3-lifecycle',
    number: '05',
    title: 'Выход из Rest Mode (S3 Resume) и зависание системных диалогов',
    affectedTarget: 'Фоновые ELF-серверы и интерактивные Native Apps',
    symptom: 'Мёртвые слушающие сокеты после сна консоли или бесконечное ожидание системного коллбэка',
    rootCause: 'При переходе в Rest Mode сетевой стек сбрасывает дескрипторы. В Native App игнорирование нереализованных системных диалогов оставляет SceShellCore в ожидании ответа.',
    mandatoryFix: 'В демонах проверять `errno` на `ENETDOWN`/`ECONNABORTED` и переоткрывать сокет после S3 Resume. Нереализованные системные диалоги обязаны явно возвращать `false`.',
    codeSnippetBad: `// ❌ HANGS: Пустой обработчик системного диалога
void onSystemDialogEvent(int eventId) {
    // Игнорирование вызова приводит к зависанию очереди коллбэков
}`,
    codeSnippetGood: `// ✅ SAFE: Явный возврат отказа (false) для неподдерживаемых диалогов
bool onUnhandledSystemDialog(int dialogType) {
    return false; // Немедленно освобождает ожидание ShellUI
}`,
  },
  {
    id: 'icon0-alpha-and-gpl',
    number: '06',
    title: 'Формат sce_sys/icon0.png (512x512 RGB без Alpha) и лицензия GPL-3.0',
    affectedTarget: 'Релизная упаковка Native App и открытый/закрытый исходный код',
    symptom: 'Битая/чёрная иконка на главном экране PS5 или нарушение лицензии boilerplate',
    rootCause: 'SceShellUI требует для icon0.png строго размер 512x512 и 24-bit RGB БЕЗ альфа-канала (RGBA ломает рендеринг). Код drakmor/ps5-native-app-boilerplate лицензирован под GPL-3.0-or-later.',
    mandatoryFix: 'Конвертировать icon0.png в RGB (convert icon.png -resize 512x512 -alpha off icon0.png). Для open-source проектов прикладывать каталог licenses/ с текстом GPL-3.0.',
    codeSnippetBad: `# ❌ BROKEN ICON: Сохранение PNG с 32-bit RGBA (альфа-каналом)
ffmpeg -i logo.png -s 512x512 sce_sys/icon0.png`,
    codeSnippetGood: `# ✅ VALID ICON: Строго 512x512 24-bit RGB без альфа-канала
python3 scripts/generate-icon0.py --input logo.png --output sce_sys/icon0.png --rgb-no-alpha`,
  },
];
