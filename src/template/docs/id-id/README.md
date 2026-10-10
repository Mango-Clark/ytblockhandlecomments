# 📌 YouTube Comment Blocker — v{{version}}

{{language_links}}

Skrip Tampermonkey yang menyembunyikan komentar YouTube berdasarkan kanal pada halaman video dan Shorts. Kelola aturan handle, UCID, dan regex dengan otomatisasi serta penyimpanan lokal.

## Pemasangan dan penggunaan

1. Pasang [Tampermonkey](https://www.tampermonkey.net/).
2. Buka URL skrip mentah di bawah, atau tempel `ytblockhandlecomments.js` ke skrip baru.
3. Pada video atau Shorts, klik kanan handle penulis atau gunakan menu `⋯` untuk memblokir/membuka blokir kanal.
4. Buka menu skrip Tampermonkey untuk mengelola daftar blokir, pengaturan, atau bahasa.

<https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js>

## Fitur

- **Pemblokiran:** aturan handle default, pasangan UCID opsional, regex terpisah, dan pencocokan kapitalisasi. Hanya interaksi dengan penulis komentar yang diperluas.
- **Komentar dan otomatisasi:** sembunyikan, pengganti abu-abu, atau klik untuk membuka; dislike otomatis, penambahan regex, dan kata kunci pada teks, handle, atau label sematan. Node yang dipakai ulang diproses kembali.
- **Daftar blokir:** pencarian, filter jenis/tag, pilihan, tindakan massal, impor/ekspor JSON atau teks. Hasil regex dapat dihitung, dipilih, diperluas, dan dibagi halaman tanpa membangun ulang seluruh daftar.
- **Pengaturan:** delapan bagian seragam: pencocokan, komentar, otomatisasi, pasangan, kunci API, tampilan/tema, log/diagnostik, reset. Pada layar sempit, navigasi berpindah ke atas. Perubahan disimpan otomatis dan default ditandai.
- **Tampilan:** lima ukuran teks/antarmuka dan tema terang, gelap, sistem, terbalik, YouTube, atau kustom. Sinkronisasi mengikuti status gelap bawaan YouTube; warna hanya memengaruhi skrip.
- **Performa:** pencocokan tersimpan di cache dan pencarian wadah komentar dibatasi. 100 entri per halaman; mode performa rendah memakai 50, kelompok kecil, pencarian tertunda, dan pasangan manual satu per satu. Pencarian yang dilewati tidak diulang.
- **Log:** keluaran lokal dan konsol terpisah, level, retensi, awalan, zona waktu, format ISO/kustom, uji, unduhan, penghapusan terkonfirmasi, dan detail V0–V5. Nilai sensitif disamarkan; pencocokan tiap komentar tidak dicatat.
- **Status:** draf, pencarian, filter, pilihan, halaman, dan gulir dipertahankan saat navigasi dan pergantian bahasa. Navigasi SPA mereset pengamat sementara; dialog mengelola fokus keyboard.

## Pasangan UCID

1. Pemblokiran handle langsung berlaku. Pembuatan pasangan langsung aktif secara default dan berjalan asinkron; kegagalan mempertahankan blokir dan tautan.
2. Pembuatan menyelesaikan **handle → UCID** dan menyimpan pasangan serta aturan `id`. Pembaruan menyelesaikan **UCID → handle terbaru**, mempertahankan UCID, dan mengganti handle lama. Tanpa UCID, gunakan proses pembuatan.
3. Atur pembuatan, pembaruan, dan pemasangan langsung secara terpisah: halaman, API resmi, atau halaman lalu API jika gagal. Halaman tidak perlu kunci; API perlu kunci tersimpan.
4. Untuk pencocokan UCID, aktifkan deteksi dan aturan pasangan. Gunakan mode handle sampai aturan UCID tersedia. Pasangan kata kunci mengikuti kebijakan pembuatan; mode performa rendah mengizinkan tindakan manual.
5. Pilih interval atau detik kustom (minimal satu). Default: 10 menit untuk halaman, satu pekan untuk API. Pembaruan semua mengikuti interval; handle terpilih memaksa pencarian.
6. Jalankan operasi pasangan di daftar blokir. Tinjau status, hasil per handle, filter/urutan, salin/ekspor kegagalan, progres, dan banner video. Uji kunci API memberi panduan kegagalan kuota berulang.
7. Halaman membaca metadata kanal itu sendiri. Pembaruan API perlu UCID cocok dan URL `@handle`. Data hilang, konflik, pembatalan, dan kegagalan mempertahankan tautan.

## Bahasa

Antarmuka dan README mendukung `en-us`, `ko-kr`, `ja-jp`, `de-de`, `zh-cn`, `zh-tw`, `fr-fr`, `pt-br`, `ru-ru`, dan `id-id`. Pilih di Pengaturan → Tampilan/tema atau menu Tampermonkey. Pilihan tersimpan diutamakan; otomatis mengikuti browser, lalu `en-us`.

Varian wilayah memakai bahasa yang tersedia (`en-GB` → `en-us`, `pt-PT` → `pt-br`). Tionghoa: Hans/CN/SG → `zh-cn`, Hant/TW/HK/MO → `zh-tw`; `zh` saja memakai sederhana. Pilihan lama `en`/`ko` tetap valid. Wiki dan changelog tetap Inggris/Korea; panduan lain mempertahankan bahasanya.

## Penyimpanan dan privasi

- `blocked_v2`: aturan `handle`, `id` (UCID), `regex`. Format JSON/teks tetap, termasuk literal `/pattern/flags`.
- `pair_meta_v1`: tautan dan verifikasi UCID; `app_settings_v1`: pengaturan; `youtube_data_api_v3_config`: kunci, uji, dan kuota; `lang`: bahasa.
- Metadata pasangan dan kunci tidak termasuk impor/ekspor daftar. Kunci disimpan lokal dan dikirim hanya untuk API resmi. Log unduhan memakai waktu UTC ISO; browser menentukan lokasi.
- Sinkronisasi memakai revisi dan penanda penghapusan agar tambahan digabung tanpa mengembalikan aturan/log terhapus. Gagal baca mencegah penulisan tidak aman; gagal tulis mempertahankan data lama.
- Daftar lama dimigrasikan hanya tanpa data saat ini yang valid. UID menjadi UCID dengan kunci, revisi, penanda hapus, dan waktu tetap. Muat ulang tab versi lama setelah pembaruan.
- Skema data, token waktu konsol, dan detail implementasi dijelaskan di Wiki di bawah.

## Default

- Pencocokan handle, sembunyikan sepenuhnya, dislike nonaktif, pasangan langsung aktif. Semua kebijakan memakai halaman pada pemasangan baru.
- Ukuran teks/antarmuka level 3; level 2 sama dengan ukuran lama. Diagnostik V3; V0/V1 tanpa data, V2 1 kolom, V3 3, V4 6, V5 10.
- Mode performa rendah dan log nonaktif. Kata kunci tidak membedakan kapitalisasi, memeriksa teks default, dan bertindak hanya setelah diaktifkan.
- Pembaruan mempertahankan pengaturan dan interval kustom. Mengubah pencarian atau bahasa tidak mereset aturan dan draf.

## Batasan dan catatan

- Pencarian halaman tidak terdokumentasi dan bisa gagal setelah perubahan HTML. API memakai kuota; aturan UCID yang tersedia dicocokkan lokal. Uji kunci memakai kanal publik tetap.
- Handle lama mungkin disimpan huruf kecil; simpan ulang untuk kapitalisasi persis. Regex memeriksa handle; kata kunci hanya kolom pilihan.
- Regex memvalidasi panjang, flag, dan kompleksitas; sasaran maksimal 128 karakter. Komentar hanya pada video/Shorts yang didukung; banner pasangan hanya di halaman video.
- Respons YouTube/API, konten pengguna, identitas kanal, kolom protokol, dan log mesin tidak diterjemahkan. Pemutar sematan dikecualikan; hanya izin Tampermonkey yang tercantum digunakan.

## Dokumentasi

- Wiki: [English](../WIKI.md) / [한국어](../ko-kr/WIKI.md)
- Changelog: [English](../CHANGELOG.md) / [한국어](../ko-kr/CHANGELOG.md)
- Panduan kontribusi: [English](../../CONTRIBUTING.md) / [한국어](../ko-kr/CONTRIBUTING.md)
- [TODO](../TODO.md) / [Bantuan peninjauan](../ABOUT.md)

## Pengembangan dan verifikasi

- Kerjakan di `dev`, edit TypeScript di `src/`. Angka untuk urutan baca, impor ES untuk eksekusi. Penyimpanan bersama: `03a-gm-backed-store.ts`; pengelola: `12a`–`12e`.
- Edit `src/template/`, bukan dokumen hasil. `npm run build` menghasilkan semua README dan `ytblockhandlecomments.js` ringkas secara transaksional; Tampermonkey hanya memuat skrip root.
- Selaraskan sepuluh katalog dan README. `en.ts` menentukan pesan; `locales.ts` nama, jalur, dan kontributor; `i18n-mason.toml` cakupan. Pertahankan parameter dan teks mesin.
- `npm run verify` menjalankan lint, lint Markdown, typecheck, `node:test` deterministik, build, dan pemeriksaan hasil. Semua perintah tersedia terpisah; laporkan pemeriksaan yang dilewati.
- Commit sumber dan hasil bersama dengan Conventional Commits serta peninjauan independen. Versi dan push perlu izin. Rilis memakai `npm run bump:version -- <MAJOR.MINOR.PATCH>`.

```sh
npm run lint
npm run lint:markdown
npm run typecheck
npm run build
npm run check:build
npm run verify
```

Pemeriksaan browser opsional mendatang terpisah; tes otomatis tidak perlu sesi YouTube nyata.

## Kontributor terjemahan

{{translation_contributors}}

## Penulis

- **Mango_Clark**
- Lisensi: MIT
