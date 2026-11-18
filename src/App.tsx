import React, { useState } from 'react';
import { AgentHandoffView } from './components/handoff/AgentHandoffView';
import { ElfResearchView } from './components/elf/ElfResearchView';
import { KnowledgeBaseView } from './components/knowledge/KnowledgeBaseView';
import { TopNavBar } from './components/layout/TopNavBar';
import { PitfallAuditorView } from './components/auditor/PitfallAuditorView';
import { ProjectScaffolderView } from './components/scaffolder/ProjectScaffolderView';
import { Ps5BridgeView } from './components/bridge/Ps5BridgeView';
import { NativePortsView } from './components/ports/NativePortsView';
import { DumpModsView } from './components/mods/DumpModsView';
import { CfwResearchView } from './components/research/CfwResearchView';
import {
  WORKSPACE_SECTIONS,
  WorkspaceSectionId,
} from './config/workspaceSections';
import { CANONICAL_AGENTS_MD } from './data/canonicalAgentsMd';
import { ProjectScaffoldConfig } from './types/ps5';

export default function App() {
  const [activeSection, setActiveSection] =
    useState<WorkspaceSectionId>('bridge');

  const [config, setConfig] = useState<ProjectScaffoldConfig>({
    projectName: 'nasbridge_ps5',
    titleId: 'PPSA99808',
    contentVersion: '01.00',
    ps5Ip: '192.168.1.50',
    elfldrPort: 9021,
    ftpPort: 2121,
    webuiPort: 8080,
    architecture: 'hybrid-app',
    graphicsBackend: 'videoout-sdl2-imgui',
    packageFormat: 'unpacked-folder',
    flexibleMemoryMiB: 448,
    useElevatedPrivileges: true,
    useHttpsTls: true,
    includeS3ResumeHandler: true,
    includeDownload0Fallback: true,
    openSourceGpl: true,
  });

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <TopNavBar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onQuickExportAgentsMd={() =>
          handleDownloadFile('AGENTS.md', CANONICAL_AGENTS_MD)
        }
      />

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-6 py-8 space-y-8">
        {/* Contextual Workspace Header */}
        <section className="flex flex-col gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1.5 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span className="whitespace-nowrap">PlayStation 5 Target: Firmware 13.60</span>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">Spec Baseline: 16.11.2026</span>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">ps5-payload-dev/sdk v0.45</span>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 dark:text-white text-balance">
              PS5 13.60 Development Handoff &amp; SDK Studio
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Интерактивная среда генерации скелетов приложений (Payload, WebUI, Native App, Hybrid), аудита критических ограничений прошивки 13.60, патчинга дампов/модов и подготовки спецификаций AGENTS.md / CLAUDE.md.
            </p>
          </div>

          {/* Workspace Mode Switcher */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-lg border border-slate-300/70 dark:border-slate-800 w-fit">
            {WORKSPACE_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeSection === section.id
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {section.tabLabel}
              </button>
            ))}
          </div>
        </section>

        {/* Active View Content */}
        {activeSection === 'scaffolder' && (
          <ProjectScaffolderView config={config} onChangeConfig={setConfig} />
        )}
        {activeSection === 'elf-research' && <ElfResearchView />}
        {activeSection === 'auditor' && <PitfallAuditorView />}
        {activeSection === 'knowledge' && <KnowledgeBaseView />}
        {activeSection === 'handoff' && (
          <AgentHandoffView
            config={config}
            fullAgentsMarkdown={CANONICAL_AGENTS_MD}
            onDownloadAgentsMd={handleDownloadFile}
          />
        )}
        {activeSection === 'bridge' && <Ps5BridgeView />}
        {activeSection === 'ports' && <NativePortsView />}
        {activeSection === 'dump-mods' && <DumpModsView />}
        {activeSection === 'cfw-research' && <CfwResearchView />}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-5 px-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>
            PS5 Firmware 13.60 Development Handoff Specification (Baseline 14.11.2026)
          </span>
          <div className="flex items-center gap-3 font-mono">
            <span>elfldr: 9021</span>
            <span aria-hidden="true">·</span>
            <span>ftpsrv: 2121</span>
            <span aria-hidden="true">·</span>
            <span>ShadowMountPlus API: 10101</span>
            <span aria-hidden="true">·</span>
            <span>Kraken Mount WebUI: 8097</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
