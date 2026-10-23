/* Katalog: ayarlardaki ürün, hat, malzeme ve tedarikçi listelerine kimlikle erişim. */
import { AYARLAR } from "../ayarlar.js";

const sozluk = (liste) => Object.fromEntries(liste.map((x) => [x.id, x]));

export const URUN = sozluk(AYARLAR.URUNLER);
export const HAT = sozluk(AYARLAR.HATLAR);
export const MALZEME = sozluk(AYARLAR.MALZEMELER);
export const TEDARIKCI = sozluk(AYARLAR.TEDARIKCILER);
export const URUN_IDLER = AYARLAR.URUNLER.map((u) => u.id);
export const HAT_IDLER = AYARLAR.HATLAR.map((h) => h.id);
export const MALZEME_IDLER = AYARLAR.MALZEMELER.map((m) => m.id);

export const hatUrunleri = (hatId) => AYARLAR.URUNLER.filter((u) => u.hat === hatId).map((u) => u.id);

export function tedarikEdebilir(malzemeId, tedarikciId) {
  return !MALZEME[malzemeId].ithal || Boolean(TEDARIKCI[tedarikciId].ithalat);
}

export function tedarikSuresi(malzemeId, tedarikciId) {
  return TEDARIKCI[tedarikciId].sure + (MALZEME[malzemeId].ithal ? AYARLAR.ITHAL_EK_GUN : 0);
}

export function birimFiyat(malzemeId, tedarikciId) {
  return Math.round(MALZEME[malzemeId].fiyat * TEDARIKCI[tedarikciId].fiyatKatsayi);
}

/* Takvimde esas alınan tedarikçi: ithal kalemde ithalatçı, diğerlerinde standart tedarikçi */
export function standartTedarikci(malzemeId) {
  if (MALZEME[malzemeId].ithal) return AYARLAR.TEDARIKCILER.find((t) => t.ithalat).id;
  return AYARLAR.STANDART_TEDARIKCI;
}

/* Malzemenin kullanıldığı hat (yeniden işleme bu hatta yapılır); iki hatta da kullanılıyorsa ilki */
export function malzemeninHatti(malzemeId, urunAgaci = AYARLAR.URUN_AGACI) {
  for (const u of AYARLAR.URUNLER) if ((urunAgaci[u.id] || {})[malzemeId]) return u.hat;
  return AYARLAR.HATLAR[0].id;
}

export const yuvarlaYukari = (sayi, adim) => Math.ceil(sayi / adim) * adim;
