import type { ChangeKind, CompatState, ModStatus } from '@/data/types'

export const statusLabel: Record<ModStatus, string> = {
  aktiv: 'Aktív',
  beta: 'Béta',
  fejlesztes: 'Fejlesztés alatt',
  archivalt: 'Archivált',
}

/** Tailwind osztályok a státuszjelvényhez. */
export const statusClass: Record<ModStatus, string> = {
  aktiv: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  beta: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  fejlesztes: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  archivalt: 'border-ink-500 bg-ink-700 text-ash-400',
}

export const compatLabel: Record<CompatState, string> = {
  tesztelve: 'Tesztelve',
  reszben: 'Részben működik',
  'nem-tesztelt': 'Nem tesztelt',
  'nem-tamogatott': 'Nem támogatott',
}

export const compatClass: Record<CompatState, string> = {
  tesztelve: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  reszben: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  'nem-tesztelt': 'border-ink-500 bg-ink-800 text-ash-400',
  'nem-tamogatott': 'border-blood-500/40 bg-blood-500/10 text-blood-300',
}

export const changeLabel: Record<ChangeKind, string> = {
  uj: 'Új',
  javitva: 'Javítva',
  modositva: 'Módosítva',
  eltavolitva: 'Eltávolítva',
}

export const changeClass: Record<ChangeKind, string> = {
  uj: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  javitva: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  modositva: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  eltavolitva: 'border-blood-500/40 bg-blood-500/10 text-blood-300',
}
