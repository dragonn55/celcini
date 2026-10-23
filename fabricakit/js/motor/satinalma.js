/* Satın Alma (Plüton): sipariş ver, tedarikçi yanıtı, 2 saatlik onay sayacı, teslimat günü ve kapıda teslim alma.
   Bütçe Finans-Muhasebe'den gelir; her harcama günlük bütçeye yazılır. */
import { AYARLAR } from "../ayarlar.js";
import { MALZEME, TEDARIKCI, tedarikEdebilir, tedarikSuresi, birimFiyat } from "../veri/katalog.js";
import { tekSefer } from "../veri/tohum.js";
import { sayi, tl, gunAdi, sure } from "../bicim.js";
import { simdi, gunAyari } from "./zaman.js";
import { puanEkle } from "./puan.js";
import { bildir, yeniId } from "./ortak.js";
import { siparisIhtiyaci, verilmeyenSiparisler } from "./mrp.js";

export const ACIK_SIPARIS = ["yanit-bekliyor", "onay-bekliyor", "onaylandi", "kapida"];
export const malzemeMetni = (m, miktar) => `${MALZEME[m].ad} · ${sayi(miktar)} ${MALZEME[m].birim}`;

/* Günlük bütçeye harcama yazar; bütçe aşılınca puan düşer (günde bir kez) */
export function harca(durum, tutar, neden) {
  durum.butce.harcanan += tutar;
  if (durum.butce.harcanan > durum.butce.limit && !durum.butce.asildi) {
    durum.butce.asildi = true;
    puanEkle(durum, "BUTCE_ASIMI", `Bütçe aşıldı: ${neden} (${tl(durum.butce.harcanan)} / ${tl(durum.butce.limit)})`);
    bildir(durum, "finans", `Finans-Muhasebe: günlük bütçe aşıldı (${tl(durum.butce.harcanan)} / ${tl(durum.butce.limit)}).`, "acil");
  }
}

export function iade(durum, tutar) {
  durum.butce.harcanan = Math.max(0, durum.butce.harcanan - tutar);
}

export function siparisVer(durum, { malzeme, tedarikci, miktar }) {
  if (durum.evre !== "oyun") return { hata: "Gün kapandı." };
  if (!MALZEME[malzeme] || !TEDARIKCI[tedarikci]) return { hata: "Malzeme ya da tedarikçi seçilmedi." };
  if (!tedarikEdebilir(malzeme, tedarikci)) return { hata: `${MALZEME[malzeme].ad} yalnızca ithalatçıdan alınır.` };
  if (!Number.isInteger(miktar) || miktar < 1 || miktar > 1000000) return { hata: "Miktar 1 ile 1.000.000 arasında tam sayı olmalı." };

  const id = yeniId(durum, "S");
  const tohum = gunAyari(durum.gun).tohum;
  const [yAlt, yUst] = AYARLAR.YANIT_SURESI_DK;
  const s = {
    id, malzeme, tedarikci, miktar, tutar: miktar * birimFiyat(malzeme, tedarikci),
    gun: durum.gun, dk: durum.dk, durum: "yanit-bekliyor",
    yanitDk: yAlt + Math.floor(tekSefer(tohum, id, "yanit") * (yUst - yAlt + 1)),
    kalanDk: AYARLAR.ONAY_SURESI_DK, varisGun: null, varisDk: null, kapidaDk: null, teslimDk: null,
  };
  durum.satinalma.push(s);
  /* Görev notunun "Eksik malzemeyi sipariş et" adımı: GEÇ KALINDI / BUGÜN VER kalemi kalmayınca tamam */
  if (!durum.gorev.siparis && !verilmeyenSiparisler(durum).length) durum.gorev.siparis = true;
  bildir(durum, "satinalma", `Satın Alma: sipariş verildi — ${malzemeMetni(malzeme, miktar)}, ${TEDARIKCI[tedarikci].ad}. Tedarikçi yanıtı bekleniyor.`);
  harca(durum, s.tutar, `${MALZEME[malzeme].ad} siparişi`);

  /* Gereksiz fazla sipariş: eldeki + yoldaki + yeni, sipariş defterinin ihtiyacını belirgin aşıyorsa */
  const ihtiyac = siparisIhtiyaci(durum, malzeme);
  const arz = durum.stok[malzeme] + durum.satinalma
    .filter((x) => x.malzeme === malzeme && ACIK_SIPARIS.includes(x.durum))
    .reduce((t, x) => t + x.miktar, 0);
  if (arz > ihtiyac * (1 + AYARLAR.FAZLA_SIPARIS_ORANI) + MALZEME[malzeme].paket) {
    s.fazla = true;
    puanEkle(durum, "FAZLA_SIPARIS", `Gereksiz fazla sipariş: ${malzemeMetni(malzeme, miktar)} (ihtiyaç ${sayi(ihtiyac)}, elde ve yolda ${sayi(arz)})`);
  }
  return { id };
}

export function onayAl(durum, id) {
  const s = durum.satinalma.find((x) => x.id === id);
  if (!s || s.durum !== "onay-bekliyor") return { hata: "Bu sipariş onaya hazır değil." };
  const [vAlt, vUst] = AYARLAR.VARIS_SAATI;
  const tohum = gunAyari(durum.gun).tohum;
  s.durum = "onaylandi";
  s.onayDk = simdi(durum);
  s.varisGun = durum.gun + tedarikSuresi(s.malzeme, s.tedarikci);
  s.varisDk = Math.round((vAlt * 60 + tekSefer(tohum, id, "varis") * (vUst - vAlt) * 60) / 15) * 15;
  durum.gorev.onay = true;
  bildir(durum, "satinalma", `Satın Alma: tedarikçi onayı alındı — ${malzemeMetni(s.malzeme, s.miktar)}. Teslimat ${gunAdi(s.varisGun)}.`);
  return {};
}

export function teslimAl(durum, id) {
  const s = durum.satinalma.find((x) => x.id === id);
  if (!s || s.durum !== "kapida") return { hata: "Kapıda bu teslimat yok." };
  s.durum = "teslim";
  s.teslimDk = simdi(durum);
  durum.stok[s.malzeme] += s.miktar;
  durum.gorev.teslim = true;
  bildir(durum, "depo", `Depo: teslim alındı — ${malzemeMetni(s.malzeme, s.miktar)}.`);
  return {};
}

/* Her oyun dakikası: tedarikçi yanıtı, onay sayacı, düşen sipariş, kapıya gelen teslimat */
export function satinalmaDakikasi(durum) {
  for (const s of durum.satinalma) {
    if (s.durum === "yanit-bekliyor" || s.durum === "onay-bekliyor") {
      s.kalanDk -= 1;
      if (s.durum === "yanit-bekliyor" && AYARLAR.ONAY_SURESI_DK - s.kalanDk >= s.yanitDk) {
        s.durum = "onay-bekliyor";
        bildir(durum, "satinalma", `Satın Alma: ${TEDARIKCI[s.tedarikci].ad} onaya hazır — ${malzemeMetni(s.malzeme, s.miktar)}. Onayı ${sure(s.kalanDk)} içinde alın.`, "dikkat");
      }
      if (s.kalanDk <= 0) {
        s.durum = "dustu";
        iade(durum, s.tutar);
        puanEkle(durum, "UNUTULAN_ONAY", `Unutulan onay: ${malzemeMetni(s.malzeme, s.miktar)} siparişi düştü`);
        bildir(durum, "satinalma", `Satın Alma: onay alınmadı, sipariş düştü — ${malzemeMetni(s.malzeme, s.miktar)}.`, "acil");
      }
    } else if (s.durum === "onaylandi" && (s.varisGun < durum.gun || (s.varisGun === durum.gun && s.varisDk <= durum.dk))) {
      s.durum = "kapida";
      s.kapidaDk = simdi(durum);
      bildir(durum, "depo", `Depo: teslimat kapıda — ${malzemeMetni(s.malzeme, s.miktar)}. Teslim alın.`, "dikkat");
    }
  }
}
