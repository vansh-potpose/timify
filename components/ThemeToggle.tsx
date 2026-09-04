'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="w-9 h-9 opacity-0">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark' || theme === 'dark';

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative w-9 h-9 rounded-full border-border/80 bg-background/80 hover:bg-accent hover:text-accent-foreground transition-all duration-300 shadow-sm"
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      aria-label="Toggle Theme"
    >
      <Sun className={`h-[1.2rem] w-[1.2rem] transition-all duration-300 text-amber-500 ${isDark ? 'rotate-90 scale-0 opacity-0 absolute' : 'rotate-0 scale-100 opacity-100'}`} />
      <Moon className={`h-[1.2rem] w-[1.2rem] transition-all duration-300 text-indigo-400 ${isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0 absolute'}`} />
    </Button>
  );
}
