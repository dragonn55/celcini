from lib2 import *
D=date; TD=date.today()
def valiz():
    p=P("VALİZ","Seyahat planı ve bütçesi","Gün gün plan, dövizli harcamalar, kişi başı maliyet ve bütçeden kalan."); n=500
    L=p.lists({"Kategori":["Ulaşım","Konaklama","Yemek","Gezi ve müze","Alışveriş","Diğer"]}); KUR="'Özet'!$C$4"
    h=p.table("Harcamalar","Harcamalar","Her harcamayı bir satır yaz. Yabancı parayla ödediysen para birimini Döviz seç.",[("Tarih","d"),("Kategori","l",L["Kategori"],15),("Açıklama","t",None,28),("Tutar","n",'#,##0.00'),("Para birimi","l","TL,Döviz"),("TL karşılığı (₺)","c",(f'=IF(D{{r}}="","",IF(E{{r}}="Döviz",D{{r}}*{KUR},D{{r}}))',TL),16)],n,
       [(D(2026,7,1),"Ulaşım","Uçak bileti",18000,"TL"),(D(2026,7,2),"Konaklama","Otel (3 gece)",240,"Döviz"),(D(2026,7,2),"Yemek","Akşam yemeği",35,"Döviz"),(D(2026,7,3),"Gezi ve müze","Müze kartı",40,"Döviz"),(D(2026,7,4),"Alışveriş","Hediyelik",1200,"TL")])
    pl=p.table("Plan","Gün Gün Plan","Her gün için nerede olacağını, ne yapacağını ve tahmini maliyeti yaz.",[("Tarih","d"),("Şehir","t",None,18),("Yapılacaklar","t",None,44),("Tahmini maliyet (₺)","m",None,17)],60,[(D(2026,7,1),"Roma","Varış, otele yerleşme",3000),(D(2026,7,2),"Roma","Kolezyum, Roma Forumu",4500),(D(2026,7,3),"Roma","Vatikan müzeleri",4000),(D(2026,7,4),"Roma","Alışveriş, dönüş",2500)])
    o=p.ozet("Sarı hücreleri doldur: bütçe, döviz kuru ve kişi sayısı.",year=None)
    for r,lab,val,nf in ((3,"Toplam bütçe (₺)",60000,TLI),(4,"1 birim döviz kaç ₺",50,'0.00'),(5,"Kişi sayısı",2,"0")): o.cell(r,2,lab).font=font(10,True); p.B.inp(o,f"C{r}",val,nf)
    o["D4"]="Kullanıcı girişi: ödediğin günkü kuru yaz."; o["D4"].font=font(9,c="475467",i=True)
    F_=h.r("TL karşılığı (₺)"); A_=h.r("Tarih")
    p.B.cards(o,7,[("Harcanan",f"=SUM({F_})",TL),("Bütçeden kalan",f"=C3-SUM({F_})",TL),("Kişi başı",f"=IF(C5=0,0,SUM({F_})/C5)",TL),("Günlük ortalama",f"=IF(COUNT({A_})=0,0,SUM({F_})/(MAX({A_})-MIN({A_})+1))",TL),("Planlanan maliyet",f"=SUM({pl.r('Tahmini maliyet (₺)')})",TL)])
    p.bylist(o,11,2,"Kategoriye göre",L["Kategori"],8,[("Tutar (₺)",f"SUMIFS({F_},{h.r('Kategori')},{{k}})",TL),("Pay",f"IF($B$8=0,0,SUMIFS({F_},{h.r('Kategori')},{{k}})/$B$8)","0%")])
    def chk(w):
        o=w["Özet"]; t=18000+240*50+35*50+40*50+1200; assert o["B8"].value==t and o["C8"].value==60000-t and o["D8"].value==t/2 and near(o["E8"].value,t/4) and o["F8"].value==14000 and o["C12"].value==18000 and o["C13"].value==12000
    p.done([("1. Özet","Bütçeni, döviz kurunu ve kişi sayısını yaz."),("2. Plan","Gün gün nerede olacağını ve tahmini maliyeti yaz."),("3. Harcamalar","Yolculukta her harcamayı gir; dövizli olanlar kura göre liraya çevrilir.")],
      [("Tek kur","Dosya tek bir döviz kuru kullanır. Farklı para birimleri ya da değişen kur için tutarı liraya kendin çevirip TL olarak gir."),("Günlük ortalama","İlk ve son harcama tarihi arasındaki gün sayısına bölünür.")],
      "Pasaport, bilet ve rezervasyon numaralarını paylaşma.",[("Rota önerisi","[Plan sayfası] Bu planı yürüme mesafelerine göre yeniden sırala ve her güne bir yedek etkinlik ekle."),("Bütçe kontrolü","[Özet sayfası] Harcamam bütçeye göre nasıl gidiyor? Kalan günler için günlük sınır öner."),("Bavul listesi","[şehir] için [ay] ayında [gün] günlük seyahate uygun bir bavul listesi hazırla."),("Kişi başı hesap","[Harcamalar sayfası] Harcamaları kişi başına böl ve kim kime ne kadar borçlu, hesapla. Ödeyenleri ben söyleyeceğim.")],"ExcelKlinigi_VALIZ_Seyahat_Plani.xlsx",check=chk)

def esya():
    p=P("EŞYA","Ev eşyası ve garanti takibi","Evde ne var, kaça alındı, garantisi ne zaman bitiyor; sigorta ya da taşınma için hazır liste."); n=400
    L=p.lists({"Oda":["Salon","Mutfak","Yatak odası","Çocuk odası","Banyo","Balkon","Depo"],"Kategori":["Beyaz eşya","Elektronik","Mobilya","Küçük ev aleti","Değerli eşya","Diğer"]})
    e=p.table("Eşyalar","Eşyalar","Her eşyayı bir satır yaz. Garanti bitiş tarihini faturadan ya da garanti belgesinden al.",[("Eşya","t",None,28),("Oda","l",L["Oda"],14),("Kategori","l",L["Kategori"],16),("Alış tarihi","d"),("Değer (₺)","m"),("Garanti bitişi","d"),("Marka ve seri no","t",None,24),
       ("Garanti","c",(f'=IF(A{{r}}="","",IF(F{{r}}="","Belirsiz",IF(F{{r}}<{T},"Bitti",IF(F{{r}}<={T}+30,"30 gün içinde","Sürüyor"))))',None)),("Yaş (yıl)","c",(f'=IF(OR(A{{r}}="",D{{r}}=""),"",({T}-D{{r}})/365.25)','0.0')),("y","h",(f'=IF(AND(A{{r}}<>"",F{{r}}<>"",F{{r}}>={T}),F{{r}}+ROW()/1000000,"")',None))],n,
       [("Buzdolabı","Mutfak","Beyaz eşya",D(2024,5,10),45000,D(2027,5,10),"Örnek"),("Televizyon","Salon","Elektronik",D(2025,11,1),38000,TD+timedelta(20),"Örnek"),("Koltuk takımı","Salon","Mobilya",D(2022,3,1),60000,D(2024,3,1),"Örnek"),("Dizüstü bilgisayar","Yatak odası","Elektronik",D(2025,2,14),52000,D(2027,2,14),"Örnek"),("Kahve makinesi","Mutfak","Küçük ev aleti",D(2026,1,5),7000,None,"Örnek")])
    for t,fc,tc in (("Bitti",GREY,"667085"),("30 gün içinde",AMB,AMBT)): p.B.cf_eq(e.ws,f"H{R0}:H{R0+n-1}",t,fc,tc)
    o=p.ozet("Bu sayfaya yazma.",year=None); V_,G_=e.r("Değer (₺)"),e.r("Garanti")
    p.B.cards(o,5,[("Eşya",f"=COUNTA({e.r('Eşya')})",NUM),("Toplam değer",f"=SUM({V_})",TL),("Garantisi süren",f'=COUNTIF({G_},"Sürüyor")+COUNTIF({G_},"30 gün içinde")',NUM),("30 gün içinde biten",f'=COUNTIF({G_},"30 gün içinde")',NUM,1)])
    p.bylist(o,9,2,"Odaya göre",L["Oda"],10,[("Adet",f"COUNTIF({e.r('Oda')},{{k}})",NUM),("Değer (₺)",f"SUMIFS({V_},{e.r('Oda')},{{k}})",TL)],"Oda")
    p.bylist(o,22,2,"Kategoriye göre",L["Kategori"],8,[("Adet",f"COUNTIF({e.r('Kategori')},{{k}})",NUM),("Değer (₺)",f"SUMIFS({V_},{e.r('Kategori')},{{k}})",TL)])
    p.top(o,9,9,"Garantisi en yakın bitecek 10 eşya",["Eşya","Garanti bitişi"],e.r("y"),e.r("Eşya"),[e.r("Garanti bitişi")],10,[DT],"SMALL")
    def chk(w):
        s=w["Eşyalar"]; assert [s.cell(R0+i,8).value for i in range(5)]==["Sürüyor","30 gün içinde","Bitti","Sürüyor","Belirsiz"]
        o=w["Özet"]; assert [o.cell(6,c).value for c in range(2,6)]==[5,202000,3,1] and o["D10"].value==98000 and o["D11"].value==52000 and o["I10"].value=="Televizyon" and o["I11"].value=="Dizüstü bilgisayar"
    p.done([("1. Listeler","Odaları ve kategorileri kendi evine göre düzenle."),("2. Eşyalar","Her eşyayı odası, alış tarihi, değeri ve garanti bitişiyle yaz."),("3. Özet","Toplam değer, oda ve kategori dağılımı, garantisi bitmek üzere olanlar.")],
      [("Değer","Yazdığın tutar alış bedeli ya da bugünkü tahmini değer olabilir; hangisini seçtiysen hep aynısını kullan."),("Sigorta","Liste sigorta başvurusunda yardımcı olur ama poliçe ya da ekspertiz yerine geçmez.")],
      "Seri numaralarını ve adresini paylaşma.",[("Garanti hatırlatma","[Özet sayfası] Garantisi yakında biten eşyalar için garanti bitmeden kontrol etmem gerekenleri yaz."),("Sigorta özeti","[Eşyalar sayfası] Sigortacıya gönderilecek, kategori bazında toplamları gösteren kısa bir özet hazırla."),("Yenileme planı","Yaşı 8 yılı geçen beyaz eşyaları listele ve yenileme için öncelik sırası öner."),("Taşınma listesi","[Eşyalar sayfası] Oda oda taşınma kontrol listesi oluştur.")],"ExcelKlinigi_ESYA_Ev_Envanteri.xlsx",check=chk)

def kumbara():
    p=P("KUMBARA","Birikim hedefleri","Tatil, araba, acil durum fonu: her hedefte neredesin, yetişmek için ayda ne ayırman gerek."); nH,nL=20,1000
    hT,hH,hN=rg("Hareketler","A",nL),rg("Hareketler","B",nL),rg("Hareketler","F",nL)
    h=p.table("Hedefler","Hedefler","Her hedefin tutarını ve tarihini yaz. Başlangıçta elinde olan tutarı da ekle.",[("Hedef","t",None,26),("Hedef tutar (₺)","m"),("Hedef tarihi","d"),("Başlangıç tutarı (₺)","m",None,16),
       ("Biriken (₺)","c",(f'=IF(A{{r}}="","",D{{r}}+SUMIFS({hN},{hH},A{{r}}))',TL)),("İlerleme","c",('=IF(OR(A{r}="",B{r}=0),"",E{r}/B{r})',"0%")),("Kalan (₺)","c",('=IF(A{r}="","",MAX(0,B{r}-E{r}))',TL)),
       ("Kalan ay","c",(f'=IF(OR(A{{r}}="",C{{r}}=""),"",MAX(0,(YEAR(C{{r}})-YEAR({T}))*12+MONTH(C{{r}})-MONTH({T})))',NUM)),("Aylık gereken (₺)","c",('=IF(OR(A{r}="",H{r}=""),"",IF(G{r}=0,0,IF(H{r}=0,G{r},G{r}/H{r})))',TL),16),
       ("Durum","c",(f'=IF(A{{r}}="","",IF(G{{r}}=0,"Tamamlandı",IF(AND(C{{r}}<>"",C{{r}}<{T}),"Süre doldu","Sürüyor")))',None))],nH,
       [("Acil durum fonu",100000,D(2027,6,30),10000),("Yaz tatili",60000,D(2027,6,1),0),("Yeni bilgisayar",45000,D(2026,9,1),45000)],uniq=True)
    for t,fc,tc in (("Tamamlandı",MINT,GREEN),("Süre doldu",PINK,RED)): p.B.cf_eq(h.ws,f"J{R0}:J{R0+nH-1}",t,fc,tc)
    p.B.cf_f(h.ws,f"F{R0}:F{R0+nH-1}",f"AND(ISNUMBER(F{R0}),F{R0}>=1)",MINT,GREEN)
    l=p.table("Hareketler","Hareketler","Hedefe para koyduğunda Yatırma, aldığında Çekme yaz.",[("Tarih","d"),("Hedef","l",h.r("Hedef"),26),("Tür","l","Yatırma,Çekme"),("Tutar (₺)","m"),("Not","t",None,28),("Net (₺)","c",('=IF(D{r}="","",IF(C{r}="Çekme",-D{r},D{r}))',TL))],nL,
       [(D(2026,8,5),"Acil durum fonu","Yatırma",20000),(D(2026,9,5),"Acil durum fonu","Yatırma",5000),(D(2026,9,20),"Acil durum fonu","Çekme",3000),(D(2026,9,5),"Yaz tatili","Yatırma",12000)])
    o=p.ozet()
    tr=p.monthly(o,10,2,[("Net yatırılan (₺)",msum(hN,hT),TL)])
    p.B.cards(o,5,[("Toplam hedef",f"=SUM({h.r('Hedef tutar (₺)')})",TL),("Biriken",f"=SUM({h.r('Biriken (₺)')})",TL),("Genel ilerleme","=IF(B6=0,0,C6/B6)","0%"),("Bu yıl net yatırılan",f"=C{tr}",TL),("Aylık gereken toplam",f"=SUM({h.r('Aylık gereken (₺)')})",TL)])
    def chk(w):
        s=w["Hedefler"]; km=max(0,(2027-TD.year)*12+6-TD.month)
        assert s.cell(R0,5).value==32000 and near(s.cell(R0,6).value,0.32) and s.cell(R0,7).value==68000 and s.cell(R0,8).value==km and near(s.cell(R0,9).value,68000/km) and s.cell(R0+2,10).value=="Tamamlandı" and s.cell(R0+1,5).value==12000
        o=w["Özet"]; assert o["C6"].value==89000 and o["E6"].value==34000 and o["C19"].value==14000
    p.done([("1. Hedefler","Hedeflerini, tutarını, tarihini ve elindeki başlangıç tutarını yaz."),("2. Hareketler","Hedefe para koydukça ya da aldıkça bir satır gir."),("3. Hedefler sayfasına dön","İlerleme, kalan tutar ve yetişmek için ayda gereken tutar hesaplanır.")],
      [("Aylık gereken","Kalan tutarın, bugünden hedef tarihine kadar kalan ay sayısına bölümüdür. Faiz ya da getiri hesaba katılmaz."),("Hedef adı","Bir hedefin adını değiştirirsen eski hareketlerdeki adı da değiştir.")],
      "Hesap numarası ve banka bilgisi paylaşma.",[("Öncelik","[Hedefler sayfası] Aylık [tutar] ayırabiliyorum. Bu parayı hedefler arasında nasıl dağıtmalıyım?"),("Gerçekçilik","[Hedefler sayfası] Hangi hedefin tarihi gerçekçi değil? Yeni tarih öner."),("Motivasyon","Birikim alışkanlığını sürdürmek için otomatik düzen kurmanın üç yolunu anlat."),("Ara hedef","En büyük hedefimi üç ara basamağa böl.")],"ExcelKlinigi_KUMBARA_Birikim_Hedefleri.xlsx",order=["Başla","Hedefler","Hareketler","Özet","AI Komutları"],check=chk)

def karne():
    p=P("KARNE","Ders notu ve ortalama hesaplama","Vize ve final notlarını gir; ders ortalaması, harf notu, dönem ve genel ortalama çıksın. Finalden kaç alman gerektiğini de söylesin."); n=80
    L=p.lists({"Dönem":[f"{i}. dönem" for i in range(1,9)]})
    B=p.B; nt=B.sheet("Not Tablosu","Not Tablosu","Okulunun harf notu sınırlarını yaz. Alt sınırlar küçükten büyüğe sıralı olmalı.",{"A":12,"B":10,"C":10})
    B.head(nt,4,["Alt sınır","Harf","Katsayı"]); B.body(nt,R0,9,3,fmt={3:"0.00"},center=(1,2,3)); B.put(nt,R0,[(0,"FF",0),(40,"FD",0.5),(50,"DD",1),(55,"DC",1.5),(60,"CC",2),(70,"CB",2.5),(75,"BB",3),(85,"BA",3.5),(90,"AA",4)])
    nt["E5"]="Bu sınırlar yalnızca örnektir; her okulun yönetmeliği farklıdır. Kendi okulunun tablosunu yaz."; nt["E5"].font=font(9,c="475467",i=True)
    es,hf,kt=[f"'Not Tablosu'!${c}${R0}:${c}${R0+8}" for c in "ABC"]
    d=p.table("Dersler","Dersler","Her ders bir satır. Final notu girilmemişse, hedef ortalamaya göre finalden gereken not gösterilir.",[("Dönem","l",L["Dönem"],12),("Ders","t",None,28),("Kredi","n"),("Vize","n",'0.0'),("Vize ağırlığı","p"),("Final","n",'0.0'),("Hedef ortalama","n",'0.0'),
       ("Ortalama","c",('=IF(OR(B{r}="",D{r}="",E{r}="",F{r}=""),"",D{r}*E{r}+F{r}*(1-E{r}))','0.0')),("Harf","c",(f'=IF(H{{r}}="","",LOOKUP(H{{r}},{es},{hf}))',None)),("Katsayı","c",(f'=IF(H{{r}}="","",LOOKUP(H{{r}},{es},{kt}))','0.00')),
       ("Finalden gereken","c",('=IF(OR(B{r}="",D{r}="",E{r}="",G{r}="",F{r}<>"",E{r}>=1),"",(G{r}-D{r}*E{r})/(1-E{r}))','0.0'),15),("y1","h",('=IF(J{r}="","",C{r})',None)),("y2","h",('=IF(J{r}="","",C{r}*J{r})',None))],n,
       [("1. dönem","Matematik",3,70,0.4,80,None),("1. dönem","Fizik",4,50,0.4,60,None),("2. dönem","Programlama",3,60,0.4,None,70),("2. dönem","İstatistik",3,85,0.5,95,None)],freeze="C5")
    p.B.cf_f(d.ws,f"K{R0}:K{R0+n-1}",f"AND(ISNUMBER(K{R0}),K{R0}>100)",PINK,RED)
    o=p.ozet("Bu sayfaya yazma.",year=None); K1,K2=d.r("y1"),d.r("y2")
    p.B.cards(o,5,[("Genel ortalama",f"=IF(SUM({K1})=0,0,SUM({K2})/SUM({K1}))","0.00"),("Notu girilen kredi",f"=SUM({K1})",NUM),("Notu girilen ders",f"=COUNT({K1})",NUM),("Bekleyen ders",f"=COUNTA({d.r('Ders')})-COUNT({K1})",NUM)])
    p.bylist(o,9,2,"Döneme göre",L["Dönem"],8,[("Kredi",f"SUMIFS({K1},{d.r('Dönem')},{{k}})",NUM),("Dönem ortalaması",f"IF(SUMIFS({K1},{d.r('Dönem')},{{k}})=0,\"\",SUMIFS({K2},{d.r('Dönem')},{{k}})/SUMIFS({K1},{d.r('Dönem')},{{k}}))","0.00")],"Dönem")
    def chk(w):
        s=w["Dersler"]; assert near(s.cell(R0,8).value,76) and s.cell(R0,9).value=="BB" and s.cell(R0+1,8).value==56 and s.cell(R0+1,9).value=="DC" and near(s.cell(R0+2,11).value,(70-24)/0.6) and s.cell(R0+3,9).value=="AA"
        o=w["Özet"]; assert near(o["B6"].value,(9+6+12)/10) and o["C6"].value==10 and o["E6"].value==1 and near(o["D10"].value,15/7) and o["D11"].value==4
    p.done([("1. Not Tablosu","Okulunun harf notu sınırlarını ve katsayılarını yaz."),("2. Dersler","Derslerini kredi, vize, vize ağırlığı ve final notuyla gir."),("3. Özet","Genel ortalama ve dönem ortalamaları.")],
      [("Finalden gereken","Final notu boşsa ve hedef ortalama yazdıysan gösterilir. 100'den büyük çıkıyorsa hedef o derste ulaşılamaz demektir."),("Tek vize","Dosya bir vize ve bir final varsayar. Ödev ya da ikinci vize varsa ağırlıklı ortalamasını vize notu olarak yaz."),("Resmî değildir","Kesin ortalama için okulunun öğrenci bilgi sistemini esas al.")],
      "Öğrenci numaranı paylaşma.",[("Çalışma planı","[Dersler sayfası] Finalden gereken notu en yüksek olan derslere öncelik vererek iki haftalık bir çalışma planı hazırla."),("Ortalama yükseltme","Genel ortalamamı [hedef] yapmak için kalan derslerden ortalama kaç almalıyım?"),("Ders tekrarı","Hangi dersi tekrar alırsam ortalamama en çok katkı sağlar? Kredi ve mevcut harfe göre sırala."),("Konu özeti","[ders adı] dersinin final konularını çalışmak için bir kontrol listesi oluştur; konuları ben yazacağım.")],"ExcelKlinigi_KARNE_Not_Ortalama.xlsx",order=["Başla","Dersler","Özet","Not Tablosu","Listeler","AI Komutları"],check=chk)

def antrenman():
    p=P("ANTRENMAN","Antrenman günlüğü","Hangi harekette ne kaldırdın, rekorun ne, aylık yükün nasıl gidiyor."); n=2000
    L=p.lists({"Hareket":["Squat","Bench press","Deadlift","Barfiks","Omuz press","Koşu (km)"]}); rB,rH=[f"${c}${R0}:${c}${R0+n-1}" for c in "BH"]
    a=p.table("Günlük","Antrenman Günlüğü","Her set grubunu bir satır yaz: hareket, set, tekrar ve ağırlık.",[("Tarih","d"),("Hareket","l",L["Hareket"],18),("Set","n"),("Tekrar","n"),("Ağırlık (kg)","n",'0.0'),("Hacim (kg)","c",('=IF(OR(C{r}="",D{r}="",E{r}=""),"",C{r}*D{r}*E{r})',NUM)),
       ("Tahmini 1 tekrar (kg)","c",('=IF(OR(D{r}="",E{r}=""),"",E{r}*(1+D{r}/30))','0.0'),15),("y1","h",('=IF(G{r}="",0,G{r})',None)),("Rekor","c",(f'=IF(H{{r}}>0,IF(H{{r}}>=SUMPRODUCT(MAX(({rB}=B{{r}})*{rH})),"Rekor",""),"")',None)),("y2","h",(f'=IF(A{{r}}="",0,IF(COUNTIF(A${R0}:A{{r}},A{{r}})=1,1,0))',None))],n,
       [(D(2026,9,28),"Squat",3,5,80),(D(2026,9,28),"Bench press",3,8,60),(D(2026,9,30),"Deadlift",1,5,110),(D(2026,10,2),"Squat",3,5,85),(D(2026,10,2),"Bench press",3,6,62.5),(D(2026,10,4),"Squat",5,3,87.5)])
    p.B.cf_eq(a.ws,f"I{R0}:I{R0+n-1}","Rekor",MINT,GREEN)
    o=p.ozet(); A_,F_,E_,H_=a.r("Tarih"),a.r("Hacim (kg)"),a.r("Ağırlık (kg)"),a.r("y1")
    tr=p.monthly(o,10,2,[("Antrenman günü",msum(a.r("y2"),A_),NUM),("Toplam hacim (kg)",msum(F_,A_),NUM)])
    p.B.cards(o,5,[("Antrenman günü (yıl)",f"=C{tr}",NUM),("Toplam hacim (kg)",f"=D{tr}",NUM),("Rekor sayısı",f'=COUNTIF({a.r("Rekor")},"Rekor")',NUM)])
    p.bylist(o,10,9,"Harekete göre",L["Hareket"],15,[("En yüksek ağırlık (kg)",f"SUMPRODUCT(MAX(({a.r('Hareket')}={{k}})*{E_}))",'0.0'),("En iyi tahmini 1 tekrar",f"SUMPRODUCT(MAX(({a.r('Hareket')}={{k}})*{H_}))",'0.0'),("Toplam hacim (kg)",f"SUMIFS({F_},{a.r('Hareket')},{{k}})",NUM)],"Hareket")
    def chk(w):
        s=w["Günlük"]; assert s.cell(R0,6).value==1200 and near(s.cell(R0,7).value,80*(1+5/30)) and [s.cell(R0+i,9).value for i in range(6)]==[None,"Rekor","Rekor","Rekor",None,None],[s.cell(R0+i,9).value for i in range(6)]
        o=w["Özet"]; assert o["C19"].value==2 and o["C20"].value==2 and o["J11"].value==87.5 and near(o["K11"].value,85*(1+5/30)) and o["L11"].value==1200+1275+1312.5
    p.done([("1. Listeler","Yaptığın hareketleri yaz."),("2. Günlük","Her antrenmanda hareket, set, tekrar ve ağırlığı gir."),("3. Özet","Aylık antrenman günü ve hacim, hareket bazında en iyi dereceler.")],
      [("Tahmini 1 tekrar","Ağırlık × (1 + tekrar / 30) formülüyle bulunan yaklaşık değerdir; gerçek en yüksek kaldırışın farklı olabilir."),("Rekor","Bir harekette tahmini 1 tekrar değeri o hareketin en yükseğine eşitse Rekor yazar."),("Sağlık","Dosya antrenman önerisi vermez. Ağrı ya da sakatlıkta bir uzmana danış.")],
      "Sağlık bilgilerini paylaşmak zorunda değilsin.",[("Gidiş","[Günlük sayfası] Hareketlerde son altı haftadaki gelişimimi yorumla; hangi harekette takılmışım?"),("Denge","[Özet sayfası] Hacmim hareketler arasında dengeli mi? İhmal ettiğim bölge var mı?"),("Sonraki hafta","Son antrenmanlarıma bakarak gelecek hafta için set ve tekrar önerisi çıkar; ağırlık artışını küçük tut."),("Kayıt kontrolü","[Günlük sayfası] Olağan dışı görünen ağırlık ya da tekrar girişlerini göster.")],"ExcelKlinigi_ANTRENMAN_Gunlugu.xlsx",check=chk)
if __name__=="__main__":
    for f in (valiz,esya,kumbara,karne,antrenman): f()
