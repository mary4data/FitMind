'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/goals');
  }, [user, loading, router]);

  async function signInWithGoogle() {
    setSigningIn(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.replace('/goals');
    } catch (e: unknown) {
      setError((e as Error).message || 'Sign-in failed');
      setSigningIn(false);
    }
  }

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--brand-bg-warm)' }}>
      <div className="bg-white rounded-3xl shadow-xl p-10 flex flex-col items-center gap-6 w-full max-w-sm">
        {/* Logo */}
        <div className="text-3xl font-display font-black tracking-tight select-none">
          <span className="text-[#1a1a2e]">Fit</span>
          <span style={{ color: 'var(--brand-purple)' }}>Mind</span>
        </div>

        <p className="text-gray-500 text-sm text-center">
          Sign in to save your fitness goals and track your progress
        </p>

        <button
          onClick={signInWithGoogle}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-full py-3 px-6 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {signingIn ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && <p className="text-red-500 text-xs text-center">{error}</p>}

        <p className="text-xs text-gray-400 text-center">
          Your data is stored securely in Firebase and never shared.
        </p>
      </div>
    </div>
  );
}
