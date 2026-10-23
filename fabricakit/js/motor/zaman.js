/* Oyun saati. Gün içi dakika (480 = 08:00) ve mutlak dakika (günler boyunca artan) kullanılır. */
import { AYARLAR } from "../ayarlar.js";

export const GUN_BASI = AYARLAR.GUN_BASI_SAAT * 60;
export const GUN_SONU = AYARLAR.GUN_SONU_SAAT * 60;
export const mutlak = (gun, dk) => (gun - 1) * 1440 + dk;
export const simdi = (durum) => mutlak(durum.gun, durum.dk);
export const gunAyari = (gun) => AYARLAR.GUNLER[Math.min(gun, AYARLAR.GUNLER.length) - 1];
export const sonGun = () => AYARLAR.GUNLER.length;
