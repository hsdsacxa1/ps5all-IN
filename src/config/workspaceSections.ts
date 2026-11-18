export type WorkspaceSectionId =
  | 'scaffolder'
  | 'elf-research'
  | 'auditor'
  | 'knowledge'
  | 'handoff'
  | 'bridge'
  | 'ports'
  | 'dump-mods'
  | 'cfw-research';

export interface WorkspaceSectionMeta {
  readonly id: WorkspaceSectionId;
  readonly navLabel: string;
  readonly tabLabel: string;
}

export const WORKSPACE_SECTIONS: readonly WorkspaceSectionMeta[] = [
  { id: 'scaffolder', navLabel: 'Scaffolder', tabLabel: '1. Генератор MVP' },
  { id: 'elf-research', navLabel: 'ELF Research', tabLabel: '2. ELF Research' },
  { id: 'auditor', navLabel: '13.60 Auditor', tabLabel: '3. Аудитор 13.60' },
  { id: 'knowledge', navLabel: 'Runtime & API', tabLabel: '4. Runtime и API' },
  { id: 'handoff', navLabel: 'Agent Handoff', tabLabel: '5. Промпт и AGENTS.md' },
  { id: 'bridge', navLabel: 'PS5 Bridge', tabLabel: '6. Мост к PS5' },
  { id: 'ports', navLabel: 'Native Ports', tabLabel: '7. Нативные порты' },
  { id: 'dump-mods', navLabel: 'Dump Mods', tabLabel: '8. Патчи и Моды Дампов' },
  { id: 'cfw-research', navLabel: 'CFW Research', tabLabel: '9. Ресерч взлома и CFW' },
];
