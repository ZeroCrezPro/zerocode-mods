/**
 * Levélküldés Gmailen át - SMTP a Cloudflare saját socketjével.
 *
 * A Gmailhez alkalmazásjelszó kell (Google-fiók → Biztonság → Kétlépcsős
 * azonosítás → Alkalmazásjelszavak). A cím és a jelszó Pages-titok:
 * GMAIL_CIM és GMAIL_JELSZO - a szerkesztő tölti fel őket.
 *
 * smtp.gmail.com:465, azonnali TLS; AUTH PLAIN. A levél kétféle alakban
 * megy (sima szöveg + HTML), mindkettő base64-ben, így az ékezetek és a
 * sorhosszak biztosan rendben vannak.
 */
import { connect } from 'cloudflare:sockets'

const b64utf8 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)))
const b64Sorok = (s) => b64utf8(s).replace(/(.{76})/g, '$1\r\n')
/** Fejlécbe való szöveg (tárgy, név) - az RFC 2047 "encoded word" alakja. */
const fejlecSzoveg = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64utf8(s)}?=`)
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

class SmtpHiba extends Error {}

/* ================================================================== */
/* Sablon - az oldal kinézete: sötét háttér, piros kiemelés, gomb      */
/* ================================================================== */

/**
 * @param {object} s
 * @param {string} s.oldalNev     pl. "ZeroCode Mods"
 * @param {string} s.oldalUrl     a főoldal címe
 * @param {string} s.cim          a levél nagy címe
 * @param {string} s.koszontes    pl. "Szia Pista!"
 * @param {string[]} s.bekezdesek szöveges bekezdések
 * @param {{szoveg: string, url: string}} [s.gomb]
 * @param {string} [s.gombAlatt]  halvány megjegyzés a gomb alatt
 * @param {string[]} [s.adatok]   "Cimke: érték" sorok (pl. Név, E-mail)
 * @returns {{ html: string, szoveg: string }}
 */
export function levelSablon(s) {
  const [brandEleje, ...brandTobbi] = s.oldalNev.toUpperCase().split(' ')
  const brandVege = brandTobbi.join(' ')

  const html = `<!DOCTYPE html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(s.cim)}</title></head>
<body style="margin:0;padding:0;background:#0b0b0d;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0d;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#141417;border:1px solid #2a2a30;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e6e6ea;">
  <tr><td style="padding:22px 28px;border-bottom:1px solid #2a2a30;">
    <a href="${esc(s.oldalUrl)}" style="text-decoration:none;">
      <span style="display:inline-block;vertical-align:middle;width:36px;height:36px;line-height:36px;text-align:center;border:1px solid #d61f27;background:#2a0a0c;color:#ff5a60;font-family:Consolas,monospace;font-weight:900;font-size:18px;">Z</span>
      <span style="display:inline-block;vertical-align:middle;margin-left:12px;">
        <span style="display:block;font-size:15px;font-weight:900;letter-spacing:3px;color:#f2f2f4;">${esc(brandEleje)}</span>
        <span style="display:block;font-size:10px;font-weight:700;letter-spacing:6px;color:#ff5a60;margin-top:2px;">${esc(brandVege)}</span>
      </span>
    </a>
  </td></tr>
  <tr><td style="padding:30px 28px 8px;">
    <h1 style="margin:0 0 14px;font-size:22px;line-height:1.2;font-weight:900;letter-spacing:.5px;text-transform:uppercase;color:#f2f2f4;">${esc(s.cim)}</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#c9c9cf;">${esc(s.koszontes)}</p>
    ${s.bekezdesek.map((b) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#c9c9cf;">${esc(b)}</p>`).join('\n    ')}
    ${
      s.adatok?.length
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;border:1px solid #2a2a30;background:#0f0f12;">${s.adatok
            .map((a) => {
              const [c, ...v] = a.split(':')
              return `<tr><td style="padding:8px 14px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#8a8a94;">${esc(c)}</td><td style="padding:8px 14px;font-size:14px;color:#f2f2f4;">${esc(v.join(':').trim())}</td></tr>`
            })
            .join('')}</table>`
        : ''
    }
  </td></tr>
  ${
    s.gomb
      ? `<tr><td style="padding:6px 28px 8px;">
    <a href="${esc(s.gomb.url)}" style="display:inline-block;background:#d61f27;color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:15px 28px;">${esc(s.gomb.szoveg)}</a>
    ${s.gombAlatt ? `<p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:#8a8a94;">${esc(s.gombAlatt)}</p>` : ''}
    <p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#8a8a94;">Ha a gomb nem működik, ezt a címet másold a böngészőbe:<br><a href="${esc(s.gomb.url)}" style="color:#ff5a60;word-break:break-all;">${esc(s.gomb.url)}</a></p>
  </td></tr>`
      : ''
  }
  <tr><td style="padding:22px 28px 26px;border-top:1px solid #2a2a30;font-size:12px;line-height:1.5;color:#8a8a94;">
    ${esc(s.oldalNev)} · <a href="${esc(s.oldalUrl)}" style="color:#8a8a94;">${esc(s.oldalUrl.replace(/^https?:\/\//, ''))}</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`

  const szoveg = [
    s.cim.toUpperCase(),
    '',
    s.koszontes,
    '',
    ...s.bekezdesek.flatMap((b) => [b, '']),
    ...(s.adatok?.length ? [...s.adatok, ''] : []),
    ...(s.gomb ? [`${s.gomb.szoveg}: ${s.gomb.url}`, ...(s.gombAlatt ? [s.gombAlatt] : []), ''] : []),
    s.oldalNev,
  ].join('\n')

  return { html, szoveg }
}

/* ================================================================== */
/* SMTP                                                                */
/* ================================================================== */

/**
 * @param {object} p
 * @param {string} p.felhasznalo  Gmail cím (ez a feladó is)
 * @param {string} p.jelszo       alkalmazásjelszó
 * @param {string} p.feladoNev    pl. "ZeroCode Mods"
 * @param {string} p.cimzett
 * @param {string} p.targy
 * @param {string} p.szoveg       sima szöveges változat
 * @param {string} [p.html]       HTML változat (ha van, mindkettő megy)
 * @param {string} [p.kiszolgalo] "gazda:port" - próbához; TLS csak a 465-ös porton
 */
export async function levelKuldes({ felhasznalo, jelszo, feladoNev, cimzett, targy, szoveg, html, kiszolgalo }) {
  if (!felhasznalo || !jelszo) throw new SmtpHiba('A levélküldés nincs beállítva (Gmail cím és alkalmazásjelszó).')
  const [gazda, portSzoveg] = (kiszolgalo || 'smtp.gmail.com:465').split(':')
  const port = Number(portSzoveg || 465)

  const socket = connect({ hostname: gazda, port }, { secureTransport: port === 465 ? 'on' : 'off', allowHalfOpen: false })
  const iro = socket.writable.getWriter()
  const olvaso = socket.readable.getReader()
  const dekoder = new TextDecoder()
  let puffer = ''

  /** Egy teljes SMTP-válasz (a "250-..." folytatósorokkal együtt). */
  async function valasz() {
    for (;;) {
      const sorok = puffer.split('\r\n')
      for (let i = 0; i < sorok.length - 1; i++) {
        if (/^\d{3} /.test(sorok[i])) {
          const v = sorok.slice(0, i + 1).join('\n')
          puffer = sorok.slice(i + 1).join('\r\n')
          return v
        }
      }
      const { value, done } = await olvaso.read()
      if (done) throw new SmtpHiba('A levelezőkiszolgáló bontotta a kapcsolatot.')
      puffer += dekoder.decode(value, { stream: true })
    }
  }
  async function parancs(sor, vart) {
    if (sor !== null) await iro.write(new TextEncoder().encode(sor + '\r\n'))
    const v = await valasz()
    if (!v.startsWith(String(vart))) {
      throw new SmtpHiba(`SMTP: ${v.split('\n')[0].slice(0, 120)}`)
    }
    return v
  }

  const fejlec = [
    `From: ${fejlecSzoveg(feladoNev)} <${felhasznalo}>`,
    `To: <${cimzett}>`,
    `Subject: ${fejlecSzoveg(targy)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@zerocode-mods.pages.dev>`,
    'MIME-Version: 1.0',
  ]
  let torzs
  if (html) {
    const hatar = `----=_zc_${crypto.randomUUID().replace(/-/g, '')}`
    fejlec.push(`Content-Type: multipart/alternative; boundary="${hatar}"`)
    torzs = [
      `--${hatar}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      b64Sorok(szoveg),
      `--${hatar}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      b64Sorok(html),
      `--${hatar}--`,
    ].join('\r\n')
  } else {
    fejlec.push('Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64')
    torzs = b64Sorok(szoveg)
  }

  try {
    await parancs(null, 220)
    await parancs('EHLO zerocode-mods.pages.dev', 250)
    await parancs(`AUTH PLAIN ${btoa(`\0${felhasznalo}\0${jelszo}`)}`, 235)
    await parancs(`MAIL FROM:<${felhasznalo}>`, 250)
    await parancs(`RCPT TO:<${cimzett}>`, 250)
    await parancs('DATA', 354)
    await parancs([...fejlec, '', torzs].join('\r\n') + '\r\n.', 250)
    await parancs('QUIT', 221)
  } finally {
    try {
      await iro.close()
    } catch {
      /* már zárva */
    }
    try {
      await socket.close()
    } catch {
      /* már zárva */
    }
  }
}
