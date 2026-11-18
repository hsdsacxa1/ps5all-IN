import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Check,
  CloudUpload,
  Code2,
  Copy,
  ExternalLink,
  FolderGit2,
  LogOut,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  SAMPLE_TITAN_DEBUG_BUNDLE,
  TitanCoreDebugBundle,
} from '../../mounters/titanCoreDebugCollector';
import {
  deleteDriveErrorReport,
  DriveReportFileItem,
  GOOGLE_APPS_SCRIPT_WEBHOOK_TEMPLATE,
  googleDriveLogout,
  googleDriveSignIn,
  initDriveAuth,
  listDriveErrorReports,
  sanitizeDebugBundleForTelemetry,
  uploadErrorReportToDrive,
} from '../../services/googleDriveTelemetry';

interface TitanGoogleDriveTelemetryCardProps {
  readonly currentBundleJson?: string;
}

export const TitanGoogleDriveTelemetryCard: React.FC<
  TitanGoogleDriveTelemetryCardProps
> = ({ currentBundleJson }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const [reports, setReports] = useState<DriveReportFileItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showWebhookCode, setShowWebhookCode] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [webhookUrlInput, setWebhookUrlInput] = useState<string>(
    'https://script.google.com/macros/s/AKfycbx_TITAN_MOD_V23_CRASH_COLLECTOR/exec'
  );
  const [isTestingWebhook, setIsTestingWebhook] = useState<boolean>(false);

  // Mandatory destructive operation confirmation state
  const [pendingDeleteFile, setPendingDeleteFile] =
    useState<DriveReportFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    const unsub = initDriveAuth(
      (authedUser, token) => {
        setUser(authedUser);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsub();
  }, []);

  const refreshDriveReports = async (tokenToUse?: string | null) => {
    const token = tokenToUse ?? accessToken;
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setIsLoadingList(true);
    setErrorMessage(null);
    try {
      const files = await listDriveErrorReports(token);
      setReports(files);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Не удалось загрузить список репортов с Google Диска'
      );
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const result = await googleDriveSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
        setStatusMessage(`Подключён Google Диск: ${result.user.email ?? result.user.displayName}`);
        await refreshDriveReports(result.accessToken);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Ошибка входа через Google OAuth'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await googleDriveLogout();
    setUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
    setReports([]);
    setStatusMessage('Сессия Google Drive отключена');
  };

  const resolveCurrentBundle = (): TitanCoreDebugBundle => {
    if (currentBundleJson) {
      try {
        const parsed = JSON.parse(currentBundleJson) as TitanCoreDebugBundle;
        if (parsed && parsed.memory && Array.isArray(parsed.errors)) {
          return parsed;
        }
      } catch {
        // Fallback to sample bundle
      }
    }
    return SAMPLE_TITAN_DEBUG_BUNDLE;
  };

  const handleUploadReportToDrive = async () => {
    if (!accessToken) {
      setNeedsAuth(true);
      return;
    }
    setIsUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const rawBundle = resolveCurrentBundle();
      const sanitized = sanitizeDebugBundleForTelemetry(rawBundle, {
        playGoStubActive: true,
        smpVariant: '1.7beta12-titan-isolated4',
      });
      const created = await uploadErrorReportToDrive(accessToken, sanitized);
      setStatusMessage(
        `Репорт ${created.name} успешно сохранён на ваш Google Диск (ID: ${created.id.slice(0, 10)}…)`
      );
      await refreshDriveReports(accessToken);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Ошибка выгрузки репорта на Google Диск'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const confirmAndDeleteReport = async () => {
    if (!pendingDeleteFile || !accessToken) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteDriveErrorReport(accessToken, pendingDeleteFile.id);
      setReports((prev) => prev.filter((f) => f.id !== pendingDeleteFile.id));
      setStatusMessage(`Удалён репорт ${pendingDeleteFile.name} с Google Диска`);
      setPendingDeleteFile(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Не удалось удалить файл с Google Диска'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSimulateWebhookDryRun = () => {
    setIsTestingWebhook(true);
    setErrorMessage(null);
    const sanitized = sanitizeDebugBundleForTelemetry(resolveCurrentBundle(), {
      playGoStubActive: true,
      smpVariant: '1.7beta12-titan-isolated4',
    });
    setTimeout(() => {
      setIsTestingWebhook(false);
      setStatusMessage(
        `Сформирован и проверен пакет ${sanitized.reportId}.json (${sanitized.errorCount} errno, RSS ${sanitized.rssMiB} MiB, PlayGo=ON, SMP=${sanitized.smpVariant}) для отправки на ${webhookUrlInput.slice(0, 42)}…`
      );
    }, 250);
  };

  const previewPayload = sanitizeDebugBundleForTelemetry(resolveCurrentBundle(), {
    playGoStubActive: true,
    smpVariant: '1.7beta12-titan-isolated4',
  });

  return (
    <div className="p-4 rounded-xl border-2 border-blue-500/35 bg-blue-500/5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-blue-500/20">
        <div className="space-y-1 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400">
            <CloudUpload className="w-4 h-4 shrink-0" />
            <span>MOD v2.3 · АВТО-СБОР РЕПОРТОВ С ОШИБКАМИ НА GOOGLE ДИСК</span>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Облачная телеметрия ошибок TITAN-CORE (Google Drive OAuth 2.0 + Autonomous Apps Script Webhook)
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Два режима доставки крэш-бандлов (<code className="font-mono">last-crash-bundle.json</code> + 256-slot <code className="font-mono">errno</code> + <code className="font-mono">KERN_PROC_VMMAP</code>):
            <strong> 1) Прямая запись в ваш Google Диск</strong> через официальный OAuth 2.0 (<code className="font-mono">drive.file</code>) прямо из Workbench;
            <strong> 2) Бессерверный вебхук Google Apps Script</strong> (без секретных ключей внутри <code className="font-mono">.elf</code> — консоль или браузер телефона на <code className="font-mono">:8097</code> автоматически пересылает JSON-репорт в вашу папку <code className="font-mono">TITAN-CORE-PS5-Crash-Reports</code>).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {needsAuth ? (
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              aria-label="Sign in with Google"
              className="gsi-material-button inline-flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="gsi-material-button-state" />
              <div className="gsi-material-button-content-wrapper flex items-center gap-2">
                <div className="gsi-material-button-icon w-4 h-4 shrink-0">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="w-4 h-4 block"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isLoggingIn ? 'Подключение Google Drive…' : 'Sign in with Google'}
                </span>
              </div>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleUploadReportToDrive}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>
                  {isUploading ? 'Выгрузка на Google Диск…' : 'Сохранить текущий репорт на Google Диск'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => refreshDriveReports()}
                disabled={isLoadingList}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin' : ''}`} />
                <span>Обновить список</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Выйти ({user?.email ?? 'Google'})</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowWebhookCode((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-blue-500/35 bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>
              {showWebhookCode ? 'Скрыть Apps Script Webhook' : 'Код Google Apps Script (авто-сбор с PS5)'}
            </span>
          </button>
        </div>
      </div>

      {/* Sanitized Crash Report Telemetry Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-[10px] font-mono text-slate-500 uppercase">ID пакета репорта</div>
          <div className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 truncate">
            {previewPayload.reportId}.json
          </div>
        </div>
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Стек Mod v2.3</div>
          <div className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-300 truncate">
            AMPR {previewPayload.amprVersion} · PlayGo 0.6
          </div>
        </div>
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Активный Title / errno</div>
          <div className="text-xs font-mono font-semibold text-amber-700 dark:text-amber-300">
            {previewPayload.primaryTitleId} · errno={previewPayload.highestErrno} ({previewPayload.errorCount} зап.)
          </div>
        </div>
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Санитизация приватности</div>
          <div className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-300">
            IPv4 -&gt; &lt;REDACTED_IP&gt; (Без токенов в ELF)
          </div>
        </div>
      </div>

      {/* Browser Relay / Webhook Configurator */}
      <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="titan-gdrive-webhook-url"
            className="text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            Webhook URL для авто-пересылки репортов из веб-панели PS5 (:8097 Browser-Relay -&gt; Google Диск):
          </label>
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
            Работает даже при оффлайн-DNS 127.0.0.2 на самой PS5
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="titan-gdrive-webhook-url"
            type="url"
            value={webhookUrlInput}
            onChange={(e) => setWebhookUrlInput(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="flex-1 min-w-[260px] px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={handleSimulateWebhookDryRun}
            disabled={isTestingWebhook}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>{isTestingWebhook ? 'Проверка…' : 'Проверить формирование бандла'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-2.5 rounded-lg border border-emerald-500/35 bg-emerald-500/10 text-xs font-mono text-emerald-800 dark:text-emerald-200">
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-2.5 rounded-lg border border-rose-500/35 bg-rose-500/10 text-xs font-mono text-rose-800 dark:text-rose-200">
          {errorMessage}
        </div>
      )}

      {/* Mandatory Confirmation Dialog for Destructive Drive File Deletion */}
      {pendingDeleteFile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-drive-delete-title"
          className="p-4 rounded-xl border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/60 space-y-3"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-200">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span id="confirm-drive-delete-title">
              Подтвердите удаление репорта с Google Диска
            </span>
          </div>
          <p className="text-xs text-rose-700 dark:text-rose-300">
            Вы действительно хотите безвозвратно удалить файл{' '}
            <code className="font-mono font-bold">{pendingDeleteFile.name}</code> (ID:{' '}
            <code className="font-mono">{pendingDeleteFile.id}</code>) из вашего Google Диска?
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={confirmAndDeleteReport}
              disabled={isDeleting}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-500"
            >
              {isDeleting ? 'Удаление…' : 'Подтвердить удаление'}
            </button>
            <button
              type="button"
              onClick={() => setPendingDeleteFile(null)}
              disabled={isDeleting}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Uploaded Google Drive Reports List */}
      {!needsAuth && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Сохранённые репорты TITAN-CORE на вашем Google Диске ({reports.length}):
          </div>
          {reports.length === 0 ? (
            <div className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-500">
              На Google Диске пока нет сохранённых файлов <code className="font-mono">titan-report-*.json</code>. Нажмите «Сохранить текущий репорт на Google Диск» выше.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {reports.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {file.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {file.createdTime ? new Date(file.createdTime).toLocaleString() : 'Только что'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${file.name} in Google Drive`}
                        className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setPendingDeleteFile(file)}
                      aria-label={`Delete ${file.name} from Google Drive`}
                      className="p-1.5 rounded border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Autonomous Google Apps Script Webhook Code */}
      {showWebhookCode && (
        <div className="space-y-2 pt-2 border-t border-blue-500/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
              Разверните в script.google.com (Web App -&gt; Who has access: Anyone) для приёма репортов со всех PS5:
            </span>
            <button
              type="button"
              onClick={() =>
                handleCopy(GOOGLE_APPS_SCRIPT_WEBHOOK_TEMPLATE, 'apps-script')
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              {copiedKey === 'apps-script' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>
                {copiedKey === 'apps-script' ? 'Скопировано' : 'Копировать Google Apps Script'}
              </span>
            </button>
          </div>
          <pre className="p-3 rounded-lg bg-slate-950 text-slate-100 border border-slate-800 text-[11px] font-mono overflow-x-auto leading-relaxed">
            <code>{GOOGLE_APPS_SCRIPT_WEBHOOK_TEMPLATE}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
