import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashearPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verificarPassword(password: string, passwordHash: string): boolean {
  const [salt, hash] = passwordHash.split(':');
  if (!salt || !hash || !/^[a-f0-9]{128}$/i.test(hash)) return false;
  return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(password, salt, 64));
}
