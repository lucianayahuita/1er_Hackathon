// PostgreSQL real en BD exclusiva *_test; Clientes y Cuentas se simulan por HTTP.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { spawn } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const clave = 'clave-interna-exclusiva-de-pruebas';
const tokens = new Map();
function emitirToken(id) {
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: id })).toString('base64url')}.firma-de-prueba-${id}`;
  tokens.set(token, id);
  return token;
}
const adminToken = emitirToken(99);
const clienteToken = emitirToken(1);
const personas = new Map([1, 2, 99].map(id => [id, { id, activo: true, bloqueado: false, rol: id === 99 ? 'ADMIN' : 'CLIENTE' }]));
const ids = [];
const depositos = [];
let perderConfirmacion = false;
let clientesCaido = false;
let m1, m2, proceso;
let salida = '';
const base = `http://127.0.0.1:${process.env.TEST_PORT || 3105}`;

function json(res, codigo, body) { res.writeHead(codigo, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); }
async function escuchar(handler) {
  const server = createServer((req, res) => Promise.resolve(handler(req, res)).catch(error => json(res, 500, { message: error.message })));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
}
async function pedir(ruta, metodo = 'GET', body, token = adminToken) {
  const res = await fetch(base + ruta, {
    method: metodo, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000),
  });
  return { status: res.status, body: await res.json() };
}
async function solicitar(cambios = {}) {
  const res = await pedir('/prestamos', 'POST', { clienteId: 1, cuentaDesembolsoId: 1, monto: 3000, tasaAnual: 12, plazoMeses: 12, ...cambios });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  ids.push(res.body.id);
  return res.body;
}

before(async () => {
  assert(process.env.DATABASE_URL && new URL(process.env.DATABASE_URL).pathname.endsWith('_test'), 'Usar DATABASE_URL de una BD exclusiva con sufijo _test');
  await prisma.$connect();
  m1 = await escuchar((req, res) => {
    if (clientesCaido) return json(res, 503, { message: 'Servicio no disponible' });
    const id = Number(/^\/clientes\/(\d+)$/.exec(req.url)?.[1]);
    const persona = personas.get(id);
    if (!persona) return json(res, 404, {});
    if (req.headers['x-service-key'] === clave) return json(res, 200, persona);
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (tokens.get(token) !== id) return json(res, 401, {});
    if (!persona.activo || persona.bloqueado) return json(res, 403, {});
    return json(res, 200, persona);
  });
  m2 = await escuchar(async (req, res) => {
    const match = /^\/cuentas\/(\d+)(\/depositar)?$/.exec(req.url);
    const cuentaId = Number(match?.[1]);
    if (![1, 2].includes(cuentaId)) return json(res, 404, {});
    if (req.method === 'GET') return json(res, 200, { id: cuentaId, clienteId: cuentaId, activo: true });
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    const id = Number(body.descripcion.split('#')[1]);
    const persistido = await prisma.prestamo.findUniqueOrThrow({ where: { id } });
    assert.equal(persistido.estado, 'APROBADO', 'Debe existir una reserva durable antes del depósito');
    depositos.push({ cuentaId, ...body });
    if (perderConfirmacion) { perderConfirmacion = false; res.destroy(); return; }
    return json(res, 201, { cuenta: { id: cuentaId }, movimiento: { id: depositos.length } });
  });
  proceso = spawn(process.execPath, ['dist/main.js'], {
    cwd: require('node:path').resolve(__dirname, '..'), windowsHide: true,
    env: { ...process.env, PORT: process.env.TEST_PORT || '3105', MS_MODULO1_URL: `http://127.0.0.1:${m1.address().port}`, MS_MODULO2_URL: `http://127.0.0.1:${m2.address().port}`, INTERNAL_API_KEY: clave },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proceso.stdout.on('data', data => { salida += data; });
  proceso.stderr.on('data', data => { salida += data; });
  for (let i = 0; i < 100; i++) {
    if (proceso.exitCode !== null) throw new Error(salida);
    try { if ((await pedir('/health')).status === 200) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`El servicio no arrancó: ${salida}`);
});

after(async () => {
  try {
    await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS fallo_confirmacion_prueba ON "Prestamo"');
    await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS fallo_confirmacion_prueba()');
    if (ids.length) await prisma.prestamo.updateMany({ where: { id: { in: ids } }, data: { activo: false } });
  } finally {
    proceso?.kill();
    for (const server of [m1, m2]) { server?.closeAllConnections(); server?.close(); }
    await prisma.$disconnect();
  }
});

test('Préstamos: permisos, edición y desembolso seguro', async t => {
  let propio, ajeno;
  await t.test('exige Bearer y valida el token por HTTP sin usar la clave interna', async () => {
    assert.equal((await pedir('/prestamos', 'GET', undefined, '')).status, 401);
    assert.equal((await pedir('/prestamos', 'GET', undefined, clienteToken + 'falso')).status, 401);
    assert.equal((await pedir('/prestamos', 'GET', undefined, adminToken)).status, 200);
    personas.get(1).bloqueado = true;
    assert.equal((await pedir('/prestamos', 'GET', undefined, clienteToken)).status, 403);
    personas.get(1).bloqueado = false;
  });
  await t.test('crea y calcula la cuota francesa, incluyendo tasa cero', async () => {
    propio = await solicitar();
    ajeno = await solicitar({ clienteId: 2, cuentaDesembolsoId: 2, tasaAnual: 0 });
    assert.equal(Number(propio.cuotaMensual), 266.55);
    assert.equal(Number(ajeno.cuotaMensual), 250);
  });
  await t.test('CLIENTE solo consulta, solicita y edita sus propios préstamos', async () => {
    const lista = await pedir('/prestamos', 'GET', undefined, clienteToken);
    assert.equal(lista.status, 200);
    assert(lista.body.every(p => p.clienteId === 1));
    for (const ruta of ['/prestamos?clienteId=2', `/prestamos/${ajeno.id}`, '/prestamos/stats']) {
      assert.equal((await pedir(ruta, 'GET', undefined, clienteToken)).status, 403);
    }
    assert.equal((await pedir('/prestamos', 'POST', { clienteId: 2, cuentaDesembolsoId: 2, monto: 3000, plazoMeses: 12 }, clienteToken)).status, 403);
    assert.equal((await pedir(`/prestamos/${ajeno.id}`, 'PATCH', { monto: 4000 }, clienteToken)).status, 403);
    assert.equal((await pedir(`/prestamos/${ajeno.id}/baja`, 'PATCH', undefined, clienteToken)).status, 403);
    for (const accion of ['aprobar', 'rechazar']) {
      assert.equal((await pedir(`/prestamos/${propio.id}/${accion}`, 'PATCH', undefined, clienteToken)).status, 403);
    }
  });
  await t.test('PATCH parcial omite campos, recalcula cuota y rechaza nulos o campos internos', async () => {
    const res = await pedir(`/prestamos/${propio.id}`, 'PATCH', { monto: 2400 }, clienteToken);
    assert.equal(res.status, 200);
    assert.equal(Number(res.body.monto), 2400);
    assert.equal(Number(res.body.cuotaMensual), 213.24);
    for (const campo of ['monto', 'tasaAnual', 'plazoMeses', 'cuentaDesembolsoId']) {
      assert.equal((await pedir(`/prestamos/${propio.id}`, 'PATCH', { [campo]: null })).status, 400);
    }
    assert.equal((await pedir(`/prestamos/${propio.id}`, 'PATCH', { estado: 'DESEMBOLSADO' })).status, 400);
  });
  await t.test('revalida cliente activo antes de aprobar y no reserva ni deposita si está inactivo', async () => {
    const prestamo = await solicitar();
    const antes = depositos.length;
    personas.get(1).activo = false;
    try { assert.equal((await pedir(`/prestamos/${prestamo.id}/aprobar`, 'PATCH')).status, 400); }
    finally { personas.get(1).activo = true; }
    assert.equal(depositos.length, antes);
    assert.equal((await prisma.prestamo.findUniqueOrThrow({ where: { id: prestamo.id } })).estado, 'SOLICITADO');
  });
  await t.test('rechaza cuenta ajena y datos fuera de rango', async () => {
    assert.equal((await pedir('/prestamos', 'POST', { clienteId: 1, cuentaDesembolsoId: 2, monto: 3000, plazoMeses: 12 })).status, 400);
    assert.equal((await pedir('/prestamos', 'POST', { clienteId: 1, cuentaDesembolsoId: 1, monto: 500, plazoMeses: 3 })).status, 400);
  });
  await t.test('cinco aprobaciones concurrentes generan un solo depósito', async () => {
    const prestamo = await solicitar();
    const antes = depositos.length;
    const resultados = await Promise.all(Array.from({ length: 5 }, () => pedir(`/prestamos/${prestamo.id}/aprobar`, 'PATCH')));
    assert(resultados.some(r => r.status === 200));
    assert(resultados.every(r => [200, 409].includes(r.status)));
    assert.equal(depositos.length - antes, 1);
    assert.equal((await prisma.prestamo.findUniqueOrThrow({ where: { id: prestamo.id } })).estado, 'DESEMBOLSADO');
    assert.equal((await pedir(`/prestamos/${prestamo.id}/aprobar`, 'PATCH')).status, 200);
    assert.equal(depositos.length - antes, 1);
  });
  await t.test('respuesta perdida tras acreditar: conserva APROBADO y no repite el depósito', async () => {
    const prestamo = await solicitar();
    const antes = depositos.length;
    perderConfirmacion = true;
    assert.equal((await pedir(`/prestamos/${prestamo.id}/aprobar`, 'PATCH')).status, 503);
    assert.equal((await pedir(`/prestamos/${prestamo.id}/aprobar`, 'PATCH')).status, 409);
    assert.equal(depositos.length - antes, 1);
    assert.equal((await prisma.prestamo.findUniqueOrThrow({ where: { id: prestamo.id } })).estado, 'APROBADO');
    assert.equal((await pedir(`/prestamos/${prestamo.id}`, 'PATCH', { monto: 4000 })).status, 400);
    for (const accion of ['baja', 'rechazar']) assert.equal((await pedir(`/prestamos/${prestamo.id}/${accion}`, 'PATCH')).status, 400);
  });
  await t.test('fallo de BD después del depósito tampoco permite duplicar el desembolso', async () => {
    const prestamo = await solicitar();
    const antes = depositos.length;
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION fallo_confirmacion_prueba() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id = ${prestamo.id} AND NEW.estado = 'DESEMBOLSADO' THEN RAISE EXCEPTION 'Fallo simulado al confirmar'; END IF; RETURN NEW; END; $$`);
    await prisma.$executeRawUnsafe('CREATE TRIGGER fallo_confirmacion_prueba BEFORE UPDATE ON "Prestamo" FOR EACH ROW EXECUTE FUNCTION fallo_confirmacion_prueba()');
    try {
      assert.equal((await pedir(`/prestamos/${prestamo.id}/aprobar`, 'PATCH')).status, 503);
      assert.equal((await pedir(`/prestamos/${prestamo.id}/aprobar`, 'PATCH')).status, 409);
      assert.equal(depositos.length - antes, 1);
      assert.equal((await prisma.prestamo.findUniqueOrThrow({ where: { id: prestamo.id } })).estado, 'APROBADO');
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER fallo_confirmacion_prueba ON "Prestamo"');
      await prisma.$executeRawUnsafe('DROP FUNCTION fallo_confirmacion_prueba()');
    }
  });
  await t.test('aprobar contra editar/rechazar/baja conserva el estado y el monto acreditado', async () => {
    for (const accion of ['', '/rechazar', '/baja']) {
      const prestamo = await solicitar();
      const antes = depositos.length;
      const resultados = await Promise.all([
        pedir(`/prestamos/${prestamo.id}/aprobar`, 'PATCH'),
        pedir(`/prestamos/${prestamo.id}${accion}`, 'PATCH', accion ? undefined : { monto: 6000 }),
      ]);
      assert(resultados.every(r => [200, 400, 409].includes(r.status)));
      const persistido = await prisma.prestamo.findUniqueOrThrow({ where: { id: prestamo.id } });
      const nuevos = depositos.slice(antes);
      assert(nuevos.length <= 1);
      if (nuevos.length) {
        assert.equal(persistido.estado, 'DESEMBOLSADO');
        assert.equal(persistido.activo, true);
        assert.equal(Number(persistido.monto), nuevos[0].monto);
      }
    }
  });
  await t.test('la baja lógica conserva el préstamo y bloquea ediciones y aprobación', async () => {
    const prestamo = await solicitar();
    assert.equal((await pedir(`/prestamos/${prestamo.id}/baja`, 'PATCH', undefined, clienteToken)).status, 200);
    assert.equal((await prisma.prestamo.findUniqueOrThrow({ where: { id: prestamo.id } })).activo, false);
    assert.equal((await pedir(`/prestamos/${prestamo.id}`, 'PATCH', { monto: 5000 })).status, 400);
    assert.equal((await pedir(`/prestamos/${prestamo.id}/aprobar`, 'PATCH')).status, 400);
  });
  await t.test('Clientes no disponible produce 503 sin ejecutar operaciones', async () => {
    clientesCaido = true;
    try { assert.equal((await pedir('/prestamos')).status, 503); }
    finally { clientesCaido = false; }
  });
});
