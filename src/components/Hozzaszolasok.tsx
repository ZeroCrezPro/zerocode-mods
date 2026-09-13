import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './ui'
import { useFiok } from '@/lib/fiok'

/**
 * Hozzászólások egy modhoz - a jobb oldali sávban, a "Melyik játékhoz" alatt.
 *
 * Olvasni bárki tud, írni csak bejelentkezve. A lista saját görgethető
 * területen van (legújabb felül), az üzenetek sima szövegként jelennek meg
 * (a React nem futtat le beírt HTML-t), 500 karakter az egy üzenet.
 */

interface Uzenet {
  id: string
  nev: string
  kepUrl: string
  szoveg: string
  ido: number
}

const MAX = 500

const idoFormat = (t: number) =>
  new Date(t).toLocaleString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

export function Hozzaszolasok({ slug }: { slug: string }) {
  const { fiok } = useFiok()
  const [lista, setLista] = useState<Uzenet[] | null>(null)
  const [szoveg, setSzoveg] = useState('')
  const [kuldes, setKuldes] = useState(false)
  const [hiba, setHiba] = useState('')
  const lap = useRef<HTMLDivElement>(null)

  const betolt = async () => {
    try {
      const v = await fetch(`/api/hozzaszolas/${encodeURIComponent(slug)}`, { credentials: 'same-origin' })
      const j = (await v.json()) as { ok?: boolean; lista?: Uzenet[] }
      setLista(j.ok && Array.isArray(j.lista) ? j.lista : [])
    } catch {
      setLista([])
    }
  }

  // Betöltés, és félpercenként frissítés, amíg az oldal nyitva van.
  useEffect(() => {
    setLista(null)
    void betolt()
    const t = setInterval(betolt, 30000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const kuld = async (e: FormEvent) => {
    e.preventDefault()
    const t = szoveg.trim()
    if (!t || kuldes) return
    setKuldes(true)
    setHiba('')
    try {
      const v = await fetch(`/api/hozzaszolas/${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ szoveg: t }),
      })
      const j = (await v.json().catch(() => ({}))) as { ok?: boolean; hiba?: string; uzenet?: Uzenet }
      if (!v.ok || !j.ok || !j.uzenet) {
        setHiba(j.hiba || 'Nem sikerült elküldeni - próbáld újra.')
      } else {
        const uj = j.uzenet
        setLista((l) => [uj, ...(l ?? [])])
        setSzoveg('')
        lap.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch {
      setHiba('Nem érem el a kiszolgálót - nézd meg a kapcsolatot.')
    }
    setKuldes(false)
  }

  const hossz = [...szoveg].length

  return (
    <section className="border border-ink-700 bg-ink-900 p-4" aria-label="Hozzászólások">
      <div className="flex items-baseline justify-between">
        <p className="zc-label text-ash-400">Hozzászólások</p>
        {lista && lista.length > 0 && <span className="font-mono text-[11px] text-ash-500">{lista.length}</span>}
      </div>

      <div ref={lap} className="mt-3 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
        {lista === null ? (
          <p className="text-xs text-ash-500">Betöltés…</p>
        ) : lista.length === 0 ? (
          <p className="text-xs text-ash-500">Még nincs hozzászólás - legyél az első!</p>
        ) : (
          lista.map((u) => (
            <article key={u.id} className="border border-ink-800 bg-ink-850/60 p-3">
              <header className="flex items-center gap-2">
                {u.kepUrl ? (
                  <img src={u.kepUrl} alt="" aria-hidden className="h-6 w-6 shrink-0 object-cover" />
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-ink-800 font-mono text-xs font-black text-blood-400">
                    {u.nev.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 truncate text-sm font-bold text-ash-100">{u.nev}</span>
                <time dateTime={new Date(u.ido).toISOString()} className="ml-auto shrink-0 text-[11px] text-ash-500">
                  {idoFormat(u.ido)}
                </time>
              </header>
              <p className="mt-2 text-sm leading-relaxed break-words whitespace-pre-wrap text-ash-300">{u.szoveg}</p>
            </article>
          ))
        )}
      </div>

      {fiok ? (
        <form onSubmit={kuld} className="mt-4 border-t border-ink-800 pt-4">
          <label htmlFor={`hsz-${slug}`} className="sr-only">
            Hozzászólás
          </label>
          <textarea
            id={`hsz-${slug}`}
            value={szoveg}
            onChange={(e) => setSzoveg([...e.target.value].slice(0, MAX).join(''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void kuld(e)
              }
            }}
            rows={3}
            maxLength={MAX}
            placeholder="Írj hozzászólást…"
            className="w-full resize-none border border-ink-600 bg-ink-850 px-3 py-2 text-sm text-ash-100 placeholder:text-ash-500 focus:border-blood-600 focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className={`font-mono text-[11px] ${hossz >= MAX ? 'text-blood-400' : 'text-ash-500'}`}>
              {hossz}/{MAX}
            </span>
            <Button type="submit" size="sm" disabled={kuldes || !szoveg.trim()}>
              {kuldes ? 'Küldés…' : 'Küldés'}
            </Button>
          </div>
          {hiba && (
            <p role="alert" className="mt-2 text-xs text-blood-400">
              {hiba}
            </p>
          )}
        </form>
      ) : (
        <p className="mt-4 border-t border-ink-800 pt-4 text-xs text-ash-400">
          A hozzászólások megtekinthetők, de íráshoz{' '}
          <Link to="/belepes" className="text-blood-400 hover:underline">
            be kell jelentkezned
          </Link>
          .
        </p>
      )}
    </section>
  )
}
