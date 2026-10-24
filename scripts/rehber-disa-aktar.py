# -*- coding: utf-8 -*-
"""Excel çalışma kitabındaki seçili sayfaları web için JSON'a çevirir.

Her sayfa için: sütun genişlikleri (px), satır yükseklikleri (px), görünen hücre metni
(Türkçe sayı biçimi), ham sayı, stil (dolgu, yazı rengi, kalın, boyut, hiza, kenarlık),
birleşik hücreler, dondurulmuş bölme, koşullu biçimlerin sonucu (hücreye işlenmiş renk)
ve grafikler (tür, başlık, kategoriler, seriler, konum).

Rehberli derslerin (Datakit) kaynağıdır: çıktı data/<urun>/sayfalar/<slug>.json olur, scripts/derle.py oradan yayınlar.
Hücrelerin önbellekteki değerleri okunur: dosya Excel'de hesaplanıp kaydedilmiş olmalı. Derlemenin parçası değildir;
yalnızca openpyxl gerekir (pip install openpyxl). Excel dosyası repoda durmaz.

Kullanım: python3 scripts/rehber-disa-aktar.py KITAP.xlsx data/datakit/sayfalar "Sayfa Adı=slug" ...
Büyük sayfalarda yalnızca bir bölüm gösterilir: "Sayfa Adı=slug:satir=1-45,328:sutun=CQ" (satır listesi ve son sütun).
Seçimin dışındaki satırlar ve sütunlar JSON'a girmez; grafikler seçime kırpılır, seçimin dışında başlayan grafik
"disarida" işaretlenir (web'de tablonun üstünde çizilir). JSON'daki "boyut" sayfanın tamamı, "gosterilen" seçimdir.
"""
import sys, os, re, json, math, zipfile, colorsys, datetime, warnings
from decimal import Decimal, ROUND_HALF_UP
import xml.etree.ElementTree as ET
import openpyxl
from openpyxl.utils import get_column_letter, column_index_from_string

warnings.filterwarnings('ignore')

AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
NS = {
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'c': 'http://schemas.openxmlformats.org/drawingml/2006/chart',
    'xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}

# ---------------------------------------------------------------- sayı biçimi

def yuvarla(x, basamak):
    q = Decimal(1).scaleb(-basamak)
    return Decimal(repr(abs(x))).quantize(q, rounding=ROUND_HALF_UP)


def tr_sayi(x, basamak, binlik=True):
    d = yuvarla(x, basamak)
    tam, _, kesir = format(d, 'f').partition('.')
    if binlik:
        tam = '{:,}'.format(int(tam)).replace(',', '.')
    s = tam + (',' + kesir if basamak else '')
    return s


def isaret(x, s):
    return ('-' + s) if x < 0 and s.strip('0,.') else s


GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
GUNLER_UZUN = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
AYLAR_UZUN = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']


def bolumler(fmt):
    """Biçimi ';' ile bölümlere ayırır (tırnak ve köşeli parantez içindeki ';' bölmez)."""
    parcalar, simdiki, tirnak, parantez = [], '', False, 0
    i = 0
    while i < len(fmt):
        ch = fmt[i]
        if ch == '\\' and i + 1 < len(fmt):
            simdiki += fmt[i:i + 2]; i += 2; continue
        if ch == '"':
            tirnak = not tirnak
        elif not tirnak and ch == '[':
            parantez += 1
        elif not tirnak and ch == ']':
            parantez = max(0, parantez - 1)
        elif not tirnak and parantez == 0 and ch == ';':
            parcalar.append(simdiki); simdiki = ''; i += 1; continue
        simdiki += ch; i += 1
    parcalar.append(simdiki)
    return parcalar


def bolum_parcala(sec):
    """Bir biçim bölümünü (metin, sayı deseni, %) parçalarına ayırır; koşul ve renk/yerel ayar parantezlerini ayıklar.
    Döner: (kosul, parcalar) — kosul ('=', 1.0) gibi ya da None; parcalar [('metin', 'abc') | ('desen', '#,##0.00') | ('yuzde',)]"""
    kosul = None
    def parantez_al(m):
        nonlocal kosul
        ic = m.group(1)
        k = re.fullmatch(r'(<>|<=|>=|=|<|>)(-?\d+(?:\.\d+)?)', ic)
        if k:
            kosul = (k.group(1), float(k.group(2)))
        return ''
    sec = re.sub(r'\[([^\]]*)\]', parantez_al, sec)
    parcalar, desen, i = [], '', 0
    def desen_kapat():
        nonlocal desen
        if desen:
            parcalar.append(('desen', desen)); desen = ''
    while i < len(sec):
        ch = sec[i]
        if ch == '"':
            j = sec.find('"', i + 1)
            if j < 0:
                j = len(sec)
            desen_kapat(); parcalar.append(('metin', sec[i + 1:j])); i = j + 1; continue
        if ch == '\\' and i + 1 < len(sec):
            desen_kapat(); parcalar.append(('metin', sec[i + 1])); i += 2; continue
        if ch == '_' and i + 1 < len(sec):
            desen_kapat(); parcalar.append(('metin', ' ')); i += 2; continue
        if ch == '*' and i + 1 < len(sec):
            i += 2; continue
        if ch in '#0,.?':
            desen += ch; i += 1; continue
        if ch == '%':
            desen_kapat(); parcalar.append(('yuzde',)); i += 1; continue
        if ch in 'Ee':
            desen += ch; i += 1; continue
        desen_kapat(); parcalar.append(('metin', ch)); i += 1
    desen_kapat()
    return kosul, parcalar


def desen_sayi(x, desen):
    """Sayı desenini (#,##0.00 / 0.## / 0) mutlak değer için uygular; Türkçe ayraçlar."""
    binlik = ',' in desen.split('.')[0]
    tam, _, kesir = desen.partition('.')
    en_az = kesir.count('0')
    en_cok = len(re.sub(r'[^0#?]', '', kesir))
    s = tr_sayi(x, en_cok, binlik=binlik)
    if en_cok > en_az:
        tam_s, _, kesir_s = s.partition(',')
        kesir_s = kesir_s.rstrip('0')
        if len(kesir_s) < en_az:
            kesir_s = kesir_s.ljust(en_az, '0')
        s = tam_s + ',' + kesir_s   # Excel'deki gibi: '#,##0.##' tam sayıda ayracı bırakır ("600,")
    return s


def bolum_uygula(x, parcalar):
    """Bir bölümü sayıya uygular (işaret bölümün kendi metninden gelir). Döner: metin."""
    yuzde = any(p[0] == 'yuzde' for p in parcalar)
    sayi = abs(x) * (100 if yuzde else 1)
    metin, desen_yazildi = '', False
    for p in parcalar:
        if p[0] == 'metin':
            metin += p[1]
        elif p[0] == 'desen' and not desen_yazildi:
            metin += ('%' if yuzde else '') + desen_sayi(sayi, p[1])
            desen_yazildi = True
    return metin


def tarih_bicimle(v, fmt):
    sec = bolumler(fmt)[0]
    sec = re.sub(r'\[\$[^\]]*\]', '', sec)
    sec = re.sub(r'\[[^\]]*\]', '', sec)
    sec = re.sub(r'\\(.)', r'\1', sec)   # kaçış: dd\.mm → dd.mm
    if not re.search(r'[dmyh]', sec, re.I):
        return f"{v.day:02d}.{v.month:02d}.{v.year}"
    def yerine(m):
        t = m.group(0).lower()
        if t == 'dddd':
            return GUNLER_UZUN[v.weekday()]
        if t == 'ddd':
            return GUNLER[v.weekday()]
        if t == 'dd':
            return f"{v.day:02d}"
        if t == 'd':
            return str(v.day)
        if t == 'mmmm':
            return AYLAR_UZUN[v.month - 1]
        if t == 'mmm':
            return AYLAR[v.month - 1]
        if t == 'mm':
            return f"{v.month:02d}"
        if t == 'm':
            return str(v.month)
        if t == 'yyyy':
            return str(v.year)
        if t == 'yy':
            return f"{v.year % 100:02d}"
        return m.group(0)
    sec = sec.replace('"', '')
    return re.sub(r'dddd|ddd|dd|d|mmmm|mmm|mm|m|yyyy|yy', yerine, sec, flags=re.I)


def bicimle(v, fmt):
    """Excel sayı biçimini Türkçe görünüme çevirir (bölümler, koşullar, tırnaklı metin, %). Döner: (metin, sayı_mı)."""
    if isinstance(v, (datetime.datetime, datetime.date)):
        return tarih_bicimle(v, fmt), False
    if isinstance(v, bool):
        return ('DOĞRU' if v else 'YANLIŞ'), False
    if not isinstance(v, (int, float)):
        return str(v), False
    x = float(v)
    if fmt in ('General', '', '@'):
        if float(x).is_integer():
            return tr_sayi(x, 0, binlik=False) if abs(x) < 1e15 else str(x), True
        s = ('%.10g' % x)
        if 'e' in s:
            return s, True
        tam, _, kesir = s.partition('.')
        return tam + (',' + kesir if kesir else ''), True
    secler = [bolum_parcala(s) for s in bolumler(fmt)]
    kosullular = [(k, p) for k, p in secler if k]
    if kosullular:
        for (op, esik), parcalar in kosullular:
            if {'=': x == esik, '<>': x != esik, '<': x < esik, '>': x > esik, '<=': x <= esik, '>=': x >= esik}[op]:
                return bolum_uygula(x, parcalar), True
        kalan = [p for k, p in secler if not k]
        if kalan:
            return bolum_uygula(x, kalan[0]), True
        return tr_sayi(x, 0), True
    parcalar = [p for _, p in secler]
    if len(parcalar) >= 3 and x == 0:
        return bolum_uygula(x, parcalar[2]), True
    if len(parcalar) >= 2 and x < 0:
        return bolum_uygula(x, parcalar[1]), True
    s = bolum_uygula(x, parcalar[0])
    if x < 0 and re.search(r'[1-9]', s):   # tek bölümlü biçimde eksi işareti otomatik (sıfıra yuvarlananda yok)
        s = ('-' + s[1:]) if s.startswith('+') else ('-' + s)
    return s, True


def metni_turkcele(s):
    s = re.sub(r'\d{1,3}(?:,\d{3})+', lambda m: m.group(0).replace(',', '.'), s)
    s = re.sub(r'%(\d+)\.(\d+)', r'%\1,\2', s)
    s = re.sub(r'(?<![\d.])(\d+)\.(\d+)%', r'%\1,\2', s)
    return s

# ---------------------------------------------------------------- renkler

def tema_renkleri(z):
    try:
        x = z.read('xl/theme/theme1.xml')
    except KeyError:
        return {}
    t = ET.fromstring(x)
    cs = t.find('.//a:clrScheme', NS)
    sira = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink']
    renk = {}
    for ad in sira:
        e = cs.find('a:' + ad, NS)
        if e is None:
            continue
        c = e[0]
        val = c.get('lastClr') or c.get('val')
        renk[ad] = val
    # Excel tema dizini: 0=lt1 1=dk1 2=lt2 3=dk2 4..9 accent, 10 hlink, 11 folHlink
    dizin = ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink']
    return {i: renk.get(ad) for i, ad in enumerate(dizin)}


def ton(hexrgb, tint):
    r, g, b = (int(hexrgb[i:i + 2], 16) / 255 for i in (0, 2, 4))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    l = l * (1 + tint) if tint < 0 else l * (1 - tint) + tint
    r, g, b = colorsys.hls_to_rgb(h, max(0, min(1, l)), s)
    return '%02X%02X%02X' % (round(r * 255), round(g * 255), round(b * 255))


def renk(col, tema):
    if col is None:
        return None
    try:
        if col.type == 'rgb' and isinstance(col.rgb, str):
            v = col.rgb[-6:]
            if col.rgb in ('00000000',):
                return None
            return '#' + v.upper()
        if col.type == 'theme' and col.theme is not None:
            base = tema.get(col.theme)
            if not base:
                return None
            if col.tint:
                base = ton(base, col.tint)
            return '#' + base.upper()
        if col.type == 'indexed':
            return None
    except Exception:
        return None
    return None

# ---------------------------------------------------------------- koşullu biçim

def dxf_stili(dx):
    stil = {}
    if dx is None:
        return stil
    if dx.font is not None:
        if dx.font.color is not None and isinstance(dx.font.color.rgb, str):
            stil['yazi'] = '#' + dx.font.color.rgb[-6:]
        if dx.font.b:
            stil['kalin'] = True
    if dx.fill is not None:
        bg = dx.fill.bgColor if dx.fill.bgColor is not None else None
        if bg is not None and isinstance(bg.rgb, str) and bg.rgb not in ('00000000',):
            stil['dolgu'] = '#' + bg.rgb[-6:]
    return stil


def kosullu_bicimler(ws, wsv, adlar, satir_secimi=None, son_sutun=None):
    """Kitaptaki koşullu biçim kurallarını Excel'deki gibi hesaplar: kurallar öncelik sırasıyla uygulanır, bir özelliği
    ilk eşleşen kural belirler, "stopIfTrue" olan kural eşleşince o hücrede sonraki kurallar işlemez.
    Döner: {hücre: {'yazi':, 'kalin':, 'dolgu':, 'cubuk': oran, 'cubukRenk':}}. Yalnızca seçimdeki hücreler hesaplanır."""
    sonuc, durdu = {}, set()
    kurallar = []   # (öncelik, hücreler, kural)
    for rng in ws.conditional_formatting:
        hucreler, ilk = [], None
        for cr in str(rng.sqref).split():
            minc, minr, maxc, maxr = openpyxl.utils.cell.range_boundaries(cr)
            if ilk is None:
                ilk = (minr, minc)   # göreli başvurular ilk aralığın sol üst hücresine göre
            for r in range(minr, maxr + 1):
                if satir_secimi is not None and r not in satir_secimi:
                    continue
                for c in range(minc, maxc + 1):
                    if son_sutun is not None and c > son_sutun:
                        continue
                    hucreler.append((r, c))
        for kural in rng.rules:
            kurallar.append((kural.priority if kural.priority is not None else 10 ** 6, ilk, hucreler, kural))
    kurallar.sort(key=lambda k: k[0])

    def ekle(r, c, d):
        ref = f'{get_column_letter(c)}{r}'
        hedef = sonuc.setdefault(ref, {})
        for k, v in d.items():
            if v is not None and k not in hedef:
                hedef[k] = v

    for _, (ilk_r, ilk_c), hucreler, kural in kurallar:
        if kural.type == 'colorScale':
            renkler = ['#' + c.rgb[-6:] for c in kural.colorScale.color]
            degerler = [wsv.cell(r, c).value for r, c in hucreler]
            sayilar = [v for v in degerler if isinstance(v, (int, float)) and not isinstance(v, bool)]
            if not sayilar:
                continue
            lo, hi = min(sayilar), max(sayilar)
            srt = sorted(sayilar)
            orta = srt[len(srt) // 2] if len(srt) % 2 else (srt[len(srt) // 2 - 1] + srt[len(srt) // 2]) / 2
            for (r, c), v in zip(hucreler, degerler):
                if not isinstance(v, (int, float)) or isinstance(v, bool) or (r, c) in durdu:
                    continue
                if len(renkler) == 2:
                    t = 0 if hi == lo else (v - lo) / (hi - lo)
                    col = karistir(renkler[0], renkler[1], t)
                else:
                    if v <= orta:
                        t = 0 if orta == lo else (v - lo) / (orta - lo)
                        col = karistir(renkler[0], renkler[1], t)
                    else:
                        t = 0 if hi == orta else (v - orta) / (hi - orta)
                        col = karistir(renkler[1], renkler[2], t)
                ekle(r, c, {'dolgu': col})
            continue
        if kural.type == 'dataBar' and kural.dataBar is not None:
            db = kural.dataBar
            renk_db = '#' + db.color.rgb[-6:] if db.color is not None and isinstance(db.color.rgb, str) else '#638EC6'
            degerler = [wsv.cell(r, c).value for r, c in hucreler]
            sayilar = [v for v in degerler if isinstance(v, (int, float)) and not isinstance(v, bool)]
            if not sayilar:
                continue
            uclar = []
            for cf in db.cfvo:
                if cf.type == 'num' and cf.val is not None:
                    uclar.append(float(cf.val))
                elif cf.type == 'min':
                    uclar.append(min(sayilar))
                elif cf.type == 'max':
                    uclar.append(max(sayilar))
                elif cf.type == 'percent' and cf.val is not None:
                    uclar.append(min(sayilar) + (max(sayilar) - min(sayilar)) * float(cf.val) / 100)
                else:
                    uclar.append(None)
            lo = uclar[0] if len(uclar) > 0 and uclar[0] is not None else min(sayilar)
            hi = uclar[1] if len(uclar) > 1 and uclar[1] is not None else max(sayilar)
            for (r, c), v in zip(hucreler, degerler):
                if not isinstance(v, (int, float)) or isinstance(v, bool) or (r, c) in durdu:
                    continue
                t = 0 if hi == lo else (v - lo) / (hi - lo)
                ekle(r, c, {'cubuk': round(max(0, min(1, t)), 3), 'cubukRenk': renk_db})
            continue
        stil = dxf_stili(kural.dxf)
        if kural.type == 'cellIs' and kural.formula:
            karsi = ifade_derle(kural.formula[0], adlar)
            op = kural.operator
            sag2 = ifade_derle(kural.formula[1], adlar) if len(kural.formula) > 1 else None
            def dogru_mu(r, c, dr, dc, op=op, karsi=karsi, sag2=sag2):
                v = hucre_degeri(wsv.cell(r, c).value)
                k = karsi(wsv, dr, dc)
                if op in ('equal', 'notEqual'):
                    e = esit(v, k)
                    return e if op == 'equal' else not e
                if op in ('greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual'):
                    return karsilastir({'greaterThan': '>', 'lessThan': '<', 'greaterThanOrEqual': '>=', 'lessThanOrEqual': '<='}[op], v, k)
                if op in ('between', 'notBetween') and sag2 is not None:
                    k2 = sag2(wsv, dr, dc)
                    ic = karsilastir('>=', v, k) and karsilastir('<=', v, k2)
                    return ic if op == 'between' else not ic
                raise ValueError('Tanınmayan cellIs işleci: ' + str(op))
        elif kural.type == 'expression' and kural.formula:
            derli = ifade_derle(kural.formula[0], adlar)
            def dogru_mu(r, c, dr, dc, derli=derli):
                return bool(mantik(derli(wsv, dr, dc)))
        else:
            continue
        for r, c in hucreler:
            if (r, c) in durdu:
                continue
            if dogru_mu(r, c, r - ilk_r, c - ilk_c):
                ekle(r, c, stil)
                if kural.stopIfTrue:
                    durdu.add((r, c))
    return sonuc


def karistir(a, b, t):
    a = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return '#%02X%02X%02X' % tuple(round(x + (y - x) * max(0, min(1, t))) for x, y in zip(a, b))


def hucre_kaydir(ref, dr, dc):
    m = re.fullmatch(r'(\$?)([A-Z]+)(\$?)(\d+)', ref)
    ca, col, ra, row = m.groups()
    c = column_index_from_string(col) + (0 if ca else dc)
    r = int(row) + (0 if ra else dr)
    return r, c


class Hata:
    """Excel hata değeri (#N/A, #DİV/0! …)."""
    def __init__(self, ad):
        self.ad = ad


def hucre_degeri(v):
    if isinstance(v, str) and v.startswith('#') and (v.endswith('!') or v.endswith('?') or v == '#N/A'):
        return Hata(v)
    if isinstance(v, (datetime.datetime, datetime.date)):
        return (v - datetime.datetime(1899, 12, 30)).days if isinstance(v, datetime.datetime) else (v - datetime.date(1899, 12, 30)).days
    return v


def sayi_mi(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def mantik(v):
    if isinstance(v, Hata):
        return False
    if v is None:
        return False
    if isinstance(v, str):
        return v.upper() == 'TRUE'
    return bool(v)


def esit(a, b):
    """Excel '=': boş hücre "" ve 0 ile eşit; metin büyük-küçük harf duyarsız; sayı ile metin eşit değil."""
    if isinstance(a, Hata) or isinstance(b, Hata):
        return False
    if a is None:
        a = '' if isinstance(b, str) else 0
    if b is None:
        b = '' if isinstance(a, str) else 0
    if isinstance(a, bool) or isinstance(b, bool):
        return (isinstance(a, bool) and isinstance(b, bool)) and a == b
    if isinstance(a, str) and isinstance(b, str):
        return a.casefold() == b.casefold()
    if sayi_mi(a) and sayi_mi(b):
        return float(a) == float(b)
    return False


def karsilastir(op, a, b):
    if isinstance(a, Hata) or isinstance(b, Hata):
        return False
    if a is None:
        a = '' if isinstance(b, str) else 0
    if b is None:
        b = '' if isinstance(a, str) else 0
    if sayi_mi(a) and sayi_mi(b):
        return {'<': a < b, '>': a > b, '<=': a <= b, '>=': a >= b}[op]
    if isinstance(a, str) and isinstance(b, str):
        a, b = a.casefold(), b.casefold()
        return {'<': a < b, '>': a > b, '<=': a <= b, '>=': a >= b}[op]
    # Excel'de metin her sayıdan büyüktür
    if isinstance(a, str) and sayi_mi(b):
        return op in ('>', '>=')
    if sayi_mi(a) and isinstance(b, str):
        return op in ('<', '<=')
    return False


_IFADE = re.compile(r'\s*(?:(?P<num>\d+(?:\.\d+)?)|(?P<str>"(?:[^"]|"")*")'
                    r"|(?P<sref>(?:'[^']+'|[A-Za-z_][A-Za-z0-9_.]*)!\$?[A-Z]{1,3}\$?\d+)(?![A-Za-z0-9_(])"
                    r'|(?P<ref>\$?[A-Z]{1,3}\$?\d+)(?![A-Za-z0-9_(])'
                    r'|(?P<name>[A-Za-z_][A-Za-z0-9_.]*)|(?P<op><>|<=|>=|[=<>+\-*/(),&]))')
_ONBELLEK = {}


def ifade_derle(f, adlar):
    """Excel koşullu biçim ifadesini (alt küme) derler. Döner: fn(wsv, dr, dc) → değer.
    Desteklenen: sayı, metin, hücre başvurusu (göreli/mutlak; başka sayfa: Ayarlar!$B$8), ad tanımı, + - * / &,
    karşılaştırma, AND OR NOT IF IFERROR ISNUMBER ISBLANK ISTEXT ISERROR LEN LEFT RIGHT MID SEARCH ABS MIN MAX SUM VALUE TRUE FALSE."""
    f = str(f).strip()
    if f.startswith('='):
        f = f[1:]
    anahtar = (f, id(adlar))
    if anahtar in _ONBELLEK:
        return _ONBELLEK[anahtar]
    tokenler = []
    i = 0
    while i < len(f):
        if f[i].isspace():
            i += 1; continue
        m = _IFADE.match(f, i)
        if not m:
            raise ValueError(f'Tanınmayan koşullu biçim ifadesi: {f!r} ({i}. karakter)')
        tokenler.append((m.lastgroup, m.group(m.lastgroup)))
        i = m.end()
    tokenler.append(('son', ''))
    poz = [0]

    def bak():
        return tokenler[poz[0]]

    def al(tur=None, deger=None):
        t = tokenler[poz[0]]
        if (tur and t[0] != tur) or (deger and t[1] != deger):
            raise ValueError(f'Koşullu biçim ifadesi: {f!r} içinde {deger or tur} bekleniyordu, {t[1]!r} geldi')
        poz[0] += 1
        return t

    def karsilastirma():
        sol = birlestirme()
        if bak()[0] == 'op' and bak()[1] in ('=', '<>', '<', '>', '<=', '>='):
            op = al()[1]
            sag = birlestirme()
            if op == '=':
                return lambda w, dr, dc: esit(sol(w, dr, dc), sag(w, dr, dc))
            if op == '<>':
                return lambda w, dr, dc: not esit(sol(w, dr, dc), sag(w, dr, dc))
            return lambda w, dr, dc, op=op: karsilastir(op, sol(w, dr, dc), sag(w, dr, dc))
        return sol

    def birlestirme():
        sol = toplama()
        while bak() == ('op', '&'):
            al()
            sag = toplama()
            sol = (lambda a, b: (lambda w, dr, dc: str(metin_degeri(a(w, dr, dc))) + str(metin_degeri(b(w, dr, dc)))))(sol, sag)
        return sol

    def toplama():
        sol = carpma()
        while bak()[0] == 'op' and bak()[1] in ('+', '-'):
            op = al()[1]
            sag = carpma()
            sol = (lambda a, b, op: (lambda w, dr, dc: aritmetik(op, a(w, dr, dc), b(w, dr, dc))))(sol, sag, op)
        return sol

    def carpma():
        sol = tekil()
        while bak()[0] == 'op' and bak()[1] in ('*', '/'):
            op = al()[1]
            sag = tekil()
            sol = (lambda a, b, op: (lambda w, dr, dc: aritmetik(op, a(w, dr, dc), b(w, dr, dc))))(sol, sag, op)
        return sol

    def tekil():
        if bak() == ('op', '-'):
            al()
            ic = tekil()
            return lambda w, dr, dc: aritmetik('*', -1, ic(w, dr, dc))
        if bak() == ('op', '+'):
            al()
            return tekil()
        return birincil()

    def birincil():
        t = bak()
        if t[0] == 'num':
            al(); v = float(t[1])
            return lambda w, dr, dc: v
        if t[0] == 'str':
            al(); v = t[1][1:-1].replace('""', '"')
            return lambda w, dr, dc: v
        if t[0] == 'ref':
            al(); ref = t[1]
            return lambda w, dr, dc: hucre_degeri(w.cell(*hucre_kaydir(ref, dr, dc)).value)
        if t[0] == 'sref':  # başka sayfadaki hücre: 'Sayfa Adı'!$B$8 (aynı çalışma kitabının değer kopyasından)
            al(); sayfa, ref = t[1].rsplit('!', 1)
            sayfa = sayfa[1:-1] if sayfa.startswith("'") else sayfa
            return lambda w, dr, dc: hucre_degeri(w.parent[sayfa].cell(*hucre_kaydir(ref, dr, dc)).value)
        if t[0] == 'name':
            al(); ad = t[1]
            if bak() == ('op', '('):
                al()
                args = []
                if bak() != ('op', ')'):
                    args.append(karsilastirma())
                    while bak() == ('op', ','):
                        al(); args.append(karsilastirma())
                al('op', ')')
                return islev(ad.upper(), args)
            if ad.upper() in ('TRUE', 'FALSE'):
                v = ad.upper() == 'TRUE'
                return lambda w, dr, dc: v
            if ad in adlar:
                v = adlar[ad]
                return lambda w, dr, dc: v
            raise ValueError(f'Koşullu biçim ifadesi: tanımsız ad {ad!r} ({f!r})')
        if t == ('op', '('):
            al(); ic = karsilastirma(); al('op', ')')
            return ic
        raise ValueError(f'Koşullu biçim ifadesi: beklenmeyen {t[1]!r} ({f!r})')

    def islev(ad, args):
        if ad == 'AND':
            return lambda w, dr, dc: all(mantik(a(w, dr, dc)) for a in args)
        if ad == 'OR':
            return lambda w, dr, dc: any(mantik(a(w, dr, dc)) for a in args)
        if ad == 'NOT':
            return lambda w, dr, dc: not mantik(args[0](w, dr, dc))
        if ad == 'IF':
            return lambda w, dr, dc: args[1](w, dr, dc) if mantik(args[0](w, dr, dc)) else (args[2](w, dr, dc) if len(args) > 2 else False)
        if ad == 'IFERROR':
            def iferror(w, dr, dc):
                v = args[0](w, dr, dc)
                return args[1](w, dr, dc) if isinstance(v, Hata) else v
            return iferror
        if ad == 'ISNUMBER':
            return lambda w, dr, dc: sayi_mi(args[0](w, dr, dc))
        if ad == 'ISBLANK':
            return lambda w, dr, dc: args[0](w, dr, dc) is None
        if ad == 'ISTEXT':
            return lambda w, dr, dc: isinstance(args[0](w, dr, dc), str)
        if ad == 'ISERROR':
            return lambda w, dr, dc: isinstance(args[0](w, dr, dc), Hata)
        if ad == 'LEN':
            return lambda w, dr, dc: len(metin_degeri(args[0](w, dr, dc)))
        if ad == 'LEFT':
            return lambda w, dr, dc: metin_degeri(args[0](w, dr, dc))[:int(sayi_degeri(args[1](w, dr, dc))) if len(args) > 1 else 1]
        if ad == 'RIGHT':
            return lambda w, dr, dc: metin_degeri(args[0](w, dr, dc))[-(int(sayi_degeri(args[1](w, dr, dc))) if len(args) > 1 else 1):]
        if ad == 'MID':
            return lambda w, dr, dc: metin_degeri(args[0](w, dr, dc))[int(sayi_degeri(args[1](w, dr, dc))) - 1:int(sayi_degeri(args[1](w, dr, dc))) - 1 + int(sayi_degeri(args[2](w, dr, dc)))]
        if ad == 'SEARCH':
            def search(w, dr, dc):
                ne, nerede = metin_degeri(args[0](w, dr, dc)).casefold(), metin_degeri(args[1](w, dr, dc)).casefold()
                k = nerede.find(ne)
                return Hata('#VALUE!') if k < 0 else k + 1
            return search
        if ad == 'ABS':
            return lambda w, dr, dc: abs(sayi_degeri(args[0](w, dr, dc)))
        if ad in ('MIN', 'MAX', 'SUM'):
            fn = {'MIN': min, 'MAX': max, 'SUM': sum}[ad]
            return lambda w, dr, dc: fn(sayi_degeri(a(w, dr, dc)) for a in args)
        if ad == 'VALUE':
            return lambda w, dr, dc: sayi_degeri(args[0](w, dr, dc))
        if ad == 'TRUE':
            return lambda w, dr, dc: True
        if ad == 'FALSE':
            return lambda w, dr, dc: False
        raise ValueError(f'Koşullu biçim ifadesi: desteklenmeyen işlev {ad} ({f!r})')

    sonuc = karsilastirma()
    al('son')
    _ONBELLEK[anahtar] = sonuc
    return sonuc


def metin_degeri(v):
    if v is None:
        return ''
    if isinstance(v, bool):
        return 'TRUE' if v else 'FALSE'
    if isinstance(v, Hata):
        return v.ad
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def sayi_degeri(v):
    if v is None:
        return 0
    if isinstance(v, bool):
        return 1 if v else 0
    if sayi_mi(v):
        return v
    if isinstance(v, str):
        try:
            return float(v.replace(',', '.'))
        except ValueError:
            return 0
    return 0


def aritmetik(op, a, b):
    if isinstance(a, Hata):
        return a
    if isinstance(b, Hata):
        return b
    a, b = sayi_degeri(a), sayi_degeri(b)
    if op == '+':
        return a + b
    if op == '-':
        return a - b
    if op == '*':
        return a * b
    return Hata('#DIV/0!') if b == 0 else a / b

# ---------------------------------------------------------------- grafikler

def basvuru_hucreleri(f, wbv):
    """'MPS!$B$13:$B$24' ya da "'TAHMİN_ANALİZ'!$B$14:$B$25" → o aralıktaki hücreler (değer, sayı biçimi) listesi; çözülemezse None."""
    if not f or wbv is None:
        return None
    m = re.fullmatch(r"\s*'?(.+?)'?!\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?\s*", f.replace("''", "'"))
    if not m or m.group(1) not in wbv.sheetnames:
        return None
    ws = wbv[m.group(1)]
    c1, r1 = column_index_from_string(m.group(2)), int(m.group(3))
    c2, r2 = (column_index_from_string(m.group(4)), int(m.group(5))) if m.group(4) else (c1, r1)
    return [ws.cell(r, c) for r in range(r1, r2 + 1) for c in range(c1, c2 + 1)]


def grafikler(z, sayfa_yolu, wbv=None):
    rels = sayfa_yolu.replace('worksheets/', 'worksheets/_rels/') + '.rels'
    if rels not in z.namelist():
        return []
    sr = ET.fromstring(z.read(rels))
    cikis = []
    for rel in sr:
        if not rel.get('Type', '').endswith('/drawing'):
            continue
        dyol = os.path.normpath(os.path.join(os.path.dirname(sayfa_yolu), rel.get('Target'))).replace('\\', '/')
        dx = ET.fromstring(z.read(dyol))
        drels_yol = dyol.replace('drawings/', 'drawings/_rels/') + '.rels'
        drels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read(drels_yol))} if drels_yol in z.namelist() else {}
        for anc in list(dx):
            fr = anc.find('xdr:from', NS); to = anc.find('xdr:to', NS)
            ch = anc.find('.//c:chart', NS)
            if ch is None or fr is None:
                continue
            rid = ch.get('{%s}id' % NS['r'])
            cyol = os.path.normpath(os.path.join(os.path.dirname(dyol), drels[rid])).replace('\\', '/')
            konum = {
                'bas': f"{get_column_letter(int(fr.find('xdr:col', NS).text) + 1)}{int(fr.find('xdr:row', NS).text) + 1}",
                'son': f"{get_column_letter(int(to.find('xdr:col', NS).text) + 1)}{int(to.find('xdr:row', NS).text) + 1}" if to is not None else None,
            }
            cikis.append(dict(grafik_oku(z.read(cyol), wbv), konum=konum))
    return cikis


def onbellek(e):
    if e is None:
        return []
    noktalar = {}
    for pt in e.iter('{%s}pt' % NS['c']):
        v = pt.find('c:v', NS)
        noktalar[int(pt.get('idx'))] = v.text if v is not None else None
    n = e.find('.//c:ptCount', NS)
    say = int(n.get('val')) if n is not None else (max(noktalar) + 1 if noktalar else 0)
    return [noktalar.get(i) for i in range(say)]


def grafik_oku(x, wbv=None):
    t = ET.fromstring(x)
    # Grafiğin kendi başlığı (c:chart/c:title); eksen başlıkları plotArea altındadır, başlığa karışmaz
    chart = t.find('.//c:chart', NS)
    baslik_e = chart.find('c:title', NS) if chart is not None else None
    baslik = ''.join(e.text or '' for e in (baslik_e.findall('.//a:t', NS) if baslik_e is not None else []))
    plot = t.find('.//c:plotArea', NS)
    seriler = []; tur = None
    for grp in plot:
        etiket = grp.tag.split('}')[1]
        if not etiket.endswith('Chart'):
            continue
        g_tur = {'lineChart': 'cizgi', 'barChart': 'cubuk', 'pieChart': 'pasta', 'doughnutChart': 'halka',
                 'areaChart': 'alan', 'scatterChart': 'dagilim'}.get(etiket, etiket)
        bd = grp.find('c:barDir', NS)
        if bd is not None and bd.get('val') == 'bar':
            g_tur = 'yatay-cubuk'
        tur = tur or g_tur
        for ser in grp.findall('c:ser', NS):
            ad = ''.join(v.text or '' for v in ser.findall('c:tx//c:v', NS)) or ''.join(v.text or '' for v in ser.findall('c:tx//a:t', NS))
            cat = ser.find('c:cat', NS)
            kats_ham = onbellek(cat.find('.//c:strCache', NS) if cat is not None and cat.find('.//c:strCache', NS) is not None else (cat.find('.//c:numCache', NS) if cat is not None else None))
            ING = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
            kats = [(AYLAR[ING.index(k[:3])] + k[3:]) if isinstance(k, str) and k[:3] in ING and re.fullmatch(r'[A-Z][a-z]{2} \d{2}', k) else k for k in kats_ham]
            # Sayısal kategori (ör. tarih) önbellekte biçimsiz seri numarasıdır: kaynak hücrelerin kendi biçimiyle yazılır
            kat_f = cat.find('.//c:numRef/c:f', NS) if cat is not None else None
            kaynak = basvuru_hucreleri(kat_f.text if kat_f is not None else None, wbv)
            if kaynak and len(kaynak) == len(kats):
                kats = [bicimle(h.value, h.number_format)[0] if h.value not in (None, '') else k for h, k in zip(kaynak, kats)]
            val = ser.find('c:val', NS)
            degs = [float(v) if v not in (None, '') else None for v in onbellek(val.find('.//c:numCache', NS) if val is not None else None)]
            fmt_e = val.find('.//c:formatCode', NS) if val is not None else None
            # Değer biçimi: önbellekte "General" kalmışsa kaynak hücrenin biçimi (yüzde serileri için)
            val_f = val.find('.//c:numRef/c:f', NS) if val is not None else None
            val_kaynak = basvuru_hucreleri(val_f.text if val_f is not None else None, wbv)
            if val_kaynak and (fmt_e is None or fmt_e.text in (None, '', 'General')):
                fmt_e = ET.Element('x'); fmt_e.text = val_kaynak[0].number_format
            # Seri rengi: serinin kendi spPr'ı (veri noktası renkleri dPt altında ayrı)
            sp = ser.find('c:spPr', NS)
            renk_e = sp.find('.//a:srgbClr', NS) if sp is not None else None
            if renk_e is None:
                renk_e = ser.find('.//c:spPr//a:srgbClr', NS)
            # Sondaki boş kategoriler (seri aralığı dolu alandan uzunsa) atılır
            while kats and degs and len(kats) == len(degs) and degs[-1] is None and kats[-1] in (None, ''):
                kats.pop(); degs.pop()
            kayit = {'ad': ad, 'tur': g_tur, 'kategoriler': kats, 'degerler': degs,
                     'bicim': fmt_e.text if fmt_e is not None else None,
                     'renk': ('#' + renk_e.get('val')) if renk_e is not None else None}
            noktalar = {}
            for dpt in ser.findall('c:dPt', NS):
                idx = dpt.find('c:idx', NS); r = dpt.find('c:spPr//a:solidFill/a:srgbClr', NS)
                if idx is not None and r is not None:
                    noktalar[int(idx.get('val'))] = '#' + r.get('val')
            if noktalar:
                kayit['renkler'] = [noktalar.get(i) for i in range(len(degs))]
            seriler.append(kayit)
    return {'tur': tur, 'baslik': baslik, 'seriler': seriler}

# ---------------------------------------------------------------- ana akış

def px_genislik(w):
    return int(round(w * 7 + 5)) if w else 0


def secim_coz(arg):
    """'Sayfa Adı=slug[:satir=1-45,328][:sutun=CQ]' → (ad, slug, satır kümesi | None, son sütun no | None)."""
    parcalar = arg.split(':')
    ad, slug = parcalar[0].split('=', 1)
    satirlar, sutun = None, None
    for p in parcalar[1:]:
        k, _, v = p.partition('=')
        if k == 'satir':
            satirlar = set()
            for aralik in v.split(','):
                a, _, b = aralik.partition('-')
                satirlar.update(range(int(a), int(b or a) + 1))
        elif k == 'sutun':
            sutun = column_index_from_string(v)
        else:
            raise ValueError('Tanınmayan seçim: ' + p)
    return ad, slug, satirlar, sutun


def disa_aktar(kitap, cikis, secim):
    z = zipfile.ZipFile(kitap)
    tema = tema_renkleri(z)
    wbv = openpyxl.load_workbook(kitap, data_only=True)
    wbf = openpyxl.load_workbook(kitap, data_only=False)
    adlar = {}
    for ad, dn in wbv.defined_names.items():
        try:
            dests = list(dn.destinations)
            if len(dests) == 1:
                s, ref = dests[0]
                v = wbv[s][ref.replace('$', '')].value
                if isinstance(v, (int, float)):
                    adlar[ad] = v
        except Exception:
            pass
    # sayfa adı -> xml yolu
    wbx = ET.fromstring(z.read('xl/workbook.xml'))
    rels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    yol = {}
    for s in wbx.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet'):
        rid = s.get('{%s}id' % NS['r'])
        t = rels[rid]
        yol[s.get('name')] = ('xl/' + t) if not t.startswith('/') else t[1:]
    os.makedirs(cikis, exist_ok=True)
    ozet = []
    for ad, slug, satir_secimi, sutun_siniri in secim:
        wsv = wbv[ad]; wsf = wbf[ad]
        # dolu alan (sayfanın tamamı)
        tam_r = tam_c = 0
        for row in wsv.iter_rows():
            for c in row:
                if c.value not in (None, ''):
                    tam_r = max(tam_r, c.row); tam_c = max(tam_c, c.column)
        son_r = min(tam_r, max(satir_secimi)) if satir_secimi else tam_r
        son_c = sutun_siniri if sutun_siniri else tam_c  # sınır dolu alandan genişse boş sütunlar eklenir (taşan metin, grafik için)
        secili = (lambda r: r in satir_secimi) if satir_secimi else (lambda r: True)
        cf = kosullu_bicimler(wsf, wsv, adlar, satir_secimi, son_c)
        varsayilan = wsv.sheet_format.defaultColWidth or 8.43
        genislik = {}
        for key, dim in wsv.column_dimensions.items():
            lo = dim.min or column_index_from_string(key); hi = dim.max or lo
            for i in range(lo, hi + 1):
                genislik[i] = (dim.width if dim.width else varsayilan, bool(dim.hidden))
        sutunlar = []
        for i in range(1, son_c + 1):
            w, gizli = genislik.get(i, (varsayilan, False))
            sutunlar.append({'harf': get_column_letter(i), 'genislik': 0 if gizli else px_genislik(w)})
        stiller = []; stil_no = {}
        satirlar = []
        for r in range(1, son_r + 1):
            if not secili(r):
                continue
            rd = wsv.row_dimensions.get(r)
            if rd is not None and rd.hidden:
                continue
            h = rd.height if rd is not None and rd.height else 15
            hucreler = []
            for c in range(1, son_c + 1):
                hv = wsv.cell(r, c); hf = wsf.cell(r, c)
                v = hv.value
                ref = f'{get_column_letter(c)}{r}'
                st = {}
                if hv.fill is not None and hv.fill.fill_type == 'solid':
                    d = renk(hv.fill.fgColor, tema)
                    if d and d != '#FFFFFF':
                        st['dolgu'] = d
                if hv.font is not None:
                    y = renk(hv.font.color, tema) if hv.font.color is not None else None
                    if y and y not in ('#000000',):
                        st['yazi'] = y
                    if hv.font.b:
                        st['kalin'] = True
                    if hv.font.i:
                        st['italik'] = True
                    if hv.font.sz and float(hv.font.sz) != 10:
                        st['boyut'] = float(hv.font.sz)
                al = hv.alignment
                if al is not None:
                    if al.horizontal in ('center', 'right', 'left', 'centerContinuous'):
                        st['hiza'] = 'center' if al.horizontal == 'centerContinuous' else al.horizontal
                    if al.wrap_text:
                        st['sar'] = True
                    if al.vertical in ('center', 'top'):
                        st['dikey'] = al.vertical
                b = hv.border
                if b is not None and (b.left.style or b.right.style or b.top.style or b.bottom.style):
                    st['kenar'] = True
                if ref in cf:
                    st.update(cf[ref])
                if v in (None, '') and not st:
                    continue
                kayit = {'c': get_column_letter(c)}
                if v not in (None, ''):
                    metin, sayi_mi = bicimle(v, hv.number_format)
                    if isinstance(v, str):
                        metin = metni_turkcele(metin)
                    kayit['v'] = metin
                    if sayi_mi and isinstance(v, (int, float)) and not isinstance(v, bool):
                        kayit['n'] = v if not (isinstance(v, float) and (math.isnan(v) or math.isinf(v))) else None
                        if 'hiza' not in st:
                            st['hiza'] = 'right'
                    if isinstance(hf.value, str) and hf.value.startswith('='):
                        kayit['f'] = True
                if 'cubuk' in st:
                    kayit['b'] = st.pop('cubuk')   # veri çubuğu oranı hücrede, rengi stilde
                if st:
                    anahtar = json.dumps(st, sort_keys=True)
                    if anahtar not in stil_no:
                        stil_no[anahtar] = len(stiller); stiller.append(st)
                    kayit['s'] = stil_no[anahtar]
                hucreler.append(kayit)
            satirlar.append({'r': r, 'yukseklik': int(round(h * 4 / 3)), 'hucreler': hucreler})
        gosterilen_satirlar = [s['r'] for s in satirlar]
        # Birleşik hücreler seçime kırpılır (seçim dışındaki satır/sütunlara taşan parça atılır)
        birlesik = []
        for m in wsv.merged_cells.ranges:
            r1, r2, c1, c2 = m.min_row, m.max_row, m.min_col, m.max_col
            if r1 > son_r or c1 > son_c or not secili(r1):
                continue
            r2 = max(x for x in gosterilen_satirlar if r1 <= x <= r2) if any(r1 <= x <= r2 for x in gosterilen_satirlar) else r1
            c2 = min(c2, son_c)
            if (r1, c1) != (r2, c2):
                birlesik.append(f'{get_column_letter(c1)}{r1}:{get_column_letter(c2)}{r2}')
        # Excel'deki gibi metin taşması: sola dayalı, sarılmayan metin sağdaki boş hücrelere taşar.
        # Değeri ya da formülü olan hücre (formül boş metin döndürse bile) ve birleşik hücre taşmayı durdurur.
        birlesik_hucre = set()
        for m in wsv.merged_cells.ranges:
            for r in range(m.min_row, m.max_row + 1):
                for c in range(m.min_col, m.max_col + 1):
                    birlesik_hucre.add((r, c))

        def bos(r, c):
            if (r, c) in birlesik_hucre:
                return False
            v = wsv.cell(r, c).value; f = wsf.cell(r, c).value
            return v in (None, '') and f in (None, '')

        for sat in satirlar:
            r = sat['r']
            for h in sat['hucreler']:
                if 'v' not in h or 'n' in h:
                    continue
                st = stiller[h['s']] if 's' in h else {}
                c = column_index_from_string(h['c'])
                if st.get('sar') or st.get('hiza') in ('right', 'center') or (r, c) in birlesik_hucre:
                    continue
                k = 0
                while c + k + 1 <= son_c and bos(r, c + k + 1):
                    k += 1
                if k:
                    h['tasma'] = k
        # Grafikler: dolu alanın hemen yanında başlayıp taşan grafik için sütun listesi uzatılır (Dashboard N sütunu);
        # dolu alanın tamamen dışında duran grafik (Tahmin, S3) "disarida" işaretlenir, web'de tablonun üstünde çizilir.
        grafik_listesi = grafikler(z, yol[ad], wbv)
        for g in grafik_listesi:
            bas_c = column_index_from_string(re.match(r'[A-Z]+', g['konum']['bas']).group(0))
            bas_r = int(re.search(r'\d+', g['konum']['bas']).group(0))
            son_gc = column_index_from_string(re.match(r'[A-Z]+', g['konum']['son']).group(0))
            son_gr = int(re.search(r'\d+', g['konum']['son']).group(0))
            # Seçimin (ya da dolu alanın) dışında başlayan grafik tablonun üstünde çizilir
            if bas_c > son_c + 1 or bas_r > son_r or not secili(bas_r) or (sutun_siniri and bas_c > sutun_siniri):
                g['disarida'] = True
                continue
            if sutun_siniri:
                son_gc = min(son_gc, son_c)
            else:
                for i in range(len(sutunlar) + 1, son_gc + 1):
                    w, gizli = genislik.get(i, (varsayilan, False))
                    sutunlar.append({'harf': get_column_letter(i), 'genislik': 0 if gizli else px_genislik(w)})
            if satir_secimi:
                son_gr = max([x for x in gosterilen_satirlar if x <= son_gr] or [bas_r])
            else:
                for r in range(satirlar[-1]['r'] + 1, son_gr + 1):
                    rd = wsv.row_dimensions.get(r)
                    h = rd.height if rd is not None and rd.height else 15
                    satirlar.append({'r': r, 'yukseklik': int(round(h * 4 / 3)), 'hucreler': []})
            g['konum']['son'] = f'{get_column_letter(son_gc)}{son_gr}'
        veri = {
            'id': slug, 'ad': ad, 'kaynak': os.path.basename(kitap),
            'boyut': {'satir': tam_r, 'sutun': tam_c},
            'dondur': wsf.freeze_panes,
            'sutunlar': sutunlar, 'satirlar': satirlar, 'birlesik': birlesik,
            'stiller': stiller, 'grafikler': grafik_listesi,
        }
        if satir_secimi or sutun_siniri:
            veri['gosterilen'] = {'satirlar': sorted(satir_secimi) if satir_secimi else None, 'son_sutun': get_column_letter(son_c)}
        with open(os.path.join(cikis, slug + '.json'), 'w', encoding='utf-8') as f:
            json.dump(veri, f, ensure_ascii=False, separators=(',', ':'))
        ozet.append((ad, slug, son_r, son_c, len(birlesik), len(veri['grafikler']), os.path.getsize(os.path.join(cikis, slug + '.json'))))
    return ozet


if __name__ == '__main__':
    if len(sys.argv) < 4:
        sys.exit('Kullanım: python3 scripts/rehber-disa-aktar.py KITAP.xlsx CIKIS_KLASORU "Sayfa Adı=slug" ...')
    kitap, cikis = sys.argv[1], sys.argv[2]
    secim = [secim_coz(a) for a in sys.argv[3:]]
    for satir in disa_aktar(kitap, cikis, secim):
        print('%-18s %-18s satır %4d sütun %3d birleşik %3d grafik %d  %6d bayt' % satir)
