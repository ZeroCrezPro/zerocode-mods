import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { site } from '@/data/site'

/**
 * Bejelentkezett fiók - az egész oldalon elérhető állapot.
 *
 * A bejelentkezést egy HttpOnly süti tartja, amit a Cloudflare-függvények
 * adnak; a böngésző JS-ből nem éri el. Betöltéskor a /api/fiok/en mondja
 * meg, ki van belépve.
 */

export interface Fiok {
  nev: string
  email: string
}

interface FiokAllapot {
  /** undefined = még nem tudjuk; null = nincs belépve */
  fiok: Fiok | null | undefined
  beallit: (fiok: Fiok | null) => void
  kilep: () => Promise<void>
}

const FiokContext = createContext<FiokAllapot>({ fiok: null, beallit: () => {}, kilep: async () => {} })

export const fiokokBekapcsolva = Boolean(site.fiok?.bekapcsolva)

/** Hívás a fiók API-hoz; a hibaszöveget a válaszból veszi. */
export async function fiokHivas<T = Record<string, unknown>>(
  ut: string,
  test?: Record<string, unknown>,
): Promise<{ ok: true; adat: T } | { ok: false; hiba: string }> {
  try {
    const v = await fetch(`/api/fiok/${ut}`, {
      method: test ? 'POST' : 'GET',
      headers: test ? { 'Content-Type': 'application/json' } : undefined,
      body: test ? JSON.stringify(test) : undefined,
      credentials: 'same-origin',
    })
    const adat = (await v.json().catch(() => ({}))) as { ok?: boolean; hiba?: string }
    if (!v.ok || !adat.ok) return { ok: false, hiba: adat.hiba || 'Valami nem sikerült - próbáld újra.' }
    return { ok: true, adat: adat as unknown as T }
  } catch {
    return { ok: false, hiba: 'Nem érem el a kiszolgálót - nézd meg a kapcsolatot.' }
  }
}

export function FiokProvider({ children }: { children: ReactNode }) {
  const [fiok, setFiok] = useState<Fiok | null | undefined>(fiokokBekapcsolva ? undefined : null)

  useEffect(() => {
    if (!fiokokBekapcsolva) return
    let el = false
    fiokHivas<{ fiok: Fiok }>('en').then((v) => {
      if (!el) setFiok(v.ok ? v.adat.fiok : null)
    })
    return () => {
      el = true
    }
  }, [])

  const kilep = useCallback(async () => {
    await fiokHivas('kilepes', {})
    setFiok(null)
  }, [])

  return <FiokContext.Provider value={{ fiok, beallit: setFiok, kilep }}>{children}</FiokContext.Provider>
}

export const useFiok = () => useContext(FiokContext)
