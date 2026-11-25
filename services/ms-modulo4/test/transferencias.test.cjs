// Pruebas automatizadas de ms-modulo4 (Transferencias) usando node:test y un mock HTTP aislado de ms-modulo2.
// Requiere: npm run build, migraciones aplicadas en db_modulo4 y seed de bancos ejecutado.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const testPort = process.env.TEST_PORT || '3104';
const baseUrl = `http://127.0.0.1:${testPort}`;
const runTag = randomUUID().slice(0, 8);
const createdTransferIds = [];

let mockM2Server;
let mockM2Port;
let msProcess;
let msLogs = '';

// Estado en memoria del mock de ms-modulo2 para verificar saldos y fallos simulados
let mockCuentas = new Map();
let failMode = null; // null | 'DOWN_ON_DEPOSIT_DEST' | 'UNAVAILABLE'

function resetMockCuentas() {
  failMode = null;
  mockCuentas = new Map([
    [1, { id: 1, numero: '1000000001', clienteId: 1, moneda: 'BOB', saldo: 5000, activo: true }],
    [2, { id: 2, numero: '1000000002', clienteId: 1, moneda: 'BOB', saldo: 1000, activo: true }],
    [3, { id: 3, numero: '1000000003', clienteId: 2, moneda: 'BOB', saldo: 2000, activo: true }],
    [4, { id: 4, numero: '1000000004', clienteId: 3, moneda: 'BOB', saldo: 500, activo: false }],
  ]);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function startMockModulo2() {
  const server = http.createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    if (failMode === 'UNAVAILABLE') {
      res.destroy();
      return;
    }

    const url = req.url || '';
    if (req.method === 'GET' && /^\/cuentas\/\d+$/.test(url)) {
      const id = Number(url.split('/')[2]);
      const cuenta = mockCuentas.get(id);
      if (!cuenta) return send(404, { statusCode: 404, message: `Cuenta ${id} no existe` });
      return send(200, cuenta);
    }

    if (req.method === 'GET' && url.startsWith('/cuentas/numero/')) {
      const numero = decodeURIComponent(url.replace('/cuentas/numero/', ''));
      const cuenta = [...mockCuentas.values()].find((c) => c.numero === numero);
      if (!cuenta) return send(404, { statusCode: 404, message: `La cuenta ${numero} no existe` });
      return send(200, cuenta);
    }

    if (req.method === 'POST' && /^\/cuentas\/\d+\/extraer$/.test(url)) {
      const id = Number(url.split('/')[2]);
      const body = await readJsonBody(req);
      const cuenta = mockCuentas.get(id);
      if (!cuenta) return send(404, { statusCode: 404, message: `Cuenta ${id} no existe` });
      if (!cuenta.activo) return send(400, { statusCode: 400, message: 'La cuenta está inactiva' });
      if (Number(body.monto) <= 0) return send(400, { statusCode: 400, message: 'El monto debe ser mayor a 0' });
      if (Number(body.monto) > cuenta.saldo) return send(400, { statusCode: 400, message: 'Saldo insuficiente' });
      cuenta.saldo = Number((cuenta.saldo - Number(body.monto)).toFixed(2));
      return send(201, { cuenta, movimiento: { id: Date.now(), tipo: 'RETIRO', monto: body.monto } });
    }

    if (req.method === 'POST' && /^\/cuentas\/\d+\/depositar$/.test(url)) {
      const id = Number(url.split('/')[2]);
      const body = await readJsonBody(req);
      if (failMode === 'DOWN_ON_DEPOSIT_DEST' && id === 3) {
        return send(500, { statusCode: 500, message: 'Error simulado en acreditación destino' });
      }
      const cuenta = mockCuentas.get(id);
      if (!cuenta) return send(404, { statusCode: 404, message: `Cuenta ${id} no existe` });
      if (!cuenta.activo) return send(400, { statusCode: 400, message: 'La cuenta está inactiva' });
      cuenta.saldo = Number((cuenta.saldo + Number(body.monto)).toFixed(2));
      return send(201, { cuenta, movimiento: { id: Date.now(), tipo: 'DEPOSITO', monto: body.monto } });
    }

    return send(404, { statusCode: 404, message: 'Not Found' });
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function waitForHealth() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return await res.json();
    } catch {
      // esperar arranque
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timeout esperando ms-modulo4 en ${baseUrl}. Logs:\n${msLogs}`);
}

async function api(method, urlPath, body, headers = {}) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    // plain text
  }
  return { status: res.status, data };
}

before(async () => {
  assert(process.env.DATABASE_URL, 'DATABASE_URL requerida para pruebas');
  resetMockCuentas();
  const mock = await startMockModulo2();
  mockM2Server = mock.server;
  mockM2Port = mock.port;

  msProcess = spawn('node', ['dist/main.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      PORT: testPort,
      MS_MODULO2_URL: `http://127.0.0.1:${mockM2Port}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  msProcess.stdout.on('data', (d) => (msLogs += d.toString()));
  msProcess.stderr.on('data', (d) => (msLogs += d.toString()));

  await prisma.$connect();
  await waitForHealth();
});

after(async () => {
  if (createdTransferIds.length > 0) {
    await prisma.transferencia.deleteMany({ where: { id: { in: createdTransferIds } } });
  }
  await prisma.transferencia.deleteMany({ where: { glosa: { contains: runTag } } });
  await prisma.$disconnect();
  if (msProcess) msProcess.kill('SIGTERM');
  if (mockM2Server) mockM2Server.close();
});

test('GET /health y GET /docs-json responden correctamente', async () => {
  const health = await api('GET', '/health');
  assert.equal(health.status, 200);
  assert.equal(health.data.status, 'ok');
  assert.equal(health.data.service, 'ms-modulo4');

  const docs = await api('GET', '/docs-json');
  assert.equal(docs.status, 200);
  assert.ok(docs.data.paths['/bancos']);
  assert.ok(docs.data.paths['/transferencias']);
  assert.ok(docs.data.paths['/transferencias/stats']);
  assert.ok(docs.data.paths['/transferencias/{id}']);
});

test('GET /bancos devuelve los 5 bancos seedeados', async () => {
  const res = await api('GET', '/bancos');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data));
  assert.ok(res.data.length >= 5);
  const codigos = res.data.map((b) => b.codigo);
  for (const esperado of ['BNB', 'BCP', 'BUNION', 'BMSC', 'BISA']) {
    assert.ok(codigos.includes(esperado), `Falta banco ${esperado}`);
  }
});

test('Transferencia PROPIA válida actualiza saldos y persiste COMPLETADA', async () => {
  resetMockCuentas();
  const res = await api('POST', '/transferencias', {
    tipo: 'PROPIA',
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: '1000000002',
    monto: 400,
    glosa: `Propia ${runTag}`,
  });
  assert.equal(res.status, 201);
  assert.equal(res.data.estado, 'COMPLETADA');
  assert.equal(res.data.tipo, 'PROPIA');
  assert.equal(Number(res.data.monto), 400);
  assert.equal(mockCuentas.get(1).saldo, 4600);
  assert.equal(mockCuentas.get(2).saldo, 1400);
  createdTransferIds.push(res.data.id);
});

test('Transferencia a TERCERO válida actualiza saldos y persiste COMPLETADA', async () => {
  resetMockCuentas();
  const res = await api('POST', '/transferencias', {
    tipo: 'TERCERO',
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: '1000000003',
    monto: 750.25,
    glosa: `Tercero ${runTag}`,
  });
  assert.equal(res.status, 201);
  assert.equal(res.data.estado, 'COMPLETADA');
  assert.equal(res.data.tipo, 'TERCERO');
  assert.equal(mockCuentas.get(1).saldo, 4249.75);
  assert.equal(mockCuentas.get(3).saldo, 2750.25);
  createdTransferIds.push(res.data.id);
});

test('Transferencia INTERBANCARIA válida debita origen, no acredita localmente y genera codigoAch', async () => {
  resetMockCuentas();
  const res = await api('POST', '/transferencias', {
    tipo: 'INTERBANCARIA',
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: '201-5544332',
    bancoDestino: 'BNB',
    titularDestino: 'Carlos Mendoza',
    monto: 1200,
    glosa: `Interbancaria ${runTag}`,
  });
  assert.equal(res.status, 201);
  assert.equal(res.data.estado, 'COMPLETADA');
  assert.match(res.data.codigoAch, /^ACH-\d{6,}$/);
  assert.equal(res.data.bancoDestino, 'BNB');
  assert.equal(mockCuentas.get(1).saldo, 3800);
  createdTransferIds.push(res.data.id);
});

test('Saldo insuficiente devuelve 400, guarda RECHAZADA y mantiene saldos', async () => {
  resetMockCuentas();
  const res = await api('POST', '/transferencias', {
    tipo: 'TERCERO',
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: '1000000003',
    monto: 99999,
    glosa: `SinFondos ${runTag}`,
  });
  assert.equal(res.status, 400);
  assert.equal(res.data.message, 'Saldo insuficiente');
  assert.equal(mockCuentas.get(1).saldo, 5000);
  assert.equal(mockCuentas.get(3).saldo, 2000);

  const guardada = await prisma.transferencia.findFirst({
    where: { glosa: `SinFondos ${runTag}` },
  });
  assert.ok(guardada);
  assert.equal(guardada.estado, 'RECHAZADA');
  createdTransferIds.push(guardada.id);
});

test('Cuenta origen o destino inexistente devuelve 400', async () => {
  resetMockCuentas();
  const orig = await api('POST', '/transferencias', {
    tipo: 'PROPIA',
    clienteId: 1,
    cuentaOrigenId: 9999,
    cuentaDestinoNumero: '1000000002',
    monto: 100,
    glosa: `OrigInex ${runTag}`,
  });
  assert.equal(orig.status, 400);
  assert.equal(orig.data.message, 'La cuenta origen no existe');

  const dest = await api('POST', '/transferencias', {
    tipo: 'TERCERO',
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: '9999999999',
    monto: 100,
    glosa: `DestInex ${runTag}`,
  });
  assert.equal(dest.status, 400);
  assert.equal(dest.data.message, 'La cuenta destino no existe');
});

test('Monto cero o negativo es rechazado con 400', async () => {
  resetMockCuentas();
  const cero = await api('POST', '/transferencias', {
    tipo: 'PROPIA',
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: '1000000002',
    monto: 0,
    glosa: `Cero ${runTag}`,
  });
  assert.equal(cero.status, 400);
  assert.equal(cero.data.message, 'El monto debe ser mayor a 0');

  const neg = await api('POST', '/transferencias', {
    tipo: 'PROPIA',
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: '1000000002',
    monto: -50,
    glosa: `Neg ${runTag}`,
  });
  assert.equal(neg.status, 400);
  assert.equal(neg.data.message, 'El monto debe ser mayor a 0');
});

test('Límite interbancario > Bs 50.000 es rechazado con mensaje del contrato', async () => {
  resetMockCuentas();
  const res = await api('POST', '/transferencias', {
    tipo: 'INTERBANCARIA',
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: '201-5544332',
    bancoDestino: 'BNB',
    titularDestino: 'Carlos Mendoza',
    monto: 50000.01,
    glosa: `Limite ${runTag}`,
  });
  assert.equal(res.status, 400);
  assert.equal(res.data.message, 'El monto supera el límite interbancario de Bs 50.000');
});

test('Errores de validación y reglas de negocio por tipo/pertenencia/misma cuenta', async () => {
  resetMockCuentas();

  const mismaCuenta = await api('POST', '/transferencias', {
    tipo: 'PROPIA',
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: '1000000001',
    monto: 100,
    glosa: `Misma ${runTag}`,
  });
  assert.equal(mismaCuenta.status, 400);
  assert.equal(mismaCuenta.data.message, 'La cuenta origen y destino no pueden ser la misma');

  const noPertenece = await api('POST', '/transferencias', {
    tipo: 'TERCERO',
    clienteId: 2,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: '1000000003',
    monto: 100,
    glosa: `Ajena ${runTag}`,
  });
  assert.equal(noPertenece.status, 400);
  assert.equal(noPertenece.data.message, 'La cuenta origen no pertenece al cliente');

  const propiaAjena = await api('POST', '/transferencias', {
    tipo: 'PROPIA',
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: '1000000003',
    monto: 100,
    glosa: `PropiaAjena ${runTag}`,
  });
  assert.equal(propiaAjena.status, 400);

  const dtoInvalido = await api('POST', '/transferencias', {
    tipo: 'INVALIDA',
    clienteId: 0,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: '',
    monto: 100,
    glosa: '',
  });
  assert.equal(dtoInvalido.status, 400);
});

test('Transferencia duplicada es rechazada con 409 sin duplicar débitos', async () => {
  resetMockCuentas();
  const key = `idem-${runTag}-1`;
  const payload = {
    tipo: 'PROPIA',
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: '1000000002',
    monto: 125,
    glosa: `Duplicado ${runTag}`,
  };

  const first = await api('POST', '/transferencias', payload, { 'Idempotency-Key': key });
  assert.equal(first.status, 201);
  createdTransferIds.push(first.data.id);

  const dupByKey = await api('POST', '/transferencias', payload, { 'Idempotency-Key': key });
  assert.equal(dupByKey.status, 409);

  const dupByWindow = await api('POST', '/transferencias', payload);
  assert.equal(dupByWindow.status, 409);

  assert.equal(mockCuentas.get(1).saldo, 4875);
  assert.equal(mockCuentas.get(2).saldo, 1125);
});

test('Fallo al acreditar destino revierte débito en origen y deja transferencia RECHAZADA', async () => {
  resetMockCuentas();
  failMode = 'DOWN_ON_DEPOSIT_DEST';

  const res = await api('POST', '/transferencias', {
    tipo: 'TERCERO',
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: '1000000003',
    monto: 300,
    glosa: `FalloDest ${runTag}`,
  });
  assert.equal(res.status, 503);
  // El débito en origen fue revertido y el destino no recibió abono
  assert.equal(mockCuentas.get(1).saldo, 5000);
  assert.equal(mockCuentas.get(3).saldo, 2000);

  const guardada = await prisma.transferencia.findFirst({
    where: { glosa: `FalloDest ${runTag}` },
  });
  assert.ok(guardada);
  assert.equal(guardada.estado, 'RECHAZADA');
  createdTransferIds.push(guardada.id);
});

test('Fallo de comunicación con ms-modulo2 devuelve 503', async () => {
  resetMockCuentas();
  failMode = 'UNAVAILABLE';
  const res = await api('POST', '/transferencias', {
    tipo: 'PROPIA',
    clienteId: 1,
    cuentaOrigenId: 1,
    cuentaDestinoNumero: '1000000002',
    monto: 50,
    glosa: `M2Down ${runTag}`,
  });
  assert.equal(res.status, 503);
});

test('Consultas GET /transferencias, GET /transferencias/:id y GET /transferencias/stats', async () => {
  const list = await api('GET', '/transferencias?clienteId=1');
  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.data) && list.data.length > 0);
  assert.ok(list.data.every((t) => t.clienteId === 1));

  const id = list.data[0].id;
  const detail = await api('GET', `/transferencias/${id}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.data.id, id);

  const stats = await api('GET', '/transferencias/stats');
  assert.equal(stats.status, 200);
  assert.equal(typeof stats.data.total, 'number');
  assert.equal(typeof stats.data.montoTotal, 'number');
  assert.ok(Array.isArray(stats.data.porTipo));
});
