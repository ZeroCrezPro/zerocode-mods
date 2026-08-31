import type { ReactNode } from 'react'

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border border-dashed border-ink-600 bg-ink-900/50 px-6 py-14 text-center">
      <p className="text-base font-bold text-ash-200">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-ash-400">{children}</div>}
    </div>
  )
}
