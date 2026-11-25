// Requiere npm run build y DATABASE_URL apuntando a una BD exclusiva de pruebas.
// Levanta una instancia HTTP real y verifica la persistencia con Prisma/PostgreSQL.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomUUID, scryptSync } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { JwtService } = require('@nestjs/jwt');

const prisma = new PrismaClient();
const sufijo = randomUUID().replaceAll('-', '');
const secretoJwt = randomUUID() + randomUUID();
const claveServicio = randomUUID();
const firmador = new JwtService({ secret: secretoJwt });
const port = process.env.TEST_PORT || '3101';
const base = `http://127.0.0.1:${port}`;
const ids = [];
let servidor;
let cliente;
let segundo;
let tokenAdmin;
let tokenCliente;
let salida = '';
const datos = {
  ci: `TEST-${sufijo}`, nombres: 'Elena', apellidos: 'Choque Pérez',
  email: `${sufijo}@example.com`, telefono: '71234567', direccion: 'La Paz',
  usuario: `test-${sufijo}`, password: 'Segura2026',
};

async function pedir(ruta, metodo = 'GET', body, headers = {}) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo, headers: { 'Content-Type': 'application/json', ...(tokenAdmin ? { Authorization: `Bearer ${tokenAdmin}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const json = await respuesta.json();
  assert(!JSON.stringify(json).includes('passwordHash'), 'No exponer hashes');
  assert(!JSON.stringify(json).includes(datos.password), 'No exponer contraseñas');
  return { status: respuesta.status, body: json };
}

before(async () => {
  assert(process.env.DATABASE_URL, 'Definir DATABASE_URL de una BD de pruebas');
  await prisma.$connect();
  const salt = randomUUID();
  const admin = await prisma.cliente.create({ data: {
    ci: `ADMIN-${sufijo}`, nombres: 'Admin', apellidos: 'Prueba',
    usuario: `admin-${sufijo}`, email: `admin-${sufijo}@example.com`, rol: 'ADMIN',
    passwordHash: `${salt}:${scryptSync(datos.password, salt, 64).toString('hex')}`,
  } });
  ids.push(admin.id);
  servidor = spawn(process.execPath, ['dist/main.js'], {
    cwd: require('node:path').resolve(__dirname, '..'),
    env: { ...process.env, PORT: port, JWT_SECRET: secretoJwt, JWT_TTL_SECONDS: '3600', INTERNAL_API_KEY: claveServicio },
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  servidor.stdout.on('data', (data) => { salida += data; });
  servidor.stderr.on('data', (data) => { salida += data; });
  for (let i = 0; i < 100; i++) {
    if (servidor.exitCode !== null) throw new Error(`El servicio terminó: ${salida}`);
    try {
      const respuesta = await pedir('/health');
      if (respuesta.status === 200) {
        const login = await pedir('/clientes/login', 'POST', { usuario: admin.usuario, password: datos.password });
        assert.equal(login.status, 200);
        assert.equal(login.body.rol, 'ADMIN');
        tokenAdmin = login.body.access_token;
        return;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`El servicio no arrancó: ${salida}`);
});

after(async () => {
  // Limpiar mediante baja lógica: nunca borrar registros de prueba físicamente.
  try {
    if (ids.length) await prisma.cliente.updateMany({ where: { id: { in: ids } }, data: { activo: false } });
  } finally {
    servidor?.kill();
    await prisma.$disconnect();
  }
});

test('Clientes: criterios de aceptación completos', async (t) => {
  await t.test('rechaza campos obligatorios, email inválido y contraseña corta', async () => {
    for (const campo of ['ci', 'nombres', 'apellidos', 'email', 'usuario', 'password']) {
      const incompleto = { ...datos };
      delete incompleto[campo];
      assert.equal((await pedir('/clientes', 'POST', incompleto)).status, 400);
      assert.equal((await pedir('/clientes', 'POST', { ...datos, [campo]: null })).status, 400);
    }
    for (const cambio of [{ ci: '   ' }, { email: 'incorrecto' }, { password: 'corta' }]) {
      assert.equal((await pedir('/clientes', 'POST', { ...datos, ...cambio })).status, 400);
    }
  });

  await t.test('registra y persiste el hash con salt, sin devolver credenciales', async () => {
    const res = await pedir('/clientes', 'POST', datos);
    assert.equal(res.status, 201);
    cliente = res.body;
    ids.push(cliente.id);
    assert.equal(cliente.activo, true);
    assert.equal(cliente.rol, 'CLIENTE');
    assert.equal(cliente.intentosFallidos, 0);
    const persistido = await prisma.cliente.findUniqueOrThrow({ where: { id: cliente.id } });
    const [salt, hash] = persistido.passwordHash.split(':');
    assert.equal(salt.length, 32);
    assert.equal(hash, scryptSync(datos.password, salt, 64).toString('hex'));
  });

  await t.test('impide CI, email y usuario duplicados con 409', async () => {
    for (const campo of ['ci', 'email', 'usuario']) {
      const unico = { ...datos, ci: `OTRO-${sufijo}`, usuario: `otro-${sufijo}`, email: `otro-${sufijo}@example.com` };
      unico[campo] = datos[campo];
      assert.equal((await pedir('/clientes', 'POST', unico)).status, 409);
    }
  });

  await t.test('lista, consulta y busca por CI, nombres o apellidos', async () => {
    for (const q of [datos.ci, 'elena', 'choque']) {
      const res = await pedir(`/clientes?q=${encodeURIComponent(q)}&activo=true`);
      assert.equal(res.status, 200);
      assert(res.body.some((c) => c.id === cliente.id));
    }
    assert.equal((await pedir(`/clientes/${cliente.id}`)).body.usuario, datos.usuario);
    assert.equal((await pedir('/clientes?activo=invalido')).status, 400);
    assert.equal((await pedir('/clientes/2147483647')).status, 404);
  });

  await t.test('actualiza los datos y rechaza nulos, estados y cambios de contraseña', async () => {
    const cambios = { nombres: 'Elena María', telefono: '76543210', direccion: 'Cochabamba' };
    assert.equal((await pedir(`/clientes/${cliente.id}`, 'PATCH', cambios)).status, 200);
    const guardado = await prisma.cliente.findUniqueOrThrow({ where: { id: cliente.id } });
    assert.equal(guardado.telefono, cambios.telefono);
    for (const body of [{ nombres: null }, { password: 'OtraSegura2026' }, { activo: false }, { bloqueado: false }, { intentosFallidos: 0 }, { rol: 'ADMIN' }]) {
      assert.equal((await pedir(`/clientes/${cliente.id}`, 'PATCH', body)).status, 400);
    }
    const res = await pedir('/clientes', 'POST', { ...datos, ci: `DOS-${sufijo}`, usuario: `dos-${sufijo}`, email: `dos-${sufijo}@example.com` });
    assert.equal(res.status, 201);
    segundo = res.body;
    ids.push(segundo.id);
    for (const campo of ['ci', 'email', 'usuario']) {
      assert.equal((await pedir(`/clientes/${cliente.id}`, 'PATCH', { [campo]: segundo[campo] })).status, 409);
    }
  });

  const login = (password) => pedir('/clientes/login', 'POST', { usuario: datos.usuario, password });

  await t.test('rechaza usuario desconocido y credenciales incorrectas', async () => {
    assert.equal((await pedir('/clientes/login', 'POST', { usuario: `ausente-${sufijo}`, password: 'incorrecta' })).status, 401);
    assert.equal((await login('incorrecta')).status, 401);
    assert.equal((await prisma.cliente.findUniqueOrThrow({ where: { id: cliente.id } })).intentosFallidos, 1);
  });

  await t.test('el login válido reinicia intentos y devuelve JWT, rol y vigencia', async () => {
    const res = await login(datos.password);
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body).sort(), ['access_token', 'apellidos', 'expires_in', 'id', 'nombres', 'rol', 'token_type', 'usuario']);
    assert.equal(res.body.rol, 'CLIENTE');
    assert.equal(res.body.token_type, 'Bearer');
    assert.equal(res.body.expires_in, 3600);
    tokenCliente = res.body.access_token;
    const payload = firmador.verify(tokenCliente, { issuer: 'chuno-clientes', audience: 'chuno-banca', algorithms: ['HS256'] });
    assert.equal(payload.sub, cliente.id);
    assert.equal(payload.rol, 'CLIENTE');
    assert.equal(payload.exp - payload.iat, 3600);
    assert.equal((await prisma.cliente.findUniqueOrThrow({ where: { id: cliente.id } })).intentosFallidos, 0);
  });

  await t.test('CLIENTE solo consulta y edita su perfil; ADMIN administra', async () => {
    const headers = { Authorization: `Bearer ${tokenCliente}` };
    assert.equal((await pedir(`/clientes/${cliente.id}`, 'GET', undefined, headers)).status, 200);
    assert.equal((await pedir(`/clientes/${cliente.id}`, 'PATCH', { telefono: '71111111' }, headers)).status, 200);
    for (const ruta of ['/clientes', '/clientes/stats', `/clientes/${segundo.id}`]) {
      assert.equal((await pedir(ruta, 'GET', undefined, headers)).status, 403);
    }
    for (const ruta of [`/clientes/${segundo.id}`, `/clientes/${cliente.id}/baja`, `/clientes/${cliente.id}/desbloquear`]) {
      assert.equal((await pedir(ruta, 'PATCH', {}, headers)).status, 403);
    }
    assert.equal((await pedir('/clientes', 'GET', undefined, { Authorization: '' })).status, 401);
    assert.equal((await pedir('/clientes', 'POST', { ...datos, rol: 'ADMIN' })).status, 400);
  });

  await t.test('rechaza JWT falsificados, expirados, sin expiración, de otra audiencia o algoritmo', async () => {
    const payload = { sub: cliente.id, rol: 'CLIENTE' };
    const opciones = { algorithm: 'HS256', issuer: 'chuno-clientes', audience: 'chuno-banca', expiresIn: 3600 };
    const partes = tokenCliente.split('.');
    partes[1] = Buffer.from(JSON.stringify({ ...payload, rol: 'ADMIN' })).toString('base64url');
    const tokens = [
      partes.join('.'), 'invalido',
      firmador.sign(payload, { ...opciones, expiresIn: -1 }),
      firmador.sign(payload, { algorithm: 'HS256', issuer: 'chuno-clientes', audience: 'chuno-banca' }),
      firmador.sign(payload, { ...opciones, audience: 'otro-sistema' }),
      firmador.sign(payload, { ...opciones, issuer: 'otro-emisor' }),
      firmador.sign(payload, { ...opciones, algorithm: 'HS384' }),
    ];
    for (const token of tokens) {
      assert.equal((await pedir(`/clientes/${cliente.id}`, 'GET', undefined, { Authorization: `Bearer ${token}` })).status, 401);
    }
  });

  await t.test('los microservicios solo pueden leer por ID con su clave interna', async () => {
    const headers = { Authorization: '', 'X-Service-Key': claveServicio };
    assert.equal((await pedir(`/clientes/${cliente.id}`, 'GET', undefined, headers)).status, 200);
    assert.equal((await pedir('/clientes', 'GET', undefined, headers)).status, 401);
    assert.equal((await pedir(`/clientes/${cliente.id}`, 'PATCH', {}, headers)).status, 401);
    assert.equal((await pedir(`/clientes/${cliente.id}/desbloquear`, 'PATCH', undefined, headers)).status, 401);
    assert.equal((await pedir(`/clientes/${cliente.id}`, 'GET', undefined, { ...headers, 'X-Service-Key': 'incorrecta' })).status, 401);
  });

  await t.test('un cambio de rol revoca privilegios aunque el JWT anterior siga vigente', async () => {
    await prisma.cliente.update({ where: { id: segundo.id }, data: { rol: 'ADMIN' } });
    const res = await pedir('/clientes/login', 'POST', { usuario: segundo.usuario, password: datos.password });
    assert.equal(res.status, 200);
    const headers = { Authorization: `Bearer ${res.body.access_token}` };
    assert.equal((await pedir('/clientes', 'GET', undefined, headers)).status, 200);
    await prisma.cliente.update({ where: { id: segundo.id }, data: { rol: 'CLIENTE' } });
    assert.equal((await pedir('/clientes', 'GET', undefined, headers)).status, 403);
    assert.equal((await pedir(`/clientes/${segundo.id}`, 'GET', undefined, headers)).status, 200);
  });

  await t.test('bloquea al tercer fallo consecutivo y persiste el contador', async () => {
    assert.equal((await login('incorrecta')).status, 401);
    assert.equal((await login('incorrecta')).status, 401);
    assert.equal((await login('incorrecta')).status, 403);
    assert.equal((await login(datos.password)).status, 403);
    const res = await prisma.cliente.findUniqueOrThrow({ where: { id: cliente.id } });
    assert.equal(res.bloqueado, true);
    assert.equal(res.intentosFallidos, 3);
    assert.equal((await pedir(`/clientes/${cliente.id}`, 'GET', undefined, { Authorization: `Bearer ${tokenCliente}` })).status, 403);
  });

  await t.test('solo un JWT de ADMIN permite desbloquear', async () => {
    const ruta = `/clientes/${cliente.id}/desbloquear`;
    assert.equal((await pedir(ruta, 'PATCH', undefined, { Authorization: '' })).status, 401);
    assert.equal((await pedir(ruta, 'PATCH', undefined, { Authorization: '', 'X-Admin-Key': 'invalida' })).status, 401);
    const res = await pedir(ruta, 'PATCH');
    assert.equal(res.status, 200);
    assert.equal(res.body.bloqueado, false);
    assert.equal(res.body.intentosFallidos, 0);
    assert.equal((await login(datos.password)).status, 200);
  });

  await t.test('los fallos concurrentes también bloquean al tercer intento', async () => {
    const respuestas = await Promise.all(Array.from({ length: 5 }, () => login('incorrecta')));
    assert.equal(respuestas.filter((r) => r.status === 401).length, 2);
    assert.equal(respuestas.filter((r) => r.status === 403).length, 3);
    const persistido = await prisma.cliente.findUniqueOrThrow({ where: { id: cliente.id } });
    assert.equal(persistido.intentosFallidos, 3);
    assert.equal(persistido.bloqueado, true);
  });

  await t.test('la baja conserva los datos y el desbloqueo no reactiva al cliente', async () => {
    assert.equal((await pedir(`/clientes/${cliente.id}/baja`, 'PATCH')).body.activo, false);
    await pedir(`/clientes/${cliente.id}/desbloquear`, 'PATCH');
    const res = await prisma.cliente.findUniqueOrThrow({ where: { id: cliente.id } });
    assert.equal(res.activo, false);
    assert.equal(res.bloqueado, false);
    assert.equal(res.ci, datos.ci);
    assert.equal((await login(datos.password)).status, 403);
    assert.equal((await pedir(`/clientes/${cliente.id}`, 'GET', undefined, { Authorization: `Bearer ${tokenCliente}` })).status, 403);
    assert((await pedir(`/clientes?activo=false&q=${datos.ci}`)).body.some((c) => c.id === cliente.id));
  });

  await t.test('estadísticas coinciden con los datos persistidos', async () => {
    const res = await pedir('/clientes/stats');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, await prisma.cliente.count());
    assert.equal(res.body.activos, await prisma.cliente.count({ where: { activo: true } }));
    assert.equal(res.body.inactivos, res.body.total - res.body.activos);
    assert.equal(res.body.bloqueados, await prisma.cliente.count({ where: { bloqueado: true } }));
  });
});
