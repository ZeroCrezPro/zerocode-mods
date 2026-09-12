/**
 * POST /api/fiok/regisztracio  { nev, email, jelszo } -> belépve, süti
 *
 * Sikeres regisztráció után üdvözlő levél megy (Gmailen át), ha az be van
 * állítva - a válasz nem várja meg, és a levél hibája nem rontja el a
 * regisztrációt.
 */
import site from '../../../src/data/site.json' with { type: 'json' }
import { levelKuldes } from '../../_lib/level.js'
import {
  fiokLetrehoz,
  fiokRendszerHiba,
  jsonValasz,
  keresTest,
  munkamenetSuti,
  nyilvanosFiok,
  tulSokProba,
} from '../../_lib/fiok.js'

function udvozloLevel(env, request, fiok) {
  const eredet = new URL(request.url).origin
  return levelKuldes({
    felhasznalo: env.GMAIL_CIM,
    jelszo: env.GMAIL_JELSZO,
    kiszolgalo: env.SMTP_PROBA,
    feladoNev: site.name,
    cimzett: fiok.email,
    targy: `${site.name} - sikeres regisztráció`,
    szoveg:
      `Szia ${fiok.nev}!\n\n` +
      `A fiókod elkészült a ${site.name} oldalon.\n\n` +
      `Név: ${fiok.nev}\nE-mail: ${fiok.email}\n\n` +
      `Belépés: ${eredet}/belepes\n` +
      `Ha egyszer elfelejtenéd a jelszavad, itt kérhetsz újat: ${eredet}/elfelejtett-jelszo\n\n` +
      `Ha nem te regisztráltál, egyszerűen hagyd figyelmen kívül ezt a levelet.\n\n${site.name}`,
  })
}

export async function onRequestPost({ request, env, waitUntil }) {
  const rendszerHiba = fiokRendszerHiba(env)
  if (rendszerHiba) return jsonValasz({ ok: false, hiba: rendszerHiba }, 500)
  const test = await keresTest(request)
  if (!test) return jsonValasz({ ok: false, hiba: 'Hibás kérés.' }, 400)
  if (await tulSokProba(env.FIOKOK, request, 'regisztracio', 10)) {
    return jsonValasz({ ok: false, hiba: 'Túl sok próbálkozás - várj tíz percet.' }, 429)
  }

  const eredmeny = await fiokLetrehoz(env.FIOKOK, { nev: test.nev, email: test.email, jelszo: test.jelszo })
  if (!eredmeny.ok) return jsonValasz({ ok: false, hiba: eredmeny.hiba }, 400)

  if (env.GMAIL_CIM && env.GMAIL_JELSZO) {
    waitUntil(udvozloLevel(env, request, eredmeny.fiok).catch(() => {}))
  }

  const suti = await munkamenetSuti(eredmeny.fiok, env.FIOK_TITOK, request)
  return jsonValasz({ ok: true, fiok: nyilvanosFiok(eredmeny.fiok) }, 200, suti)
}
