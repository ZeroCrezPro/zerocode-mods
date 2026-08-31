/** 2026-08-31 -> "2026. 08. 31." */
export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}. ${p(d.getUTCMonth() + 1)}. ${p(d.getUTCDate())}.`
}

/** Ezres tagolás magyar módra: 10420 -> "10 420" */
export function formatNumber(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** "1.2.0" -> "v1.2.0" */
export function vLabel(version: string): string {
  return version.startsWith('v') ? version : `v${version}`
}

/** Szemantikus verzió-összehasonlítás (csökkenő sorrendhez). */
export function compareVersionDesc(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split(/[.-]/)
  const pb = b.replace(/^v/, '').split(/[.-]/)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = Number(pa[i] ?? 0)
    const nb = Number(pb[i] ?? 0)
    if (Number.isNaN(na) || Number.isNaN(nb)) {
      const cmp = (pb[i] ?? '').localeCompare(pa[i] ?? '')
      if (cmp !== 0) return cmp
      continue
    }
    if (na !== nb) return nb - na
  }
  return 0
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
