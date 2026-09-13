/** POST /api/fiok/torles -> a bejelentkezett fiók végleges törlése, a süti törlésével */
import { bejelentkezettFiok, emailKulcs, jsonValasz, kilepesSuti, nevKulcs } from '../../_lib/fiok.js'

export async function onRequestPost({ request, env }) {
  const fiok = await bejelentkezettFiok(request, env)
  if (!fiok) return jsonValasz({ ok: false, hiba: 'Nem vagy bejelentkezve.' }, 401)

  await env.FIOKOK.delete(`nev:${nevKulcs(fiok.nev)}`)
  await env.FIOKOK.delete(`fiok:${emailKulcs(fiok.email)}`)
  return jsonValasz({ ok: true }, 200, kilepesSuti())
}
