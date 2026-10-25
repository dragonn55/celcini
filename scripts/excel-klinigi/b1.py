from lib2 import *
D=date; TD=date.today()
def menu():
    p=P("MENÜ","Haftalık yemek planı ve alışveriş listesi","Haftanın yemeklerini seç; hangi malzemeden ne kadar alacağını dosya toplasın."); nT=600
    L=p.lists({"Malzeme":["Kıyma","Soğan","Domates","Makarna","Pirinç","Tavuk but","Yoğurt","Mercimek","Zeytinyağı","Yumurta"]},n=80)
    y=p.table("Yemekler","Yemekler","Yaptığın yemekleri yaz. Bu hafta kaç kez planlandığı kendiliğinden sayılır.",[("Yemek","t",None,28),("Kaç kişilik","n"),("Bu hafta","c",("=IF(A{r}=\"\",\"\",COUNTIF('Plan'!$C$5:$E$11,A{r}))",NUM))],60,[("Kıymalı makarna",4),("Tavuk pilav",4),("Mercimek çorbası",4),("Menemen",2)],uniq=True)
    t=p.table("Tarifler","Tarifler","Her satır bir yemeğin bir malzemesi. Miktarı yemeğin tamamı için yaz.",[("Yemek","l",y.r("Yemek"),26),("Malzeme","l",L["Malzeme"],18),("Miktar","n",'#,##0.###'),("Birim","t",None,9),("Bu hafta gereken","c",(f'=IF(OR(A{{r}}="",C{{r}}=""),"",C{{r}}*IFERROR(INDEX({y.r("Bu hafta")},MATCH(A{{r}},{y.r("Yemek")},0)),0))','#,##0.###'),16)],nT,
       [("Kıymalı makarna","Kıyma",0.4,"kg"),("Kıymalı makarna","Makarna",0.5,"kg"),("Kıymalı makarna","Soğan",0.2,"kg"),("Kıymalı makarna","Domates",0.3,"kg"),("Tavuk pilav","Tavuk but",1,"kg"),("Tavuk pilav","Pirinç",0.4,"kg"),("Mercimek çorbası","Mercimek",0.25,"kg"),("Mercimek çorbası","Soğan",0.15,"kg"),("Menemen","Yumurta",4,"adet"),("Menemen","Domates",0.4,"kg")])
    B=p.B; pl=B.sheet("Plan","Haftalık Plan","Her öğün için yemeği listeden seç. Yeni hafta için hücreleri silip yeniden doldur.",{"A":3,"B":14,"C":26,"D":26,"E":26},grid=False)
    B.head(pl,4,["Gün","Kahvaltı","Öğle","Akşam"],start=2,h=22); B.body(pl,R0,7,4,calc=(2,),start=2)
    plan={0:(None,"Mercimek çorbası","Kıymalı makarna"),1:("Menemen",None,"Tavuk pilav"),3:(None,None,"Kıymalı makarna"),5:("Menemen","Mercimek çorbası",None)}
    for i,g in enumerate(["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"]):
        pl.cell(R0+i,2,g).font=font(10,True)
        for j,v in enumerate(plan.get(i,(None,None,None))):
            if v: pl.cell(R0+i,3+j,v)
    B.dv(pl,"list","C5:E11","="+y.r("Yemek"))
    o=p.ozet("Bu sayfaya yazma. Plan sayfasındaki seçimlere göre hesaplanır.",year=None,name="Alışveriş")
    p.B.cards(o,5,[("Planlanan öğün","=COUNTA('Plan'!C5:E11)",NUM),("Farklı yemek",f'=COUNTIF({y.r("Bu hafta")},">0")',NUM)])
    p.bylist(o,9,2,"Bu hafta alınacaklar",L["Malzeme"],80,[("Gereken miktar",f"SUMIFS({t.r('Bu hafta gereken')},{t.r('Malzeme')},{{k}})",'#,##0.###;-#,##0.###;"-"'),("Birim",f"IFERROR(INDEX({t.r('Birim')},MATCH({{k}},{t.r('Malzeme')},0))&\"\",\"\")",None)],"Malzeme")
    def chk(w):
        o=w["Alışveriş"]; g={o.cell(r,2).value:o.cell(r,3).value for r in range(10,20)}
        assert near(g["Kıyma"],0.8) and near(g["Soğan"],0.4+0.3) and near(g["Domates"],0.6+0.8) and g["Yumurta"]==8 and near(g["Mercimek"],0.5) and g["Yoğurt"]==0 and o["B6"].value==7 and o["C6"].value==4
    p.done([("1. Listeler","Kullandığın malzemeleri yaz."),("2. Yemekler ve Tarifler","Yemeklerini ve her yemeğin malzemelerini miktarıyla gir."),("3. Plan","Haftanın öğünlerine yemek seç."),("4. Alışveriş","Seçtiğin yemeklere göre her malzemeden ne kadar gerektiğini gör.")],
      [("Aynı birim","Bir malzemeyi bütün tariflerde aynı birimle yaz (hep kg ya da hep adet); dosya birim çevirmez."),("Evdeki malzeme","Liste evde olanı düşmez; almadan önce dolabına bak.")],
      "Paylaşılacak kişisel bilgi yok.",[("Yeni tarif","Elimdeki malzemelerle [malzemeler] yapılabilecek üç akşam yemeği öner ve malzeme miktarlarını ver."),("Dengeli hafta","[Plan sayfası] Bu haftalık planı çeşitlilik açısından değerlendir ve iki değişiklik öner."),("Market sırası","[Alışveriş sayfası] Listeyi market reyonlarına göre grupla."),("Bütçe","Bu alışveriş listesinin tahmini tutarını hesaplamak için hangi fiyatları bilmen gerekiyor, sor ve hesapla.")],"ExcelKlinigi_MENU_Yemek_Plani.xlsx",order=["Başla","Plan","Alışveriş","Yemekler","Tarifler","Listeler","AI Komutları"],check=chk)

def okuma():
    p=P("OKUMA","Kitap okuma takibi","Bu yıl kaç kitap, kaç sayfa okudun, hedefin neresindesin, en sevdiklerin hangileri."); n=500
    L=p.lists({"Tür":["Roman","Öykü","Tarih","Bilim","Kişisel gelişim","İş ve ekonomi","Biyografi","Diğer"]})
    k=p.table("Kitaplar","Kitaplar","Okuduğun, okumakta olduğun ve sıradaki kitapları yaz.",[("Kitap","t",None,30),("Yazar","t",None,22),("Tür","l",L["Tür"],16),("Sayfa","n"),("Başlama","d"),("Bitiş","d"),("Puan (1-5)","n"),
       ("Durum","c",('=IF(A{r}="","",IF(F{r}<>"","Bitti",IF(E{r}<>"","Okunuyor","Sırada")))',None)),("Gün","c",('=IF(OR(E{r}="",F{r}=""),"",F{r}-E{r}+1)',NUM)),("Günde sayfa","c",('=IF(OR(I{r}="",D{r}=""),"",D{r}/I{r})','0.0')),("y","h",('=IF(AND(A{r}<>"",G{r}<>""),G{r}+ROW()/1000000,"")',None))],n,
       [("Örnek Roman 1","Yazar Alfa","Roman",320,D(2026,8,1),D(2026,8,16),5),("Örnek Tarih Kitabı","Yazar Beta","Tarih",450,D(2026,8,20),D(2026,9,18),4),("Örnek Bilim Kitabı","Yazar Gama","Bilim",280,D(2026,9,20),D(2026,10,3),3),("Örnek Roman 2","Yazar Alfa","Roman",400,D(2026,10,4),None,None),("Örnek Öykü Kitabı","Yazar Delta","Öykü",180,None,None,None)])
    for t,fc,tc in (("Bitti",MINT,GREEN),("Okunuyor",AMB,AMBT)): p.B.cf_eq(k.ws,f"H{R0}:H{R0+n-1}",t,fc,tc)
    o=p.ozet("Yılı ve yıllık kitap hedefini yaz."); o["D3"]="Yıllık hedef (kitap)"; o["D3"].alignment=Alignment(horizontal="right"); p.B.inp(o,"F3",24,"0")
    Fb,Sy,Pn,Tr=k.r("Bitiş"),k.r("Sayfa"),k.r("Puan (1-5)"),k.r("Tür")
    tr=p.monthly(o,10,2,[("Biten kitap",mcnt(Fb),NUM),("Sayfa",msum(Sy,Fb),NUM)])
    yr=f'{Fb},">="&DATE($C$3,1,1),{Fb},"<"&DATE($C$3+1,1,1)'
    p.B.cards(o,5,[("Biten kitap",f"=C{tr}",NUM),("Hedefe göre","=IF(F3=0,0,C23/F3)","0%"),("Okunan sayfa",f"=D{tr}",NUM),("Ortalama puan",f'=IFERROR(AVERAGEIFS({Pn},{yr}),0)','0.0'),("Okunan",f'=COUNTIF({k.r("Durum")},"Okunuyor")',NUM),("Sırada",f'=COUNTIF({k.r("Durum")},"Sırada")',NUM)])
    p.bylist(o,10,6,"Türe göre (seçili yıl)",L["Tür"],10,[("Kitap",f"COUNTIFS({Tr},{{k}},{yr})",NUM)],"Tür")
    p.top(o,10,9,"En yüksek puanlı 5 kitap",["Kitap","Puan"],k.r("y"),k.r("Kitap"),[Pn],5,[NUM])
    def chk(w):
        s=w["Kitaplar"]; assert [s.cell(R0+i,8).value for i in range(5)]==["Bitti","Bitti","Bitti","Okunuyor","Sırada"] and s.cell(R0,9).value==16 and near(s.cell(R0,10).value,20)
        o=w["Özet"]; assert o["B6"].value==3 and near(o["C6"].value,3/24) and o["D6"].value==1050 and near(o["E6"].value,4) and o["C18"].value==1 and o["C20"].value==1 and o["I11"].value=="Örnek Roman 1" and o["G11"].value==1
    p.done([("1. Kitaplar","Kitabı, sayfa sayısını, başlama ve bitiş tarihini, bitince puanını yaz."),("2. Özet","Yıllık hedefini gir; aylık biten kitap ve sayfa, tür dağılımı ve en sevdiklerin.")],
      [("Durum","Bitiş tarihi varsa Bitti, yalnız başlama tarihi varsa Okunuyor, ikisi de yoksa Sırada yazar."),("Yıl","Kitap, bittiği yıla ve aya sayılır.")],
      "Paylaşılacak kişisel bilgi yok.",[("Sıradaki kitap","[Kitaplar sayfası] Puanlarıma bakarak sevdiğim türleri çıkar ve sıradaki kitaplarımdan hangisiyle devam etmemi önerirsin?"),("Okuma hızı","[Kitaplar sayfası] Günde ortalama kaç sayfa okuyorum? Yıl hedefime yetişmek için günde kaç sayfa gerekir?"),("Yıl özeti","[Özet sayfası] Okuma yılımı beş cümleyle özetle."),("Not çıkarma","[kitap adı] kitabından aklımda kalanları yazacağım; bunları üç ana fikre topla.")],"ExcelKlinigi_OKUMA_Kitap_Takibi.xlsx",check=chk)

def kasa():
    p=P("KASA","Gün sonu kasa defteri","Günü kapatırken kasada olması gereken parayla saydığın para tutuyor mu; açık ya da fazla varsa hemen gör."); n=800
    k=p.table("Günler","Gün Sonu","Her gün için bir satır. Günü kapatırken kasayı say ve Sayılan nakit sütununa yaz.",[("Tarih","d"),("Açılış nakdi (₺)","m"),("Nakit satış (₺)","m"),("Kart satış (₺)","m"),("Diğer nakit giriş (₺)","m",None,16),("Kasadan ödenen (₺)","m",None,16),("Bankaya yatırılan (₺)","m",None,17),("Sayılan nakit (₺)","m",None,15),
       ("Olması gereken (₺)","c",('=IF(A{r}="","",B{r}+C{r}+E{r}-F{r}-G{r})',TL),16),("Fark (₺)","c",('=IF(OR(A{r}="",H{r}=""),"",ROUND(H{r}-I{r},2))',TL)),("Durum","c",('=IF(J{r}="","",IF(J{r}=0,"Tam",IF(J{r}<0,"Açık","Fazla")))',None)),("Günlük ciro (₺)","c",('=IF(A{r}="","",C{r}+D{r})',TL),15)],n,
       [(D(2026,10,1),1000,8400,12600,0,650,7000,1750),(D(2026,10,2),1750,7900,11200,500,300,8000,1800),(D(2026,10,3),1800,9300,14100,0,1200,8000,1900),(D(2026,9,30),1000,6000,9000,0,0,6000,1000)])
    for t,fc,tc in (("Açık",PINK,RED),("Fazla",AMB,AMBT),("Tam",MINT,GREEN)): p.B.cf_eq(k.ws,f"K{R0}:K{R0+n-1}",t,fc,tc)
    o=p.ozet(); A_,C_,D_,J_=k.r("Tarih"),k.r("Nakit satış (₺)"),k.r("Kart satış (₺)"),k.r("Fark (₺)")
    tr=p.monthly(o,10,2,[("Nakit satış (₺)",msum(C_,A_),TL),("Kart satış (₺)",msum(D_,A_),TL),("Ciro (₺)",mf("=C{r}+D{r}"),TL),("Kasa farkı (₺)",msum(J_,A_),TL)])
    p.B.cards(o,5,[("Yıl cirosu",f"=E{tr}",TL),("Kart payı",f"=IF(E{tr}=0,0,D{tr}/E{tr})","0%"),("Toplam kasa farkı",f"=F{tr}",TL,1),("Açık veren gün",f'=COUNTIF({k.r("Durum")},"Açık")',NUM,1),("Günlük ortalama ciro",f"=IF(COUNT({A_})=0,0,SUM({k.r('Günlük ciro (₺)')})/COUNT({A_}))",TL)])
    def chk(w):
        s=w["Günler"]; assert [s.cell(R0+i,9).value for i in range(4)]==[1750,1850,1900,1000] and [s.cell(R0+i,10).value for i in range(4)]==[0,-50,0,0] and s.cell(R0+1,11).value=="Açık"
        o=w["Özet"]; assert o["E20"].value==63500 and o["F20"].value==-50 and o["E19"].value==15000 and o["E6"].value==1 and near(o["C6"].value,(12600+11200+14100+9000)/78500)
    p.done([("1. Günler","Her gün açılış nakdini, nakit ve kart satışı, kasadan yapılan ödemeleri ve bankaya yatırılanı yaz."),("2. Gün sonu sayımı","Kasayı say ve Sayılan nakit sütununa yaz; fark ve durum hesaplanır."),("3. Özet","Aylık nakit ve kart satış, ciro ve kasa farkı.")],
      [("Olması gereken","Açılış nakdi + nakit satış + diğer nakit giriş − kasadan ödenen − bankaya yatırılan. Kart satış kasadaki nakdi etkilemez."),("Ertesi gün","Bugünün sayılan nakdi, yarının açılış nakdidir; kendin aktarırsın.")],
      "Paylaşılacak kişisel bilgi yok; çalışan adı yazma.",[("Açık analizi","[Günler sayfası] Kasa açığı veren günleri listele; haftanın belirli günlerinde mi toplanıyor?"),("Ciro gidişi","[Özet sayfası] Aylık ciro ve kart payını yorumla."),("Kasa kuralı","Kasa açığını azaltmak için küçük bir dükkânda uygulanabilecek beş kural yaz."),("Kontrol","[Günler sayfası] Açılış nakdi bir önceki günün sayılan nakdiyle uyuşmayan günleri göster.")],"ExcelKlinigi_KASA_Gun_Sonu_Defteri.xlsx",check=chk)

def yevmiye():
    p=P("YEVMİYE","Gündelik işçi puantaj ve hakediş","Kim kaç gün çalıştı, ne kadar hak etti, ne kadar avans aldı, kime ne kadar borcun kaldı."); nK,nP,nO=40,3000,600; B1,B2="'Özet'!$C$3","'Özet'!$C$4"
    L=p.lists({"İş":["Şantiye Alfa","Şantiye Beta","Atölye"]})
    pT,pK,pG,pM=[rg("Puantaj",c,nP) for c in "ABCD"]; oT,oK,oU=rg("Ödemeler","A",nO),rg("Ödemeler","B",nO),rg("Ödemeler","D",nO)
    dn=lambda dt: f'{dt},">="&{B1},{dt},"<="&{B2}'
    k=p.table("Kişiler","Kişiler","Çalışanları ve ücretlerini yaz. Gün, hakediş ve kalan, Özet sayfasındaki döneme göre hesaplanır.",[("Ad","t",None,24),("Günlük ücret (₺)","m"),("Mesai saat ücreti (₺)","m",None,16),("Gün","c",(f'=IF(A{{r}}="","",SUMIFS({pG},{pK},A{{r}},{dn(pT)}))','#,##0.0')),("Mesai (saat)","c",(f'=IF(A{{r}}="","",SUMIFS({pM},{pK},A{{r}},{dn(pT)}))','#,##0.0')),
       ("Hakediş (₺)","c",('=IF(A{r}="","",D{r}*B{r}+E{r}*C{r})',TL)),("Ödenen (₺)","c",(f'=IF(A{{r}}="","",SUMIFS({oU},{oK},A{{r}},{dn(oT)}))',TL)),("Kalan (₺)","c",('=IF(A{r}="","",F{r}-G{r})',TL))],nK,[("İşçi Alfa",2000,300),("İşçi Beta",1800,270),("İşçi Gama",2500,375)],uniq=True)
    KA,KB,KC=k.r("Ad"),k.r("Günlük ücret (₺)"),k.r("Mesai saat ücreti (₺)")
    pu=p.table("Puantaj","Puantaj","Her çalışılan gün bir satır. Yarım gün için 0,5 yaz.",[("Tarih","d"),("Kişi","l",KA,22),("Gün","n",'0.0'),("Mesai (saat)","n",'0.0'),("İş","l",L["İş"],16),("Not","t",None,24),
       ("Maliyet (₺)","c",(f'=IF(OR(B{{r}}="",A{{r}}=""),"",C{{r}}*IFERROR(INDEX({KB},MATCH(B{{r}},{KA},0)),0)+D{{r}}*IFERROR(INDEX({KC},MATCH(B{{r}},{KA},0)),0))',TL))],nP,
       [(D(2026,10,1),"İşçi Alfa",1,2,"Şantiye Alfa"),(D(2026,10,1),"İşçi Beta",1,None,"Şantiye Alfa"),(D(2026,10,2),"İşçi Alfa",1,None,"Şantiye Beta"),(D(2026,10,2),"İşçi Gama",0.5,None,"Şantiye Beta"),(D(2026,10,3),"İşçi Alfa",1,None,"Şantiye Alfa"),(D(2026,9,28),"İşçi Beta",1,None,"Atölye")])
    p.table("Ödemeler","Ödemeler","Verdiğin her avansı ve ödemeyi yaz.",[("Tarih","d"),("Kişi","l",KA,22),("Tür","l","Avans,Ödeme"),("Tutar (₺)","m"),("Not","t",None,24)],nO,[(D(2026,10,2),"İşçi Alfa","Avans",2000),(D(2026,10,3),"İşçi Beta","Ödeme",1800)])
    o=p.ozet("Dönemin başlangıç ve bitiş tarihini yaz; bütün hesaplar bu döneme göre yapılır.",year=None); o["B3"]="Dönem başlangıcı"; p.B.inp(o,"C3",D(2026,10,1),DT); o["B4"]="Dönem bitişi"; p.B.inp(o,"C4",D(2026,10,7),DT)
    p.B.cards(o,6,[("Çalışılan gün",f"=SUM({k.r('Gün')})",'#,##0.0'),("Mesai (saat)",f"=SUM({k.r('Mesai (saat)')})",'#,##0.0'),("Hakediş",f"=SUM({k.r('Hakediş (₺)')})",TL),("Ödenen",f"=SUM({k.r('Ödenen (₺)')})",TL),("Kalan borç",f"=SUM({k.r('Kalan (₺)')})",TL,1)])
    p.bylist(o,10,2,"İşe göre (dönem)",L["İş"],15,[("Gün",f"SUMIFS({pG},{pu.r('İş')},{{k}},{dn(pT)})",'#,##0.0'),("İşçilik maliyeti (₺)",f"SUMIFS({pu.r('Maliyet (₺)')},{pu.r('İş')},{{k}},{dn(pT)})",TL)],"İş")
    def chk(w):
        s=w["Kişiler"]; assert [s.cell(R0,c).value for c in range(4,9)]==[3,2,6600,2000,4600] and [s.cell(R0+1,c).value for c in (4,6,8)]==[1,1800,0] and s.cell(R0+2,6).value==1250
        o=w["Özet"]; assert [o.cell(7,c).value for c in range(2,7)]==[4.5,2,9650,3800,5850] and o["C11"].value==3 and o["D11"].value==2600+1800+2000 and o["D12"].value==3250 and o["D13"].value==0
    p.done([("1. Kişiler","Çalışanları, günlük ücreti ve mesai saat ücretini yaz."),("2. Puantaj","Her çalışılan günü kişi ve iş ile gir."),("3. Ödemeler","Verdiğin avans ve ödemeleri yaz."),("4. Özet","Dönemi seç; hakediş, ödenen ve kalan borç ile iş bazında işçilik maliyeti hesaplanır.")],
      [("Dönem","Hakediş ve ödenen, yalnızca seçtiğin iki tarih arasındaki kayıtlardan hesaplanır. Önceki dönemden devreden borç eklenmez."),("Resmî belge değil","Bordro, SGK bildirimi ya da resmî puantaj yerine geçmez.")],
      "Çalışan adlarını takma adla değiştir.",[("Hakediş özeti","[Kişiler sayfası] Bu dönem her kişiye ödenecek tutarı tek satırlık mesajlar halinde yaz."),("Maliyet","[Özet sayfası] İşçilik maliyeti hangi işte yoğunlaşmış? Yorumla."),("Mesai","[Puantaj sayfası] En çok mesai yapan kişileri ve günleri çıkar."),("Kontrol","[Puantaj sayfası] Aynı kişiye aynı gün için birden fazla satır girilmiş mi?")],"ExcelKlinigi_YEVMIYE_Puantaj_Hakedis.xlsx",order=["Başla","Puantaj","Ödemeler","Kişiler","Özet","Listeler","AI Komutları"],check=chk)

def saat():
    p=P("SAAT","Serbest çalışan saat takibi","Hangi müşteriye kaç saat çalıştın, ne kadar faturalandı, faturalanmayı bekleyen ne kadar."); nM,nK=50,2000
    kM,kS,kF,kU=rg("Kayıtlar","B",nK),rg("Kayıtlar","E",nK),rg("Kayıtlar","F",nK),rg("Kayıtlar","G",nK)
    m=p.table("Müşteriler","Müşteriler","Müşterilerini ve saat ücretini yaz.",[("Müşteri","t",None,26),("Saat ücreti (₺)","m"),("Saat","c",(f'=IF(A{{r}}="","",SUMIFS({kS},{kM},A{{r}}))','#,##0.00')),("Tutar (₺)","c",(f'=IF(A{{r}}="","",SUMIFS({kU},{kM},A{{r}}))',TL)),("Faturalanmamış (₺)","c",(f'=IF(A{{r}}="","",SUMIFS({kU},{kM},A{{r}},{kF},"Hayır"))',TL),18)],nM,[("Müşteri Alfa",1500),("Müşteri Beta",1200)],uniq=True)
    k=p.table("Kayıtlar","Saat Kayıtları","Her çalışma bir satır. Faturasını kesince Faturalandı sütununu Evet yap.",[("Tarih","d"),("Müşteri","l",m.r("Müşteri"),22),("Proje","t",None,20),("Yapılan iş","t",None,32),("Saat","n",'0.00'),("Faturalandı","l","Evet,Hayır"),
       ("Tutar (₺)","c",(f'=IF(OR(B{{r}}="",E{{r}}=""),"",E{{r}}*IFERROR(INDEX({m.r("Saat ücreti (₺)")},MATCH(B{{r}},{m.r("Müşteri")},0)),0))',TL))],nK,
       [(D(2026,9,10),"Müşteri Alfa","Web sitesi","Tasarım",4,"Evet"),(D(2026,9,24),"Müşteri Alfa","Web sitesi","Geliştirme",6.5,"Evet"),(D(2026,10,1),"Müşteri Beta","Rapor","Veri temizliği",3,"Hayır"),(D(2026,10,3),"Müşteri Alfa","Web sitesi","Düzeltmeler",2,"Hayır")])
    o=p.ozet(); A_=k.r("Tarih")
    tr=p.monthly(o,10,2,[("Saat",msum(kS,A_),'#,##0.00'),("Tutar (₺)",msum(kU,A_),TL)])
    p.B.cards(o,5,[("Yıl saati",f"=C{tr}",'#,##0.00'),("Yıl tutarı",f"=D{tr}",TL),("Faturalanmamış",f'=SUMIFS({kU},{kF},"Hayır")',TL,1),("Ortalama saat ücreti",f"=IF(C{tr}=0,0,D{tr}/C{tr})",TL)])
    def chk(w):
        s=w["Müşteriler"]; assert [s.cell(R0,c).value for c in (3,4,5)]==[12.5,18750,3000] and s.cell(R0+1,5).value==3600
        o=w["Özet"]; assert o["B6"].value==15.5 and o["C6"].value==22350 and o["D6"].value==6600 and o["D19"].value==15750
    p.done([("1. Müşteriler","Müşterilerini ve saat ücretini yaz."),("2. Kayıtlar","Her çalışmayı tarih, müşteri, iş ve saat olarak gir. Dakikayı ondalık yaz: 30 dakika 0,5 saattir."),("3. Özet","Aylık saat ve tutar, faturalanmayı bekleyen tutar.")],
      [("Ücret değişirse","Saat ücretini değiştirirsen eski kayıtların tutarı da yeni ücretle hesaplanır."),("Fatura","Dosya fatura kesmez; yalnızca neyin faturalanmadığını gösterir.")],
      "Müşteri ve proje adlarını takma adla değiştir.",[("Fatura metni","[Kayıtlar sayfası] Faturalanmamış kayıtları müşteri bazında topla ve fatura açıklaması olarak kullanılacak kısa bir döküm yaz."),("Verimlilik","[Kayıtlar sayfası] Saatlerimin müşterilere ve iş türlerine dağılımını çıkar."),("Ücret","Saat ücretimi artırmak istiyorum; müşteriye bildirmek için kısa bir mesaj yaz."),("Kapasite","Ayda [saat] çalışabiliyorum. Mevcut müşterilerle hedef gelire ulaşmak için ücret ne olmalı?")],"ExcelKlinigi_SAAT_Serbest_Calisan_Takibi.xlsx",order=["Başla","Kayıtlar","Müşteriler","Özet","AI Komutları"],check=chk)

def maliyet():
    p=P("MALİYET","Ürün maliyeti ve fiyat hesaplama","Bir kurabiye, bir tabak yemek, bir sabun sana kaça mal oluyor; hedeflediğin kârı bırakması için kaça satmalısın."); nM,nR,nU=150,1000,80; HM="'Özet'!$C$3"
    m=p.table("Malzemeler","Malzemeler","Aldığın paketin fiyatını ve içindeki miktarı yaz; birim fiyat hesaplanır.",[("Malzeme","t",None,24),("Birim","t",None,9),("Paket fiyatı (₺)","m"),("Paket miktarı","n",'#,##0.###'),("Birim fiyat (₺)","c",('=IF(OR(A{r}="",D{r}="",D{r}=0),"",C{r}/D{r})','#,##0.00'))],nM,[("Un","kg",150,5),("Şeker","kg",220,5),("Tereyağı","kg",500,1),("Yumurta","adet",180,30)],uniq=True)
    rU,rS=rg("Reçeteler","A",nR),rg("Reçeteler","D",nR)
    u=p.table("Ürünler","Ürünler","Ürünü, reçetenin kaç adet verdiğini, adet başına ek maliyeti (ambalaj, işçilik) ve satış fiyatını yaz.",[("Ürün","t",None,24),("Reçete kaç adet verir","n",None,15),("Adet başına ek maliyet (₺)","m",None,17),("Satış fiyatı (₺)","m"),
       ("Reçete maliyeti (₺)","c",(f'=IF(A{{r}}="","",SUMIFS({rS},{rU},A{{r}}))',TL),16),("Birim maliyet (₺)","c",('=IF(OR(A{r}="",B{r}="",B{r}=0),"",E{r}/B{r}+C{r})','#,##0.00')),("Kâr (₺)","c",('=IF(OR(F{r}="",D{r}=""),"",D{r}-F{r})','#,##0.00')),("Marj","c",('=IF(OR(G{r}="",D{r}=0),"",G{r}/D{r})','0%')),
       ("Hedef marja göre fiyat (₺)","c",(f'=IF(OR(F{{r}}="",{HM}>=1),"",F{{r}}/(1-{HM}))','#,##0.00'),17),("Durum","c",(f'=IF(H{{r}}="","",IF(H{{r}}<{HM},"Hedefin altında","Hedefte"))',None),16),("y","h",('=IF(H{r}="","",H{r}+ROW()/1000000000)',None))],nU,[("Kurabiye",40,0.5,12),("Kek (dilim)",12,1,25)],uniq=True)
    p.B.cf_eq(u.ws,f"J{R0}:J{R0+nU-1}","Hedefin altında",PINK,RED)
    r=p.table("Reçeteler","Reçeteler","Her satır bir ürünün bir malzemesi. Miktarı malzemenin birimiyle yaz.",[("Ürün","l",u.r("Ürün"),24),("Malzeme","l",m.r("Malzeme"),22),("Miktar","n",'#,##0.###'),("Satır maliyeti (₺)","c",(f'=IF(OR(A{{r}}="",B{{r}}="",C{{r}}=""),"",C{{r}}*IFERROR(INDEX({m.r("Birim fiyat (₺)")},MATCH(B{{r}},{m.r("Malzeme")},0)),0))','#,##0.00'),16)],nR,
       [("Kurabiye","Un",0.5),("Kurabiye","Şeker",0.2),("Kurabiye","Tereyağı",0.25),("Kek (dilim)","Un",0.3),("Kek (dilim)","Şeker",0.25),("Kek (dilim)","Yumurta",4),("Kek (dilim)","Tereyağı",0.2)])
    o=p.ozet("Hedeflediğin kâr marjını yaz.",year=None); o["B3"]="Hedef marj"; p.B.inp(o,"C3",0.6,"0%"); H_=u.r("Marj")
    p.B.cards(o,5,[("Ürün",f"=COUNTA({u.r('Ürün')})",NUM),("Ortalama marj",f"=IFERROR(AVERAGE({H_}),0)","0%"),("Hedefin altındaki ürün",f'=COUNTIF({u.r("Durum")},"Hedefin altında")',NUM,1)])
    p.top(o,9,2,"Marjı en düşük 5 ürün",["Ürün","Marj","Birim maliyet (₺)","Satış fiyatı (₺)"],u.r("y"),u.r("Ürün"),[H_,u.r("Birim maliyet (₺)"),u.r("Satış fiyatı (₺)")],5,["0%",'#,##0.00','#,##0.00'],"SMALL")
    def chk(w):
        s=w["Ürünler"]; rc=0.5*30+0.2*44+0.25*500; bm=rc/40+0.5
        assert near(s.cell(R0,5).value,rc) and near(s.cell(R0,6).value,bm,1e-6) and near(s.cell(R0,8).value,(12-bm)/12,1e-6) and near(s.cell(R0,9).value,bm/0.4,1e-6) and s.cell(R0,10).value=="Hedefte"
        k2=(0.3*30+0.25*44+4*6+0.2*500)/12+1; assert near(s.cell(R0+1,6).value,k2,1e-6) and s.cell(R0+1,10).value=="Hedefin altında" and w["Özet"]["B10"].value=="Kek (dilim)" and w["Özet"]["D6"].value==1
    p.done([("1. Malzemeler","Malzemeleri, paket fiyatını ve paket miktarını yaz."),("2. Ürünler","Ürünü, reçetenin kaç adet verdiğini, adet başına ek maliyeti ve satış fiyatını yaz."),("3. Reçeteler","Her ürünün malzemelerini ve miktarını gir."),("4. Özet","Hedef marjını yaz; hedefin altındaki ürünleri ve olması gereken fiyatı gör.")],
      [("Marj","Kârın satış fiyatına oranıdır. Yüzde 60 marj, 10 liralık satışın 6 lirasının kâr olması demektir."),("Kapsam","Kira, elektrik gibi genel giderler birim maliyete dahil değildir; onları adet başına ek maliyete kendin katabilirsin."),("KDV","Fiyat ve maliyetleri hep aynı şekilde (KDV dahil ya da hariç) yaz.")],
      "Tedarikçi adlarını paylaşmak zorunda değilsin.",[("Zam etkisi","[Malzemeler sayfası] Tereyağı yüzde 20 zamlanırsa hangi ürünün marjı ne kadar düşer?"),("Fiyat önerisi","[Ürünler sayfası] Hedefin altındaki ürünler için yuvarlak ve makul satış fiyatları öner."),("Maliyet düşürme","[Reçeteler sayfası] Maliyetin en büyük kısmını hangi malzemeler oluşturuyor? Azaltma yolları öner."),("Menü","Marjı yüksek ürünleri öne çıkarmak için menü ya da vitrin düzeni öner.")],"ExcelKlinigi_MALIYET_Urun_Maliyeti.xlsx",order=["Başla","Ürünler","Reçeteler","Malzemeler","Özet","AI Komutları"],check=chk)

def servis():
    p=P("SERVİS","Teknik servis iş emri takibi","Hangi cihaz kimde, ne zamandır bekliyor, hazır olanı kim almadı, kimden tahsilat kaldı."); n=1500
    s=p.table("İş Emirleri","İş Emirleri","Kabul ettiğin her cihaz bir satır. Durumu ilerledikçe güncelle.",[("Kabul tarihi","d"),("Müşteri","t",None,22),("Telefon","t",None,15),("Cihaz","t",None,22),("Arıza","t",None,28),("Durum","l","Bekliyor,Parça bekleniyor,Hazır,Teslim edildi,İade edildi",16),("Parça (₺)","m"),("İşçilik (₺)","m"),("Alınan ödeme (₺)","m",None,15),("Teslim tarihi","d"),
       ("Toplam (₺)","c",('=IF(A{r}="","",G{r}+H{r})',TL)),("Kalan (₺)","c",('=IF(A{r}="","",IF(F{r}="İade edildi",0,K{r}-I{r}))',TL)),("Gün","c",(f'=IF(A{{r}}="","",IF(J{{r}}<>"",J{{r}}-A{{r}},{T}-A{{r}}))',NUM)),
       ("Uyarı","c",('=IF(A{r}="","",IF(AND(OR(F{r}="Bekliyor",F{r}="Parça bekleniyor",F{r}="Hazır"),M{r}>7),"7 günü geçti",""))',None)),("y","h",('=IF(AND(A{r}<>"",OR(F{r}="Bekliyor",F{r}="Parça bekleniyor",F{r}="Hazır")),A{r}+ROW()/1000000,"")',None))],n,
       [(TD-timedelta(12),"Müşteri Alfa",None,"Çamaşır makinesi","Su almıyor","Parça bekleniyor",1800,900,0,None),(TD-timedelta(3),"Müşteri Beta",None,"Telefon","Ekran kırık","Hazır",2500,600,1000,None),(D(2026,9,10),"Müşteri Gama",None,"Laptop","Açılmıyor","Teslim edildi",3200,1500,4700,D(2026,9,16)),(D(2026,9,20),"Müşteri Delta",None,"Televizyon","Görüntü yok","Teslim edildi",0,1200,1000,D(2026,9,22)),(TD-timedelta(1),"Müşteri Epsilon",None,"Süpürge","Çekmiyor","Bekliyor",0,0,0,None)],freeze="C5")
    p.B.cf_eq(s.ws,f"N{R0}:N{R0+n-1}","7 günü geçti",PINK,RED); p.B.cf_eq(s.ws,f"F{R0}:F{R0+n-1}","Hazır",MINT,GREEN)
    o=p.ozet(); F_,J_,K_,L_,M_=s.r("Durum"),s.r("Teslim tarihi"),s.r("Toplam (₺)"),s.r("Kalan (₺)"),s.r("Gün")
    tr=p.monthly(o,10,2,[("Teslim edilen iş",mcnt(J_,f',{F_},"Teslim edildi"'),NUM),("Ciro (₺)",msum(K_,J_,f',{F_},"Teslim edildi"'),TL)])
    p.B.cards(o,5,[("Açık iş",f"=COUNT({s.r('y')})",NUM),("Hazır, teslim bekleyen",f'=COUNTIF({F_},"Hazır")',NUM),("7 günü geçen",f'=COUNTIF({s.r("Uyarı")},"7 günü geçti")',NUM,1),("Tahsil edilmemiş",f"=SUM({L_})",TL,1),("Ortalama teslim süresi (gün)",f'=IFERROR(AVERAGEIFS({M_},{F_},"Teslim edildi"),0)','0.0')])
    p.top(o,10,6,"En eski 10 açık iş",["Müşteri","Cihaz","Kabul","Durum"],s.r("y"),s.r("Müşteri"),[s.r("Cihaz"),s.r("Kabul tarihi"),F_],10,[None,DT,None],"SMALL")
    o.column_dimensions["F"].width=20; o.column_dimensions["G"].width=22; o.column_dimensions["I"].width=18
    def chk(w):
        x=w["İş Emirleri"]; assert [x.cell(R0+i,13).value for i in range(5)]==[12,3,6,2,1] and x.cell(R0,14).value=="7 günü geçti" and x.cell(R0+3,12).value==200
        o=w["Özet"]; assert [o.cell(6,c).value for c in range(2,7)]==[3,1,1,2700+2100+0+200,4] and o["C19"].value==2 and o["D19"].value==5900 and o["F11"].value=="Müşteri Alfa" and o["F13"].value=="Müşteri Epsilon"
    p.done([("1. İş Emirleri","Cihazı kabul ederken tarihi, müşteriyi, cihazı ve arızayı yaz."),("2. Güncelle","İş ilerledikçe durumu, parça ve işçilik tutarını, alınan ödemeyi ve teslim tarihini gir."),("3. Özet","Açık işler, hazır olup alınmayanlar, tahsil edilmemiş tutar ve aylık ciro.")],
      [("Açık iş","Durumu Bekliyor, Parça bekleniyor ya da Hazır olan iştir."),("Ciro","Yalnızca Teslim edildi durumundaki işler, teslim tarihindeki aya yazılır.")],
      "Müşteri adlarını ve telefonlarını paylaşma.",[("Hazır bildirimi","Cihazı hazır olan müşteriye gönderilecek kısa bir bilgilendirme mesajı yaz; tutar için boşluk bırak."),("Geciken işler","[Özet sayfasındaki açık işler] Hangi işler neden bekliyor olabilir? Müşteriye durum bildirmek için kısa mesajlar yaz."),("Arıza dağılımı","[İş Emirleri sayfası] En sık gelen cihaz ve arıza türlerini çıkar; stokta tutmam gereken parçaları öner."),("Tahsilat","Ödemesi kalan müşterilere gönderilecek kibar bir hatırlatma yaz.")],"ExcelKlinigi_SERVIS_Is_Emri_Takibi.xlsx",check=chk)
if __name__=="__main__":
    for f in (menu,okuma,kasa,yevmiye,saat,maliyet,servis): f()
