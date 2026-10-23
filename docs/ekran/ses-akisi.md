# Ajan GM sesi: telefonda ve masaüstünde akış

Ajan GM'nin sabit cümleleri `assets/ses/ajan-gm/<id>.mp3`'ten sabit erkek sesle çalar. Hitap, sayı ve ürün adı gibi
değişken parçalar cihazın Türkçe sesiyle okunur. Hangi parçanın dosyadan çalacağına `fabricakit/js/ajan-gm/cumleler.js`
karar verir (40 cümle).

Ses dosyaları üretilene kadar (`ses-dosyalari.js`'te `SES_DOSYALARI_HAZIR = false`) her şey eskisi gibi cihaz sesiyle okunur.
Bir dosya açılamazsa o parça da cihaz sesine düşer.

## Açılış ekranı

- **Telefon ve masaüstü:** "Ajan GM konuşsun" düğmesine basınca `acilis.mp3` çalar. Cümlenin tamamı sabit olduğu için
  cihaz sesi hiç devreye girmez. Okurken düğme "Durdur" olur; bir daha basınca susar.
- Görüntüler: `ajan-gm-sesi-giris-telefon.jpg`, `ajan-gm-sesi-giris-masaustu.jpg`

## Kilit ekranı (2. gün)

- **Telefon ve masaüstü:** "Ajan GM konuşsun" düğmesine basınca önce hitap ("Ayşe Hanım,") cihaz sesiyle okunur, ardından
  `kilit.mp3` çalar.
- Cihazda Türkçe ses yoksa hitap atlanır ve yalnızca `kilit.mp3` çalar. Hitap ekranda yazılı durur.
- Görüntüler: `ajan-gm-sesi-kilit-telefon.jpg`, `ajan-gm-sesi-kilit-masaustu.jpg`

## Karne

"Sesli oku" düğmesi önce günün yorumunu, sonra Sorgula cevaplarını okur. Örnek bir C günü:

| Sıra | Parça | Kaynak |
| --- | --- | --- |
| 1 | "Ayşe Hanım," | cihaz sesi |
| 2 | "fabrika bugün yarım güçle çalıştı" | `not-c-1.mp3` |
| 3 | "yetmiş yedi puan, C. beş iş zamanında yapılmadı. İlki: …" | cihaz sesi |
| 4 | "Yarın için talimatım:" | `talimat.mp3` |
| 5 | "gün içinde sipariş ya da kapasite değişirse bir saat içinde planı güncelleyin." | `talimat-unutulan-is-guncelle-1.mp3` |
| 6 | Sorgula cevapları (sayılı) | cihaz sesi |
| 7 | "Yarın ne yapmalıyım?" cevabında talimatın gövdesi | ilgili `talimat-….mp3` |

- Cihazda Türkçe ses yoksa 1, 3 ve 6. satırlar atlanır; yalnızca mp3'ler çalar.
- Ne kadarı erkek sesle? sim-test'teki 220 karnede, karakter sayısına göre:
  - yorumun yaklaşık %46'sı,
  - Sorgula cevaplarının yaklaşık %9'u,
  - ikisi birlikte yaklaşık %19'u.

  Gerisi sayı, hitap ve kalem adı olduğu için cihaz sesinde kalır.
- Görüntüler: `karne-sesli-oku-telefon.jpg`, `karne-sesli-oku-masaustu.jpg` (önceki turdan, düğme aynı)

## Ses kapalıyken

- Hiçbir ses çalmaz; buna Ajan GM de dahildir. Düğme pasif kalır, yanında "Sesi aç" çıkar.
- Açılış, kilit ve karne ekranlarında hoparlör düğmesi yoktur. "Sesi aç" düğmesi bu ekranlarda sesi açmanın tek yoludur.
- Görüntüler: `ajan-gm-sesi-kapali-telefon.jpg`, `ajan-gm-sesi-kapali-masaustu.jpg`

## Hoparlör ipucu

- **Telefon ve masaüstü:** hoparlörle ses açılınca bildirim balonu çıkar: "Ses açık. iPhone'da sessiz anahtarı açıksa ses
  çıkmaz." Ses kapatılınca balon çıkmaz.
- **Masaüstü:** fare hoparlör düğmesinin üzerine gelince aynı ipucu düğmenin üzerinde de görünür.
- Görüntüler: `ajan-gm-sesi-ipucu-telefon.jpg`, `ajan-gm-sesi-ipucu-masaustu.jpg`

## iPhone'a özel davranış

- iPhone'da ses dosyası da konuşma da ancak dokunuşla başlayabilir. İlk parça dokunuşun içinde başlar. Öteki türün kilidi
  aynı dokunuşta açılır: konuşma önce geliyorsa ses öğesi sessizce başlatılıp hemen durdurulur.
- iPhone'da ses motoru ilk dokunuştan hemen sonra bir an askıda kalabilir. O sırada gelen efekt (ilk "sipariş geldi")
  artık atlanmaz: kuyruğa girer ve motor açılınca çalar. Kuyruk en fazla 2 efekt tutar; 2 saniyeden eski efekt çalmaz.
- Ses dosyalarının ses düzeyi -30 LUFS'a eşitlenir; düzey dosyaya işlenir, çünkü iPhone `audio.volume` ayarını yok sayar.
  Oyunun en yüksek efektleri (sipariş, zil) yaklaşık -35 LUFS'tur; konuşma onların biraz üstünde kalır.
- Sayfa arka plana geçince (başka uygulamaya ya da sekmeye geçilince) Ajan GM susar.

## Telefonda denenecekler (ses dosyaları yüklendikten sonra)

1. Açılış: "Ajan GM konuşsun" ile erkek ses duyuluyor mu?
2. Kilit: hitap (cihaz sesi) ile kilit cümlesi (erkek ses) arka arkaya ve takılmadan geliyor mu?
3. Karne: "Sesli oku" karışık akışı sırayla okuyor mu? "Durdur" hemen kesiyor mu?
4. Sessiz anahtar açıkken: efektler susmalı (beklenen). Ajan GM'nin mp3'ü ve cihaz sesi ne yapıyor? Not alın.
5. Ses düzeyi: erkek ses, efektler ve cihaz sesi arasında rahatsız eden bir fark var mı? Hitap ve sayılar (cihaz sesi)
   erkek sesten belirgin yüksek kalabilir. Erkek ses kısık gelirse sesler daha yüksek düzeyle yeniden üretilir:
   `-Duzey -26` (Windows) ya da `--duzey -26` (Piper).
