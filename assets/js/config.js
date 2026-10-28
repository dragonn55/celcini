/* Celcini · dış bağlantılar (tek yer)
   Boş bırakılan ("") bağlantının bölümü sayfada gizlenir; kırık link oluşmaz.
   Ürünlerin Shopier bağlantıları burada değil, data/urunler.json'daki shopier_url alanındadır.
   Değer https:// ile başlamalı; e-posta yalnızca adres olarak yazılır (ör. merhaba@celcini.com). */
window.CELCINI_LINKS = {
  shopier_magaza: "https://www.shopier.com/fabricakit",
  google_form: "",      /* e-posta listesi için Google Form bağlantısı; girilince "Açılınca haber ver" düğmeleri görünür */
  eposta: "",           /* iletişim e-postası */
  instagram: "https://www.instagram.com/celciniai/",
  fabricakit_kod: "",   /* Fabricakit erişim kodu ürününün Shopier bağlantısı; boşsa kilit ekranı mağazaya gider */
  fabricakit_kod_fiyat: "" /* kod ürününün fiyatı, ör. "199 TL"; fabricakit_kod doluyken kilit ekranındaki düğmede yazar */
};
