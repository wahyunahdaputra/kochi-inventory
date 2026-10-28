import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, LoaderCircle, Building2, Package, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { defaultSearch } from '@/lib/kochi/shared';
import logo from '@/assets/kochi-logo.png';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Masuk | KOCHI Inventory Management System' },
      { name: 'description', content: 'Sistem inventaris kantor KOCHI / PT Nusa Jelita Lestari. Masuk menggunakan akun Google Anda.' },
      { property: 'og:title', content: 'KOCHI Inventory Management System' },
      { property: 'og:description', content: 'Inventaris kantor IT, General Affair dan Maintenance KOCHI.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Index,
});

function Index() { 
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        void navigate({ to: '/$page', params: { page: 'dashboard' }, search: defaultSearch, replace: true });
      }
    });
  }, [navigate]);

  async function login() {
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      console.error('[login]', error);
      setError('Login belum berhasil. Silakan coba kembali menggunakan akun Google.');
      setBusy(false);
    }
    // Kalau sukses, browser otomatis pindah ke Google. Jangan navigate manual.
  }

   return (
    <div className="login-page">
      <header className="flex items-center justify-between border-b px-6 py-5 md:px-12">
        <img src={logo} alt="KOCHI" className="w-28" />
        <span className="hidden text-xs text-muted-foreground sm:block">PT Nusa Jelita Lestari</span>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-14">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-[11px] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          Ruang Kerja Digital KOCHI
        </div>
        <img src={logo} alt="KOCHI" className="mb-6 w-44" />
        <h1 className="text-center text-3xl font-semibold leading-tight md:text-4xl">Inventory Management System</h1>
        <p className="mt-5 max-w-md text-center text-sm leading-7 text-muted-foreground">
          Satu ruang kerja untuk inventaris kantor.<br />IT, General Affair, dan Maintenance.
        </p>
        <div className="mt-10 w-full max-w-sm">
          <Button className="h-12 w-full gap-3 text-sm" onClick={() => void login()} disabled={busy}>
            {busy ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <span className="flex size-6 items-center justify-center rounded-full bg-primary-foreground text-sm font-bold text-primary">G</span>
            )}
            Masuk dengan Google
            <ArrowRight className="ml-auto" />
          </Button>
          {error && <p role="alert" className="mt-4 text-center text-xs text-destructive">{error}</p>}
          <p className="mt-5 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <LockKeyhole className="size-3" />
            Akses sesuai divisi dan persetujuan administrator
          </p>
        </div>
        <div className="mt-16 flex flex-wrap justify-center gap-x-10 gap-y-4 border-t pt-6 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-2"><Package className="size-4" />Inventaris Kantor</span>
          <span className="flex items-center gap-2"><Building2 className="size-4" />3 Divisi</span>
          <span className="flex items-center gap-2"><ShieldCheck className="size-4" />Akses Terlindungi</span>
        </div>
      </main>
      <footer className="border-t px-6 py-5 text-center text-[10px] text-muted-foreground">
        © {new Date().getFullYear()} KOCHI · PT Nusa Jelita Lestari
      </footer>
    </div>
  );
}