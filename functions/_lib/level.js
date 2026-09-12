/**
 * Levélküldés Gmailen át - SMTP a Cloudflare saját socketjével.
 *
 * A Gmailhez alkalmazásjelszó kell (Google-fiók → Biztonság → Kétlépcsős
 * azonosítás → Alkalmazásjelszavak). A cím és a jelszó Pages-titok:
 * GMAIL_CIM és GMAIL_JELSZO - a szerkesztő tölti fel őket.
 *
 * smtp.gmail.com:465, azonnali TLS; AUTH PLAIN. A törzs base64-ben megy,
 * így az ékezetek és a sorhosszak biztosan rendben vannak.
 */
import { connect } from 'cloudflare:sockets'

const b64utf8 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)))
/** Fejlécbe való szöveg (tárgy, név) - az RFC 2047 "encoded word" alakja. */
const fejlecSzoveg = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64utf8(s)}?=`)

class SmtpHiba extends Error {}

/**
 * @param {object} p
 * @param {string} p.felhasznalo  Gmail cím (ez a feladó is)
 * @param {string} p.jelszo       alkalmazásjelszó
 * @param {string} p.feladoNev    pl. "ZeroCode Mods"
 * @param {string} p.cimzett
 * @param {string} p.targy
 * @param {string} p.szoveg       sima szöveg
 * @param {string} [p.kiszolgalo] "gazda:port" - próbához; TLS csak a 465-ös porton
 */
export async function levelKuldes({ felhasznalo, jelszo, feladoNev, cimzett, targy, szoveg, kiszolgalo }) {
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

  try {
    await parancs(null, 220)
    await parancs('EHLO zerocode-mods.pages.dev', 250)
    await parancs(`AUTH PLAIN ${btoa(`\0${felhasznalo}\0${jelszo}`)}`, 235)
    await parancs(`MAIL FROM:<${felhasznalo}>`, 250)
    await parancs(`RCPT TO:<${cimzett}>`, 250)
    await parancs('DATA', 354)
    const uzenet = [
      `From: ${fejlecSzoveg(feladoNev)} <${felhasznalo}>`,
      `To: <${cimzett}>`,
      `Subject: ${fejlecSzoveg(targy)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@zerocode-mods.pages.dev>`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      b64utf8(szoveg).replace(/(.{76})/g, '$1\r\n'),
    ].join('\r\n')
    await parancs(uzenet + '\r\n.', 250)
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
