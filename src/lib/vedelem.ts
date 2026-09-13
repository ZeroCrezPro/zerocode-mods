/**
 * Tartalomvédelem az élő oldalon: nincs szövegkijelölés, másolás, kép-húzás,
 * jobb klikk (mezőkben sem), és gyorsbillentyű sem - csak az F11 (teljes
 * képernyő) és az ESC él. A sima gépelés, Tab, Enter, nyilak működnek, hogy
 * a belépés és a regisztráció kitölthető maradjon.
 *
 * A szerkesztő előnézetében (helyi cím) nem kapcsol be, mert ott a
 * formázáshoz szöveget kell kijelölni.
 */
export function vedelemBekapcsol() {
  if (typeof window === 'undefined') return
  const h = location.hostname
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return

  document.documentElement.classList.add('zc-vedett')

  const mezoben = (cel: EventTarget | null) => {
    const e = cel as HTMLElement | null
    return Boolean(e?.closest?.('input, textarea, select, [contenteditable="true"]'))
  }

  // Jobb klikk sehol - mezőben sem.
  document.addEventListener('contextmenu', (ev) => ev.preventDefault())

  for (const nev of ['copy', 'cut', 'dragstart', 'selectstart'] as const) {
    document.addEventListener(nev, (ev) => {
      if (!mezoben(ev.target)) ev.preventDefault()
    })
  }

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'F11' || ev.key === 'Escape') return
    // Az AltGr (Ctrl+Alt együtt) magyar billentyűzeten írásjelet ad (@, {, [ …) - az kell.
    const altGr = ev.ctrlKey && ev.altKey && ev.key.length === 1
    if (altGr) return
    // Minden más módosítós kombináció (Ctrl+…, Alt+…, Win+…) és a funkcióbillentyűk tiltva.
    if (ev.ctrlKey || ev.altKey || ev.metaKey || /^F\d{1,2}$/.test(ev.key) || ev.key === 'ContextMenu') {
      ev.preventDefault()
      ev.stopPropagation()
    }
  })
}
