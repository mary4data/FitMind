'use client';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="w-full px-6 py-4 flex items-center justify-between bg-transparent">
      <Link href="/" className="flex items-center gap-0.5 text-2xl font-display font-black tracking-tight select-none">
        <span className="text-[#1a1a2e]">Fit</span>
        <span style={{ color: 'var(--brand-purple)' }}>Mind</span>
      </Link>
      <Link
        href="/goals"
        className="rounded-full px-6 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
        style={{ backgroundColor: 'var(--brand-purple)' }}
      >
        Get Started
      </Link>
    </nav>
  );
}
