import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Galaga } from '@/jatek/galaga'

/**
 * A rejtett arcade játék ablaka: a vászon az egész képernyőt kitölti
 * (a játéktér szélessége a kijelző arányát követi), pixelesen skálázva. A játék motorja külön modul (lazy),
 * ezért az oldal csomagját nem terheli, amíg valaki elő nem hívja.
 *
 * Portállal a body alá kerül: a fejléc háttér-elmosása különben a fixed
 * ablakot a fejlécbe zárná.
 */
export default function GalagaJatek({ bezar }: { bezar: () => void }) {
  const vaszon = useRef<HTMLCanvasElement>(null)
  const keret = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const c = vaszon.current
    const k = keret.current
    if (!c || !k) return
    const jatek = new Galaga(c, {
      bezar,
      teljesKepernyo: (be) => {
        try {
          if (be && !document.fullscreenElement) k.requestFullscreen?.()
          else if (!be && document.fullscreenElement) document.exitFullscreen?.()
        } catch {
          /* ha a böngésző nem engedi, ablakban marad */
        }
      },
    })
    jatek.start()
    document.body.style.overflow = 'hidden'
    return () => {
      jatek.destroy()
      document.body.style.overflow = ''
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [bezar])

  return createPortal(
    <div
      ref={keret}
      role="dialog"
      aria-modal="true"
      aria-label="Csillagraj - arcade játék"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
    >
      <canvas
        ref={vaszon}
        className="h-full w-full cursor-crosshair"
        style={{ imageRendering: 'pixelated' }}
      />
      <button
        type="button"
        onClick={bezar}
        aria-label="Játék bezárása"
        className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center border border-ink-600 bg-ink-900/80 font-mono text-lg text-ash-300 hover:border-blood-600 hover:text-white"
      >
        ×
      </button>
    </div>,
    document.body,
  )
}
