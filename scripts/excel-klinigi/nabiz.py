from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.chart import BarChart, Reference
from openpyxl.utils import get_column_letter
from datetime import date

GREEN="1F6F43"; MINT="E8F5EE"; INPUT="FFF9DB"; GREY="F3F4F6"; RED="B42318"; DARK="1B1F23"
F="Arial"
def font(sz=10,b=False,c=DARK,i=False): return Font(name=F,size=sz,bold=b,color=c,italic=i)
def fill(c): return PatternFill("solid",start_color=c,end_color=c)
thin=Side(style="thin",color="D0D5DD")
box=Border(left=thin,right=thin,top=thin,bottom=thin)
TL='#,##0.00 "₺";[Red]-#,##0.00 "₺";"-"'
N_ROWS=500; R0=5; R1=R0+N_ROWS-1   # Kayıtlar 5..504
K="'Kayıtlar'!"
rngA=f"{K}$A${R0}:$A${R1}"; rngB=f"{K}$B${R0}:$B${R1}"; rngC=f"{K}$C${R0}:$C${R1}"; rngE=f"{K}$E${R0}:$E${R1}"

wb=Workbook()

# ---------- Başla ----------
ws=wb.active; ws.title="Başla"; ws.sheet_view.showGridLines=False
ws.column_dimensions["A"].width=3; ws.column_dimensions["B"].width=24; ws.column_dimensions["C"].width=78
ws.merge_cells("B2:C2"); ws["B2"]="EXCEL KLİNİĞİ"; ws["B2"].font=font(11,True,"FFFFFF"); ws["B2"].fill=fill(GREEN)
ws["B2"].alignment=Alignment(vertical="center",indent=1); ws.row_dimensions[2].height=24
ws.merge_cells("B3:C3"); ws["B3"]="NABIZ  |  Gelir Gider Defteri"; ws["B3"].font=font(20,True,GREEN); ws.row_dimensions[3].height=36
ws.merge_cells("B4:C4"); ws["B4"]="Esnaf, serbest çalışan ve ev bütçesi için. Kaydı gir, özet kendiliğinden çıksın."; ws["B4"].font=font(10,c="475467")
rows=[
 ("NASIL KULLANILIR",None),
 ("1. Kategoriler","Kendi gelir ve gider kategorilerini yaz. Listeye eklediğin her kategori, kayıt girerken açılır listede görünür."),
 ("2. Kayıtlar","Her gelir ya da gider için bir satır gir: tarih, tür, kategori, açıklama, tutar, ödeme şekli. Tutarı her zaman artı sayı olarak yaz."),
 ("3. Özet","Yılı seç. Aylık gelir, gider, net ve kategori dağılımı kendiliğinden hesaplanır. Bu sayfada yıldan başka hiçbir hücreye dokunma."),
 ("4. AI Komutları","Kayıtlarını bir yapay zeka asistanına yapıştırıp kullanabileceğin hazır komutlar."),
 (None,None),
 ("RENKLER",None),
 ("Sarı hücre","Senin dolduracağın hücre."),
 ("Beyaz / yeşil hücre","Formül ya da başlık. Değiştirme, kendiliğinden hesaplanır."),
 (None,None),
 ("ÖNEMLİ",None),
 ("Örnek kayıtlar","Kayıtlar sayfasındaki 8 satır örnektir. Kullanmaya başlamadan önce seçip sil (yalnızca A-F sütunlarındaki içeriği)."),
 ("Kapasite",f"Kayıtlar sayfası {N_ROWS} satıra kadar hesaplanır. Dolunca dosyanın boş bir kopyasıyla yeni yıla başla."),
 ("Kategori adı değişirse","Bir kategorinin adını sonradan değiştirirsen eski kayıtlardaki ad aynı kalır. Eski kayıtları da güncelle, yoksa özet dağılımında görünmez."),
]
r=6
for a,b in rows:
    if a and b is None:
        ws.merge_cells(start_row=r,start_column=2,end_row=r,end_column=3)
        ws.cell(r,2,a).font=font(10,True,GREEN); ws.cell(r,2).fill=fill(MINT); ws.cell(r,2).alignment=Alignment(indent=1,vertical="center"); ws.row_dimensions[r].height=20
    elif a:
        ws.cell(r,2,a).font=font(10,True); ws.cell(r,3,b).font=font(10)
        ws.cell(r,2).alignment=Alignment(vertical="top",indent=1); ws.cell(r,3).alignment=Alignment(wrap_text=True,vertical="top")
        ws.row_dimensions[r].height=30 if len(b)>80 else 18
        if a=="Sarı hücre": ws.cell(r,2).fill=fill(INPUT)
    r+=1

# ---------- Kategoriler ----------
wk=wb.create_sheet("Kategoriler"); wk.sheet_view.showGridLines=False
for col,w in zip("ABCDEF",[28,3,32,3,22,3]): wk.column_dimensions[col].width=w
wk["A1"]="Kategoriler"; wk["A1"].font=font(16,True,GREEN)
wk["A2"]="Sarı hücrelere kendi kategorilerini yaz. Boş bıraktıkların listede görünmez."; wk["A2"].font=font(9,c="475467",i=True)
gelir=["Satış","Hizmet Geliri","Maaş","Kira Geliri","Faiz / Yatırım","Diğer Gelir"]
gider=["Kira","Faturalar","İnternet / Telefon","Market / Gıda","Ulaşım / Yakıt","Malzeme / Stok","Personel","Vergi / SGK","Reklam / Tanıtım","Kargo","Sağlık","Eğitim","Eğlence","Diğer Gider"]
odeme=["Nakit","Banka Kartı","Kredi Kartı","Havale / EFT"]
for col,title,items,n in (("A","Gelir Kategorileri",gelir,12),("C","Gider Kategorileri",gider,20),("E","Ödeme Şekli",odeme,6)):
    c=wk[f"{col}3"]; c.value=title; c.font=font(10,True,"FFFFFF"); c.fill=fill(GREEN); c.border=box; c.alignment=Alignment(indent=1)
    for i in range(n):
        c=wk[f"{col}{4+i}"]; c.value=items[i] if i<len(items) else None
        c.font=font(10); c.fill=fill(INPUT); c.border=box; c.alignment=Alignment(indent=1)

# ---------- Kayıtlar ----------
wr=wb.create_sheet("Kayıtlar")
for col,w in zip("ABCDEF",[13,10,24,38,16,16]): wr.column_dimensions[col].width=w
wr["A1"]="Kayıtlar"; wr["A1"].font=font(16,True,GREEN)
wr["A2"]="Her satıra bir gelir ya da gider. Tutarı artı sayı olarak gir; tür sütunu gelir mi gider mi olduğunu belirler."; wr["A2"].font=font(9,c="475467",i=True)
heads=["Tarih","Tür","Kategori","Açıklama","Tutar (₺)","Ödeme Şekli"]
for j,h in enumerate(heads,1):
    c=wr.cell(4,j,h); c.font=font(10,True,"FFFFFF"); c.fill=fill(GREEN); c.border=box; c.alignment=Alignment(horizontal="center",vertical="center")
wr.row_dimensions[4].height=22
samples=[
 (date(2026,9,1),"Gelir","Satış","Örnek: Eylül satışları",42000,"Havale / EFT"),
 (date(2026,9,3),"Gider","Kira","Örnek: Dükkân kirası",12000,"Havale / EFT"),
 (date(2026,9,10),"Gider","Faturalar","Örnek: Elektrik faturası",1850,"Banka Kartı"),
 (date(2026,9,15),"Gider","Malzeme / Stok","Örnek: Ürün alımı",9500,"Kredi Kartı"),
 (date(2026,10,1),"Gelir","Satış","Örnek: Ekim ilk hafta satışları",15500,"Nakit"),
 (date(2026,10,2),"Gider","Kira","Örnek: Dükkân kirası",12000,"Havale / EFT"),
 (date(2026,10,3),"Gider","İnternet / Telefon","Örnek: İnternet faturası",650,"Banka Kartı"),
 (date(2026,10,4),"Gelir","Hizmet Geliri","Örnek: Kurulum hizmeti",3000,"Havale / EFT"),
]
for i in range(N_ROWS):
    r=R0+i
    vals=samples[i] if i<len(samples) else (None,)*6
    for j,v in enumerate(vals,1):
        c=wr.cell(r,j,v); c.font=font(10); c.fill=fill(INPUT); c.border=box
    wr.cell(r,1).number_format="DD.MM.YYYY"; wr.cell(r,1).alignment=Alignment(horizontal="center")
    wr.cell(r,2).alignment=Alignment(horizontal="center")
    wr.cell(r,5).number_format='#,##0.00 "₺"'
wr.freeze_panes="A5"
dv=DataValidation(type="date",operator="greaterThan",formula1="36526",allow_blank=True); dv.error="Geçerli bir tarih gir (örnek: 04.10.2026)."; dv.errorTitle="Tarih"; dv.showErrorMessage=True
wr.add_data_validation(dv); dv.add(f"A{R0}:A{R1}")
dv=DataValidation(type="list",formula1='"Gelir,Gider"',allow_blank=True); dv.error="Listeden Gelir ya da Gider seç."; dv.errorTitle="Tür"; dv.showErrorMessage=True
wr.add_data_validation(dv); dv.add(f"B{R0}:B{R1}")
dv=DataValidation(type="list",formula1=f'=IF($B{R0}="Gelir",Kategoriler!$A$4:$A$15,Kategoriler!$C$4:$C$23)',allow_blank=True)
dv.error="Kategoriyi listeden seç. Yeni kategori için Kategoriler sayfasına ekle."; dv.errorTitle="Kategori"; dv.showErrorMessage=True
wr.add_data_validation(dv); dv.add(f"C{R0}:C{R1}")
dv=DataValidation(type="decimal",operator="greaterThan",formula1="0",allow_blank=True); dv.error="Tutarı sıfırdan büyük bir sayı olarak gir."; dv.errorTitle="Tutar"; dv.showErrorMessage=True
wr.add_data_validation(dv); dv.add(f"E{R0}:E{R1}")
dv=DataValidation(type="list",formula1="=Kategoriler!$E$4:$E$9",allow_blank=True)
wr.add_data_validation(dv); dv.add(f"F{R0}:F{R1}")
wr.conditional_formatting.add(f"B{R0}:B{R1}",CellIsRule(operator="equal",formula=['"Gelir"'],font=Font(name=F,bold=True,color=GREEN)))
wr.conditional_formatting.add(f"B{R0}:B{R1}",CellIsRule(operator="equal",formula=['"Gider"'],font=Font(name=F,bold=True,color=RED)))
# eksik bilgi uyarısı: tutar var ama tarih/tür yoksa satırı kırmızıya boya
wr.conditional_formatting.add(f"A{R0}:F{R1}",FormulaRule(formula=[f'AND($E{R0}<>"",OR($A{R0}="",$B{R0}=""))'],fill=fill("FDE2E0")))

# ---------- Özet ----------
wo=wb.create_sheet("Özet"); wo.sheet_view.showGridLines=False
widths={"A":3,"B":16,"C":17,"D":17,"E":17,"F":18,"G":3,"H":26,"I":17,"J":9,"K":3,"L":22,"M":17,"N":9}
for k,v in widths.items(): wo.column_dimensions[k].width=v
wo["B1"]="Özet"; wo["B1"].font=font(16,True,GREEN)
wo["B3"]="Yıl"; wo["B3"].font=font(10,True); wo["B3"].alignment=Alignment(horizontal="right",indent=1)
wo["C3"]=2026; wo["C3"].font=font(12,True); wo["C3"].fill=fill(INPUT); wo["C3"].border=box; wo["C3"].alignment=Alignment(horizontal="center"); wo["C3"].number_format="0"
wo["D3"]="← Görmek istediğin yılı yaz"; wo["D3"].font=font(9,c="475467",i=True)
dv=DataValidation(type="whole",operator="between",formula1="2000",formula2="2100"); dv.error="2000 ile 2100 arasında bir yıl yaz."; dv.showErrorMessage=True
wo.add_data_validation(dv); dv.add("C3")
cards=[("B","Toplam Gelir","=C22",TL),("C","Toplam Gider","=D22",TL),("D","Net (Kalan)","=E22",TL),("E","Kalan / Gelir",'=IF(C22=0,0,E22/C22)','0.0%;[Red]-0.0%;"-"'),("F","Aylık Ort. Gider",'=IF(COUNTIF(D10:D21,">0")=0,0,D22/COUNTIF(D10:D21,">0"))',TL)]
for col,lab,f,nf in cards:
    a=wo[f"{col}5"]; a.value=lab; a.font=font(9,True,"FFFFFF"); a.fill=fill(GREEN); a.alignment=Alignment(horizontal="center"); a.border=box
    b=wo[f"{col}6"]; b.value=f; b.font=font(12,True); b.fill=fill(MINT); b.alignment=Alignment(horizontal="center",vertical="center"); b.number_format=nf; b.border=box
wo.row_dimensions[6].height=28
wo["B8"]="Aylık Tablo"; wo["B8"].font=font(11,True,GREEN)
for j,h in enumerate(["Ay","Gelir","Gider","Net","Birikimli Net"]):
    c=wo.cell(9,2+j,h); c.font=font(10,True,"FFFFFF"); c.fill=fill(GREEN); c.border=box; c.alignment=Alignment(horizontal="center")
aylar=["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"]
for m,ay in enumerate(aylar,1):
    r=9+m
    wo.cell(r,2,ay)
    for col,tur in ((3,"Gelir"),(4,"Gider")):
        wo.cell(r,col,f'=SUMIFS({rngE},{rngB},"{tur}",{rngA},">="&DATE($C$3,{m},1),{rngA},"<"&DATE($C$3,{m+1},1))')
    wo.cell(r,5,f"=C{r}-D{r}")
    wo.cell(r,6,f"=E{r}" if m==1 else f"=F{r-1}+E{r}")
    for col in range(2,7):
        c=wo.cell(r,col); c.font=font(10); c.border=box
        if col>2: c.number_format=TL
        if m%2==0: c.fill=fill(GREY)
    wo.cell(r,2).alignment=Alignment(indent=1)
wo.cell(22,2,"TOPLAM"); wo.cell(22,3,"=SUM(C10:C21)"); wo.cell(22,4,"=SUM(D10:D21)"); wo.cell(22,5,"=SUM(E10:E21)"); wo.cell(22,6,"=F21")
for col in range(2,7):
    c=wo.cell(22,col); c.font=font(10,True); c.fill=fill(MINT); c.border=box
    if col>2: c.number_format=TL
wo.cell(22,2).alignment=Alignment(indent=1)
yil_bas='">="&DATE($C$3,1,1)'; yil_son='"<"&DATE($C$3+1,1,1)'
def cat_table(c0,title,tur,src_col,n,total_cell):
    L=get_column_letter
    wo.cell(8,c0,title).font=font(11,True,GREEN)
    for j,h in enumerate(["Kategori","Tutar","Pay"]):
        c=wo.cell(9,c0+j,h); c.font=font(10,True,"FFFFFF"); c.fill=fill(GREEN); c.border=box; c.alignment=Alignment(horizontal="center")
    for i in range(n):
        r=10+i; a=f"{L(c0)}{r}"
        wo.cell(r,c0,f'=IF(Kategoriler!{src_col}{4+i}="","",Kategoriler!{src_col}{4+i})')
        wo.cell(r,c0+1,f'=IF({a}="","",SUMIFS({rngE},{rngB},"{tur}",{rngC},{a},{rngA},{yil_bas},{rngA},{yil_son}))')
        wo.cell(r,c0+2,f'=IF(OR({a}="",{total_cell}=0),"",{L(c0+1)}{r}/{total_cell})')
        for j in range(3):
            c=wo.cell(r,c0+j); c.font=font(10); c.border=box
            if i%2==1: c.fill=fill(GREY)
        wo.cell(r,c0).alignment=Alignment(indent=1); wo.cell(r,c0+1).number_format=TL; wo.cell(r,c0+2).number_format='0%;-0%;"-"'
cat_table(8,"Gider Dağılımı","Gider","C",20,"$D$22")
cat_table(12,"Gelir Dağılımı","Gelir","A",12,"$C$22")
wo.conditional_formatting.add("E10:F22",CellIsRule(operator="lessThan",formula=["0"],font=Font(name=F,color=RED,bold=True)))
wo.conditional_formatting.add("D6",CellIsRule(operator="lessThan",formula=["0"],font=Font(name=F,size=12,color=RED,bold=True)))
ch=BarChart(); ch.type="col"; ch.title="Aylık Gelir ve Gider"; ch.height=7.5; ch.width=15.2
ch.add_data(Reference(wo,min_col=3,max_col=4,min_row=9,max_row=21),titles_from_data=True)
ch.set_categories(Reference(wo,min_col=2,min_row=10,max_row=21))
ch.series[0].graphicalProperties.solidFill=GREEN; ch.series[1].graphicalProperties.solidFill="D92D20"
ch.legend.position="b"; ch.y_axis.numFmt='#,##0'; ch.y_axis.majorGridlines=None
ch.x_axis.delete=False; ch.y_axis.delete=False
wo.add_chart(ch,"B24")

# ---------- AI Komutları ----------
wa=wb.create_sheet("AI Komutları"); wa.sheet_view.showGridLines=False
wa.column_dimensions["A"].width=3; wa.column_dimensions["B"].width=26; wa.column_dimensions["C"].width=92
wa["B1"]="Yapay Zeka Komutları"; wa["B1"].font=font(16,True,GREEN)
wa.merge_cells("B2:C2"); wa["B2"]="Kayıtlar sayfasında başlık satırıyla birlikte kayıtlarını seç, kopyala, kullandığın yapay zeka asistanına yapıştır ve altına aşağıdaki komutlardan birini ekle."
wa["B2"].font=font(10,c="475467"); wa["B2"].alignment=Alignment(wrap_text=True,vertical="top"); wa.row_dimensions[2].height=30
wa.merge_cells("B3:C3"); wa["B3"]="Dikkat: Açıklama sütununda kişi adı, IBAN, kimlik numarası gibi bilgiler varsa yapıştırmadan önce sil. Yapay zekanın verdiği rakamları Özet sayfasıyla karşılaştır."
wa["B3"].font=font(10,True,RED); wa["B3"].alignment=Alignment(wrap_text=True,vertical="top"); wa.row_dimensions[3].height=30
for j,h in enumerate(["Ne için","Komut (kopyala, yapıştır)"]):
    c=wa.cell(5,2+j,h); c.font=font(10,True,"FFFFFF"); c.fill=fill(GREEN); c.border=box; c.alignment=Alignment(indent=1)
prompts=[
 ("Genel durum","Yukarıdaki tablo benim gelir gider kayıtlarım. Toplam gelir, toplam gider ve kalanı ay ay hesapla, sonra durumumu üç cümleyle özetle."),
 ("En büyük giderler","Bu kayıtlara göre en çok para harcadığım 3 kategoriyi tutarları ve toplam gider içindeki paylarıyla listele."),
 ("Tasarruf fikri","Bu giderlerden hangilerini azaltabilirim? Her öneri için aylık kaç lira kazanacağımı tahmini olarak yaz. Yalnızca tablodaki verilere dayan."),
 ("Aylar arası fark","Son iki ayı karşılaştır. Hangi kategoride ne kadar artış ya da azalış var? En büyük üç değişikliği yaz."),
 ("Sabit ve değişken gider","Giderlerimi her ay tekrar eden sabit giderler ve aydan aya değişen giderler diye ikiye ayır, ikisinin toplamını ver."),
 ("Olağan dışı kayıt","Bu kayıtlarda alışılmadık derecede yüksek ya da tekrar girilmiş gibi görünen satır var mı? Varsa tarihini ve tutarını göster."),
 ("Gelecek ay tahmini","Geçmiş aylara bakarak gelecek ay için gelir ve gider tahmini yap. Tahmini hangi varsayıma dayandırdığını bir cümleyle açıkla."),
 ("Bütçe önerisi","Aylık gelirimi temel alarak her gider kategorisi için bir üst sınır öner. Sonucu kategori ve tutar sütunlu tablo olarak ver."),
 ("Ödeme şekli","Harcamalarımın ne kadarı nakit, ne kadarı kart, ne kadarı havale? Yüzdeleriyle göster."),
 ("Kategori düzeltme","Açıklamalara bakarak yanlış kategoriye girilmiş olabilecek kayıtları bul ve doğru kategoriyi öner."),
]
for i,(a,b) in enumerate(prompts):
    r=6+i
    wa.cell(r,2,a).font=font(10,True); wa.cell(r,3,b).font=font(10)
    for col in (2,3):
        c=wa.cell(r,col); c.border=box; c.alignment=Alignment(wrap_text=True,vertical="center",indent=1)
        if i%2==1: c.fill=fill(GREY)
    wa.row_dimensions[r].height=32

wb.move_sheet("Kategoriler",offset=3)  # Başla, Kayıtlar, Özet, Kategoriler, AI Komutları
wb._sheets=[wb["Başla"],wb["Kayıtlar"],wb["Özet"],wb["Kategoriler"],wb["AI Komutları"]]
for s in wb.worksheets:
    s.sheet_properties.tabColor=GREEN
    s.page_setup.orientation="landscape"; s.page_setup.fitToWidth=1; s.page_setup.fitToHeight=0
    s.sheet_properties.pageSetUpPr.fitToPage=True
wb.active=0
wb.save("ExcelKlinigi_NABIZ_Gelir_Gider_Defteri.xlsx")
