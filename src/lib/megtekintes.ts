import { useEffect, useState } from 'react'

/**
 * Megtekintés-számláló: hányszor nyitották meg az egyes modok adatlapját.
 * A számokat egyszer töltjük le (modulszinten tárolva), a kártyák ebből
 * olvasnak; az adatlap megnyitása egyet hozzáad.
 */

let tarolt: Record<string, number> | null = null
let betoltes: Promise<Record<string, number>> | null = null
const figyelok = new Set<(sz: Record<string, number>) => void>()

function ertesit() {
  if (tarolt) for (const f of figyelok) f(tarolt)
}

export function megtekintesekBetolt(): Promise<Record<string, number>> {
  if (tarolt) return Promise.resolve(tarolt)
  if (!betoltes) {
    betoltes = fetch('/api/megtekintes')
      .then((v) => v.json())
      .then((j: { ok?: boolean; szamok?: Record<string, number> }) => {
        tarolt = j.ok && j.szamok ? j.szamok : {}
        ertesit()
        return tarolt
      })
      .catch(() => {
        tarolt = {}
        return tarolt
      })
  }
  return betoltes
}

/** Az adatlap megnyitása: +1 (a kiszolgáló fél percen belül nem számol duplán). */
export async function megtekintesJelez(slug: string) {
  try {
    const v = await fetch(`/api/megtekintes/${encodeURIComponent(slug)}`, { method: 'POST', keepalive: true })
    const j = (await v.json()) as { ok?: boolean; szam?: number }
    if (j.ok && typeof j.szam === 'number') {
      tarolt = { ...(tarolt ?? {}), [slug]: j.szam }
      ertesit()
    }
  } catch {
    /* számláló nélkül is megy az oldal */
  }
}

/** A modok megtekintés-számai; amíg nincs adat, üres. */
export function useMegtekintesek(): Record<string, number> {
  const [sz, setSz] = useState<Record<string, number>>(tarolt ?? {})
  useEffect(() => {
    figyelok.add(setSz)
    void megtekintesekBetolt().then(setSz)
    return () => {
      figyelok.delete(setSz)
    }
  }, [])
  return sz
}
