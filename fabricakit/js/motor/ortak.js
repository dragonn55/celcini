/* Motorun ortak yardımcıları: kimlik üretimi ve günlük (bildirim) kaydı.
   Bildirim metinleri gerçek oda adını kullanır ("Satın Alma: sipariş düştü"). */

export function yeniId(durum, onek) {
  durum.sonId += 1;
  return `${onek}${durum.sonId}`;
}

/* seviye: "bilgi" | "dikkat" | "acil" */
export function bildir(durum, oda, metin, seviye = "bilgi") {
  durum.gunluk.push({ id: yeniId(durum, "G"), dk: durum.dk, oda, metin, seviye });
  durum.degisim += 1;
}

export const kimlikSirasi = (a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1));
