#!/usr/bin/env node
/* Ana sayfadaki "Akşam Ajan GM karneni verir" örneği: Fabricakit motorunun 1. gün için ürettiği gerçek karneden kesit.
   Senaryo (SENARYO metni ana sayfada da yazar) burada adım adım oynanır; harf notu, dört gösterge, Ajan GM yorumu
   (kural modu) ve hazır sorular data/karne-ornegi.json'a yazılır. scripts/derle.py bu dosyayı okur;
   scripts/sim-test.mjs dosyanın motorun bugünkü çıktısıyla aynı olduğunu denetler.
   Oyun kuralı ya da şablon değişince: node scripts/karne-ornegi.mjs && python3 scripts/derle.py */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { olusturStore } from "../fabricakit/js/motor/durum.js";
import { malzemeIhtiyaci } from "../fabricakit/js/motor/mrp.js";
import { onerilenTedarikci } from "../fabricakit/js/arayuz/panel-planlama.js";
import { karneOlculeri, hitapla } from "../fabricakit/js/arayuz/karne.js";
import { VARSAYILAN_HITAP } from "../fabricakit/js/arayuz/giris.js";
import { SORULAR } from "../fabricakit/js/ajan-gm/yorumlar.js";
import { gunAdi } from "../fabricakit/js/bicim.js";

const DOSYA = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "karne-ornegi.json");
const BITIR_SAAT = 9;
export const SENARYO = "Oyuncu 08:00'de siparişleri plana aldı, GEÇ KALINDI ve BUGÜN VER kalemlerini önerilen tedarikçi ve miktarla sipariş etti, "
  + "onayları aldı; 09:00'da \"Günü bitir\"e bastı, Kalite durağında \"Yeniden işle\" dedi.";

export function karneOrnegi() {
  const s = olusturStore();
  const isler = () => {
    const d = s.durum;
    if (!d.planBilgi.guncel) s.gonder({ tip: "PLANA_AL" });
    if (!d.gorev.ihtiyac) s.gonder({ tip: "IHTIYAC_GORULDU" });
    for (const m of malzemeIhtiyaci(d)) {
      if ((m.durum === "gec-kaldi" || m.durum === "bugun-ver") && m.onerilen > 0) s.gonder({ tip: "SIPARIS_VER", malzeme: m.id, tedarikci: onerilenTedarikci(m), miktar: m.onerilen });
    }
    for (const x of d.satinalma) if (x.durum === "onay-bekliyor") s.gonder({ tip: "ONAY_AL", id: x.id });
  };
  while (s.durum.dk < BITIR_SAAT * 60) { isler(); s.gonder({ tip: "ILERLE", dk: 5 }); }
  for (let r = s.gonder({ tip: "GUNU_BITIR" }); r.durak; r = s.gonder({ tip: "GUNU_BITIR" })) {
    if (r.durak.tur === "onay") s.gonder({ tip: "ONAY_AL", id: r.durak.id });
    else s.gonder({ tip: "KARAR", id: r.durak.id, secim: s.durum.kararlar.find((k) => k.id === r.durak.id).tur === "bozuk-parti" ? "yeniden-isle" : "bekle" });
  }
  const k = s.durum.karne;
  return {
    senaryo: SENARYO,
    gun: gunAdi(k.gun),
    harf: k.harf,
    puan: k.puan,
    olculer: karneOlculeri(k),
    hitap: VARSAYILAN_HITAP,
    gmYorum: hitapla(k.gmYorum, VARSAYILAN_HITAP),
    sorular: SORULAR.map((x) => x.metin),
  };
}

export const ornekMetni = () => `${JSON.stringify(karneOrnegi(), null, 2)}\n`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(DOSYA, ornekMetni());
  console.log(`✓ ${path.relative(process.cwd(), DOSYA)} yazıldı.`);
}
