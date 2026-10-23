/* Oyun saati ve sayaçlar: her oyun dakikasında sırayla satın alma sayaçları, kararlar ve olaylar, üretim.
   Sayaçlar yalnızca oyun saati işlerken akar (gece durur, sabah kaldığı yerden devam eder). */
import { GUN_SONU } from "./zaman.js";
import { satinalmaDakikasi } from "./satinalma.js";
import { olayDakikasi } from "./olaylar.js";
import { uretimDakikasi } from "./uretim.js";
import { gunuKapat } from "./gunsonu.js";

function birDakika(durum) {
  satinalmaDakikasi(durum);
  olayDakikasi(durum);
  uretimDakikasi(durum);
  durum.dk += 1;
  if (durum.dk >= GUN_SONU) gunuKapat(durum);
}

export function ilerle(durum, dakika) {
  for (let i = 0; i < dakika && durum.evre === "oyun"; i++) birDakika(durum);
}

/* "Günü bitir": saat 18:00'e kadar hızlı ilerler. Hat çalışır, sayaçlar akar, olaylar gelir.
   Oyuncunun eli gereken yerde durur (durak): karar bekleyen olay ve hızlı ilerleme dururken verilen siparişin
   tedarikçi onayı. Karar verilip onay alınınca arayüz "Günü bitir"i yeniden gönderir, ilerleme kaldığı yerden sürer.
   Dönüş: { durak } ya da gün kapandıysa {} */
export function hizliBitir(durum) {
  if (durum.evre !== "oyun") return {};
  durum.bitirDk = durum.dk;
  durum.bitirme = { siparis: null };
  while (durum.evre === "oyun") {
    const durak = bitirmeDuragi(durum);
    if (durak) {
      durum.degisim += 1;
      return { durak };
    }
    birDakika(durum);
  }
  return {};
}

/* Hızlı ilerlemenin beklediği iş: { tur: "karar" | "onay", id, oda } ya da null */
export function bitirmeDuragi(durum) {
  const k = durum.kararlar.find((x) => x.durum === "bekliyor");
  if (k) return { tur: "karar", id: k.id, oda: k.oda };
  const s = durum.satinalma.find((x) => x.bitirmede && x.durum === "onay-bekliyor");
  return s ? { tur: "onay", id: s.id, oda: "satinalma" } : null;
}

/* Süren sayaçlar (arayüzdeki sayaç şeridi için): onay bekleyen siparişler ve kalite kararları */
export function sayaclar(durum) {
  const liste = [];
  for (const s of durum.satinalma) {
    if (s.durum === "yanit-bekliyor" || s.durum === "onay-bekliyor") {
      liste.push({ tur: "onay", id: s.id, oda: "satinalma", kalanDk: s.kalanDk, hazir: s.durum === "onay-bekliyor", malzeme: s.malzeme, miktar: s.miktar, tedarikci: s.tedarikci });
    }
  }
  for (const k of durum.kararlar) {
    if (k.durum === "bekliyor" && k.kalanDk != null) liste.push({ tur: "karar", id: k.id, oda: k.oda, kalanDk: k.kalanDk, malzeme: k.malzeme, miktar: k.miktar });
  }
  return liste.sort((a, b) => a.kalanDk - b.kalanDk);
}
