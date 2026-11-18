import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { TitanCoreDebugBundle } from '../mounters/titanCoreDebugCollector';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
] as const;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleDriveSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Drive sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getDriveAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleDriveLogout = async (): Promise<void> => {
  await auth.signOut();
  cachedAccessToken = null;
};

export interface DriveReportFileItem {
  id: string;
  name: string;
  createdTime?: string;
  size?: string;
  webViewLink?: string;
}

export interface SanitizedCrashReportPayload {
  reportId: string;
  createdAtIso: string;
  forkVersion: string;
  firmware: string;
  amprVersion: string;
  playGoStubActive: boolean;
  smpVariant: string;
  primaryTitleId: string;
  highestErrno: number;
  errorCount: number;
  rssMiB: number;
  flexibleBudgetMiB: number;
  unionFsCollisionCount: number;
  sanitizedBundle: TitanCoreDebugBundle;
}

export function sanitizeDebugBundleForTelemetry(
  bundle: TitanCoreDebugBundle,
  extraMeta?: {
    playGoStubActive?: boolean;
    smpVariant?: string;
  }
): SanitizedCrashReportPayload {
  const cleanMounts = bundle.mounts.map((m) => ({
    ...m,
    from: m.from.replace(/([0-9]{1,3}\.){3}[0-9]{1,3}/g, '<REDACTED_IP>'),
  }));
  const cleanErrors = bundle.errors.map((e) => ({
    ...e,
    message: e.message.replace(/([0-9]{1,3}\.){3}[0-9]{1,3}/g, '<REDACTED_IP>'),
  }));

  const primaryTitleId =
    cleanErrors[cleanErrors.length - 1]?.titleId ?? 'SYSTEM';
  const highestErrno = cleanErrors.reduce(
    (acc, item) => Math.max(acc, item.errno),
    0
  );

  const commonLibTargets = new Map<string, number>();
  for (const m of cleanMounts) {
    if (m.fstype === 'unionfs' && m.on.includes('common/lib')) {
      commonLibTargets.set(m.on, (commonLibTargets.get(m.on) ?? 0) + 1);
    }
  }
  const unionFsCollisionCount = [...commonLibTargets.values()].filter(
    (c) => c > 1
  ).length;

  const nowIso = new Date().toISOString();
  const shortStamp = nowIso.replace(/[-:T.Z]/g, '').slice(0, 14);
  const reportId = `titan-report-${shortStamp}-${primaryTitleId}-errno${highestErrno}`;

  return {
    reportId,
    createdAtIso: nowIso,
    forkVersion: bundle.version || '1.0.3-mod-v2.3',
    firmware: bundle.firmware || '13.60',
    amprVersion: bundle.amprVersion || '0.4.1-3ced5c0',
    playGoStubActive: extraMeta?.playGoStubActive ?? true,
    smpVariant: extraMeta?.smpVariant ?? '1.7beta12-titan-isolated4',
    primaryTitleId,
    highestErrno,
    errorCount: cleanErrors.length,
    rssMiB: bundle.memory.rssMiB,
    flexibleBudgetMiB: bundle.memory.flexibleBudgetMiB,
    unionFsCollisionCount,
    sanitizedBundle: {
      ...bundle,
      mounts: cleanMounts,
      errors: cleanErrors,
    },
  };
}

export async function listDriveErrorReports(
  accessToken: string
): Promise<DriveReportFileItem[]> {
  const q = encodeURIComponent(
    "trashed = false and name contains 'titan-report-' and mimeType = 'application/json'"
  );
  const fields = encodeURIComponent(
    'files(id,name,createdTime,size,webViewLink)'
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=createdTime desc&pageSize=15`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive list failed (${res.status}): ${errText}`);
  }
  const data = (await res.json()) as { files?: DriveReportFileItem[] };
  return Array.isArray(data.files) ? data.files : [];
}

export async function uploadErrorReportToDrive(
  accessToken: string,
  payload: SanitizedCrashReportPayload
): Promise<DriveReportFileItem> {
  const filename = `${payload.reportId}.json`;
  const metadata = {
    name: filename,
    mimeType: 'application/json',
    description: `TITAN-CORE Mod v2.3 PS5 Error Report (${payload.primaryTitleId}, errno=${payload.highestErrno})`,
  };

  const boundary = '-------titan_drive_multipart_boundary_v23';
  const bodyContent =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(payload, null, 2) +
    `\r\n--${boundary}--`;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,size,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: bodyContent,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive upload failed (${res.status}): ${errText}`);
  }

  return (await res.json()) as DriveReportFileItem;
}

export async function deleteDriveErrorReport(
  accessToken: string,
  fileId: string
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive delete failed (${res.status}): ${errText}`);
  }
}

export const GOOGLE_APPS_SCRIPT_WEBHOOK_TEMPLATE = `/**
 * TITAN-CORE Mod v2.3 — Autonomous Google Drive & Google Sheets Error Report Collector
 * Deploy in script.google.com -> Deploy -> New deployment -> Web app (Execute as: Me, Who has access: Anyone)
 */
const TARGET_FOLDER_NAME = 'TITAN-CORE-PS5-Crash-Reports';

function getOrCreateReportFolder() {
  const folders = DriveApp.getFoldersByName(TARGET_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(TARGET_FOLDER_NAME);
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const data = JSON.parse(raw);
    const folder = getOrCreateReportFolder();
    const reportId = data.reportId || ('titan-report-' + new Date().getTime());
    const fileName = reportId + '.json';
    const file = folder.createFile(fileName, JSON.stringify(data, null, 2), MimeType.PLAIN_TEXT);

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        reportId: reportId,
        fileId: file.getId(),
        fileUrl: file.getUrl()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
