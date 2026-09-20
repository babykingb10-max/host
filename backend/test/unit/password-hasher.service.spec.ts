import { PasswordHasherService } from '../../apps/api/src/auth/password-hasher.service';

describe('PasswordHasherService', () => {
  const service = new PasswordHasherService();

  it('hashes and verifies a correct password', async () => {
    const hash = await service.hash('Sup3rSecret!');
    expect(hash).not.toBe('Sup3rSecret!');
    await expect(service.verify(hash, 'Sup3rSecret!')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('Sup3rSecret!');
    await expect(service.verify(hash, 'WrongPassword1')).resolves.toBe(false);
  });

  it('never returns the plaintext as the hash', async () => {
    const hash = await service.hash('AnotherOne99');
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });
});
