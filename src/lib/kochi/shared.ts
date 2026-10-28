export const pages = {
 dashboard:'Dashboard', inventaris:'Inventaris', 'barang-masuk':'Barang Masuk', 'barang-keluar':'Barang Keluar', penyesuaian:'Penyesuaian Stok', transaksi:'Riwayat Transaksi', pembelian:'Pembelian', aset:'Aset Tetap', laporan:'Laporan', kategori:'Kategori', satuan:'Satuan', pemasok:'Pemasok', lokasi:'Lokasi Penyimpanan', pengguna:'Manajemen Pengguna', audit:'Audit Log', pengaturan:'Pengaturan', profil:'Profil Saya', 'akses-ditolak':'Akses Ditolak'
} as const;
export type Page = keyof typeof pages;
// Database DTO boundary; shape is validated by database policies and form schemas.
export type Row = Record<string, any>;
export const text = (v: unknown) => v == null ? '' : String(v);
export const num = (v: unknown) => Number(v) || 0;
export const rupiah = (v: unknown) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(num(v));
export const tanggal = (v: unknown) => v ? new Date(String(v)).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : '—';
export const stockStatus = (stock:number,min:number) => stock <= 0 ? 'habis' : stock <= min ? 'menipis' : 'normal';
export const safeCell = (v: unknown) => /^[=+@\-\t\r]/.test(text(v)) ? "'"+text(v) : text(v);
export const labels: Record<string,string> = {in:'Masuk',out:'Keluar',adjust:'Penyesuaian',purchase:'Pembelian',reversal:'Pembalik',normal:'Normal',menipis:'Menipis',habis:'Habis',active:'Aktif',archived:'Diarsipkan',pending:'Menunggu',disabled:'Nonaktif',confirmed:'Dikonfirmasi',cancelled:'Dibatalkan',consumable:'Habis pakai',asset:'Aset tetap',super_admin:'Super Admin',admin_divisi:'Admin Divisi',staf:'Staf Divisi',insert:'Tambah',update:'Ubah',archive:'Arsip',restore:'Pulihkan',cancel:'Batalkan'};
export const isPage = (v:string): v is Page => Object.hasOwn(pages,v);

export const defaultSearch={q:'',department:'',status:'',category:'',type:'',from:'',to:'',offset:0,sort:'created_at' as const,report:'stok'};
