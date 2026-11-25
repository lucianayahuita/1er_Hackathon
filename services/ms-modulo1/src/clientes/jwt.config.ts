import { JwtModuleOptions } from '@nestjs/jwt';

export function vigenciaToken(): number {
  const segundos = Number(process.env.JWT_TTL_SECONDS ?? 3600);
  if (!Number.isInteger(segundos) || segundos < 60 || segundos > 86400) {
    throw new Error('JWT_TTL_SECONDS debe ser un entero entre 60 y 86400');
  }
  return segundos;
}

export function configurarJwt(): JwtModuleOptions {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('Configura JWT_SECRET con al menos 32 bytes antes de iniciar Clientes');
  }
  return {
    secret,
    signOptions: {
      algorithm: 'HS256', expiresIn: vigenciaToken(),
      issuer: 'chuno-clientes', audience: 'chuno-banca',
    },
    verifyOptions: {
      algorithms: ['HS256'], issuer: 'chuno-clientes', audience: 'chuno-banca',
    },
  };
}
