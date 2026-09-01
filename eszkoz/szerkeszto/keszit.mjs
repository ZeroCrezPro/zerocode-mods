/**
 * A ZeroCode Szerkesztő EXE elkészítése.
 *
 * Futtatás:  npm run szerkeszto:exe
 * Eredmény:  "ZeroCode Szerkeszto.exe" a projekt gyökerében.
 *
 * Igény: .NET SDK 8 vagy újabb (https://dotnet.microsoft.com/download).
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const projekt = path.resolve(here, '..', '..')
const programDir = path.join(here, 'program')
const kiadas = path.join(programDir, 'kiadas')
const exeNev = 'ZeroCode Szerkeszto.exe'

function futtat(parancs, argumentumok, mappa) {
  const eredmeny = spawnSync(parancs, argumentumok, {
    cwd: mappa,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (eredmeny.status !== 0) {
    console.error(`\nA parancs hibára futott: ${parancs} ${argumentumok.join(' ')}`)
    process.exit(eredmeny.status ?? 1)
  }
}

/**
 * A futó példányt be kell zárni, különben a Windows nem engedi felülírni
 * az EXE fájlt ("EBUSY"). Ha nem futott semmi, ez a lépés csendben elmúlik.
 */
function futoPeldanytBezar() {
  if (process.platform !== 'win32') return
  const nev = path.basename(exeNev, '.exe')
  const eredmeny = spawnSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `Get-Process -Name '${nev}' -ErrorAction SilentlyContinue | Stop-Process -Force`,
    ],
    { stdio: 'ignore' },
  )
  if (eredmeny.status === 0) console.log('A futó szerkesztő bezárva (az EXE cseréjéhez kellett).')
}

console.log('Ikon készítése…')
futtat('node', ['ikon-keszit.mjs'], programDir)

console.log('EXE fordítása (.NET)…')
futtat('dotnet', ['publish', '-c', 'Release', '--nologo', '-o', 'kiadas'], programDir)

futoPeldanytBezar()

const forras = path.join(kiadas, exeNev)
if (!fs.existsSync(forras)) {
  console.error(`Nem készült el: ${forras}`)
  process.exit(1)
}
fs.copyFileSync(forras, path.join(projekt, exeNev))
console.log(`\nKész: ${path.join(projekt, exeNev)}`)
