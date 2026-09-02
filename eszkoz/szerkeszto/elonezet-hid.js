/*
 * Híd az előnézet és a szerkesztő formázó panele között.
 *
 * A helyi előnézeti kiszolgáló ezt a szkriptet fűzi hozzá minden kiszolgált
 * oldalhoz. Csak a szerkesztőben fut, az éles weboldalra soha nem kerül ki.
 *
 * Amit csinál:
 *   - figyeli, mit jelöl ki az egérrel a felhasználó az előnézetben,
 *   - megmondja a szerkesztőnek, melyik mezőben és hányadik karaktertől
 *     hányadikig tart a kijelölés,
 *   - a szerkesztőtől visszakapott új tartalmat beteszi az oldalba, hogy a
 *     szín és az animáció azonnal látszódjon.
 */
;(function () {
  var JELOLO = '[data-zc-mezo]'

  /** Hányadik karakternél tart a csomópont az elem szövegében? */
  function eltolas(elem, csomo, hely) {
    if (csomo === elem) {
      // A böngésző néha magára az elemre mutat: a gyerekek hosszát adjuk.
      var db = 0
      for (var i = 0; i < hely && i < elem.childNodes.length; i++) {
        db += (elem.childNodes[i].textContent || '').length
      }
      return db
    }
    var jaro = document.createTreeWalker(elem, NodeFilter.SHOW_TEXT)
    var eddig = 0
    var n
    while ((n = jaro.nextNode())) {
      if (n === csomo) return eddig + hely
      eddig += n.textContent.length
    }
    return -1
  }

  /** Tartomány készítése karakter-eltolásokból. */
  function tartomany(elem, kezd, veg) {
    var jaro = document.createTreeWalker(elem, NodeFilter.SHOW_TEXT)
    var eddig = 0
    var r = document.createRange()
    var vanEleje = false
    var n
    while ((n = jaro.nextNode())) {
      var hossz = n.textContent.length
      if (!vanEleje && kezd <= eddig + hossz) {
        r.setStart(n, Math.max(0, kezd - eddig))
        vanEleje = true
      }
      if (vanEleje && veg <= eddig + hossz) {
        r.setEnd(n, Math.max(0, veg - eddig))
        return r
      }
      eddig += hossz
    }
    return vanEleje ? r : null
  }

  function kuld(uzenet) {
    try {
      window.parent.postMessage(uzenet, '*')
    } catch (e) {
      /* nincs szülő ablak - nem baj */
    }
  }

  var utolso = ''

  function jelent() {
    var s = document.getSelection()
    if (!s || s.rangeCount === 0 || s.isCollapsed) {
      if (utolso !== 'ures') {
        utolso = 'ures'
        kuld({ tipus: 'zc-elonezet-kijeloles', ures: true })
      }
      return
    }
    var r = s.getRangeAt(0)
    var e = r.commonAncestorContainer
    if (e.nodeType !== 1) e = e.parentElement
    var cel = e && e.closest ? e.closest(JELOLO) : null
    if (!cel) {
      if (utolso !== 'kivul') {
        utolso = 'kivul'
        kuld({ tipus: 'zc-elonezet-kijeloles', ures: true, kivul: true })
      }
      return
    }
    var kezd = eltolas(cel, r.startContainer, r.startOffset)
    var veg = eltolas(cel, r.endContainer, r.endOffset)
    if (kezd < 0 || veg < 0 || veg <= kezd) return

    var mezo = cel.getAttribute('data-zc-mezo')
    utolso = mezo + ':' + kezd + ':' + veg
    kuld({
      tipus: 'zc-elonezet-kijeloles',
      mezo: mezo,
      kezd: kezd,
      veg: veg,
      szoveg: r.toString(),
      // Az állandó feliratoknak nincs tárolt értékük, amíg hozzá nem nyúlsz.
      // Ilyenkor ez a jelenlegi tartalom lesz a kiindulás.
      alap: cel.innerHTML,
    })
  }

  document.addEventListener('selectionchange', jelent)
  document.addEventListener('mouseup', jelent)
  document.addEventListener('keyup', jelent)

  /** A jelölővel ellátott elem megkeresése. */
  function mezotKeres(mezo) {
    var lista = document.querySelectorAll(JELOLO)
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].getAttribute('data-zc-mezo') === mezo) return lista[i]
    }
    return null
  }

  window.addEventListener('message', function (esemeny) {
    var a = esemeny.data
    if (!a || typeof a !== 'object') return

    // Új tartalom egy mezőbe (a szerkesztő már megszűrte)
    if (a.tipus === 'zc-elonezet-frissit') {
      // Ugyanaz az adat több helyen is megjelenhet az oldalon.
      var mind = document.querySelectorAll(JELOLO)
      var cel = null
      for (var m = 0; m < mind.length; m++) {
        if (mind[m].getAttribute('data-zc-mezo') !== a.mezo) continue
        mind[m].innerHTML = a.html
        if (!cel) cel = mind[m]
      }
      if (!cel) return
      if (typeof a.kezd === 'number' && typeof a.veg === 'number') {
        var r = tartomany(cel, a.kezd, a.veg)
        if (r) {
          var s = document.getSelection()
          s.removeAllRanges()
          s.addRange(r)
        }
      }
      return
    }

    // Animációk újraindítása, hogy lássa, milyen lesz
    if (a.tipus === 'zc-elonezet-ujrajatszas') {
      var gyoker = a.mezo ? mezotKeres(a.mezo) : document.body
      if (!gyoker) return
      var mozgok = gyoker.querySelectorAll('[class*="zc-anim-"]')
      for (var j = 0; j < mozgok.length; j++) {
        var span = mozgok[j]
        var osztalyok = []
        for (var k = 0; k < span.classList.length; k++) {
          if (span.classList[k].indexOf('zc-anim-') === 0) osztalyok.push(span.classList[k])
        }
        if (!osztalyok.length) continue
        span.classList.remove.apply(span.classList, osztalyok)
        void span.offsetWidth
        span.classList.add.apply(span.classList, osztalyok)
      }
    }
  })

  kuld({ tipus: 'zc-elonezet-kesz' })
})()
