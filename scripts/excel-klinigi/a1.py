from lib2 import *
D=date; TD=date.today()
def kontak():
    p=P("KONTAK","Araç gider ve yakıt takibi","Aracın sana kilometre başına kaça geliyor, 100 kilometrede kaç litre yakıyor, hangi bakımın zamanı geldi."); n=1000
    L=p.lists({"Araç":["34 ABC 123"],"Gider türü":["Yakıt","Bakım","Sigorta","Vergi","Muayene","Lastik","Otopark ve geçiş","Diğer"]})
    rB,rC,rD=[f"${c}${R0}:${c}${R0+n-1}" for c in "BCD"]
    g=p.table("Giderler","Giderler","Her yakıt alımını ve masrafı bir satır yaz. Yakıtta kilometreyi ve litreyi de gir.",[("Tarih","d"),("Araç","l",L["Araç"],13),("Tür","l",L["Gider türü"],17),("Kilometre","n"),("Litre","n",'#,##0.00'),("Tutar (₺)","m"),("Açıklama","t",None,26),
       ("y","h",(f'=IF(AND(C{{r}}="Yakıt",D{{r}}<>""),SUMPRODUCT(MAX(({rB}=B{{r}})*({rC}="Yakıt")*({rD}<D{{r}})*{rD})),0)',NUM)),("Gidilen km","c",('=IF(H{r}>0,D{r}-H{r},"")',NUM)),("Litre / 100 km","c",('=IF(OR(I{r}="",E{r}=""),"",E{r}/I{r}*100)','0.0')),("Km başına yakıt (₺)","c",('=IF(I{r}="","",F{r}/I{r})','0.00'))],n,
       [(D(2026,9,1),"34 ABC 123","Yakıt",10000,40,2000),(D(2026,9,12),"34 ABC 123","Yakıt",10600,42,2100),(D(2026,9,15),"34 ABC 123","Sigorta",None,None,9000),(D(2026,10,2),"34 ABC 123","Yakıt",11250,45.5,2300),(D(2026,10,3),"34 ABC 123","Otopark ve geçiş",None,None,350)])
    km=g.r("Kilometre")
    b=p.table("Bakımlar","Bakım Hatırlatma","Düzenli bakımları, en son ne zaman ve kaç kilometrede yapıldığını yaz.",[("İş","t",None,28),("Son yapılan","d"),("Son kilometre","n"),("Aralık (ay)","n"),("Aralık (km)","n"),("Sonraki tarih","c",('=IF(OR(A{r}="",B{r}="",D{r}=""),"",EDATE(B{r},D{r}))',DT)),("Sonraki km","c",('=IF(OR(A{r}="",C{r}="",E{r}=""),"",C{r}+E{r})',NUM)),
       ("Durum","c",(f'=IF(A{{r}}="","",IF(OR(AND(F{{r}}<>"",F{{r}}<={T}),AND(G{{r}}<>"",G{{r}}<=MAX({km}))),"Zamanı geldi",IF(OR(AND(F{{r}}<>"",F{{r}}<={T}+30),AND(G{{r}}<>"",G{{r}}<=MAX({km})+1000)),"Yaklaşıyor","Var")))',None),16)],40,
       [("Yağ değişimi",D(2026,3,10),4000,12,10000),("Muayene",D(2024,10,20),None,24,None),("Lastik değişimi (kışlık)",D(2025,11,15),None,12,None),("Triger seti",D(2023,5,1),1000,60,90000)])
    for t,fc,tc in (("Zamanı geldi",PINK,RED),("Yaklaşıyor",AMB,AMBT)): p.B.cf_eq(b.ws,f"H{R0}:H{R0+39}",t,fc,tc)
    o=p.ozet(); A_,C_,E_,F_,I_=g.r("Tarih"),g.r("Tür"),g.r("Litre"),g.r("Tutar (₺)"),g.r("Gidilen km")
    tr=p.monthly(o,10,2,[("Yakıt (₺)",msum(F_,A_,f',{C_},"Yakıt"'),TL),("Diğer giderler (₺)",(lambda m,r: f"={mrange(F_,A_,'$C$3',m)}-C{r}"),TL),("Litre",msum(E_,A_),'#,##0.0')])
    p.B.cards(o,5,[("Yıl gideri",f"=C{tr}+D{tr}",TL),("Yakıt",f"=C{tr}",TL),("Litre",f"=E{tr}",'#,##0.0'),("Ortalama litre / 100 km",f'=IF(SUM({I_})=0,0,SUMIFS({E_},{I_},">0")/SUM({I_})*100)','0.0'),("Km başına toplam maliyet (₺)",f"=IF(MAX({km})-MIN({km})<=0,0,SUM({F_})/(MAX({km})-MIN({km})))",'0.00')])
    p.bylist(o,10,9,"Gider türüne göre (seçili yıl)",L["Gider türü"],10,[("Tutar (₺)",f'SUMIFS({F_},{C_},{{k}},{A_},">="&DATE($C$3,1,1),{A_},"<"&DATE($C$3+1,1,1))',TL)],"Tür")
    def chk(w):
        s=w["Giderler"]; assert [s.cell(R0+i,9).value for i in (0,1,3)]==[None,600,650]; assert near(s.cell(R0+1,10).value,7.0) and near(s.cell(R0+3,10).value,7.0) and near(s.cell(R0+1,11).value,3.5)
        o=w["Özet"]; assert o["C19"].value==4100 and o["D19"].value==9000 and o["C20"].value==2300 and o["D20"].value==350 and near(o["E6"].value,7.0) and near(o["F6"].value,15750/1250)
        assert w["Bakımlar"].cell(R0,8).value=="Var" and w["Bakımlar"].cell(R0+1,8).value in ("Yaklaşıyor","Zamanı geldi")
    p.done([("1. Listeler","Aracının plakasını yaz."),("2. Giderler","Her yakıt alımında tarihi, kilometreyi, litreyi ve tutarı gir. Diğer masraflarda kilometre ve litre boş kalabilir."),("3. Bakımlar","Düzenli bakımları ve aralıklarını yaz; zamanı gelen kırmızı olur."),("4. Özet","Aylık yakıt ve masraf, ortalama tüketim ve kilometre başına maliyet.")],
      [("Tüketim hesabı","İki yakıt alımı arasındaki kilometreye bölünür. Doğru sonuç için her seferinde depoyu aynı seviyeye kadar doldur ve hiçbir alımı atlama."),("Km başına maliyet","Bütün giderlerin, kayıtlardaki en düşük ve en yüksek kilometre arasındaki farka bölümüdür.")],
      "Plakayı paylaşmak zorunda değilsin.",[("Tüketim yorumu","[Giderler sayfası] Litre / 100 km değerlerime bak. Hangi dönemde tüketim artmış, olası nedenleri neler?"),("Yıllık maliyet","[Özet sayfası] Aracın bana yıllık toplam maliyetini ve aylık ortalamasını çıkar."),("Bakım planı","[Bakımlar sayfası] Önümüzdeki altı ayda yapılacak bakımları sırala ve her biri için kenara ayırmam gereken tutarı sor."),("Tasarruf","Yakıt tüketimini düşürmek için sürüş ve bakım açısından uygulanabilir beş öneri ver.")],"ExcelKlinigi_KONTAK_Arac_Gider_Takibi.xlsx",check=chk)

def kiraci():
    p=P("KİRACI","Kira geliri takibi","Hangi kiracı ödedi, hangisi geride, daire sana yılda net ne bırakıyor."); nD,nT=30,1000; Y="'Özet'!$C$3"
    L=p.lists({"Gider türü":["Aidat","Tamir ve bakım","Emlak vergisi","Sigorta","Emlakçı","Diğer"]})
    tT,tD,tU=rg("Tahsilatlar","A",nT),rg("Tahsilatlar","B",nT),rg("Tahsilatlar","C",nT); gT,gD,gU=rg("Giderler","A",nT),rg("Giderler","B",nT),rg("Giderler","D",nT)
    yr=lambda dt: f'{dt},">="&DATE({Y},1,1),{dt},"<"&DATE({Y}+1,1,1)'
    d=p.table("Daireler","Daireler","Her daireyi, kiracısını, kirasını ve ayın kaçında ödendiğini yaz.",[("Daire","t",None,22),("Kiracı","t",None,22),("Aylık kira (₺)","m"),("Kira günü","n"),("Sözleşme başlangıcı","d"),("Depozito (₺)","m"),
       ("y1","h",(f'=IF(A{{r}}="","",IF(E{{r}}="",1,IF(YEAR(E{{r}})>{Y},13,IF(YEAR(E{{r}})={Y},MONTH(E{{r}}),1))))',None)),("y2","h",(f'=IF(A{{r}}="","",IF({Y}<YEAR({T}),12,IF({Y}>YEAR({T}),0,MONTH({T})-IF(DAY({T})<D{{r}},1,0))))',None)),
       ("Beklenen kira (₺)","c",('=IF(A{r}="","",MAX(0,H{r}-G{r}+1)*C{r})',TL),15),("Ödenen (₺)","c",(f'=IF(A{{r}}="","",SUMIFS({tU},{tD},A{{r}},{yr(tT)}))',TL)),("Eksik (₺)","c",('=IF(A{r}="","",MAX(0,I{r}-J{r}))',TL)),("Durum","c",('=IF(A{r}="","",IF(K{r}>0,"Gecikmiş","Güncel"))',None)),
       ("Gider (₺)","c",(f'=IF(A{{r}}="","",SUMIFS({gU},{gD},A{{r}},{yr(gT)}))',TL)),("Net gelir (₺)","c",('=IF(A{r}="","",J{r}-M{r})',TL))],nD,
       [("Kadıköy 2+1","Kiracı Alfa",20000,5,D(2026,3,1),40000),("Ümraniye 1+1","Kiracı Beta",15000,1,D(2025,6,1),15000)],uniq=True)
    p.B.cf_eq(d.ws,f"L{R0}:L{R0+nD-1}","Gecikmiş",PINK,RED)
    t=p.table("Tahsilatlar","Tahsilatlar","Kiracıdan gelen her ödemeyi bir satır yaz.",[("Tarih","d"),("Daire","l",d.r("Daire"),22),("Tutar (₺)","m"),("Not","t",None,30)],nT,
       [(D(2026,m,5),"Kadıköy 2+1",20000) for m in range(3,9)]+[(D(2026,m,1),"Ümraniye 1+1",15000) for m in range(1,11)])
    p.table("Giderler","Giderler","Daire için yaptığın masraflar.",[("Tarih","d"),("Daire","l",d.r("Daire"),22),("Tür","l",L["Gider türü"],18),("Tutar (₺)","m"),("Not","t",None,30)],nT,[(D(2026,5,10),"Kadıköy 2+1","Tamir ve bakım",6500),(D(2026,5,20),"Ümraniye 1+1","Emlak vergisi",1800)])
    o=p.ozet("Yılı değiştir. Beklenen kira, seçilen yılda bugüne kadar vadesi gelmiş aylara göre hesaplanır.")
    tr=p.monthly(o,10,2,[("Tahsilat (₺)",msum(tU,tT),TL),("Gider (₺)",msum(gU,gT),TL),("Net (₺)",mf("=C{r}-D{r}"),TL)])
    p.B.cards(o,5,[("Beklenen kira",f"=SUM({d.r('Beklenen kira (₺)')})",TL),("Tahsil edilen",f"=C{tr}",TL),("Eksik",f"=SUM({d.r('Eksik (₺)')})",TL,1),("Gider",f"=D{tr}",TL),("Net gelir",f"=E{tr}",TL)])
    def chk(w):
        s=w["Daireler"]; last=TD.month-(1 if TD.day<5 else 0); e1=max(0,last-3+1)*20000; e2=(TD.month-(1 if TD.day<1 else 0))*15000
        assert s.cell(R0,9).value==e1 and s.cell(R0,10).value==120000 and s.cell(R0,11).value==max(0,e1-120000),(s.cell(R0,9).value,e1)
        assert s.cell(R0+1,9).value==e2 and s.cell(R0+1,12).value=="Güncel" and s.cell(R0,14).value==113500; assert w["Özet"]["F6"].value==270000-8300
    p.done([("1. Daireler","Daireni, kiracını, aylık kirayı, kira gününü ve sözleşme başlangıcını yaz."),("2. Tahsilatlar","Gelen her kira ödemesini tarihiyle gir."),("3. Giderler","Aidat, tamir, vergi gibi masrafları yaz."),("4. Özet","Beklenen, tahsil edilen ve eksik kira ile net gelir.")],
      [("Beklenen kira","Seçili yılda, sözleşme başlangıcından bugüne kadar kira günü geçmiş her ay için bir kira sayılır."),("Kira artışı","Yıl içinde kira değişirse dosya eski ayları yeni tutarla sayar; artıştan sonra eksik tutarı kendin kontrol et."),("Vergi","Kira geliri beyanını hesaplamaz.")],
      "Kiracı adlarını ve adresleri takma adla değiştir.",[("Hatırlatma","Kirası geciken kiracıya gönderilecek kısa ve kibar bir hatırlatma mesajı yaz."),("Getiri","Dairenin bugünkü değeri [tutar]. Net gelire göre yıllık getiri oranını hesapla ve yorumla."),("Artış yazısı","Kira artışını bildirmek için resmî ama nazik bir yazı taslağı hazırla; oranı ben yazacağım."),("Gider analizi","[Giderler sayfası] Masrafları türe göre topla; hangisi olağan dışı?")],"ExcelKlinigi_KIRACI_Kira_Geliri_Takibi.xlsx",check=chk)

def sayac():
    p=P("SAYAÇ","Fatura ve tüketim takibi","Elektrik, su, doğalgaz: ne kadar tükettin, birimi kaça geldi, geçen yılın aynı ayına göre ne değişti."); n=600
    L=p.lists({"Abonelik":["Elektrik","Su","Doğalgaz","İnternet"]}); rA,rB,rE=[f"${c}${R0}:${c}${R0+n-1}" for c in "ABE"]
    s=p.table("Faturalar","Faturalar","Her faturayı bir satır yaz. Endeksleri yazarsan tüketim ve birim maliyet hesaplanır.",[("Fatura ayı (tarih)","d",None,15),("Abonelik","l",L["Abonelik"],15),("İlk endeks","n",'#,##0.0'),("Son endeks","n",'#,##0.0'),("Tutar (₺)","m"),
       ("Tüketim","c",('=IF(OR(C{r}="",D{r}=""),"",D{r}-C{r})','#,##0.0')),("Birim maliyet (₺)","c",('=IF(OR(F{r}="",F{r}=0),"",E{r}/F{r})','0.00')),
       ("Geçen yıl aynı ay (₺)","c",(f'=IF(OR(A{{r}}="",B{{r}}=""),"",IF(SUMIFS({rE},{rB},B{{r}},{rA},">="&DATE(YEAR(A{{r}})-1,MONTH(A{{r}}),1),{rA},"<"&DATE(YEAR(A{{r}})-1,MONTH(A{{r}})+1,1))=0,"",SUMIFS({rE},{rB},B{{r}},{rA},">="&DATE(YEAR(A{{r}})-1,MONTH(A{{r}}),1),{rA},"<"&DATE(YEAR(A{{r}})-1,MONTH(A{{r}})+1,1))))',TL),17),("Değişim","c",('=IF(OR(H{r}="",E{r}=""),"",E{r}/H{r}-1)',PCT))],n,
       [(D(2025,9,15),"Elektrik",700,940,1200),(D(2026,8,15),"Elektrik",3400,3720,1650),(D(2026,9,15),"Elektrik",3720,4020,1500),(D(2026,9,20),"Su",210,224,560),(D(2026,9,25),"Doğalgaz",1500,1535,420),(D(2026,9,28),"İnternet",None,None,650)])
    o=p.ozet(); A_,B_,E_,F_=s.r("Fatura ayı (tarih)"),s.r("Abonelik"),s.r("Tutar (₺)"),s.r("Tüketim")
    tr=p.monthly(o,10,2,[(a+" (₺)",msum(E_,A_,f',{B_},"{a}"'),TL) for a in ("Elektrik","Su","Doğalgaz")]+[("Tümü (₺)",msum(E_,A_),TL)])
    p.B.cards(o,5,[("Yıl toplamı",f"=F{tr}",TL),("Aylık ortalama",f'=IF(COUNTIF(F11:F22,">0")=0,0,F{tr}/COUNTIF(F11:F22,">0"))',TL),("Elektrik",f"=C{tr}",TL),("Su",f"=D{tr}",TL),("Doğalgaz",f"=E{tr}",TL)])
    yr=f'{A_},">="&DATE($C$3,1,1),{A_},"<"&DATE($C$3+1,1,1)'
    p.bylist(o,10,9,"Aboneliğe göre (seçili yıl)",L["Abonelik"],10,[("Tutar (₺)",f"SUMIFS({E_},{B_},{{k}},{yr})",TL),("Tüketim",f"SUMIFS({F_},{B_},{{k}},{yr})",'#,##0.0'),("Fatura sayısı",f"COUNTIFS({B_},{{k}},{yr})",NUM)],"Abonelik")
    def chk(w):
        f=w["Faturalar"]; assert f.cell(R0+2,6).value==300 and near(f.cell(R0+2,7).value,5) and f.cell(R0+2,8).value==1200 and near(f.cell(R0+2,9).value,0.25) and f.cell(R0+1,8).value is None
        o=w["Özet"]; assert o["C19"].value==1500 and o["F19"].value==3130 and o["B6"].value==4780 and near(o["C6"].value,2390)
    p.done([("1. Listeler","Aboneliklerini yaz."),("2. Faturalar","Her faturanın tarihini, tutarını ve varsa ilk ve son endeksini gir."),("3. Özet","Aylık tutarlar, yıl toplamı ve abonelik bazında tüketim.")],
      [("Geçen yıl karşılaştırması","Aynı aboneliğin bir yıl önceki aynı ayına ait fatura varsa gösterilir."),("Aylık tablo","İlk üç sütun Elektrik, Su ve Doğalgaz adlarına göre toplar; abonelik adını değiştirirsen o sütun boş kalır, Tümü sütunu çalışmaya devam eder.")],
      "Abone ve tesisat numaralarını paylaşma.",[("Artış nedeni","[Faturalar sayfası] Tutarı geçen yıla göre en çok artan faturaları bul; artış tüketimden mi birim fiyattan mı geliyor?"),("Tasarruf","Elektrik tüketimimi düşürmek için evde uygulanabilir beş öneri ver."),("Kış bütçesi","[Özet sayfası] Geçmiş aylara bakarak kış ayları için aylık ne kadar ayırmalıyım?"),("Kontrol","[Faturalar sayfası] Son endeksi ilk endeksten küçük ya da tüketimi olağan dışı olan satır var mı?")],"ExcelKlinigi_SAYAC_Fatura_Tuketim_Takibi.xlsx",check=chk)

def kiler():
    p=P("KİLER","Erzak ve son kullanma tarihi takibi","Evde ne var, ne azaldı, hangisinin tarihi geçmek üzere; alışveriş listesi kendiliğinden çıksın."); n=300
    L=p.lists({"Kategori":["Bakliyat","Konserve","Süt ürünleri","Dondurulmuş","Temizlik","İçecek","Baharat","Diğer"]})
    k=p.table("Kiler","Kiler","Ürünleri, elindeki miktarı, altına düşünce almak istediğin miktarı ve son kullanma tarihini yaz.",[("Ürün","t",None,26),("Kategori","l",L["Kategori"],16),("Miktar","n",'#,##0.##'),("Birim","t",None,9),("En az","n",'#,##0.##'),("Son kullanma","d"),
       ("Kalan gün","c",(f'=IF(OR(A{{r}}="",F{{r}}=""),"",F{{r}}-{T})',NUM)),("Durum","c",(f'=IF(A{{r}}="","",IF(AND(F{{r}}<>"",F{{r}}<{T}),"Tarihi geçti",IF(AND(F{{r}}<>"",F{{r}}<={T}+7),"Bu hafta bitiyor",IF(C{{r}}<=E{{r}},"Azaldı","Tamam"))))',None),16),
       ("y1","h",('=IF(AND(A{r}<>"",F{r}<>""),F{r}+ROW()/1000000,"")',None)),("y2","h",('=IF(AND(A{r}<>"",C{r}<=E{r}),ROW(),"")',None))],n,
       [("Kırmızı mercimek","Bakliyat",2,"kg",1,TD+timedelta(200)),("Yoğurt","Süt ürünleri",1,"kg",1,TD+timedelta(4)),("Ton balığı","Konserve",6,"adet",2,TD+timedelta(400)),("Süt","Süt ürünleri",3,"L",2,TD-timedelta(2)),("Bulaşık deterjanı","Temizlik",0,"adet",1,None),("Pirinç","Bakliyat",5,"kg",2,TD+timedelta(90))],uniq=True)
    for t,fc,tc in (("Tarihi geçti",PINK,RED),("Bu hafta bitiyor",AMB,AMBT),("Azaldı","DBEAFE","1D4ED8")): p.B.cf_eq(k.ws,f"H{R0}:H{R0+n-1}",t,fc,tc)
    o=p.ozet("Bu sayfaya yazma.",year=None); H_=k.r("Durum")
    p.B.cards(o,5,[("Ürün",f"=COUNTA({k.r('Ürün')})",NUM),("Tarihi geçen",f'=COUNTIF({H_},"Tarihi geçti")',NUM,1),("Bu hafta biten",f'=COUNTIF({H_},"Bu hafta bitiyor")',NUM,1),("Azalan",f"=COUNT({k.r('y2')})",NUM)])
    p.top(o,10,2,"Son kullanma tarihi en yakın 10 ürün",["Ürün","Son kullanma","Kalan gün"],k.r("y1"),k.r("Ürün"),[k.r("Son kullanma"),k.r("Kalan gün")],10,[DT,NUM],"SMALL")
    p.B.label(o,"I9","Alışveriş listesi (azalanlar)"); p.B.table(o,10,9,["Ürün","Elde","En az"],15,fmt={10:'#,##0.##',11:'#,##0.##'})
    for i in range(1,16):
        r=10+i; o.cell(r,9,f"=IFERROR(INDEX('Kiler'!$A$1:$A${R0+n-1},SMALL({k.r('y2')},{i}))&\"\",\"\")")
        for c,h in ((10,"Miktar"),(11,"En az")): o.cell(r,c,f'=IF(I{r}="","",INDEX({k.r(h)},MATCH(I{r},{k.r("Ürün")},0)))')
    def chk(w):
        s=w["Kiler"]; assert [s.cell(R0+i,8).value for i in range(6)]==["Tamam","Bu hafta bitiyor","Tamam","Tarihi geçti","Azaldı","Tamam"]
        o=w["Özet"]; assert [o.cell(6,c).value for c in range(2,6)]==[6,1,1,2] and o["B11"].value=="Süt" and o["B12"].value=="Yoğurt" and o["I11"].value=="Yoğurt" and o["I12"].value=="Bulaşık deterjanı"
    p.done([("1. Kiler","Ürünleri, miktarı, en az miktarı ve son kullanma tarihini yaz. Kullandıkça miktarı güncelle."),("2. Özet","Tarihi yaklaşan ürünler ve alışveriş listesi kendiliğinden çıkar.")],
      [("Azaldı","Miktar, en az miktara eşit ya da altındaysa ürün alışveriş listesine girer."),("Tek tarih","Aynı üründen farklı tarihli paketler varsa en yakın tarihi yaz; her ürün adı bir kez girilir.")],
      "Paylaşılacak kişisel bilgi yok; yine de adres yazma.",[("Yemek fikri","[Özet sayfasındaki tarihi yaklaşanlar] Bu ürünleri kullanarak yapılabilecek üç yemek öner."),("Alışveriş listesi","[Alışveriş listesi] Bu listeyi market reyonlarına göre grupla."),("İsraf analizi","Tarihi geçen ürünlerime bakarak israfı azaltmak için üç alışkanlık öner."),("Stok önerisi","Dört kişilik bir ev için bu ürünlerin en az miktarlarını gözden geçir.")],"ExcelKlinigi_KILER_Erzak_Takibi.xlsx",check=chk)

def davet():
    p=P("DAVET","Etkinlik bütçesi ve davetli listesi","Düğün, nişan, açılış: bütçe ne durumda, kime ne kadar ödenecek, kaç kişi geliyor, masalar doldu mu."); nK,nD=100,500
    L=p.lists({"Kategori":["Mekân","Yemek","Fotoğraf","Müzik","Kıyafet","Davetiye","Süsleme","Diğer"],"Taraf":["Kız tarafı","Erkek tarafı","Ortak"]})
    k=p.table("Kalemler","Bütçe Kalemleri","Her harcama kalemini yaz. Fiyat kesinleşince Gerçekleşen sütununu doldur.",[("Kalem","t",None,28),("Kategori","l",L["Kategori"],15),("Planlanan (₺)","m"),("Gerçekleşen (₺)","m"),("Ödenen (₺)","m"),
       ("Güncel tutar (₺)","c",('=IF(A{r}="","",IF(D{r}="",C{r},D{r}))',TL),16),("Kalan ödeme (₺)","c",('=IF(A{r}="","",F{r}-E{r})',TL),16),("Plan farkı (₺)","c",('=IF(OR(A{r}="",D{r}=""),"",D{r}-C{r})',TL))],nK,
       [("Salon kirası","Mekân",150000,160000,60000),("Yemek (kişi başı)","Yemek",200000,None,0),("Fotoğrafçı","Fotoğraf",40000,35000,35000),("Orkestra","Müzik",50000,None,10000)])
    d=p.table("Davetliler","Davetliler","Her satır bir davetiye. Kişi sayısına gelecek toplam kişiyi yaz.",[("Ad","t",None,26),("Taraf","l",L["Taraf"],14),("Kişi sayısı","n"),("Yanıt","l","Geliyor,Gelmiyor,Yanıt yok"),("Masa no","n"),("Not","t",None,26)],nD,
       [("Aile Alfa","Kız tarafı",4,"Geliyor",1),("Aile Beta","Erkek tarafı",3,"Geliyor",1),("Aile Gama","Kız tarafı",2,"Gelmiyor",None),("Aile Delta","Erkek tarafı",5,"Yanıt yok",2),("Aile Epsilon","Ortak",4,"Geliyor",1)])
    o=p.ozet("Toplam bütçeyi ve bir masanın kaç kişilik olduğunu yaz.",year=None); o["B3"]="Toplam bütçe (₺)"; p.B.inp(o,"C3",450000,TLI); o["D3"]="Masa kapasitesi"; p.B.inp(o,"E3",10,"0")
    F_,E_,G_=k.r("Güncel tutar (₺)"),k.r("Ödenen (₺)"),k.r("Kalan ödeme (₺)"); K_,Y_,M_=d.r("Kişi sayısı"),d.r("Yanıt"),d.r("Masa no")
    p.B.cards(o,5,[("Güncel toplam",f"=SUM({F_})",TL),("Bütçeden kalan",f"=C3-SUM({F_})",TL),("Ödenen",f"=SUM({E_})",TL),("Kalan ödeme",f"=SUM({G_})",TL,1),("Gelen kişi",f'=SUMIFS({K_},{Y_},"Geliyor")',NUM),("Kişi başı maliyet",f'=IF(F6=0,0,B6/F6)',TL)])
    p.bylist(o,9,2,"Kategoriye göre",L["Kategori"],10,[("Planlanan (₺)",f"SUMIFS({k.r('Planlanan (₺)')},{k.r('Kategori')},{{k}})",TL),("Güncel (₺)",f"SUMIFS({F_},{k.r('Kategori')},{{k}})",TL),("Ödenen (₺)",f"SUMIFS({E_},{k.r('Kategori')},{{k}})",TL)])
    p.bylist(o,22,2,"Tarafa göre davetli (kişi)",L["Taraf"],5,[("Davetli",f"SUMIFS({K_},{d.r('Taraf')},{{k}})",NUM),("Geliyor",f'SUMIFS({K_},{d.r("Taraf")},{{k}},{Y_},"Geliyor")',NUM),("Yanıt yok",f'SUMIFS({K_},{d.r("Taraf")},{{k}},{Y_},"Yanıt yok")',NUM)],"Taraf")
    p.B.label(o,"I8","Masa düzeni (gelenler)"); p.B.table(o,9,9,["Masa","Kişi","Durum"],25,fmt={10:NUM},center=(9,11))
    for i in range(1,26):
        r=9+i; o.cell(r,9,i); o.cell(r,10,f'=SUMIFS({K_},{M_},I{r},{Y_},"Geliyor")'); o.cell(r,11,f'=IF(J{r}=0,"",IF(J{r}>$E$3,"Taştı",IF(J{r}=$E$3,"Dolu","Yer var")))')
    p.B.cf_eq(o,"K10:K34","Taştı",PINK,RED)
    def chk(w):
        o=w["Özet"]; assert [o.cell(6,c).value for c in range(2,7)]==[445000,5000,105000,340000,11] and near(o["G6"].value,445000/11) and o["J10"].value==11 and o["K10"].value=="Taştı" and o["D10"].value==160000 and o["D24"].value==3 and o["E24"].value==5
    p.done([("1. Kalemler","Harcama kalemlerini planlanan tutarıyla yaz; fiyat kesinleşince gerçekleşeni, ödeme yaptıkça ödeneni gir."),("2. Davetliler","Davetiyeleri, kişi sayısını, yanıtı ve masa numarasını yaz."),("3. Özet","Bütçe durumu, kalan ödemeler, gelen kişi sayısı ve masa doluluğu.")],
      [("Güncel tutar","Gerçekleşen yazılmışsa o, yazılmamışsa planlanan tutar sayılır."),("Kişi başı maliyet","Güncel toplamın, Geliyor yanıtı verenlerin kişi sayısına bölümüdür.")],
      "Davetli adlarını ve telefonlarını paylaşma.",[("Bütçe kısma","[Kalemler sayfası] Bütçeyi yüzde 10 düşürmem gerekse hangi kalemlerden kısabilirim? Etkisini yaz."),("Yanıt hatırlatma","Yanıt vermeyen davetlilere gönderilecek kısa ve sıcak bir hatırlatma mesajı yaz."),("Ödeme takvimi","[Kalemler sayfası] Kalan ödemeleri etkinlik tarihine [tarih] göre aylara yay."),("Kontrol listesi","Etkinlikten bir hafta önce yapılacaklar için bir kontrol listesi hazırla.")],"ExcelKlinigi_DAVET_Etkinlik_Butcesi.xlsx",check=chk)
if __name__=="__main__":
    for f in (kontak,kiraci,sayac,kiler,davet): f()
