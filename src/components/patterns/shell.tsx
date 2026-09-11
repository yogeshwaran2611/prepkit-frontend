'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Button, Logo, Badge, cx } from '../ui';
import { 
  FolderGit2, 
  PlusCircle, 
  LogOut, 
  User, 
  ChevronDown, 
  ExternalLink, 
  Sparkles,
  Layers,
  Menu,
  X
} from 'lucide-react';

/** Modern App chrome with persistent responsive Navbar & Profile Avatar Dropdown */
export function AppShell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void api
      .me()
      .then((u) => setEmail(u.email))
      .catch(() => router.replace('/login'));
  }, [router]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    void api.logout().finally(() => {
      window.location.assign('/login');
    });
  };

  // Generate clean initial avatar from email
  const userInitial = email ? email.charAt(0).toUpperCase() : 'U';

  const navLinks = [
    { href: '/kits', label: 'All Kits', icon: <FolderGit2 className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-md transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          
          {/* Brand and primary navigation */}
          <div className="flex items-center gap-6 sm:gap-8">
            <Link href="/kits" className="group flex items-center gap-2.5 font-bold text-fg tracking-tight">
              <Logo size="sm" />
              <div className="flex flex-col">
                <span className="text-base font-extrabold text-fg tracking-tight flex items-center gap-1.5">
                  PrepKit <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-semibold">AI</span>
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cx(
                      'flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition duration-fast',
                      isActive
                        ? 'bg-surface-muted text-accent font-bold'
                        : 'text-fg-muted hover:bg-surface-muted/60 hover:text-fg'
                    )}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right section: Actions & Profile Menu */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {right}

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                className={cx(
                  'flex items-center gap-2 rounded-full p-1 sm:px-2 sm:py-1 border transition duration-fast',
                  profileOpen 
                    ? 'border-accent bg-surface-muted shadow-sm' 
                    : 'border-border bg-surface hover:border-fg-subtle/50 hover:bg-surface-muted'
                )}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-accent-fg text-xs font-bold shadow-sm">
                  {userInitial}
                </span>
                <span className="hidden sm:inline-block max-w-[130px] truncate text-xs font-medium text-fg text-left">
                  {email ? email.split('@')[0] : 'Account'}
                </span>
                <ChevronDown className={cx('h-3.5 w-3.5 text-fg-subtle transition-transform duration-fast', profileOpen && 'rotate-180')} />
              </button>

              {/* Dropdown Menu Modal */}
              {profileOpen && (
                <div 
                  role="menu"
                  className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-surface p-2 shadow-lg animate-scale-in z-50 text-left"
                >
                  <div className="px-3 py-2.5 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-fg text-sm font-bold">
                        {userInitial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-fg truncate">{email}</p>
                        <p className="text-[11px] text-fg-subtle flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-success inline-block"></span> Active Session
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/kits"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-fg hover:bg-surface-muted transition"
                    >
                      <FolderGit2 className="h-4 w-4 text-accent" />
                      <span>My Kits</span>
                    </Link>
                    <Link
                      href="/kits/new"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-fg hover:bg-surface-muted transition"
                    >
                      <PlusCircle className="h-4 w-4 text-accent" />
                      <span>Create New Kit</span>
                    </Link>
                  </div>

                  <div className="border-t border-border/60 pt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-danger hover:bg-danger-muted transition text-left"
                    >
                      <LogOut className="h-4 w-4 text-danger" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile hamburger menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="md:hidden p-2 rounded-lg border border-border text-fg-muted hover:text-fg hover:bg-surface-muted transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-surface px-4 py-3 space-y-2 animate-fade-down">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-fg hover:bg-surface-muted"
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        )}
      </header>

      <main id="main" className="mx-auto max-w-7xl w-full px-4 py-8 sm:px-8 flex-1">
        {children}
      </main>

      {/* Modern subtle footer */}
      <footer className="mt-auto border-t border-border bg-surface py-5 text-center text-xs text-fg-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 flex flex-wrap items-center justify-between gap-3">
          <span className="font-medium text-fg-muted">PrepKit — Autonomous Interview Preparation</span>
          <span className="text-fg-subtle">Spaced repetition & requirements-driven prep</span>
        </div>
      </footer>
    </div>
  );
}

