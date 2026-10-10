# 🎬 Auto Video Editor (TikTok Beat-Sync & Theme-Based)

Aplikasi pintar untuk mengotomasi proses editing video: mengimpor bahan mentah (video & foto), mencocokkan ritme potongan klip dengan musik referensi TikTok (beat-sync), dan memoles hasil video dengan tema pilihan (**Cinematic**, **Dokumentasi**, atau **TikTok Viral**).

---

## ✨ Fitur Utama

1. **🔥 Template CapCut Trending (Siap Pakai)**:
   - **CapCut JJ Mengkane (Jedag-Jedug)**: Potongan ultra-cepat pas di setiap hentakan bass drum, efek kilatan *Flash White*, dan zoom punch.
   - **CapCut Cinematic Film Look**: Rasio bioskop *Letterbox 2.35:1*, grading moody Teal & Orange, dan transisi *smooth dissolve*.
   - **CapCut Mini Vlog / Daily Story**: Warna natural jernih, transisi halus, audio vokal asli video tetap jernih (*ducking 70%*).
   - **CapCut 90s Retro Film Roll**: Nuansa vintage warm pastel, grain lembut, dan transisi fade elegan.
   - **CapCut Travel Recap**: Pacing berenergi tinggi, dynamic whip cuts, dan saturasi kaya warna.

2. **🔗 Paste Link Template CapCut & TikTok**:
   - Mendukung link template CapCut (`https://www.capcut.com/template-detail/...` atau shortlink `capcut.com/t/...`).
   - Mendukung link TikTok, Instagram Reels, dan YouTube Shorts.
   - Otomatis mengekstrak audio template dan menghitung ritme beat-sync pemotongannya.

3. **📁 Multi-Media Ingestion**:
   - Mendukung berbagai klip video (`.mp4`, `.mov`, `.mkv`) dan foto (`.jpg`, `.png`).
   - Otomatis melakukan *smart center-cropping* ke rasio vertikal **9:16 (1080x1920)** standar CapCut/TikTok/Reels.

4. **🎨 Pilihan Tema Editing**:
   - **🎬 Cinematic**: Color grading moody Teal & Orange, alur transisi halus (crossfade/dissolve), tempo elegan dan dramatis.
   - **📖 Dokumentasi / Vlog**: Warna natural jernih dan tajam, pemotongan dinamis berurutan, mempertahankan suara asli percakapan/vokal (audio ducking).
   - **⚡ TikTok Viral (Beat-Sync)**: Potongan klip ultra-cepat tepat di setiap hentakan beat, warna kontras pop & punchy.

5. **📱 Mobile-First & Siap APK**:
   - Tampilan responsif seperti aplikasi mobile CapCut/TikTok.
   - Mendukung **PWA (Progressive Web App)**: Bisa langsung diinstall di HP Android/iOS menjadi aplikasi beranda tanpa perlu instalasi Android Studio yang rumit.
   - Pemrosesan rendering video berjalan di backend (FFmpeg), sehingga HP tidak panas dan tidak lag.

---

## 🚀 Cara Menjalankan Aplikasi

Pastikan Python telah terinstal, lalu jalankan script berikut di terminal:

```bash
python run.py
```

Setelah server aktif:
- **Di Laptop/PC**: Buka [http://localhost:8585](http://localhost:8585) *(Port 8585 terisolasi agar aman & tidak bentrok dengan aplikasi trading Anda di port 8000)*.
- **Di HP Android/iOS**: Buka alamat IP lokal yang tampil di terminal (misal: `http://192.168.1.X:8585`) dengan memastikan HP terhubung ke jaringan WiFi yang sama.
- **Opsi Ganti Port Manual**: Anda juga bisa menentukan port sendiri jika mau:
  ```bash
  python run.py --port 8888
  ```

---

## 📱 Cara Menjadikan Aplikasi di HP (iPhone & Android)

Aplikasi ini mendukung **PWA (Progressive Web App)** sehingga bisa langsung dipasang di layar utama iPhone maupun Android tanpa perlu download lewat App Store/Play Store:

### 🍏 Untuk Pengguna iPhone (iOS):
1. Pastikan iPhone dan laptop terhubung ke **WiFi yang sama**.
2. Buka browser **Safari** di iPhone, lalu ketik `http://<IP_LAPTOP_ANDA>:8585`.
3. Ketuk ikon **Share** (kotak dengan panah ke atas) di menu bawah Safari.
4. Gulir ke bawah, lalu pilih **"Add to Home Screen"** (*Tambahkan ke Layar Utama*).
5. Ketuk **"Add"** di pojok kanan atas. Ikon **AutoEdit** akan langsung muncul di Home Screen iPhone Anda dan bisa dibuka fullscreen layaknya aplikasi iOS native!

### 🤖 Untuk Pengguna Android:
1. Buka browser **Google Chrome** di HP Android.
2. Akses alamat `http://<IP_LAPTOP_ANDA>:8585`.
3. Ketuk menu **Titik Tiga (⋮)** di pojok kanan atas browser.
4. Pilih **"Install aplikasi"** atau **"Tambahkan ke Layar Utama"** (*Add to Home Screen*).
5. Ikon aplikasi langsung terpasang di beranda HP Anda!

---

---

## 🛠️ Struktur Proyek

```text
apk edit vid/
├── backend/
│   ├── config.py             # Konfigurasi path, FFmpeg, resolusi
│   ├── app.py                # Server FastAPI & API Endpoints
│   └── engine/
│       ├── beat_detector.py  # Analisis BPM & deteksi ketukan musik (Librosa)
│       ├── downloader.py     # Download audio TikTok/CapCut (yt-dlp)
│       ├── themes.py         # Konfigurasi preset tema & filter FFmpeg
│       └── video_editor.py   # Engine FFmpeg video cutting, crop 9:16, & muxing
├── frontend_app/             # ⚡ Modern React + Vite + TypeScript + Tailwind + shadcn/ui
│   ├── src/
│   │   ├── components/ui/    # Komponen shadcn/ui (Button, Card, Badge, Input, Progress, Dialog)
│   │   ├── lib/              # Utility styling (cn)
│   │   └── App.tsx           # Antarmuka interaktif 4-Step Wizard & Beat Visualizer
│   ├── vite.config.ts        # Konfigurasi bundler Vite
│   └── package.json          # Dependensi React & Tailwind v4
├── frontend/
│   └── dist/                 # Hasil build produksi yang langsung dilayani oleh FastAPI
├── frontend_legacy/          # Backup frontend vanilla HTML/JS sebelumnya
├── run.py                    # Script starter otomatis (FastAPI + Cloudflare Tunnel)
└── README.md
```

### 💻 Mode Pengembangan Frontend (Hot Reload)

Jika ingin memodifikasi tampilan UI secara langsung:
```bash
cd frontend_app
npm run dev
```
Buka `http://localhost:5173` di browser. Request API otomatis diteruskan (*proxied*) ke server backend FastAPI di port 8585.

Untuk mengompilasi build produksi ke folder `frontend/dist`:
```bash
cd frontend_app
npm run build
```
Setelah build selesai, cukup jalankan `python run.py` seperti biasa!

