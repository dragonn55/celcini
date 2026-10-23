/* Günün kapanışı (18:00 ya da "Günü bitir"): unutulan işler, sevkiyat, ikinci vardiya, karne. */
import { AYARLAR } from "../ayarlar.js";
import { GUN_SONU, mutlak } from "./zaman.js";
import { acikSatirlar, sevkiyat } from "./siparis.js";
import { ikinciVardiya } from "./uretim.js";
import { verilmeyenSiparisler } from "./mrp.js";
import { malzemeMetni } from "./satinalma.js";
import { puanEkle } from "./puan.js";
import { karneOlustur } from "./karne.js";
import { kuralYorumu } from "../ajan-gm/yorumlar.js";

export function gunuKapat(durum) {
  if (durum.evre !== "oyun") return;
  durum.dk = GUN_SONU;
  const ayrilis = mutlak(durum.gun, durum.bitirDk ?? GUN_SONU);

  /* Unutulan işler */
  if (!durum.planBilgi.guncel && acikSatirlar(durum).length) {
    puanEkle(durum, "UNUTULAN_IS", "Unutulan iş: siparişler plana alınmadı ya da plan güncellenmedi");
  }
  const unutulanMalzemeler = verilmeyenSiparisler(durum).slice(0, AYARLAR.UNUTULAN_MALZEME_EN_FAZLA);
  for (const m of unutulanMalzemeler) {
    puanEkle(durum, "UNUTULAN_IS", `Unutulan iş: sipariş verilmedi — ${m.ad} (${m.durum === "gec-kaldi" ? "geç kalınmıştı" : "bugün verilmeliydi"})`);
  }
  for (const s of durum.satinalma) {
    if (s.durum === "kapida" && s.kapidaDk <= ayrilis - AYARLAR.KAPIDA_BEKLEME_DK) {
      puanEkle(durum, "UNUTULAN_IS", `Unutulan iş: kapıdaki teslimat alınmadı — ${malzemeMetni(s.malzeme, s.miktar)}`);
    }
  }

  const sevk = sevkiyat(durum);
  const gece = ikinciVardiya(durum);
  durum.evre = "gun-sonu";
  durum.karne = karneOlustur(durum, { sevk, gece, unutulanMalzemeler: unutulanMalzemeler.map((m) => m.id) });
  const yorum = kuralYorumu(durum.karne, durum.gmKullanilan);
  durum.karne.gmYorum = yorum.metin;
  durum.gmKullanilan = durum.gmKullanilan.concat(yorum.sablonlar);
  durum.gecmis = durum.gecmis.filter((g) => g.gun !== durum.gun).concat([{ gun: durum.gun, puan: durum.karne.puan, harf: durum.karne.harf }]);
  durum.degisim += 1;
}
