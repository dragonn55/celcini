#!/usr/bin/env python3
"""Ajan GM sesleri (Piper, çevrimdışı): data/ses/cumleler.json'daki sabit cümleleri Türkçe erkek sesle okur,
assets/ses/ajan-gm/<id>.mp3 olarak yazar ve fabricakit/js/ajan-gm/ses-dosyalari.js'i günceller.

Ses: önce tr_TR-fahrettin-medium, olmazsa tr_TR-fettah-medium. Model Piper'ın ses deposundan (huggingface.co) bir kez
indirilir, sonra her şey çevrimdışı çalışır. Metin: cumleler.json'daki "okunus" (seseHazirla: sayılar yazıyla).
Hız yavaş, ton ciddi: length_scale 1,1.
mp3: ffmpeg ile 64 kbps, tek kanal, 22.050 Hz. Baştaki ve sondaki sessizlik kırpılır, ses düzeyi -30 LUFS'a eşitlenir
(--duzey ile değişir): oyunun en yüksek efektleri (sipariş, zil) yaklaşık -35 LUFS, konuşma onların biraz üstünde kalır.
iPhone audio.volume'u yok saydığı için düzey dosyaya işlenir (scripts/ses-tolga.ps1 ile aynı ayarlar).
Her dosya ffprobe ile denetlenir: 0,3 sn'den kısa ya da boşsa yeniden üretilir. Toplam 3 MB'ı geçerse betik durur.
Üretim bitene kadar SES_DOSYALARI_HAZIR false kalır; yarıda kalırsa site cihaz sesine düşer, npm run check uyarır.

Kurulum:    python3 -m venv ~/.piper && ~/.piper/bin/pip install piper-tts      (ffmpeg ve ffprobe da gerekir)
Çalıştırma: ~/.piper/bin/python scripts/ses-piper.py [--model-klasoru KLASOR] [--duzey -30]
Sonra:      npm run check (scripts/ses-test.mjs dosyaları listeyle karşılaştırır)
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
LISTE = KOK / "data/ses/cumleler.json"
CIKTI = KOK / "assets/ses/ajan-gm"
BAYRAK = KOK / "fabricakit/js/ajan-gm/ses-dosyalari.js"
SESLER = ["tr_TR-fahrettin-medium", "tr_TR-fettah-medium"]
LENGTH_SCALE = 1.1
EN_KISA_SN = 0.3
EN_FAZLA_BAYT = 3 * 1024 * 1024
DENEME = 3
DUZEY = -30.0  # LUFS
FFMPEG_SN = 120


def suzgec(duzey):
    """Başa ve sona kısa sessizlik eklenir (hiç sessizliği olmayan seste silenceremove + loudnorm takılıyor), sonra
    sessizlik 0,05 / 0,1 sn kalacak biçimde kırpılır ve düzey eşitlenir"""
    return ("adelay=100,apad=pad_dur=0.2,"
            "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,"
            "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.1,areverse,"
            f"loudnorm=I={duzey:g}:TP=-3:LRA=11")


def ses_ac(klasor):
    """İlk açılabilen sesi döndürür: (ad, PiperVoice)"""
    from piper import PiperVoice
    from piper.download_voices import download_voice
    klasor.mkdir(parents=True, exist_ok=True)
    for ad in SESLER:
        try:
            download_voice(ad, klasor)  # model klasörde varsa indirmez
            return ad, PiperVoice.load(klasor / f"{ad}.onnx")
        except Exception as e:  # indirme engeli, bozuk model…
            print(f"! {ad} kullanılamadı: {e}", file=sys.stderr)
    sys.exit("Türkçe erkek ses indirilemedi ya da açılamadı (huggingface.co erişimi gerekir). "
             "Windows'ta scripts/ses-tolga.ps1 kullanılabilir.")


def mp3_uret(ses, metin, mp3, gecici, duzey):
    from piper import SynthesisConfig
    wav = gecici / "ses.wav"
    with wave.open(str(wav), "wb") as w:
        ses.synthesize_wav(metin, w, syn_config=SynthesisConfig(length_scale=LENGTH_SCALE))
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(wav), "-af", suzgec(duzey), "-ac", "1", "-ar", "22050",
                    "-c:a", "libmp3lame", "-b:a", "64k", "-map_metadata", "-1", str(mp3)], check=True, timeout=FFMPEG_SN)


def sure(yol):
    """Saniye; okunamazsa 0"""
    try:
        cikti = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(yol)],
                               capture_output=True, text=True, check=True).stdout
        return float(cikti.strip() or 0)
    except (subprocess.CalledProcessError, ValueError):
        return 0.0


def bayrak_yaz(hazir, kaynak):
    metin = BAYRAK.read_text(encoding="utf-8")
    yeni, n1 = re.subn(r"SES_DOSYALARI_HAZIR = (true|false);", f"SES_DOSYALARI_HAZIR = {'true' if hazir else 'false'};", metin)
    yeni, n2 = re.subn(r'SES_KAYNAGI = ".*";', lambda _: f"SES_KAYNAGI = {json.dumps(kaynak, ensure_ascii=False)};", yeni)
    if (n1, n2) != (1, 1):
        sys.exit(f"{BAYRAK.relative_to(KOK)} beklenen biçimde değil (SES_DOSYALARI_HAZIR ve SES_KAYNAGI satırları).")
    BAYRAK.write_text(yeni, encoding="utf-8", newline="\n")


def main():
    ap = argparse.ArgumentParser(description="Ajan GM ses dosyalarını Piper ile üretir.")
    ap.add_argument("--model-klasoru", type=Path, default=Path.home() / ".cache/piper", help="Piper ses modellerinin klasörü")
    ap.add_argument("--duzey", type=float, default=DUZEY, help="hedef ses düzeyi, LUFS (varsayılan -30)")
    args = ap.parse_args()
    for arac in ("ffmpeg", "ffprobe"):
        if not shutil.which(arac):
            sys.exit(f"{arac} bulunamadı: kurun (ör. sudo apt install ffmpeg) ve yeniden çalıştırın.")
    liste = json.loads(LISTE.read_text(encoding="utf-8"))
    ad, ses = ses_ac(args.model_klasoru)
    print(f"Ses: {ad}, {len(liste)} cümle, düzey {args.duzey:g} LUFS")
    CIKTI.mkdir(parents=True, exist_ok=True)
    bayrak_yaz(False, "")
    with tempfile.TemporaryDirectory() as g:
        for c in liste:
            mp3 = CIKTI / c["dosya"]
            for deneme in range(1, DENEME + 1):
                try:
                    mp3_uret(ses, c["okunus"], mp3, Path(g), args.duzey)
                    sn = sure(mp3)
                except (subprocess.CalledProcessError, subprocess.TimeoutExpired):  # boş ses ya da takılan ffmpeg
                    sn = 0.0
                if sn >= EN_KISA_SN:
                    break
                print(f"! {c['dosya']}: {sn:.2f} sn, yeniden üretiliyor ({deneme}/{DENEME})", file=sys.stderr)
            else:
                sys.exit(f"{c['dosya']} {DENEME} denemede de {EN_KISA_SN} sn'ye ulaşmadı.")
            print(f"✓ {c['dosya']}: {sn:.1f} sn, {mp3.stat().st_size / 1024:.0f} KB")
    beklenen = {c["dosya"] for c in liste}
    for f in sorted(CIKTI.glob("*.mp3")):
        if f.name not in beklenen:
            f.unlink()
            print(f"- listede olmayan {f.name} silindi")
    toplam = sum((CIKTI / d).stat().st_size for d in beklenen)
    if toplam > EN_FAZLA_BAYT:
        sys.exit(f"Toplam {toplam / 1048576:.2f} MB, 3 MB sınırı aşıldı (SES_DOSYALARI_HAZIR false kaldı).")
    kaynak = f"Piper {ad}"
    bayrak_yaz(True, kaynak)
    print(f"\n{len(liste)} dosya, toplam {toplam / 1048576:.2f} MB, ses: {kaynak}. Şimdi: npm run check")


if __name__ == "__main__":
    main()
