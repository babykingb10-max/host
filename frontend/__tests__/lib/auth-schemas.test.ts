import { loginSchema, registerSchema } from '@/lib/validation/auth-schemas';

describe('loginSchema', () => {
  it('accepts a valid login payload', () => {
    const result = loginSchema.safeParse({ identifier: 'someone', password: 'x' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty identifier', () => {
    const result = loginSchema.safeParse({ identifier: '', password: 'x' });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  const validBase = {
    displayName: 'Jane Doe',
    username: 'jane_doe',
    email: 'jane@example.com',
    password: 'Passw0rd!',
    confirmPassword: 'Passw0rd!',
    acceptedTerms: true as const,
  };

  it('accepts a fully valid registration payload', () => {
    expect(registerSchema.safeParse(validBase).success).toBe(true);
  });

  it('rejects a password without a number', () => {
    const result = registerSchema.safeParse({ ...validBase, password: 'NoNumbers!', confirmPassword: 'NoNumbers!' });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched password confirmation', () => {
    const result = registerSchema.safeParse({ ...validBase, confirmPassword: 'Different1' });
    expect(result.success).toBe(false);
  });

  it('rejects a username with invalid characters', () => {
    const result = registerSchema.safeParse({ ...validBase, username: 'not a valid username!' });
    expect(result.success).toBe(false);
  });

  it('requires terms to be accepted', () => {
    const result = registerSchema.safeParse({ ...validBase, acceptedTerms: false });
    expect(result.success).toBe(false);
  });
});
