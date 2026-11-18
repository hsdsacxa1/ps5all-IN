export type FirmwareOffsetProfileId =
  | 'fw-1360'
  | 'fw-1320'
  | 'fw-1300'
  | 'fw-1200'
  | 'fw-1001'
  | 'fw-960'
  | 'fw-761'
  | 'fw-550'
  | 'fw-451';

export type ElfLoaderEntryVariant =
  | 'elfldr-sdk-v045'
  | 'y2jb-autoloader'
  | 'byepervisor-s3'
  | 'libkernel-syscall-stub';

export type OffsetVerificationStatus = 'verified' | 'experimental' | 'legacy';

export interface FirmwareKernelOffsets {
  readonly kernelBaseMask: string;
  readonly kernelDataBaseHint: string;
  readonly allproc: string;
  readonly prison0: string;
  readonly rootvnode: string;
  readonly securityFlags: string;
  readonly qaFlags: string;
  readonly utokenFlags: string;
  readonly elfldrEntryHook: string;
  readonly sceKernelDlsymOffset: string;
}

export interface FirmwareOffsetRecord {
  readonly id: FirmwareOffsetProfileId;
  readonly fwNumber: string;
  readonly fwLabel: string;
  readonly fwHex: string;
  readonly sdkTarget: string;
  readonly entryVector: string;
  readonly kstuffSupport: string;
  readonly verifiedStatus: OffsetVerificationStatus;
  readonly notes: string;
  readonly offsets: FirmwareKernelOffsets;
}

export interface PayloadHeaderConfig {
  firmwareId: FirmwareOffsetProfileId;
  loaderVariant: ElfLoaderEntryVariant;
  fileName: string;
  headerGuard: string;
  namespacePrefix: string;
  includeElf64Boilerplate: boolean;
  includeKernelReadWriteMacros: boolean;
  includeSandboxEscapeHelpers: boolean;
  includeS3ResumeCheck: boolean;
  customKernelDataBaseOverride: string;
}

export interface GeneratedHeaderResult {
  readonly fileName: string;
  readonly headerGuard: string;
  readonly content: string;
  readonly lineCount: number;
  readonly macroCount: number;
  readonly firmware: FirmwareOffsetRecord;
  readonly loaderLabel: string;
  readonly validationWarnings: readonly string[];
}
