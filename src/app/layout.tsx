import type { Metadata } from 'next';
import './globals.css';
import { ServerWarmup } from '@/components/patterns/server-warmup';

export const metadata: Metadata = {
  title: 'Prep Kit — turn a job description into an interview plan',
  description:
    'Paste a job description and a company website. Get a researched company brief, a role breakdown, a question bank, flashcards and a day-by-day study schedule you can reshape.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Skip link: the first tab stop on every page (§10.4 keyboard access). */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:border focus:border-border focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        <ServerWarmup>{children}</ServerWarmup>
      </body>
    </html>
  );
}
