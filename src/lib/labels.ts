import type { ModStatus } from '@/data/types'

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

/** Csak a szövegszín - keret és háttér nélküli megjelenítéshez. */
export const statusTextClass: Record<ModStatus, string> = {
  aktiv: 'text-emerald-300',
  beta: 'text-amber-300',
  fejlesztes: 'text-sky-300',
  archivalt: 'text-ash-400',
}
