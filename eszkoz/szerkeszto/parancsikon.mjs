/**
 * Parancsikon létrehozása az asztalon a ZeroCode Szerkesztőhöz.
 *
 * Futtatás:  npm run szerkeszto:parancsikon
 *
 * Magát az EXE-t nem érdemes az asztalra másolni: a program a saját helyéből
 * találja meg a weboldal projektmappáját. A parancsikon viszont az asztalról
 * indítja, ugyanazzal az ikonnal, és a munkakönyvtár is a projekt marad.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.platform !== 'win32') {
  console.error('Ez a parancs csak Windowson működik.')
  process.exit(1)
}

const here = path.dirname(fileURLToPath(import.meta.url))
const projekt = path.resolve(here, '..', '..')
const exeUt = path.join(projekt, 'ZeroCode Szerkeszto.exe')

if (!fs.existsSync(exeUt)) {
  console.error(
    `Nem találom a programot: ${exeUt}\n` +
      'Előbb futtasd: npm run szerkeszto:exe',
  )
  process.exit(1)
}

/*
 * A .lnk fájlt a Windows saját COM felületével hozzuk létre.
 *
 * A parancsikon nevében szereplő "ő" betűt kódponttal állítjuk elő
 * ([char]0x0151), mert a Windows parancssora és a PowerShell eltérő
 * kódlapjai között az ékezetes betűk elveszhetnek. Így a név biztosan
 * "ZeroCode Szerkesztő" lesz, nem "Szerkeszto".
 */
const parancs = `
$asztal = [Environment]::GetFolderPath('Desktop')

# A COM-os mentés nem őrzi meg az ékezetes fájlnevet, ezért előbb ékezet
# nélküli néven mentünk, majd .NET-tel nevezzük át - az teljesen Unicode-os.
$ideiglenesLink = Join-Path $asztal 'ZeroCode Szerkeszto.lnk'
$veglegesLink   = Join-Path $asztal ('ZeroCode Szerkeszt' + [char]0x0151 + '.lnk')

$hejj = New-Object -ComObject WScript.Shell
$p = $hejj.CreateShortcut($ideiglenesLink)
$p.TargetPath = '${exeUt.replace(/'/g, "''")}'
$p.WorkingDirectory = '${projekt.replace(/'/g, "''")}'
$p.IconLocation = '${exeUt.replace(/'/g, "''")},0'
$p.Description = 'ZeroCode Mods weboldal szerkesztése'
$p.WindowStyle = 1
$p.Save()

if (Test-Path -LiteralPath $veglegesLink) {
  [System.IO.File]::Delete($veglegesLink)
}
[System.IO.File]::Move($ideiglenesLink, $veglegesLink)

Write-Output $veglegesLink
`

/*
 * A szkriptet fájlba írjuk, és úgy futtatjuk - parancssori argumentumként
 * átadva a Windows elrontaná az ékezetes betűket.
 *
 * A fájl elejére UTF-8 bájtsorrend-jelet (BOM) teszünk: a Windows
 * PowerShell 5.1 e nélkül a rendszer kódlapja szerint olvasná a fájlt,
 * és az ékezetes szövegek összekuszálódnának.
 */
const BOM = Buffer.from([0xef, 0xbb, 0xbf])
const ideiglenes = path.join(projekt, '.szerkeszto-parancsikon.ps1')
fs.writeFileSync(ideiglenes, Buffer.concat([BOM, Buffer.from(parancs, 'utf8')]))

let eredmeny
try {
  eredmeny = spawnSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ideiglenes],
    { encoding: 'utf8' },
  )
} finally {
  fs.rmSync(ideiglenes, { force: true })
}

if (eredmeny.status !== 0) {
  console.error('Nem sikerült létrehozni a parancsikont.')
  console.error(eredmeny.stderr || eredmeny.stdout)
  process.exit(1)
}

console.log(`Kész: ${eredmeny.stdout.trim()}`)
