/** GET /api/fiok/en -> a bejelentkezett fiók, vagy { ok: false } */
import { bejelentkezettFiok, jsonValasz, nyilvanosFiok } from '../../_lib/fiok.js'

export async function onRequestGet({ request, env }) {
  const fiok = await bejelentkezettFiok(request, env)
  if (!fiok) return jsonValasz({ ok: false }, 401)
  return jsonValasz({ ok: true, fiok: nyilvanosFiok(fiok) })
}
