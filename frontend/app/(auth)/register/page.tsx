'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { registerSchema, type RegisterFormValues } from '@/lib/validation/auth-schemas';
import { FormField } from '@/components/forms/form-field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/api-error';

function RegisterForm() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref') ?? undefined;
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerUser({
        displayName: values.displayName,
        username: values.username,
        email: values.email,
        password: values.password,
        referralCode,
      });
      router.replace('/dashboard');
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <div>
      <h1 className="text-lg font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Start hosting in minutes — no credit card required.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <FormField label="Full name" htmlFor="displayName" error={errors.displayName?.message}>
          <Input id="displayName" autoComplete="name" invalid={Boolean(errors.displayName)} {...register('displayName')} />
        </FormField>

        <FormField label="Username" htmlFor="username" error={errors.username?.message}>
          <Input id="username" autoComplete="username" invalid={Boolean(errors.username)} {...register('username')} />
        </FormField>

        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" invalid={Boolean(errors.email)} {...register('email')} />
        </FormField>

        <FormField label="Password" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="new-password" invalid={Boolean(errors.password)} {...register('password')} />
        </FormField>

        <FormField label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <Input id="confirmPassword" type="password" autoComplete="new-password" invalid={Boolean(errors.confirmPassword)} {...register('confirmPassword')} />
        </FormField>

        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input type="checkbox" className="mt-0.5" {...register('acceptedTerms')} />
          I agree to the Terms of Service and Privacy Policy.
        </label>
        {errors.acceptedTerms && <p className="text-xs text-danger">{errors.acceptedTerms.message}</p>}

        {serverError && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {serverError}
          </p>
        )}

        <Button type="submit" className="w-full" loading={isSubmitting} disabled={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
