# KOCHI Inventory Management System

Sistem inventaris kantor untuk **PT Nusa Jelita Lestari (KOCHI)**. Dipakai oleh tiga divisi: **IT**, **General Affair**, dan **Maintenance**. Login memakai akun Google, dan akses diatur per divisi dengan persetujuan Super Admin.

## Fitur

- Dashboard ringkasan stok, transaksi terbaru, dan barang menipis/habis
- Master data: barang, kategori, satuan, pemasok, lokasi penyimpanan
- Barang masuk, barang keluar, penyesuaian stok, dan riwayat transaksi
- Pembelian dengan rincian barang dan pembatalan (transaksi pembalik)
- Aset tetap per unit (nomor aset, nomor seri, kondisi, penanggung jawab)
- Laporan stok, stok menipis/habis, transaksi masuk/keluar, pembelian, dan aset
- Lampiran foto/PDF (ambil foto langsung dari kamera atau upload file)
- Manajemen pengguna: peran, divisi, dan status akun
- Audit log dan pengaturan aplikasi

## Teknologi

- [TanStack Start](https://tanstack.com/start) + TanStack Router (React, SSR)
- Vite
- Tailwind CSS + shadcn/ui
- Supabase: Auth (Google OAuth), Postgres, Storage
- Drizzle ORM / drizzle-kit untuk migrasi skema database
- Zod untuk validasi input server function

## Prasyarat

- Node.js 20 atau lebih baru
- Akun [Supabase](https://supabase.com) dan project Supabase
- Akun Google Cloud (untuk OAuth Client ID)

## Lisensi

Hak cipta © PT Nusa Jelita Lestari (KOCHI). Seluruh hak dilindungi.
