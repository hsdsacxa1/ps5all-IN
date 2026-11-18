import {
  ElfLoaderEntryVariant,
  FirmwareOffsetRecord,
  PayloadHeaderConfig,
} from '../../types/payloadHeader';

export interface ElfLoaderVariantStrategy {
  readonly id: ElfLoaderEntryVariant;
  readonly label: string;
  readonly shortBadge: string;
  readonly description: string;
  readonly buildLoaderSection: (
    config: PayloadHeaderConfig,
    fw: FirmwareOffsetRecord,
    prefix: string
  ) => string;
}
