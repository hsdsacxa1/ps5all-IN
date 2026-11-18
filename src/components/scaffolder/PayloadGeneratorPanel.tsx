import React, { useMemo, useState } from 'react';
import {
  DEFAULT_PAYLOAD_HEADER_CONFIG,
  generatePayloadHeaderTemplate,
  sanitizeCIdentifier,
} from '../../generators/payloadHeader/payloadHeaderRegistry';
import { PayloadHeaderConfig } from '../../types/payloadHeader';
import { PayloadHeaderPreview } from './PayloadHeaderPreview';
import { PayloadOffsetSelector } from './PayloadOffsetSelector';

interface PayloadGeneratorPanelProps {
  projectName: string;
}

export const PayloadGeneratorPanel: React.FC<PayloadGeneratorPanelProps> = ({
  projectName,
}) => {
  const [headerConfig, setHeaderConfig] = useState<PayloadHeaderConfig>(
    DEFAULT_PAYLOAD_HEADER_CONFIG
  );

  const generatedResult = useMemo(
    () => generatePayloadHeaderTemplate(headerConfig),
    [headerConfig]
  );

  const handleSyncFromProject = () => {
    const cleanSlug = projectName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_') || 'ps5_payload';
    const cleanPrefix = sanitizeCIdentifier(cleanSlug, 'PS5_LDR');
    setHeaderConfig((prev) => ({
      ...prev,
      fileName: `${cleanSlug}_offsets.h`,
      headerGuard: `${cleanPrefix}_OFFSETS_H`,
      namespacePrefix: cleanPrefix,
    }));
  };

  return (
    <section
      aria-label="Payload Generator"
      className="space-y-4 pt-2"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            03. Payload Generator — C-Header &amp; Firmware Offsets (ELF Loader)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Генератор шаблонного C-заголовка (.h) со смещениями ядра и структурами ELF64 под выбранную прошивку PS5 (4.51–13.60)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5">
          <PayloadOffsetSelector
            config={headerConfig}
            projectName={projectName}
            onChange={setHeaderConfig}
            onSyncFromProject={handleSyncFromProject}
          />
        </div>
        <div className="lg:col-span-7">
          <PayloadHeaderPreview result={generatedResult} />
        </div>
      </div>
    </section>
  );
};
