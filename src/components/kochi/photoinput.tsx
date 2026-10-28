import { useEffect, useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  label: string;
  accept: string;
  onChange: (files: File[]) => void;
  maxMB?: number;
};

async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= 1.5 * 1024 * 1024) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.8));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
}

export function PhotoInput({ label, accept, onChange, maxMB = 5 }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [items, setItems] = useState<{ file: File; url: string }[]>([]);
  const [webcam, setWebcam] = useState(false);
  const [error, setError] = useState('');
  const allowImage = accept.includes('image/');

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);
  useEffect(() => () => items.forEach((i) => i.url && URL.revokeObjectURL(i.url)), []); // eslint-disable-line

  useEffect(() => {
    if (webcam && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play();
    }
  }, [webcam]);

  async function add(list: File[]) {
    setError('');
    const next = [...items];
    for (const f of list) {
      const small = await shrink(f);
      if (small.size > maxMB * 1024 * 1024) { setError(`${f.name} melebihi ${maxMB} MB`); continue; }
      next.push({ file: small, url: small.type.startsWith('image/') ? URL.createObjectURL(small) : '' });
    }
    setItems(next);
    onChange(next.map((i) => i.file));
  }

  function remove(index: number) {
    const target = items[index];
    if (target?.url) URL.revokeObjectURL(target.url);
    const next = items.filter((_, n) => n !== index);
    setItems(next);
    onChange(next.map((i) => i.file));
  }

  async function openCamera() {
    setError('');
    if (/Android|iPhone|iPad/i.test(navigator.userAgent)) { camRef.current?.click(); return; }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });
      setWebcam(true);
    } catch {
      setError('Kamera tidak bisa diakses. Izinkan kamera di browser atau gunakan Upload File.');
    }
  }

  function closeWebcam() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setWebcam(false);
  }

  function snap() {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    c.toBlob((b) => {
      if (b) void add([new File([b], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' })]);
      closeWebcam();
    }, 'image/jpeg', 0.85);
  }

  return (
    <div className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">
      <p className="mb-3">{label}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {allowImage && (
          <Button type="button" variant="outline" size="sm" onClick={() => void openCamera()}>
            <Camera className="size-4" />Ambil Foto
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" />Upload File
        </Button>
      </div>

      {items.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {items.map((it, i) => (
            <div key={it.url || it.file.name + i} className="relative">
              {it.url
                ? <img src={it.url} alt={it.file.name} className="h-24 rounded-md object-cover" />
                : <div className="flex h-24 w-24 items-center justify-center rounded-md border px-1 text-[10px] break-all">{it.file.name}</div>}
              <button type="button" aria-label="Hapus file" onClick={() => remove(i)}
                className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white">
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs">JPG, PNG, WEBP{accept.includes('pdf') ? ', PDF' : ''} · Maks. {maxMB} MB per file</p>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}

      <input ref={fileRef} type="file" multiple accept={accept} className="hidden"
        onChange={(e) => { void add(Array.from(e.target.files || [])); e.target.value = ''; }} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { void add(Array.from(e.target.files || [])); e.target.value = ''; }} />

      {webcam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-4">
            <video ref={videoRef} className="w-full rounded-md bg-black" playsInline muted />
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeWebcam}>Batal</Button>
              <Button type="button" onClick={snap}>Ambil</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}