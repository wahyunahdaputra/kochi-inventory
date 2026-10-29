import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Bell, PackageX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { defaultSearch, num, text, type Row } from '@/lib/kochi/shared';
import type { Workspace } from './forms';

export function NotificationBell({ ws }: { ws: Workspace }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dept = ws.role === 'super_admin' ? '' : text(ws.profile['department_id']);

  const { data } = useQuery({
    queryKey: ['low-stock-notif', dept],
    refetchInterval: 60_000,
    queryFn: async () => {
      let q = supabase
        .from('inventory_items')
        .select('id,code,name,current_stock,min_stock,stock_status,units(name),departments(name)', { count: 'exact' })
        .eq('status', 'active')
        .in('stock_status', ['menipis', 'habis'])
        .order('current_stock')
        .limit(8);
      if (dept) q = q.eq('department_id', dept);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data || []) as unknown as Row[], count: count ?? 0 };
    },
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const count = data?.count ?? 0;
  const rows = data?.rows ?? [];
  const related = (r: Row, key: string) => text((r[key] as Row | null)?.['name']);

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" className="relative" aria-label={`Notifikasi, ${count} stok perlu perhatian`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bell />
        {count > 0 && (
          <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-4 text-primary-foreground">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Button>

      {open && (
        <div className="fixed inset-x-3 top-[76px] z-50 overflow-hidden rounded-lg border bg-card shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifikasi</p>
            <span className="text-[11px] text-muted-foreground">{count} perlu perhatian</span>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {rows.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">Semua stok dalam kondisi aman.</p>
            ) : (
              rows.map((r) => {
                const habis = text(r['stock_status']) === 'habis';
                return (
                  <Link
                    key={text(r['id'])}
                    to="/$page"
                    params={{ page: 'inventaris' }}
                    search={{ ...defaultSearch, q: text(r['code']) }}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/50"
                  >
                    <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${habis ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                      {habis ? <PackageX className="size-4" /> : <AlertTriangle className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">{text(r['name'])}</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {habis ? 'Stok habis' : 'Stok menipis'} · sisa {num(r['current_stock'])} {related(r, 'units')} (min. {num(r['min_stock'])})
                      </span>
                      {ws.role === 'super_admin' && <span className="block text-[10px] text-muted-foreground">{related(r, 'departments')}</span>}
                    </span>
                  </Link>
                );
              })
            )}
          </div>

          <Link
            to="/$page"
            params={{ page: 'inventaris' }}
            search={{ ...defaultSearch, status: 'menipis' }}
            onClick={() => setOpen(false)}
            className="block border-t px-4 py-3 text-center text-xs font-medium text-primary hover:bg-muted/50"
          >
            Lihat semua stok menipis
          </Link>
        </div>
      )}
    </div>
  );
}