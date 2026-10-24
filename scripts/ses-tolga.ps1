<#
.SYNOPSIS
  Ajan GM sesleri (Windows, çevrimdışı): data/ses/cumleler.json'daki sabit cümleleri "Microsoft Tolga" sesiyle okur.

.DESCRIPTION
  Her cümle önce wav olarak üretilir (%TEMP%\celcini-ses). ffmpeg varsa assets\ses\ajan-gm\<id>.mp3'e çevrilir:
  64 kbps, tek kanal, 22.050 Hz; baştaki ve sondaki sessizlik kırpılır, ses düzeyi -30 LUFS'a eşitlenir (-Duzey ile
  değişir; oyunun en yüksek efektleri yaklaşık -35 LUFS). Ayarlar scripts/ses-piper.py ile aynı. Her mp3 ffprobe ile denetlenir: 0,3 sn'den kısa ya da boşsa yeniden
  üretilir. Toplam 3 MB'ı geçemez. Bitince fabricakit\js\ajan-gm\ses-dosyalari.js'te SES_DOSYALARI_HAZIR true olur;
  o zamana kadar site cihaz sesine düşer.
  Metin: cumleler.json'daki "okunus" (sayılar yazıyla). Hız biraz yavaş (ciddi ton).
  Ses önce System.Speech'te aranır. Tolga orada yoksa (Windows 10/11'de çoğunlukla yalnız yeni konuşma altyapısında
  kuruludur) Windows.Media.SpeechSynthesis kullanılır. İnternet gerekmez.

  Gerekenler:
  - Türkçe konuşma sesi: Ayarlar > Saat ve dil > Konuşma > Ses ekle > Türkçe (Türkiye)
  - ffmpeg: winget install Gyan.FFmpeg (kurduktan sonra yeni bir PowerShell penceresi açın)

.PARAMETER Duzey
  Hedef ses düzeyi (LUFS). Varsayılan -30; daha yüksek ses için örneğin -26.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\ses-tolga.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\ses-tolga.ps1 -Duzey -26
#>
param([double]$Duzey = -30)
$ErrorActionPreference = 'Stop'

$kok = Split-Path -Parent $PSScriptRoot
$listeYolu = Join-Path $kok 'data/ses/cumleler.json'
$cikti = Join-Path $kok 'assets/ses/ajan-gm'
$bayrak = Join-Path $kok 'fabricakit/js/ajan-gm/ses-dosyalari.js'
$gecici = Join-Path ([System.IO.Path]::GetTempPath()) 'celcini-ses'
$enKisaSn = 0.3
$enFazlaBayt = 3MB
$denemeSayisi = 3
# Başa ve sona kısa sessizlik eklenir (hiç sessizliği olmayan seste silenceremove + loudnorm takılıyor), sonra kırpılır
$suzgec = 'adelay=100,apad=pad_dur=0.2,' +
  'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,' +
  'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.1,areverse,' +
  'loudnorm=I=' + $Duzey.ToString([System.Globalization.CultureInfo]::InvariantCulture) + ':TP=-3:LRA=11'
$utf8 = New-Object System.Text.UTF8Encoding($false)

# System.Speech: Tolga masaüstü sesi olarak kuruluysa
function SapiSesi {
  try {
    Add-Type -AssemblyName System.Speech
    $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $v = $s.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Name -like '*Tolga*' } | Select-Object -First 1
    if ($v) {
      $s.SelectVoice($v.VoiceInfo.Name)
      $s.Rate = -1
      return $s
    }
    $s.Dispose()
  } catch { }
  return $null
}

# Windows.Media.SpeechSynthesis: Windows 10/11'in yeni konuşma sesleri (Tolga çoğunlukla burada)
function WinRtSesi {
  try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
    $v = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like '*Tolga*' } | Select-Object -First 1
    if (-not $v) { return $null }
    $script:asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
      $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    } | Select-Object -First 1
    $s = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
    $s.Voice = $v
    try { $s.Options.SpeakingRate = 0.9 } catch { }  # Windows 10 1803'ten eskide yok
    return $s
  } catch { return $null }
}

# WinRT işlemini bekler
function Bekle($islem, [Type]$tur) {
  $gorev = $script:asTask.MakeGenericMethod($tur).Invoke($null, @($islem))
  $null = $gorev.Wait(-1)
  return $gorev.Result
}

function WavYaz([string]$metin, [string]$wav) {
  if ($sapi) {
    $bicim = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050,
      [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
    $sapi.SetOutputToWaveFile($wav, $bicim)
    try { $sapi.Speak($metin) } finally { $sapi.SetOutputToNull() }
  } else {
    $akis = Bekle ($winrt.SynthesizeTextToStreamAsync($metin)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
    $dosya = [System.IO.File]::Create($wav)
    try { [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($akis).CopyTo($dosya) } finally { $dosya.Dispose(); $akis.Dispose() }
  }
}

function Mp3Yap([string]$wav, [string]$mp3) {
  & ffmpeg -nostdin -v error -y -i $wav -af $suzgec -ac 1 -ar 22050 -c:a libmp3lame -b:a 64k -map_metadata -1 $mp3
  return ($LASTEXITCODE -eq 0)
}

# Saniye; okunamazsa 0
function Sure([string]$yol) {
  $ErrorActionPreference = 'Continue'  # Windows PowerShell 5.1'de yönlendirilen stderr satırı hata sayılmasın
  $s = & ffprobe -v error -show_entries format=duration -of csv=p=0 $yol 2>$null
  $sn = 0.0
  if ($LASTEXITCODE -ne 0 -or -not $s) { return 0.0 }
  if ([double]::TryParse(($s | Select-Object -First 1).Trim(), [System.Globalization.NumberStyles]::Float,
      [System.Globalization.CultureInfo]::InvariantCulture, [ref]$sn)) { return $sn }
  return 0.0
}

function BayrakYaz([bool]$hazir, [string]$kaynak) {
  $metin = [System.IO.File]::ReadAllText($bayrak, $utf8)
  $deger = if ($hazir) { 'true' } else { 'false' }
  $desen1 = [regex]'SES_DOSYALARI_HAZIR = (true|false);'
  $desen2 = [regex]'SES_KAYNAGI = ".*";'
  if ($desen1.Matches($metin).Count -ne 1 -or $desen2.Matches($metin).Count -ne 1) {
    throw "ses-dosyalari.js beklenen biçimde değil (SES_DOSYALARI_HAZIR ve SES_KAYNAGI satırları)."
  }
  $metin = $desen1.Replace($metin, "SES_DOSYALARI_HAZIR = $deger;")
  $metin = $desen2.Replace($metin, { param($m) 'SES_KAYNAGI = "' + $kaynak + '";' })
  [System.IO.File]::WriteAllText($bayrak, $metin, $utf8)
}

# ---------------- ana akış ----------------
$liste = [System.IO.File]::ReadAllText($listeYolu, $utf8) | ConvertFrom-Json
$sapi = SapiSesi
$winrt = $null
if (-not $sapi) { $winrt = WinRtSesi }
if (-not $sapi -and -not $winrt) {
  throw '"Microsoft Tolga" sesi bulunamadı. Ayarlar > Saat ve dil > Konuşma > Ses ekle > Türkçe (Türkiye) ile kurun, sonra yeniden çalıştırın.'
}
$kaynak = if ($sapi) { 'Microsoft Tolga (System.Speech)' } else { 'Microsoft Tolga (Windows.Media.SpeechSynthesis)' }
$ffmpegVar = [bool](Get-Command ffmpeg -ErrorAction SilentlyContinue) -and [bool](Get-Command ffprobe -ErrorAction SilentlyContinue)
Write-Host "Ses: $kaynak, $($liste.Count) cümle, düzey $Duzey LUFS"

New-Item -ItemType Directory -Force -Path $gecici | Out-Null
if (-not $ffmpegVar) {
  foreach ($c in $liste) { WavYaz $c.okunus (Join-Path $gecici ($c.id + '.wav')) }
  Write-Host ""
  Write-Warning "ffmpeg bulunamadı: wav dosyaları $gecici klasöründe, site ise mp3 bekliyor."
  Write-Host "ffmpeg'i kurun (winget install Gyan.FFmpeg), yeni bir PowerShell penceresi açın ve bu betiği yeniden çalıştırın."
  exit 1
}

New-Item -ItemType Directory -Force -Path $cikti | Out-Null
BayrakYaz $false ''
foreach ($c in $liste) {
  $wav = Join-Path $gecici ($c.id + '.wav')
  $mp3 = Join-Path $cikti $c.dosya
  $sn = 0.0
  for ($deneme = 1; $deneme -le $denemeSayisi; $deneme++) {
    WavYaz $c.okunus $wav
    if (Mp3Yap $wav $mp3) { $sn = Sure $mp3 } else { $sn = 0.0 }
    if ($sn -ge $enKisaSn) { break }
    Write-Warning ("{0}: {1:N2} sn, yeniden üretiliyor ({2}/{3})" -f $c.dosya, $sn, $deneme, $denemeSayisi)
  }
  if ($sn -lt $enKisaSn) { throw "$($c.dosya) $denemeSayisi denemede de $enKisaSn sn'ye ulaşmadı." }
  Write-Host ("+ {0}: {1:N1} sn, {2:N0} KB" -f $c.dosya, $sn, ((Get-Item $mp3).Length / 1KB))
}

$beklenen = @($liste | ForEach-Object { $_.dosya })
Get-ChildItem -Path $cikti -Filter '*.mp3' | Where-Object { $beklenen -notcontains $_.Name } | ForEach-Object {
  Remove-Item $_.FullName
  Write-Host "- listede olmayan $($_.Name) silindi"
}
$toplam = 0
foreach ($d in $beklenen) { $toplam += (Get-Item (Join-Path $cikti $d)).Length }
if ($toplam -gt $enFazlaBayt) {
  throw ("Toplam {0:N2} MB, 3 MB sınırı aşıldı (SES_DOSYALARI_HAZIR false kaldı)." -f ($toplam / 1MB))
}
BayrakYaz $true $kaynak
Write-Host ""
Write-Host ("{0} dosya, toplam {1:N2} MB, ses: {2}." -f $beklenen.Count, ($toplam / 1MB), $kaynak)
Write-Host "Sonra: git add assets/ses fabricakit/js/ajan-gm/ses-dosyalari.js, commit ve push."
