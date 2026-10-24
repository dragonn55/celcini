from lib2 import *
D=date; TD=date.today()
def siparis():
    p=P("SİPARİŞ","Online sipariş ve net kazanç takibi","Hangi kanaldan ne sattın, komisyon ve kargodan sonra elinde ne kaldı, iade oranın ne."); nK,nS=15,3000
    sK,sU,sD,sN=rg("Siparişler","C",nS),rg("Siparişler","E",nS),rg("Siparişler","H",nS),rg("Siparişler","J",nS); ok=f'{sD},"<>İade",{sD},"<>İptal"'
    k=p.table("Kanallar","Satış Kanalları","Sattığın yerleri ve komisyon oranlarını yaz.",[("Kanal","t",None,22),("Komisyon oranı","p"),("Sipariş","c",(f'=IF(A{{r}}="","",COUNTIFS({sK},A{{r}},{sD},"<>İptal"))',NUM)),("Ciro (₺)","c",(f'=IF(A{{r}}="","",SUMIFS({sU},{sK},A{{r}},{ok}))',TL)),("Net (₺)","c",(f'=IF(A{{r}}="","",SUMIFS({sN},{sK},A{{r}}))',TL)),("İade oranı","c",(f'=IF(OR(A{{r}}="",C{{r}}=0),"",COUNTIFS({sK},A{{r}},{sD},"İade")/C{{r}})',"0%"))],nK,[("Pazaryeri Alfa",0.20),("Kendi sitem",0.04),("Instagram",0)],uniq=True)
    s=p.table("Siparişler","Siparişler","Her sipariş bir satır. Durum değiştikçe güncelle.",[("Tarih","d"),("Sipariş no","t",None,14),("Kanal","l",k.r("Kanal"),16),("Ürün","t",None,24),("Tutar (₺)","m"),("Ürün maliyeti (₺)","m",None,15),("Kargo (₺)","m"),("Durum","l","Hazırlanıyor,Kargoda,Teslim edildi,İade,İptal",15),
       ("Komisyon (₺)","c",(f'=IF(OR(A{{r}}="",C{{r}}=""),"",IF(OR(H{{r}}="İade",H{{r}}="İptal"),0,E{{r}}*IFERROR(INDEX({k.r("Komisyon oranı")},MATCH(C{{r}},{k.r("Kanal")},0)),0)))',TL)),("Net (₺)","c",('=IF(I{r}="","",IF(H{r}="İptal",0,IF(H{r}="İade",-G{r},E{r}-I{r}-F{r}-G{r})))',TL))],nS,
       [(D(2026,10,1),"S-1","Pazaryeri Alfa","Ürün 1",600,330,70,"Teslim edildi"),(D(2026,10,2),"S-2","Kendi sitem","Ürün 2",900,500,70,"Kargoda"),(D(2026,10,2),"S-3","Pazaryeri Alfa","Ürün 1",600,330,70,"İade"),(D(2026,10,3),"S-4","Instagram","Ürün 3",450,200,60,"Hazırlanıyor"),(D(2026,10,3),"S-5","Pazaryeri Alfa","Ürün 2",900,500,70,"İptal"),(D(2026,9,28),"S-0","Pazaryeri Alfa","Ürün 1",600,330,70,"Teslim edildi")])
    o=p.ozet(); A_=s.r("Tarih")
    tr=p.monthly(o,10,2,[("Sipariş",mcnt(A_,f',{sD},"<>İptal",{sD},"<>"'),NUM),("Ciro (₺)",msum(sU,A_,","+ok),TL),("Net (₺)",msum(sN,A_),TL)])
    p.B.cards(o,5,[("Yıl cirosu",f"=D{tr}",TL),("Net kazanç",f"=E{tr}",TL),("Net / ciro",f"=IF(D{tr}=0,0,E{tr}/D{tr})","0%"),("Kargolanacak",f'=COUNTIF({sD},"Hazırlanıyor")',NUM,1),("İade oranı",f'=IF(COUNTIFS({sD},"<>İptal",{sD},"<>")=0,0,COUNTIF({sD},"İade")/COUNTIFS({sD},"<>İptal",{sD},"<>"))',"0%")])
    def chk(w):
        x=w["Siparişler"]; assert [x.cell(R0+i,10).value for i in range(6)]==[80,294,-70,190,0,80]
        k_=w["Kanallar"]; assert [k_.cell(R0,c).value for c in (3,4,5)]==[3,1200,90] and near(k_.cell(R0,6).value,1/3); o=w["Özet"]; assert o["C20"].value==4 and o["D20"].value==1950 and o["E20"].value==494 and o["E6"].value==1 and near(o["F6"].value,1/5)
    p.done([("1. Kanallar","Sattığın yerleri ve komisyon oranlarını yaz."),("2. Siparişler","Her siparişi tutarı, ürün maliyeti, kargo ve durumuyla gir."),("3. Özet","Aylık sipariş, ciro ve net kazanç; kanal bazında iade oranı.")],
      [("Net","Tutar − komisyon − ürün maliyeti − kargo. İadede kargo zarar yazılır, iptalde sıfırdır."),("Komisyon","Kanal sayfasındaki tek orana göre hesaplanır; kategoriye göre değişen oranlar için ortalama oranı yaz.")],
      "Müşteri adı ve adres yazma; sipariş numarası yeterli.",[("Kanal karşılaştırma","[Kanallar sayfası] Hangi kanal sipariş başına daha çok net bırakıyor? İade oranıyla birlikte yorumla."),("İade nedeni","[Siparişler sayfası] İade edilen siparişlerde ortak ürün ya da kanal var mı?"),("Fiyat","Komisyon ve kargo sonrası elimde en az [tutar] kalması için satış fiyatı ne olmalı? Ürün maliyetim [tutar]."),("Günlük iş","[Siparişler sayfası] Durumu Hazırlanıyor olan siparişleri kargolama listesi olarak sırala.")],"ExcelKlinigi_SIPARIS_Online_Satis_Takibi.xlsx",order=["Başla","Siparişler","Kanallar","Özet","AI Komutları"],check=chk)

def aday():
    p=P("ADAY","Müşteri adayı ve fırsat takibi","Kimle görüştün, hangi aşamada, ne kadarlık iş, bugün kimi araman gerek."); n=1000
    L=p.lists({"Kaynak":["Tavsiye","Instagram","Web sitesi","Telefon","Fuar","Diğer"]})
    B=p.B; a=B.sheet("Aşamalar","Aşamalar","Satış aşamalarını ve o aşamadaki işin gerçekleşme olasılığını yaz. Kazanıldı ve Kaybedildi adlarını değiştirme.",{"A":22,"B":12})
    B.head(a,4,["Aşama","Olasılık"]); B.body(a,R0,8,2,fmt={2:"0%"},center=(2,)); B.put(a,R0,[("Yeni",0.1),("Görüşüldü",0.25),("Teklif verildi",0.5),("Pazarlık",0.75),("Kazanıldı",1),("Kaybedildi",0)])
    aA,aO=[f"'Aşamalar'!${c}${R0}:${c}${R0+7}" for c in "AB"]
    op='AND(C{r}<>"Kazanıldı",C{r}<>"Kaybedildi",C{r}<>"")'
    f=p.table("Fırsatlar","Fırsatlar","Her müşteri adayı ya da iş fırsatı bir satır. Görüştükçe aşamayı ve sonraki temas tarihini güncelle.",[("Aday","t",None,26),("Kaynak","l",L["Kaynak"],14),("Aşama","l",aA,15),("Tutar (₺)","m"),("İlk temas","d"),("Sonraki temas","d"),("Not","t",None,30),
       ("Olasılık","c",(f'=IF(OR(A{{r}}="",C{{r}}=""),"",IFERROR(INDEX({aO},MATCH(C{{r}},{aA},0)),0))',"0%")),("Ağırlıklı tutar (₺)","c",('=IF(H{r}="","",D{r}*H{r})',TL),16),("Temas","c",(f'=IF(AND({op},F{{r}}<>""),IF(F{{r}}<{T},"Gecikti",IF(F{{r}}={T},"Bugün","")),"")',None)),("y","h",(f'=IF(AND({op},F{{r}}<>"",F{{r}}<={T}),F{{r}}+ROW()/1000000,"")',None))],n,
       [("Firma Alfa","Tavsiye","Teklif verildi",80000,D(2026,9,10),TD,None),("Firma Beta","Instagram","Yeni",20000,D(2026,10,1),TD-timedelta(3),None),("Firma Gama","Web sitesi","Kazanıldı",50000,D(2026,8,5),None,None),("Firma Delta","Tavsiye","Kaybedildi",30000,D(2026,8,20),None,None),("Firma Epsilon","Fuar","Pazarlık",120000,D(2026,9,22),TD+timedelta(5),None)])
    for t,fc,tc in (("Gecikti",PINK,RED),("Bugün",AMB,AMBT)): p.B.cf_eq(f.ws,f"J{R0}:J{R0+n-1}",t,fc,tc)
    o=p.ozet("Bu sayfaya yazma.",year=None); C_,D_,I_=f.r("Aşama"),f.r("Tutar (₺)"),f.r("Ağırlıklı tutar (₺)"); opn=f'{C_},"<>Kazanıldı",{C_},"<>Kaybedildi",{C_},"<>"'
    p.B.cards(o,5,[("Açık fırsat",f"=COUNTIFS({opn})",NUM),("Açık tutar",f"=SUMIFS({D_},{opn})",TL),("Ağırlıklı tutar",f"=SUMIFS({I_},{opn})",TL),("Kazanılan tutar",f'=SUMIFS({D_},{C_},"Kazanıldı")',TL),("Kazanma oranı",f'=IF(COUNTIF({C_},"Kazanıldı")+COUNTIF({C_},"Kaybedildi")=0,0,COUNTIF({C_},"Kazanıldı")/(COUNTIF({C_},"Kazanıldı")+COUNTIF({C_},"Kaybedildi")))',"0%"),("Temas zamanı gelen",f"=COUNT({f.r('y')})",NUM,1)])
    p.bylist(o,9,2,"Aşamaya göre",aA,8,[("Adet",f"COUNTIF({C_},{{k}})",NUM),("Tutar (₺)",f"SUMIFS({D_},{C_},{{k}})",TL)],"Aşama")
    p.bylist(o,20,2,"Kaynağa göre",L["Kaynak"],8,[("Adet",f"COUNTIF({f.r('Kaynak')},{{k}})",NUM),("Kazanılan (₺)",f'SUMIFS({D_},{f.r("Kaynak")},{{k}},{C_},"Kazanıldı")',TL)],"Kaynak")
    p.top(o,9,9,"Temas zamanı gelenler (en eski 10)",["Aday","Sonraki temas","Aşama"],f.r("y"),f.r("Aday"),[f.r("Sonraki temas"),C_],10,[DT,None],"SMALL")
    def chk(w):
        x=w["Fırsatlar"]; assert [x.cell(R0+i,10).value for i in range(5)]==["Bugün","Gecikti",None,None,None] and x.cell(R0,9).value==40000 and x.cell(R0+4,9).value==90000
        o=w["Özet"]; assert [o.cell(6,c).value for c in range(2,8)]==[3,220000,132000,50000,0.5,2] and o["I10"].value=="Firma Beta" and o["I11"].value=="Firma Alfa" and o["D12"].value==80000 and o["D21"].value==0 and o["D23"].value==50000
    p.done([("1. Aşamalar ve Listeler","Satış aşamalarını, olasılıklarını ve müşteri kaynaklarını kendine göre düzenle."),("2. Fırsatlar","Her adayı tutarı, aşaması ve sonraki temas tarihiyle yaz."),("3. Özet","Açık ve ağırlıklı tutar, kazanma oranı ve bugün araman gerekenler.")],
      [("Ağırlıklı tutar","Tutar × aşamanın olasılığı. Olasılıklar senin tahminindir; gerçek kazanma oranına göre zamanla düzelt."),("Temas","Sonraki temas tarihi bugün ya da geçmişse aday listede görünür.")],
      "Firma ve kişi adlarını takma adla değiştir.",[("Günlük liste","[Özet sayfası] Temas zamanı gelenler için arama sırası ve her biri için tek cümlelik konuşma açılışı öner."),("Takip mesajı","Teklif verdiğim ama yanıt alamadığım bir müşteriye kısa bir takip mesajı yaz."),("Kayıp analizi","[Fırsatlar sayfası] Kaybedilen fırsatların kaynak ve tutarlarına bak; ortak nokta var mı?"),("Tahmin","[Özet sayfası] Ağırlıklı tutara göre önümüzdeki ay beklenen ciroyu yorumla ve varsayımlarını yaz.")],"ExcelKlinigi_ADAY_Firsat_Takibi.xlsx",order=["Başla","Fırsatlar","Özet","Aşamalar","Listeler","AI Komutları"],check=chk)

def cek():
    p=P("ÇEK","Çek ve senet takibi","Elindeki ve verdiğin çeklerin vadesi ne zaman, hangi ay ne kadar tahsil edecek, ne kadar ödeyeceksin."); n=1000
    c=p.table("Belgeler","Çek ve Senetler","Aldığın ve verdiğin her çek ya da senet bir satır. Tahsil edince ya da ödeyince durumu değiştir.",[("Tür","l","Alınan,Verilen"),("Belge","l","Çek,Senet"),("Kişi ya da firma","t",None,24),("Banka","t",None,16),("Belge no","t",None,13),("Vade","d"),("Tutar (₺)","m"),("Durum","l","Bekliyor,Tahsil edildi,Ödendi,Ciro edildi,Karşılıksız",15),
       ("Kalan gün","c",(f'=IF(OR(F{{r}}="",H{{r}}<>"Bekliyor"),"",F{{r}}-{T})',NUM)),("Uyarı","c",('=IF(I{r}="","",IF(I{r}<0,"Vadesi geçti",IF(I{r}<=7,"Bu hafta","")))',None)),("y","h",('=IF(H{r}="Bekliyor",G{r},0)',None))],n,
       [("Alınan","Çek","Müşteri Alfa","Banka Alfa","001",TD+timedelta(5),40000,"Bekliyor"),("Alınan","Senet","Müşteri Beta",None,"S-7",TD+timedelta(45),25000,"Bekliyor"),("Verilen","Çek","Tedarikçi Alfa","Banka Beta","104",TD+timedelta(20),30000,"Bekliyor"),("Alınan","Çek","Müşteri Gama","Banka Alfa","002",TD-timedelta(10),15000,"Karşılıksız"),("Verilen","Çek","Tedarikçi Beta","Banka Beta","105",TD-timedelta(2),12000,"Bekliyor"),("Alınan","Çek","Müşteri Alfa","Banka Alfa","000",TD-timedelta(30),20000,"Tahsil edildi")])
    for t,fc,tc in (("Vadesi geçti",PINK,RED),("Bu hafta",AMB,AMBT)): p.B.cf_eq(c.ws,f"J{R0}:J{R0+n-1}",t,fc,tc)
    p.B.cf_eq(c.ws,f"H{R0}:H{R0+n-1}","Karşılıksız",PINK,RED)
    o=p.ozet("Yıl, aylık vade takvimi içindir."); A_,F_,G_,H_,I_,Y_=c.r("Tür"),c.r("Vade"),c.r("Tutar (₺)"),c.r("Durum"),c.r("Kalan gün"),c.r("y")
    p.B.cards(o,5,[("Bekleyen alınan",f'=SUMIFS({Y_},{A_},"Alınan")',TL),("Bekleyen verilen",f'=SUMIFS({Y_},{A_},"Verilen")',TL,1),("Net","=B6-C6",TL),("7 günde tahsil edilecek",f'=SUMIFS({Y_},{A_},"Alınan",{I_},">=0",{I_},"<=7")',TL),("7 günde ödenecek",f'=SUMIFS({Y_},{A_},"Verilen",{I_},">=0",{I_},"<=7")',TL,1),("Karşılıksız",f'=SUMIFS({G_},{H_},"Karşılıksız")',TL,1)])
    tr=p.monthly(o,10,2,[("Tahsil edilecek (₺)",msum(Y_,F_,f',{A_},"Alınan"'),TL),("Ödenecek (₺)",msum(Y_,F_,f',{A_},"Verilen"'),TL),("Net (₺)",mf("=C{r}-D{r}"),TL)],title="Vade takvimi (bekleyenler)")
    p.B.label(o,"I9","Vade dilimleri (bekleyenler)"); p.B.table(o,10,9,["Dilim","Alınan (₺)","Verilen (₺)"],5,fmt={10:TL,11:TL})
    for i,(lab,lo,hi) in enumerate((("Vadesi geçmiş",None,-1),("0-30 gün",0,30),("31-60 gün",31,60),("61-90 gün",61,90),("90 günden uzun",91,None))):
        r=11+i; o.cell(r,9,lab); cr="".join(([f',{I_},">={lo}"'] if lo is not None else [])+([f',{I_},"<={hi}"'] if hi is not None else []))
        o.cell(r,10,f'=SUMIFS({Y_},{A_},"Alınan"{cr})'); o.cell(r,11,f'=SUMIFS({Y_},{A_},"Verilen"{cr})')
    def chk(w):
        o=w["Özet"]; assert [o.cell(6,c).value for c in range(2,8)]==[65000,42000,23000,40000,0,15000] and [o.cell(11+i,10).value for i in range(5)]==[0,40000,25000,0,0] and [o.cell(11+i,11).value for i in range(5)]==[12000,30000,0,0,0]
        assert w["Belgeler"].cell(R0+4,10).value=="Vadesi geçti" and w["Belgeler"].cell(R0,10).value=="Bu hafta"
    p.done([("1. Belgeler","Aldığın ve verdiğin çek ve senetleri vade ve tutarıyla yaz."),("2. Durum","Tahsil edince, ödeyince, ciro edince ya da karşılıksız çıkınca durumu değiştir."),("3. Özet","Bekleyen tutarlar, bu hafta tahsil edilecek ve ödenecekler, vade dilimleri ve aylık takvim.")],
      [("Bekleyen","Yalnızca durumu Bekliyor olan belgeler toplamlara ve takvime girer."),("Ciro","Ciro ettiğin çeki Ciro edildi yap; karşılıksız çıkarsa sorumluluğun sürebilir, dosya bunu izlemez.")],
      "Kişi, firma ve hesap bilgilerini takma adla değiştir.",[("Nakit planı","[Özet sayfasındaki vade takvimi] Hangi aylarda ödeyeceğim tahsil edeceğimden fazla? O aylar için ne yapabilirim?"),("Risk","[Belgeler sayfası] Tek bir kişiden aldığım çeklerin toplamı çok yüksek mi? Yoğunlaşmayı göster."),("Hatırlatma","Vadesi yaklaşan senet için borçluya gönderilecek kısa bir hatırlatma yaz."),("Karşılıksız çek","Karşılıksız çıkan çek için atılabilecek ilk adımları genel hatlarıyla anlat; hukuki kesinlik için avukata danışmam gerektiğini biliyorum.")],"ExcelKlinigi_CEK_Senet_Takibi.xlsx",check=chk)

def demirbas():
    p=P("DEMİRBAŞ","Demirbaş ve zimmet takibi","İş yerindeki makine, bilgisayar, mobilya: kimde, kaça alındı, bugün defterde kaç lira ediyor."); n=500
    L=p.lists({"Kategori":["Bilgisayar","Makine","Mobilya","Araç","Telefon","Diğer"],"Zimmetli":["Ortak kullanım","Kişi Alfa","Kişi Beta"]})
    d=p.table("Demirbaşlar","Demirbaşlar","Her demirbaş bir satır. Faydalı ömrü yıl olarak yaz.",[("Demirbaş","t",None,28),("Kategori","l",L["Kategori"],14),("Alış tarihi","d"),("Bedel (₺)","m"),("Faydalı ömür (yıl)","n"),("Zimmetli","l",L["Zimmetli"],16),("Yer","t",None,16),
       ("Yıllık amortisman (₺)","c",('=IF(OR(A{r}="",E{r}="",E{r}=0),"",D{r}/E{r})',TL),16),("Geçen yıl","c",(f'=IF(OR(A{{r}}="",C{{r}}=""),"",MAX(0,({T}-C{{r}})/365.25))','0.0')),("Birikmiş amortisman (₺)","c",('=IF(OR(H{r}="",I{r}=""),"",MIN(D{r},H{r}*I{r}))',TL),17),("Net değer (₺)","c",('=IF(J{r}="","",D{r}-J{r})',TL)),("Durum","c",('=IF(K{r}="","",IF(K{r}<=0,"Ömrünü doldurdu","Kullanımda"))',None),16)],n,
       [("Dizüstü bilgisayar","Bilgisayar",TD-timedelta(730),60000,4,"Kişi Alfa","Ofis"),("Kesim makinesi","Makine",TD-timedelta(1461),200000,10,"Ortak kullanım","Atölye"),("Ofis masası","Mobilya",TD-timedelta(4000),8000,5,"Kişi Beta","Ofis")])
    p.B.cf_eq(d.ws,f"L{R0}:L{R0+n-1}","Ömrünü doldurdu",GREY,"667085")
    o=p.ozet("Bu sayfaya yazma.",year=None); B_,D_,F_,K_=d.r("Kategori"),d.r("Bedel (₺)"),d.r("Zimmetli"),d.r("Net değer (₺)")
    p.B.cards(o,5,[("Demirbaş",f"=COUNTA({d.r('Demirbaş')})",NUM),("Toplam bedel",f"=SUM({D_})",TL),("Net değer",f"=SUM({K_})",TL),("Bu yılın amortismanı",f'=SUMIFS({d.r("Yıllık amortisman (₺)")},{d.r("Durum")},"Kullanımda")',TL),("Ömrünü dolduran",f'=COUNTIF({d.r("Durum")},"Ömrünü doldurdu")',NUM)])
    p.bylist(o,9,2,"Kategoriye göre",L["Kategori"],10,[("Adet",f"COUNTIF({B_},{{k}})",NUM),("Bedel (₺)",f"SUMIFS({D_},{B_},{{k}})",TL),("Net değer (₺)",f"SUMIFS({K_},{B_},{{k}})",TL)])
    p.bylist(o,22,2,"Zimmetliye göre",L["Zimmetli"],20,[("Adet",f"COUNTIF({F_},{{k}})",NUM),("Bedel (₺)",f"SUMIFS({D_},{F_},{{k}})",TL)],"Zimmetli")
    def chk(w):
        x=w["Demirbaşlar"]; assert near(x.cell(R0,10).value,15000*730/365.25) and near(x.cell(R0+1,11).value,200000-20000*1461/365.25) and x.cell(R0+2,11).value==0 and x.cell(R0+2,12).value=="Ömrünü doldurdu"
        o=w["Özet"]; assert o["B6"].value==3 and o["C6"].value==268000 and o["E6"].value==35000 and o["F6"].value==1 and o["D10"].value==60000 and o["D24"].value==60000
    p.done([("1. Listeler","Kategorileri ve zimmet verilebilecek kişileri yaz."),("2. Demirbaşlar","Her demirbaşı alış tarihi, bedeli, faydalı ömrü ve zimmetlisiyle gir."),("3. Özet","Toplam bedel, net değer, kategori ve kişi bazında dağılım.")],
      [("Amortisman","Bedel faydalı ömre eşit bölünür ve alış tarihinden bugüne geçen süreyle çarpılır. Bu basit bir yöntemdir."),("Vergi hesabı değildir","Vergi mevzuatındaki oran ve yöntemler farklı olabilir; resmî amortisman için mali müşavirine danış.")],
      "Kişi adlarını takma adla değiştir; seri numarası paylaşma.",[("Yenileme planı","[Demirbaşlar sayfası] Ömrünü dolduran ya da bir yıl içinde dolduracak demirbaşları listele ve yenileme bütçesi için sıra öner."),("Zimmet tutanağı","[kişi] için zimmet tutanağı taslağı hazırla; demirbaş listesini ben vereceğim."),("Sayım","[Demirbaşlar sayfası] Yer bazında sayım kontrol listesi oluştur."),("Sigorta","Kategori bazında toplam bedeli sigorta teklifinde kullanmak üzere özetle.")],"ExcelKlinigi_DEMIRBAS_Zimmet_Takibi.xlsx",check=chk)

def nobet():
    p=P("NÖBET","Haftalık vardiya çizelgesi","Kim hangi gün hangi vardiyada, haftada kaç saat çalışıyor, hangi gün kaç kişi var."); B=p.B; nP=30
    v=B.sheet("Vardiyalar","Vardiyalar","Vardiya kodlarını ve kaç saat sürdüğünü yaz. Çizelgede bu kodları kullanırsın.",{"A":8,"B":26,"C":10})
    B.head(v,4,["Kod","Açıklama","Saat"]); B.body(v,R0,10,3,fmt={3:'0.0'},center=(1,3)); B.put(v,R0,[("S","Sabah 08:00-16:00",8),("A","Akşam 16:00-24:00",8),("G","Gece 24:00-08:00",8),("T","Tam gün 10:00-22:00",12),("İ","İzinli",0)])
    KD,SA=f"'Vardiyalar'!$A${R0}:$A${R0+9}",f"'Vardiyalar'!$C${R0}:$C${R0+9}"
    c=B.sheet("Çizelge","Haftalık Çizelge","Haftanın pazartesi tarihini yaz, her kişi için günlerin vardiya kodunu seç.",{"A":3,"B":24,"C":12,**{CL(i):11 for i in range(4,11)},"K":12,"L":18},grid=False)
    c["B3"]="Haftanın pazartesisi"; c["B3"].font=font(10,True); B.inp(c,"C3",D(2026,10,5),DT)
    B.head(c,5,["Personel","En fazla saat"]+[""]*7+["Haftalık saat","Uyarı"],calc=range(4,13),start=2,h=34)
    for j,g in enumerate(["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"]): c.cell(5,4+j,f'="{g} "&RIGHT("0"&DAY($C$3+{j}),2)&"."&RIGHT("0"&MONTH($C$3+{j}),2)')
    B.body(c,6,nP,11,calc=(11,12),fmt={3:NUM,11:'0.0'},center=range(3,13),start=2)
    plan=[("Personel Alfa",45,"S","S","S","S","S","İ","İ"),("Personel Beta",45,"A","A","A","A","A","A","İ"),("Personel Gama",45,"İ","T","T","T","T","S",None),("Personel Delta",30,"S",None,"S",None,"A","T","T")]
    B.put(c,6,plan,start=2)
    for i in range(nP):
        r=6+i; c.cell(r,11,f'=IF(B{r}="","",SUMPRODUCT(COUNTIF(D{r}:J{r},{KD})*{SA}))'); c.cell(r,12,f'=IF(OR(B{r}="",C{r}=""),"",IF(K{r}>C{r},"En fazla saati aşıyor",""))')
    B.dv(c,"list",f"D6:J{5+nP}","="+KD); B.dv(c,"nonneg",f"C6:C{5+nP}"); B.cf_eq(c,f"L6:L{5+nP}","En fazla saati aşıyor",PINK,RED); B.cf_eq(c,f"D6:J{5+nP}","İ",GREY,"667085")
    r0=6+nP+2; B.label(c,f"B{r0-1}","Gün gün kaç kişi çalışıyor")
    B.head(c,r0,["Vardiya",""]+[""]*7,calc=range(2,11),start=2,h=22)
    for j in range(7): c.cell(r0,4+j,f"={CL(4+j)}5")
    B.body(c,r0+1,11,9,calc=range(2,11),center=range(3,11),start=2,stripe=True)
    for k in range(10):
        r=r0+1+k; c.cell(r,2,f"=IF('Vardiyalar'!A{R0+k}=\"\",\"\",'Vardiyalar'!A{R0+k}&\" \"&'Vardiyalar'!B{R0+k})")
        for j in range(7): L_=CL(4+j); c.cell(r,4+j,f"=IF('Vardiyalar'!$A{R0+k}=\"\",\"\",COUNTIF({L_}$6:{L_}${5+nP},'Vardiyalar'!$A{R0+k}))")
    r=r0+11; c.cell(r,2,"ÇALIŞAN TOPLAMI").font=font(10,True)
    for j in range(7): L_=CL(4+j); c.cell(r,4+j,f"=SUMPRODUCT(COUNTIF({L_}$6:{L_}${5+nP},{KD})*({SA}>0))").font=font(10,True)
    c.freeze_panes="D6"; p.caps.append(f"{nP} personel, 10 vardiya kodu, bir hafta")
    def chk(w):
        x=w["Çizelge"]; assert [x.cell(6+i,11).value for i in range(4)]==[40,48,56,48] and [x.cell(6+i,12).value for i in range(4)]==[None,"En fazla saati aşıyor","En fazla saati aşıyor","En fazla saati aşıyor"]
        assert [x.cell(49,4+j).value for j in range(7)]==[3,3,4,3,4,3,1],[x.cell(49,4+j).value for j in range(7)]; assert x.cell(39,4).value==2 and x.cell(5,4).value=="Pzt 05.10"
    p.done([("1. Vardiyalar","Vardiya kodlarını ve sürelerini yaz. İzin için süresi 0 olan bir kod kullan."),("2. Çizelge","Haftanın pazartesi tarihini, personeli ve her günün vardiya kodunu gir."),("3. Kontrol","Haftalık saat, en fazla saati aşanlar ve gün gün çalışan sayısı hesaplanır.")],
      [("Tek hafta","Bir sayfa bir haftayı tutar. Yeni hafta için sayfayı kopyala ya da kodları silip yeniden doldur."),("Yasal süre","En fazla saat senin girdiğin sınırdır; yasal çalışma ve dinlenme sürelerine uygunluğu dosya denetlemez.")],
      "Personel adlarını takma adla değiştir.",[("Dengeleme","[Çizelge sayfası] Saatleri kişiler arasında daha dengeli dağıtmak için hangi vardiyaları değiştirebilirim?"),("Boşluk","[Çizelge sayfası] Hangi gün ve vardiyada kişi sayısı en düşük? Öneri ver."),("Duyuru","Haftalık vardiya çizelgesini ekibe duyuran kısa bir mesaj yaz."),("İzin talebi","[kişi] [gün] izin istiyor. Çizelgeyi en az değişiklikle yeniden düzenle.")],"ExcelKlinigi_NOBET_Vardiya_Cizelgesi.xlsx",order=["Başla","Çizelge","Vardiyalar","AI Komutları"],check=chk)

def fiyat():
    p=P("FİYAT","Fiyat listesi ve zam güncelleme","Bütün ürünlere tek seferde zam yap, kategoriye ya da ürüne özel oran ver, fiyatları yuvarla; marjın nasıl değiştiğini gör."); n=500; B=p.B
    kz=B.sheet("Kategori Zamları","Kategori Zamları","Kategorileri yaz. Bir kategoriye özel zam oranı vermek istersen yanına yaz; boş bırakırsan genel oran uygulanır.",{"A":22,"B":14})
    B.head(kz,4,["Kategori","Zam oranı"]); B.body(kz,R0,20,2,fmt={2:"0%"},center=(2,)); B.put(kz,R0,[("İçecek",0.25),("Atıştırmalık",None),("Temizlik",0.15)])
    KA,KZ=[f"'Kategori Zamları'!${c}${R0}:${c}${R0+19}" for c in "AB"]; GZ,AD,BT="'Özet'!$C$3","'Özet'!$C$4","'Özet'!$C$5"
    u=p.table("Ürünler","Ürünler","Ürünleri maliyeti ve mevcut fiyatıyla yaz. Ürüne özel zam vermek istersen son sarı sütuna oranı yaz.",[("Ürün","t",None,28),("Kategori","l",KA,16),("Maliyet (₺)","m"),("Mevcut fiyat (₺)","m",None,15),("Özel zam","p"),
       ("Uygulanan zam","c",(f'=IF(OR(A{{r}}="",D{{r}}=""),"",IF(E{{r}}<>"",E{{r}},IF(IFERROR(INDEX({KZ},MATCH(B{{r}},{KA},0)),"")="",{GZ},INDEX({KZ},MATCH(B{{r}},{KA},0)))))',"0%")),
       ("Yeni fiyat (₺)","c",(f'=IF(F{{r}}="","",ROUNDUP(ROUND(D{{r}}*(1+F{{r}})/{AD},6),0)*{AD}-{BT})','#,##0.00')),("Fark (₺)","c",('=IF(G{r}="","",G{r}-D{r})','#,##0.00')),("Eski marj","c",('=IF(OR(G{r}="",D{r}=0),"",(D{r}-C{r})/D{r})',"0%")),("Yeni marj","c",('=IF(OR(G{r}="",G{r}=0),"",(G{r}-C{r})/G{r})',"0%")),("Gerçekleşen zam","c",('=IF(OR(G{r}="",D{r}=0),"",G{r}/D{r}-1)',"0.0%"),15)],n,
       [("Ayran","İçecek",12,20,None),("Kraker","Atıştırmalık",18,30,None),("Çikolata","Atıştırmalık",30,45,0.10),("Sıvı sabun","Temizlik",55,88,None)])
    o=p.ozet("Genel zam oranını ve yuvarlama kuralını yaz.",year=None)
    for r,lab,val,nf,note in ((3,"Genel zam oranı",0.20,"0%","Kategoriye ya da ürüne özel oran yoksa bu uygulanır."),(4,"Yuvarlama adımı (₺)",5,'0.00',"Yeni fiyat bu adımın katına yukarı yuvarlanır: 1, 5 ya da 10 gibi."),(5,"Fiyattan düşülecek (₺)",0.10,'0.00',"0,10 yazarsan 25 lira yerine 24,90 olur. İstemezsen 0 yaz.")):
        o.cell(r,2,lab).font=font(10,True); B.inp(o,f"C{r}",val,nf); o.cell(r,4,note).font=font(9,c="475467",i=True)
    B.cards(o,7,[("Ürün",f"=COUNTA({u.r('Ürün')})",NUM),("Ortalama gerçekleşen zam",f"=IFERROR(AVERAGE({u.r('Gerçekleşen zam')}),0)","0.0%"),("Eski ortalama marj",f"=IFERROR(AVERAGE({u.r('Eski marj')}),0)","0%"),("Yeni ortalama marj",f"=IFERROR(AVERAGE({u.r('Yeni marj')}),0)","0%"),("Maliyetin altında kalan",f'=COUNTIF({u.r("Yeni marj")},"<0")',NUM,1)])
    def chk(w):
        x=w["Ürünler"]; assert [x.cell(R0+i,6).value for i in range(4)]==[0.25,0.20,0.10,0.15] and [round(x.cell(R0+i,7).value,2) for i in range(4)]==[24.90,39.90,49.90,104.90],[x.cell(R0+i,7).value for i in range(4)]
        assert near(x.cell(R0,10).value,(24.9-12)/24.9,1e-6); assert w["Özet"]["B8"].value==4 and w["Özet"]["F8"].value==0
    p.done([("1. Kategori Zamları","Kategorilerini yaz; özel oran vermek istediklerinin yanına oranı gir."),("2. Ürünler","Ürünleri maliyet ve mevcut fiyatla yaz."),("3. Özet","Genel zam oranını ve yuvarlama kuralını belirle; yeni fiyatlar Ürünler sayfasında çıkar.")],
      [("Öncelik","Ürüne özel zam varsa o, yoksa kategorinin oranı, o da yoksa genel oran uygulanır."),("Yuvarlama","Yeni fiyat her zaman yukarı yuvarlanır; bu yüzden gerçekleşen zam, yazdığın orandan biraz yüksek çıkabilir."),("Uygulama","Dosya yalnızca hesaplar; mevcut fiyatların üzerine yazmaz. Zamdan sonra yeni fiyatları değer olarak kopyalayıp mevcut fiyat sütununa yapıştır.")],
      "Tedarikçi fiyat anlaşmalarını paylaşmak zorunda değilsin.",[("Zam duyurusu","Müşterilere fiyat güncellemesini duyuran kısa ve dürüst bir metin yaz."),("Kategori önerisi","[Ürünler sayfası] Marjı en düşük kategorilere bakarak kategori bazında zam oranı öner."),("Psikolojik fiyat","[Ürünler sayfası] Yeni fiyatları müşteri gözünde daha kabul edilebilir kılacak yuvarlama önerileri ver."),("Etki","Zamdan sonra satış adedi yüzde 10 düşerse toplam kârım artar mı azalır mı? Örnek ürünle hesapla.")],"ExcelKlinigi_FIYAT_Zam_Guncelleme.xlsx",order=["Başla","Ürünler","Özet","Kategori Zamları","AI Komutları"],check=chk)

def kiralama():
    p=P("KİRALAMA","Kiralama ve rezervasyon takibi","Hangi ürün hangi tarihte kimde, aynı güne iki rezervasyon var mı, hangi ürün ne kadar kazandırdı."); nU,nR=60,1500; Y="'Özet'!$C$3"
    rU,rB,rE,rD,rG,rT=[rg("Rezervasyonlar",c,nR) for c in "CDEFHI"]; yr=f'{rB},">="&DATE({Y},1,1),{rB},"<"&DATE({Y}+1,1,1),{rD},"<>İptal"'
    u=p.table("Ürünler","Kiralık Ürünler","Kiraya verdiğin her ürünü günlük ücreti ve depozitosuyla yaz.",[("Ürün","t",None,26),("Günlük ücret (₺)","m"),("Depozito (₺)","m"),("Kiralanan gün (yıl)","c",(f'=IF(A{{r}}="","",SUMIFS({rG},{rU},A{{r}},{yr}))',NUM),15),("Ciro (yıl, ₺)","c",(f'=IF(A{{r}}="","",SUMIFS({rT},{rU},A{{r}},{yr}))',TL)),("Doluluk","c",('=IF(A{r}="","",D{r}/365)',"0%")),
       ("Şu an","c",(f'=IF(A{{r}}="","",IF(COUNTIFS({rU},A{{r}},{rB},"<="&{T},{rE},">="&{T},{rD},"<>İptal",{rD},"<>İade alındı")>0,"Dışarıda","Müsait"))',None))],nU,[("Ses sistemi",2500,5000),("Projeksiyon",1200,3000),("Çadır 5x5",4000,8000)],uniq=True)
    r=p.table("Rezervasyonlar","Rezervasyonlar","Her kiralama bir satır. Aynı ürün aynı günlere iki kez yazılırsa Çakışıyor uyarısı çıkar.",[("Müşteri","t",None,22),("Telefon","t",None,14),("Ürün","l",u.r("Ürün"),22),("Başlangıç","d"),("Bitiş (dahil)","d"),("Durum","l","Rezerve,Teslim edildi,İade alındı,İptal",14),("İndirim (₺)","m"),
       ("Gün","c",('=IF(OR(D{r}="",E{r}="",E{r}<D{r}),"",E{r}-D{r}+1)',NUM)),("Tutar (₺)","c",(f'=IF(OR(H{{r}}="",C{{r}}=""),"",IF(F{{r}}="İptal",0,H{{r}}*IFERROR(INDEX({u.r("Günlük ücret (₺)")},MATCH(C{{r}},{u.r("Ürün")},0)),0)-G{{r}}))',TL)),
       ("Çakışma","c",(f'=IF(OR(H{{r}}="",C{{r}}="",F{{r}}="İptal"),"",IF(COUNTIFS($C${R0}:$C${R0+nR-1},C{{r}},$D${R0}:$D${R0+nR-1},"<="&E{{r}},$E${R0}:$E${R0+nR-1},">="&D{{r}},$F${R0}:$F${R0+nR-1},"<>İptal")>1,"Çakışıyor",""))',None))],nR,
       [("Müşteri Alfa",None,"Ses sistemi",TD-timedelta(1),TD+timedelta(1),"Teslim edildi",0),("Müşteri Beta",None,"Ses sistemi",TD+timedelta(1),TD+timedelta(2),"Rezerve",0),("Müşteri Gama",None,"Projeksiyon",TD+timedelta(1),TD+timedelta(1),"Rezerve",200),("Müşteri Delta",None,"Çadır 5x5",D(2026,8,10),D(2026,8,12),"İade alındı",0),("Müşteri Epsilon",None,"Çadır 5x5",D(2026,8,11),D(2026,8,11),"İptal",0)])
    p.B.cf_eq(r.ws,f"J{R0}:J{R0+nR-1}","Çakışıyor",PINK,RED); p.B.cf_eq(u.ws,f"G{R0}:G{R0+nU-1}","Dışarıda",AMB,AMBT)
    o=p.ozet("Yılı değiştir. Kiralama, başladığı aya yazılır.")
    tr=p.monthly(o,10,2,[("Kiralama",mcnt(rB,f',{rD},"<>İptal"'),NUM),("Gün",msum(rG,rB,f',{rD},"<>İptal"'),NUM),("Ciro (₺)",msum(rT,rB),TL)])
    p.B.cards(o,5,[("Yıl cirosu",f"=E{tr}",TL),("Şu an dışarıda",f'=COUNTIF({u.r("Şu an")},"Dışarıda")',NUM),("Yarın teslim edilecek",f'=COUNTIFS({rB},{T}+1,{rD},"Rezerve")',NUM),("Bugün dönecek",f'=COUNTIFS({rE},{T},{rD},"Teslim edildi")',NUM),("Çakışan rezervasyon",f'=COUNTIF({r.r("Çakışma")},"Çakışıyor")',NUM,1)])
    def chk(w):
        x=w["Rezervasyonlar"]; assert [x.cell(R0+i,8).value for i in range(5)]==[3,2,1,3,1] and [x.cell(R0+i,9).value for i in range(5)]==[7500,5000,1000,12000,0] and [x.cell(R0+i,10).value for i in range(5)]==["Çakışıyor","Çakışıyor",None,None,None]
        y=w["Ürünler"]; assert [y.cell(R0+i,7).value for i in range(3)]==["Dışarıda","Müsait","Müsait"] and y.cell(R0+2,5).value==12000; o=w["Özet"]; assert [o.cell(6,c).value for c in range(3,7)]==[1,2,0,2] and o["E18"].value==12000 and o["C18"].value==1
    p.done([("1. Ürünler","Kiralık ürünleri, günlük ücreti ve depozitoyu yaz."),("2. Rezervasyonlar","Her kiralamayı ürün, başlangıç ve bitiş tarihiyle gir; teslim edince ve geri alınca durumu güncelle."),("3. Özet","Aylık kiralama ve ciro, şu an dışarıda olanlar, yarın teslim edilecekler.")],
      [("Çakışma","Aynı ürünün tarihleri kesişen ve iptal olmayan iki kaydı varsa ikisi de Çakışıyor yazar. Aynı üründen birden fazla adet varsa her adedi ayrı ürün olarak yaz."),("Depozito","Depozito bilgi amaçlıdır; ciroya girmez.")],
      "Müşteri adlarını ve telefonlarını paylaşma.",[("Teslim listesi","[Rezervasyonlar sayfası] Yarın teslim edilecek ve geri alınacak ürünleri saat sırası için liste haline getir."),("Doluluk","[Ürünler sayfası] Doluluk oranı düşük ürünler için fiyat ya da paket önerisi ver."),("Sözleşme","Kısa bir kiralama teslim tutanağı taslağı hazırla: ürün, tarih, depozito, hasar durumu."),("Hatırlatma","Ürünü yarın getirmesi gereken müşteriye kibar bir hatırlatma yaz.")],"ExcelKlinigi_KIRALAMA_Rezervasyon_Takibi.xlsx",order=["Başla","Rezervasyonlar","Ürünler","Özet","AI Komutları"],check=chk)
if __name__=="__main__":
    for f in (siparis,aday,cek,demirbas,nobet,fiyat,kiralama): f()
