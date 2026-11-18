import { ElfSymbolEntry, ExtractedBinaryString } from '../types/elf';

export type ElfSymbolFilterId = 'all' | 'imports' | 'exports' | 'forbidden';
export type ElfStringCategoryFilterId =
  | 'all'
  | ExtractedBinaryString['category'];

const SYMBOL_FILTER_PREDICATES: Record<
  ElfSymbolFilterId,
  (sym: ElfSymbolEntry) => boolean
> = {
  all: () => true,
  imports: (sym) => sym.isImported,
  exports: (sym) => !sym.isImported,
  forbidden: (sym) => sym.forbiddenInTitle,
};

const STRING_CATEGORY_PREDICATES: Record<
  ElfStringCategoryFilterId,
  (entry: ExtractedBinaryString) => boolean
> = {
  all: () => true,
  'ps5-path': (entry) => entry.category === 'ps5-path',
  'sprx-module': (entry) => entry.category === 'sprx-module',
  'symbol-or-literal': (entry) => entry.category === 'symbol-or-literal',
};

export function filterElfSymbols(
  symbols: readonly ElfSymbolEntry[],
  filterId: ElfSymbolFilterId,
  query: string
): ElfSymbolEntry[] {
  const predicate = SYMBOL_FILTER_PREDICATES[filterId];
  const normalizedQuery = query.trim().toLowerCase();

  return symbols.filter((sym) => {
    if (!predicate(sym)) return false;
    if (normalizedQuery && !sym.name.toLowerCase().includes(normalizedQuery)) {
      return false;
    }
    return true;
  });
}

export function filterExtractedStrings(
  strings: readonly ExtractedBinaryString[],
  categoryFilter: ElfStringCategoryFilterId,
  query: string
): ExtractedBinaryString[] {
  const predicate = STRING_CATEGORY_PREDICATES[categoryFilter];
  const normalizedQuery = query.trim().toLowerCase();

  return strings.filter((entry) => {
    if (!predicate(entry)) return false;
    if (normalizedQuery) {
      const hay = `${entry.value} ${entry.offsetHex}`.toLowerCase();
      if (!hay.includes(normalizedQuery)) return false;
    }
    return true;
  });
}
