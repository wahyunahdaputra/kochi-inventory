import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { Camera, LoaderCircle, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { saveRow, signedFile } from '@/lib/kochi/data.functions';

export function useSignedPath(path: string) {
  const sign = useServerFn(signedFile);
  const { data } = useQuery({
    queryKey: ['signed-file', path],
    queryFn: () => sign({ data: path }),
    enabled: !!path,
    staleTime: 4 * 60 * 1000,
  });
  return data || '';
}

async function squarePhoto(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const size = Math.min(side, 512);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.getContext('2d')?.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
  if (!blob) throw new Error('Foto tidak dapat diproses');
  return blob;
}

export function HeaderAvatar({ path, name }: { path: string; name: string }) {
  const url = useSignedPath(path);
  return (
    <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-accent font-semibold text-primary">
      {url ? <img src={url} alt="" className="size-full object-cover" /> : name.slice(0, 2).toUpperCase() || 'KO'}
    </span>
  );
}

export function ProfilePhoto({ userId, path }: { userId: string; path: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const url = useSignedPath(path);
  const save = useServerFn(saveRow);
  const qc = useQueryClient();
  const router = useRouter();

  async function refresh() {
    await qc.invalidateQueries();
    await router.invalidate();
  }

  async function onPick(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Gunakan foto JPG, PNG, atau WEBP');
      return;
    }
    setBusy(true);
    try {
      const blob = await squarePhoto(file);
      const newPath = `profiles/${userId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from('kochi-files').upload(newPath, blob, { contentType: 'image/jpeg' });
      if (error) throw new Error('Unggah foto gagal: ' + error.message);
      await save({ data: { table: 'profiles', id: userId, values: { avatar_path: newPath } } });
      if (path) void supabase.storage.from('kochi-files').remove([path]);
      toast.success('Foto profil diperbarui');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Foto belum tersimpan');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function onRemove() {
    setBusy(true);
    try {
      await save({ data: { table: 'profiles', id: userId, values: { avatar_path: null } } });
      if (path) void supabase.storage.from('kochi-files').remove([path]);
      toast.success('Foto profil dihapus');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Foto belum terhapus');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-44 shrink-0 flex-col items-center gap-3">
      <div className="relative size-44 overflow-hidden rounded-xl border bg-muted">
        {url
          ? <img src={url} alt="Foto profil" className="size-full object-cover" />
          : <div className="flex size-full items-center justify-center text-muted-foreground"><UserRound className="size-16" /></div>}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <LoaderCircle className="size-6 animate-spin" />
          </div>
        )}
      </div>
      <div className="flex w-full gap-2">
        <Button type="button" variant="outline" size="sm" className="flex-1" disabled={busy} onClick={() => inputRef.current?.click()}>
          <Camera className="size-4" />{path ? 'Ganti' : 'Unggah Foto'}
        </Button>
        {path && (
          <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" aria-label="Hapus foto" disabled={busy} onClick={() => void onRemove()}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      <p className="text-center text-[10px] text-muted-foreground">JPG, PNG, WEBP. Otomatis dipotong persegi.</p>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void onPick(e.target.files?.[0])} />
    </div>
  );
}