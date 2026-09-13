/** POST /api/jatek/pont { pont } -> a bejelentkezett játékos eredménye a ranglistára */
import { bejelentkezettFiok, jsonValasz, keresTest, tulSokProba } from '../../_lib/fiok.js'
import { PONT_HATAR, nyilvanosRanglista, ranglistaFrissit } from '../../_lib/ranglista.js'

export async function onRequestPost({ request, env }) {
  const fiok = await bejelentkezettFiok(request, env)
  if (!fiok) return jsonValasz({ ok: false, hiba: 'Csak bejelentkezve kerülhetsz a ranglistára.' }, 401)
  const test = await keresTest(request)
  if (!test) return jsonValasz({ ok: false, hiba: 'Hibás kérés.' }, 400)
  if (await tulSokProba(env.FIOKOK, request, 'pont', 60)) {
    return jsonValasz({ ok: false, hiba: 'Túl sok beküldés - várj tíz percet.' }, 429)
  }
  const pont = Math.floor(Number(test.pont))
  if (!Number.isFinite(pont) || pont < 0 || pont > PONT_HATAR) return jsonValasz({ ok: false, hiba: 'Hibás pontszám.' }, 400)
  const lista = await ranglistaFrissit(env.FIOKOK, fiok, pont)
  return jsonValasz({ ok: true, lista: nyilvanosRanglista(lista) })
}
