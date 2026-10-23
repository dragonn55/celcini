/* Fabricakit · giriş noktası (tarayıcı). Simülatör bu dosyadan kurulur. */
const kok = document.getElementById("fk");
const yukleniyor = kok && kok.querySelector(".fk-yukleniyor");
if (yukleniyor) yukleniyor.textContent = "Simülatör hazırlanıyor.";
