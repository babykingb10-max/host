'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/lib/validation/auth-schemas';
import { FormField } from '@/components/forms/form-field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <AlertTriangle className="h-10 w-10 text-warning" aria-hidden />
        <h1 className="text-lg font-semibold">Invalid reset link</h1>
        <p className="text-sm text-muted-foreground">This password reset link is missing its token.</p>
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setServerError(null);
    const result = await authApi.resetPassword(token, values.newPassword);
    if (result?.success) {
      setStatus('success');
      setTimeout(() => router.replace('/login'), 2000);
    } else {
      setStatus('error');
      setServerError(result?.error?.message ?? 'This link may have expired. Please request a new one.');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="h-10 w-10 text-success" aria-hidden />
        <h1 className="text-lg font-semibold">Password reset</h1>
        <p className="text-sm text-muted-foreground">Redirecting you to sign in...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold">Set a new password</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <FormField label="New password" htmlFor="newPassword" error={errors.newPassword?.message}>
          <Input id="newPassword" type="password" autoComplete="new-password" invalid={Boolean(errors.newPassword)} {...register('newPassword')} />
        </FormField>

        <FormField label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <Input id="confirmPassword" type="password" autoComplete="new-password" invalid={Boolean(errors.confirmPassword)} {...register('confirmPassword')} />
        </FormField>

        {serverError && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {serverError}
          </p>
        )}

        <Button type="submit" className="w-full" loading={isSubmitting} disabled={isSubmitting}>
          Reset password
        </Button>
      </form>
    </div>
  );
}
