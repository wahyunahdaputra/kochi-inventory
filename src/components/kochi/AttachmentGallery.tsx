import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { FileText, LoaderCircle, X } from 'lucide-react';
import { signedFile } from '@/lib/kochi/data.functions';
import { text, type Row } from '@/lib/kochi/shared';

function AttachmentItem({ file, onOpen }: { file: Row; onOpen: (url: string, name: string) => void }) {
  const sign = useServerFn(signedFile);
  const path = text(file['path']);
  const name = text(file['file_name']);
  const isImage = text(file['mime_type']).startsWith('image/');

  const { data: url, isLoading, isError } = useQuery({
    queryKey: ['signed-file', path],
    queryFn: () => sign({ data: path }),
    staleTime: 4 * 60 * 1000, // signed URL berlaku 5 menit
  });

  if (isLoading) {
    return <div className="flex h-28 w-28 items-center justify-center rounded-md border"><LoaderCircle className="size-5 animate-spin text-muted-foreground" /></div>;
  }
  if (isError || !url) {
    return <div className="flex h-28 w-28 items-center justify-center rounded-md border px-2 text-center text-[10px] text-destructive">Gagal memuat {name}</div>;
  }
  if (isImage) {
    return (
      <button type="button" onClick={() => onOpen(url, name)} className="group text-left">
        <img src={url} alt={name} loading="lazy" className="h-28 w-28 rounded-md border object-cover transition group-hover:opacity-80" />
        <span className="mt-1 block w-28 truncate text-[10px] text-muted-foreground">{name}</span>
      </button>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex h-28 w-28 flex-col items-center justify-center gap-2 rounded-md border p-2 text-center hover:bg-muted">
      <FileText className="size-7 text-muted-foreground" />
      <span className="line-clamp-2 break-all text-[10px]">{name}</span>
    </a>
  );
}

export function AttachmentGallery({ files, skipPath }: { files: Row[]; skipPath?: string }) {
  const [view, setView] = useState<{ url: string; name: string } | null>(null);
  const list = files.filter((f) => !skipPath || text(f['path']) !== skipPath);

  if (!list.length) return <p className="text-sm text-muted-foreground">Belum ada lampiran.</p>;

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {list.map((f) => (
          <AttachmentItem key={text(f['id']) || text(f['path'])} file={f} onOpen={(url, name) => setView({ url, name })} />
        ))}
      </div>

      {view && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={() => setView(null)}>
          <button type="button" aria-label="Tutup" className="absolute right-4 top-4 rounded-full bg-white/90 p-2" onClick={() => setView(null)}>
            <X className="size-5" />
          </button>
          <img src={view.url} alt={view.name} className="max-h-full max-w-full rounded-md object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}