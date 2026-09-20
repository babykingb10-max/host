'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('This verification link is missing its token.');
      return;
    }
    authApi
      .verifyEmail(token)
      .then((result) => {
        if (result?.success) {
          setState('success');
        } else {
          setState('error');
          setMessage(result?.error?.message ?? 'This link may have expired.');
        }
      })
      .catch(() => {
        setState('error');
        setMessage('Something went wrong verifying your email.');
      });
  }, [token]);

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {state === 'loading' && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
          <h1 className="text-lg font-semibold">Verifying your email...</h1>
        </>
      )}

      {state === 'success' && (
        <>
          <CheckCircle2 className="h-10 w-10 text-success" aria-hidden />
          <h1 className="text-lg font-semibold">Email verified</h1>
          <p className="text-sm text-muted-foreground">Your account is ready to go.</p>
          <Link href="/dashboard" className={cn(buttonVariants({ size: 'sm' }), 'mt-2')}>
            Go to dashboard
          </Link>
        </>
      )}

      {state === 'error' && (
        <>
          <AlertTriangle className="h-10 w-10 text-warning" aria-hidden />
          <h1 className="text-lg font-semibold">Verification failed</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Link href="/login" className="text-sm font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
