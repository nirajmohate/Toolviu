import Link from 'next/link';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-shell items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Home" className="rounded-md">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          <Link href="/#tools" className="rounded-md px-3 py-2 text-muted transition-colors hover:bg-sunken hover:text-ink">
            All tools
          </Link>
          <Link href="/about" className="hidden rounded-md px-3 py-2 text-muted transition-colors hover:bg-sunken hover:text-ink sm:block">
            About
          </Link>
          <Link href="/contact" className="hidden rounded-md px-3 py-2 text-muted transition-colors hover:bg-sunken hover:text-ink sm:block">
            Contact
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
