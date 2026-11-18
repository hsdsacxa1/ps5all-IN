import React from 'react';
import {
  WORKSPACE_SECTIONS,
  WorkspaceSectionId,
} from '../../config/workspaceSections';

export type { WorkspaceSectionId };

interface TopNavBarProps {
  activeSection: WorkspaceSectionId;
  onSelectSection: (section: WorkspaceSectionId) => void;
  onQuickExportAgentsMd: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeSection,
  onSelectSection,
  onQuickExportAgentsMd,
}) => {
  return (
    <header className="flex items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#scaffolder"
        onClick={(e) => {
          e.preventDefault();
          onSelectSection('scaffolder');
        }}
        className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
      >
        Prospero 13.60 Studio
      </a>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav
        aria-label="Main Workspace Navigation"
        className="flex items-center gap-3 xl:gap-4 text-xs font-medium text-slate-600 dark:text-slate-400 overflow-x-auto"
      >
        {WORKSPACE_SECTIONS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                onSelectSection(item.id);
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                isActive
                  ? 'border-blue-600 dark:border-blue-400 text-slate-950 dark:text-white font-semibold'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {item.navLabel}
            </a>
          );
        })}
      </nav>

      {/* Zone 3: Primary actions */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href="/api/bridge/download-build/TITAN-CORE-v1.0.3-mod-20261118-src.tar.gz"
          download="TITAN-CORE-v1.0.3-mod-20261118-src.tar.gz"
          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
        >
          TITAN-CORE v2.3
        </a>
        <button
          type="button"
          onClick={onQuickExportAgentsMd}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
        >
          AGENTS.md
        </button>
      </div>
    </header>
  );
};
