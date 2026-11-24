/**
 * scripts/smoke/checks/base.js
 * Validaciones de infraestructura base: /health de todos los servicios,
 * verificación del API Gateway en Next.js, login y validación de 401 sin token.
 *
 * Mantenido por: Axl
 */

module.exports = {
  name: 'Base e Infraestructura',
  owner: 'Axl',
  run: async (ctx) => {
    const { urls } = ctx;

    // 1. Health checks de cada microservicio directo
    await ctx.test('ms-modulo1 /health responde 200 y status ok', async () => {
      const res = await ctx.get(`${urls.modulo1}/health`);
      ctx.assertEqual(res.status, 200, 'Código HTTP de /health en ms-modulo1');
      ctx.assert(res.data && res.data.status === 'ok', "Respuesta esperada: { status: 'ok' }");
    });

    await ctx.test('ms-modulo2 /health responde 200 y status ok', async () => {
      const res = await ctx.get(`${urls.modulo2}/health`);
      ctx.assertEqual(res.status, 200, 'Código HTTP de /health en ms-modulo2');
      ctx.assert(res.data && res.data.status === 'ok', "Respuesta esperada: { status: 'ok' }");
    });

    await ctx.test('ms-modulo3 /health responde 200 y status ok', async () => {
      const res = await ctx.get(`${urls.modulo3}/health`);
      ctx.assertEqual(res.status, 200, 'Código HTTP de /health en ms-modulo3');
      ctx.assert(res.data && res.data.status === 'ok', "Respuesta esperada: { status: 'ok' }");
    });

    await ctx.test('ms-modulo4 /health responde 200 y status ok', async () => {
      const res = await ctx.get(`${urls.modulo4}/health`);
      ctx.assertEqual(res.status, 200, 'Código HTTP de /health en ms-modulo4');
      ctx.assert(res.data && res.data.status === 'ok', "Respuesta esperada: { status: 'ok' }");
    });

    // 2. Health check de frontend / API Gateway (Next.js :3000)
    await ctx.test('apps/web responde en puerto 3000', async () => {
      const res = await ctx.get(urls.gateway);
      ctx.assert(res.status >= 200 && res.status < 400, `apps/web respondió con estado HTTP ${res.status}`);
    });

    // 3. Verificación de rewrites en el API Gateway (/api/m1..m4 -> :3001..3004)
    await ctx.test('Gateway rewrite /api/m1/health reenvía correctamente a ms-modulo1', async () => {
      const res = await ctx.get(`${urls.gateway}/api/m1/health`);
      ctx.assertEqual(res.status, 200, 'HTTP status de /api/m1/health vía Gateway');
      ctx.assert(res.data && res.data.status === 'ok', 'Gateway debe responder con payload de ms-modulo1');
    });

    // 4. Login con credenciales (según contrato ms-modulo1: POST /clientes/login)
    const loginUrl = process.env.AUTH_LOGIN_URL || `${urls.modulo1}/clientes/login`;
    const hasLoginRoute = await ctx.isReachable(`${urls.modulo1}/clientes`);

    if (hasLoginRoute) {
      await ctx.test('POST /clientes/login con credenciales válidas retorna cliente', async () => {
        const payload = {
          usuario: process.env.AUTH_USER || 'mquispe',
          password: process.env.AUTH_PASSWORD || 'Segura2026',
        };
        const res = await ctx.post(loginUrl, payload);
        if (res.status === 404) {
          ctx.skip('POST /clientes/login no implementado aún en ms-modulo1');
          return;
        }
        ctx.assert(res.status === 200 || res.status === 201, `Login falló con código ${res.status}`);
        ctx.assert(res.data && (res.data.id || res.data.token || res.data.access_token), 'Respuesta debe incluir datos de cliente o token');
      });
    } else {
      ctx.skip('POST /clientes/login con credenciales', 'ms-modulo1 aún no tiene /clientes activo o está offline');
    }

    // 5. 401 Unauthorized sin token
    const protectedUrl = process.env.AUTH_PROTECTED_URL || `${urls.gateway}/api/protected`;
    const hasProtected = await ctx.isReachable(protectedUrl);

    if (hasProtected) {
      await ctx.test('Petición a ruta protegida sin token retorna 401 Unauthorized', async () => {
        const res = await ctx.get(protectedUrl);
        ctx.assertEqual(res.status, 401, 'Debe denegar acceso sin Authorization Bearer');
      });
    } else {
      ctx.skip('Acceso a ruta protegida sin token retorna 401', 'Ruta protegida no configurada en este esqueleto');
    }
  },
};
