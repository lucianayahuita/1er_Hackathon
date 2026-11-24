/**
 * scripts/smoke/checks/modulo2.js
 * Pruebas smoke para ms-modulo2.
 *
 * Mantenido por: Laura
 * Contrato: contracts/modulo2.md
 * Puerto: 3002 (directo) o /api/m2 (gateway)
 */

module.exports = {
  name: 'Módulo 2 - ms-modulo2',
  owner: 'Laura',
  run: async (ctx) => {
    const { urls } = ctx;
    const baseUrl = process.env.USE_GATEWAY ? `${urls.gateway}/api/m2` : urls.modulo2;
    const endpoint = process.env.M2_ENDPOINT || (await ctx.isReachable(`${baseUrl}/cuentas`) ? '/cuentas' : '/registros');

    let createdId = null;
    let serviceIsAlive = true;
    const testCode = `SMK-M2-${Date.now().toString().slice(-6)}`;

    // 1. Health check
    await ctx.test('ms-modulo2 está arriba y reporta health ok', async () => {
      try {
        const res = await ctx.get(`${baseUrl}/health`);
        ctx.assertEqual(res.status, 200, 'Código de estado');
        ctx.assert(res.data && res.data.status === 'ok', 'Debe responder con status: ok');
      } catch (err) {
        serviceIsAlive = false;
        throw err;
      }
    });

    function ensureService() {
      if (!serviceIsAlive) {
        ctx.skip(`Servicio ms-modulo2 no responde en ${baseUrl}`);
      }
    }

    // 2. Listar registros
    await ctx.test(`GET ${endpoint} lista registros existentes`, async () => {
      ensureService();
      const res = await ctx.get(`${baseUrl}${endpoint}`);
      ctx.assertEqual(res.status, 200, 'Código de estado');
      ctx.assert(Array.isArray(res.data), 'La respuesta debe ser una lista/array de registros');
    });

    // 3. Crear nuevo registro (Happy path)
    await ctx.test(`POST ${endpoint} crea un nuevo registro`, async () => {
      ensureService();
      const nuevo = {
        codigo: testCode,
        nombre: 'Prueba Smoke Modulo 2',
        categoria: 'Smoke',
        monto: 2500,
        fecha: '2026-11-24',
      };
      const res = await ctx.post(`${baseUrl}${endpoint}`, nuevo);
      ctx.assert(res.status === 201 || res.status === 200, `Código esperado 201/200, recibido: ${res.status}`);
      ctx.assert(res.data && res.data.id, 'El registro creado debe contener un id numérico');
      ctx.assertEqual(res.data.codigo, testCode, 'El código debe coincidir');
      createdId = res.data.id;
    });

    // 4. Validación de DTO (Error path)
    await ctx.test(`POST ${endpoint} rechaza datos inválidos con 400 Bad Request`, async () => {
      ensureService();
      const res = await ctx.post(`${baseUrl}${endpoint}`, {});
      ctx.assertEqual(res.status, 400, 'Debe rechazar DTO incompleto con 400');
    });

    // 5. Consultar por ID
    await ctx.test(`GET ${endpoint}/:id obtiene el registro creado`, async () => {
      ensureService();
      if (!createdId) {
        ctx.skip('No se ejecutó porque falló la creación previa');
      }
      const res = await ctx.get(`${baseUrl}${endpoint}/${createdId}`);
      ctx.assertEqual(res.status, 200, 'Código de estado');
      ctx.assertEqual(res.data.id, createdId, 'El id consultado debe coincidir');
    });

    // 6. Actualizar registro
    await ctx.test(`PATCH ${endpoint}/:id actualiza datos del registro`, async () => {
      ensureService();
      if (!createdId) {
        ctx.skip('No se ejecutó porque falló la creación previa');
      }
      const patchData = { nombre: 'Nombre Actualizado Smoke M2' };
      const res = await ctx.patch(`${baseUrl}${endpoint}/${createdId}`, patchData);
      ctx.assertEqual(res.status, 200, 'Código de estado');
      ctx.assertEqual(res.data.nombre, patchData.nombre, 'El nombre debe haberse actualizado');
    });

    // 7. Baja lógica
    await ctx.test(`PATCH ${endpoint}/:id/baja aplica baja lógica (activo: false)`, async () => {
      ensureService();
      if (!createdId) {
        ctx.skip('No se ejecutó porque falló la creación previa');
      }
      const res = await ctx.patch(`${baseUrl}${endpoint}/${createdId}/baja`);
      ctx.assertEqual(res.status, 200, 'Código de estado');
      ctx.assertEqual(res.data.activo, false, 'El campo activo debe ser false tras la baja lógica');
    });

    // 8. Estadísticas
    await ctx.test(`GET ${endpoint}/stats devuelve métricas`, async () => {
      ensureService();
      const res = await ctx.get(`${baseUrl}${endpoint}/stats`);
      ctx.assertEqual(res.status, 200, 'Código de estado');
      ctx.assert(res.data && typeof res.data.total === 'number', 'Debe contener campo total');
    });
  },
};
