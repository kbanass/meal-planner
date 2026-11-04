/** "{N} daniach" in the Polish locative: "1 daniu", otherwise "N daniach". */
export function dishCountPhrase(n: number): string {
  return n === 1 ? '1 daniu' : `${n} daniach`;
}

export function usageLabel(n: number): string {
  return `używany: ${n}`;
}

export function deleteHint(usage: number): string {
  return `Produkt jest używany w ${dishCountPhrase(usage)} – nie można go usunąć.`;
}

export function unitHint(usage: number): string {
  return `Produkt jest używany w ${dishCountPhrase(usage)} – jednostki nie można zmienić.`;
}

export function mergeHint(hasCandidates: boolean): string | null {
  return hasCandidates ? null : 'Brak innych produktów z tą samą jednostką.';
}

export function renameConflictMessage(name: string): string {
  return `Produkt „${name}” już istnieje.`;
}

export function renameMergeQuestion(from: string, into: string): string {
  return `Scalić „${from}” z „${into}”?`;
}

export function mergeConfirmMessage(from: string, into: string): string {
  return `${renameMergeQuestion(from, into)} Wszystkie dania będą używać „${into}”.`;
}

export function deleteConfirmMessage(name: string): string {
  return `Usunąć produkt „${name}”?`;
}
