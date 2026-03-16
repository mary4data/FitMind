'use client';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from './AuthProvider';

export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="w-full px-6 py-4 flex items-center justify-between bg-transparent">
      <Link href="/" className="flex items-center gap-0.5 text-2xl font-display font-black tracking-tight select-none">
        <span className="text-[#1a1a2e]">Fit</span>
        <span style={{ color: 'var(--brand-purple)' }}>Mind</span>
      </Link>

      {user ? (
        <div className="flex items-center gap-3">
          {user.photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full" />
          )}
          <span className="text-sm text-gray-600 hidden sm:block">{user.displayName}</span>
          <button
            onClick={() => signOut(auth)}
            className="rounded-full px-4 py-2 text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      ) : (
        <Link
          href="/login"
          className="rounded-full px-6 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
          style={{ backgroundColor: 'var(--brand-purple)' }}
        >
          Get Started
        </Link>
      )}
    </nav>
  );
}
