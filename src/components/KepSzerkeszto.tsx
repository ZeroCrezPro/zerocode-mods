import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react'
import { Button } from './ui'
import { alapKivagas, kepKivag, kivagasSzorit, webpOptimalizal, type Kivagas } from '@/lib/fiok'

/**
 * Kis képszerkesztő a profilképhez: a négyzetes keretben látszik, mi lesz
 * a képből. Húzással mozgatható, görgővel vagy a csúszkával nagyítható -
 * a nem négyzetes képeknél így választható ki, melyik része látsszon.
 * Mentéskor 256x256-os, weboptimalizált WebP készül.
 */

const NEZET = 288 // a keret mérete a képernyőn (px)

export function KepSzerkeszto({
  img,
  mentes,
  megse,
}: {
  img: HTMLImageElement
  mentes: (kep: Blob) => Promise<void>
  megse: () => void
}) {
  const [k, setK] = useState<Kivagas>(() => alapKivagas(img))
  const [fut, setFut] = useState(false)
  const [hiba, setHiba] = useState('')
  const keret = useRef<HTMLDivElement>(null)
  const huzas = useRef<{ x: number; y: number; k: Kivagas } | null>(null)

  const maxOldal = Math.min(img.naturalWidth, img.naturalHeight)
  // legfeljebb négyszeres nagyítás - ennél közelebb már csak pixelek lennének
  const minOldal = Math.max(32, maxOldal / 4)
  // nagyítás: 1 = a legnagyobb négyzet látszik; nagyobb szám = kisebb kivágás = közelebb
  const nagyitas = maxOldal / k.oldal
  const maxNagyitas = maxOldal / minOldal
  const arany = NEZET / k.oldal // képernyő-px / kép-px

  const nagyit = (uj: number, kozepX = 0.5, kozepY = 0.5) => {
    const oldal = maxOldal / Math.max(1, Math.min(maxNagyitas, uj))
    // a nagyítás középpontja maradjon a helyén
    const cx = k.x + k.oldal * kozepX
    const cy = k.y + k.oldal * kozepY
    setK(kivagasSzorit(img, { oldal, x: cx - oldal * kozepX, y: cy - oldal * kozepY }))
  }

  const lenyom = (e: ReactPointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    huzas.current = { x: e.clientX, y: e.clientY, k }
  }
  const mozgat = (e: ReactPointerEvent) => {
    if (!huzas.current) return
    const dx = (e.clientX - huzas.current.x) / arany
    const dy = (e.clientY - huzas.current.y) / arany
    setK(kivagasSzorit(img, { ...huzas.current.k, x: huzas.current.k.x - dx, y: huzas.current.k.y - dy }))
  }
  const elenged = () => {
    huzas.current = null
  }
  const gorgo = (e: ReactWheelEvent) => {
    e.preventDefault()
    const r = keret.current?.getBoundingClientRect()
    const kx = r ? (e.clientX - r.left) / r.width : 0.5
    const ky = r ? (e.clientY - r.top) / r.height : 0.5
    nagyit(nagyitas * (e.deltaY < 0 ? 1.12 : 1 / 1.12), kx, ky)
  }

  // A kép ideiglenes címét a szerkesztő bezárásakor szabadítjuk fel.
  useEffect(() => () => URL.revokeObjectURL(img.src), [img])

  useEffect(() => {
    const billentyu = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && !fut) megse()
    }
    document.addEventListener('keydown', billentyu)
    return () => document.removeEventListener('keydown', billentyu)
  }, [megse, fut])

  const ment = async () => {
    setFut(true)
    setHiba('')
    try {
      await mentes(await webpOptimalizal(kepKivag(img, k)))
    } catch (e) {
      setHiba(e instanceof Error ? e.message : 'Nem sikerült menteni.')
      setFut(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kepszerk-cim"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !fut) megse()
      }}
    >
      <div className="w-full max-w-sm border border-ink-600 bg-ink-900 p-5 shadow-2xl shadow-black/70 sm:p-6">
        <h2 id="kepszerk-cim" className="text-lg font-black tracking-tight uppercase text-ash-100">
          Profilkép beállítása
        </h2>
        <p className="mt-1 text-xs text-ash-400">Húzd a képet a helyére, görgővel vagy a csúszkával nagyíts.</p>

        <div
          ref={keret}
          className="relative mx-auto mt-4 cursor-grab touch-none overflow-hidden border border-blood-600/70 bg-ink-950 select-none active:cursor-grabbing"
          style={{ width: NEZET, height: NEZET }}
          onPointerDown={lenyom}
          onPointerMove={mozgat}
          onPointerUp={elenged}
          onPointerCancel={elenged}
          onWheel={gorgo}
        >
          <img
            src={img.src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute max-w-none"
            style={{
              width: img.naturalWidth * arany,
              height: img.naturalHeight * arany,
              left: -k.x * arany,
              top: -k.y * arany,
            }}
          />
          <div className="pointer-events-none absolute inset-0 border border-white/15" aria-hidden />
        </div>

        <label className="mt-4 flex items-center gap-3 text-xs text-ash-400">
          <span className="zc-label shrink-0">Nagyítás</span>
          <input
            type="range"
            min={1}
            max={Math.max(1.01, maxNagyitas)}
            step={0.01}
            value={nagyitas}
            onChange={(e) => nagyit(Number(e.target.value))}
            className="w-full accent-blood-500"
            aria-label="Nagyítás"
          />
          <span className="w-10 shrink-0 text-right font-mono">{nagyitas.toFixed(1)}×</span>
        </label>

        {hiba && (
          <p role="alert" className="mt-3 text-sm text-blood-400">
            {hiba}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button type="button" onClick={ment} disabled={fut}>
            {fut ? 'Mentés…' : 'Mentés'}
          </Button>
          <Button type="button" variant="secondary" onClick={megse} disabled={fut}>
            Mégse
          </Button>
        </div>
      </div>
    </div>
  )
}
