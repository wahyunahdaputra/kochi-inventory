import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

function apply(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
  document.documentElement.style.colorScheme = t;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const dark = theme === 'dark';

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem('kochi-theme'); } catch {}
    const t: Theme = saved === 'dark' || saved === 'light'
      ? saved
      : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(t);
    apply(t);
  }, []);

  function toggle() {
    const next: Theme = dark ? 'light' : 'dark';
    setTheme(next);
    apply(next);
    try { localStorage.setItem('kochi-theme', next); } catch {}
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      title={dark ? 'Mode gelap aktif' : 'Mode terang aktif'}
      onClick={toggle}
      className="relative inline-flex h-8 w-16 shrink-0 items-center rounded-full border border-border bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Sun className="absolute left-2 size-3.5 text-muted-foreground" />
      <Moon className="absolute right-2 size-3.5 text-muted-foreground" />
      <span
        className={`absolute left-0.5 top-0.5 flex size-6 items-center justify-center rounded-full bg-card shadow transition-transform duration-200 ${dark ? 'translate-x-[34px]' : 'translate-x-0'}`}
      >
        {dark ? <Moon className="size-3.5 text-primary" /> : <Sun className="size-3.5 text-primary" />}
      </span>
    </button>
  );
}