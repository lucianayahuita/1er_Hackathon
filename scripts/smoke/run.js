#!/usr/bin/env node
/**
 * scripts/smoke/run.js
 * Corredor principal de pruebas smoke (mantenido por Axl).
 * Ejecuta validaciones rápidas sobre los microservicios y gateway.
 *
 * Uso:
 *   npm run smoke
 *   npm run smoke -- base
 *   npm run smoke -- modulo1
 *   npm run smoke -- modulo2
 *   npm run smoke -- modulo3
 *   npm run smoke -- modulo4
 *   node scripts/smoke/run.js [checks...]
 */

const fs = require('fs');
const path = require('path');

// Colores ANSI para terminal
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

// Error especial para omitir pruebas dentro de test()
class SkipException extends Error {
  constructor(reason = 'Prueba omitida') {
    super(reason);
    this.name = 'SkipException';
  }
}

// Configuración de URLs por defecto (sobreescribible con variables de entorno)
const DEFAULT_URLS = {
  gateway: process.env.GATEWAY_URL || 'http://localhost:3000',
  modulo1: process.env.MS_MODULO1_URL || 'http://localhost:3001',
  modulo2: process.env.MS_MODULO2_URL || 'http://localhost:3002',
  modulo3: process.env.MS_MODULO3_URL || 'http://localhost:3003',
  modulo4: process.env.MS_MODULO4_URL || 'http://localhost:3004',
};

// Utilidad HTTP usando fetch nativo de Node.js (con timeout)
async function httpRequest(url, options = {}, timeoutMs = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    let data = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return {
      status: res.status,
      ok: res.ok,
      headers: res.headers,
      data,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Timeout tras ${timeoutMs}ms al conectar a ${url}`);
    }
    if (err.cause && (err.cause.code === 'ECONNREFUSED' || err.code === 'ECONNREFUSED')) {
      throw new Error(`Conexión rechazada en ${url} (¿está corriendo el servicio?)`);
    }
    throw new Error(`Fallo de conexión a ${url}: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

// Clase para coordinar la ejecución del conjunto de pruebas
class SmokeRunner {
  constructor(urls = DEFAULT_URLS) {
    this.urls = { ...urls };
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      startTime: Date.now(),
    };
  }

  createContext(suiteName) {
    const runner = this;

    const ctx = {
      urls: { ...this.urls },

      // Assertions
      assert(condition, message = 'Aserción fallida') {
        if (!condition) {
          throw new Error(message);
        }
      },

      assertEqual(actual, expected, message) {
        if (actual !== expected) {
          const detail = `esperado [${expected}] pero recibió [${actual}]`;
          throw new Error(message ? `${message} (${detail})` : `Aserción fallida: ${detail}`);
        }
      },

      // HTTP helpers
      async request(url, options, timeoutMs) {
        return httpRequest(url, options, timeoutMs);
      },

      async get(url, options = {}, timeoutMs) {
        return httpRequest(url, { method: 'GET', ...options }, timeoutMs);
      },

      async post(url, body, options = {}, timeoutMs) {
        return httpRequest(
          url,
          {
            method: 'POST',
            body: typeof body === 'string' ? body : JSON.stringify(body),
            ...options,
          },
          timeoutMs
        );
      },

      async patch(url, body, options = {}, timeoutMs) {
        return httpRequest(
          url,
          {
            method: 'PATCH',
            body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
            ...options,
          },
          timeoutMs
        );
      },

      async delete(url, options = {}, timeoutMs) {
        return httpRequest(url, { method: 'DELETE', ...options }, timeoutMs);
      },

      // Helper para verificar si un endpoint responde rápidamente sin lanzar excepción
      async isReachable(url, timeoutMs = 1200) {
        try {
          await httpRequest(url, { method: 'GET' }, timeoutMs);
          return true;
        } catch {
          return false;
        }
      },

      // Omitir una prueba:
      // Si se llama dentro de test(fn): ctx.skip('razón') lanza SkipException
      // Si se llama directamente: ctx.skip('nombre', 'razón') lo imprime de inmediato
      skip(arg1, arg2) {
        if (arg2 === undefined) {
          throw new SkipException(arg1);
        } else {
          runner.stats.total++;
          runner.stats.skipped++;
          const reasonText = arg2 ? ` ${c.gray}(${arg2})${c.reset}` : '';
          console.log(`  ${c.yellow}⚠ SKIP${c.reset} ${arg1}${reasonText}`);
        }
      },

      // Registrar una prueba ejecutada
      async test(name, fn) {
        runner.stats.total++;
        const testStart = Date.now();
        try {
          await fn();
          const duration = Date.now() - testStart;
          runner.stats.passed++;
          console.log(`  ${c.green}✔ PASS${c.reset} ${name} ${c.gray}(${duration}ms)${c.reset}`);
          return true;
        } catch (err) {
          const duration = Date.now() - testStart;
          if (err instanceof SkipException || err.name === 'SkipException') {
            runner.stats.skipped++;
            const reason = err.message ? ` ${c.gray}(${err.message})${c.reset}` : '';
            console.log(`  ${c.yellow}⚠ SKIP${c.reset} ${name}${reason}`);
            return false;
          }
          runner.stats.failed++;
          console.log(`  ${c.red}✖ FAIL${c.reset} ${name} ${c.gray}(${duration}ms)${c.reset}`);
          console.log(`         ${c.red}→ ${err.message}${c.reset}`);
          return false;
        }
      },
    };

    return ctx;
  }
}

// Mapeo amigable de alias a archivos
const ALIASES = {
  base: 'base.js',
  m1: 'modulo1.js',
  modulo1: 'modulo1.js',
  m2: 'modulo2.js',
  modulo2: 'modulo2.js',
  m3: 'modulo3.js',
  modulo3: 'modulo3.js',
  m4: 'modulo4.js',
  modulo4: 'modulo4.js',
};

const ORDERED_CHECKS = ['base.js', 'modulo1.js', 'modulo2.js', 'modulo3.js', 'modulo4.js'];

function resolveChecks(rawArgs) {
  const filtered = rawArgs.filter((arg) => !arg.startsWith('-'));

  if (filtered.length === 0) {
    return ORDERED_CHECKS;
  }

  const resolved = [];
  for (const arg of filtered) {
    const lower = arg.toLowerCase().replace(/\.js$/, '');
    if (ALIASES[lower]) {
      resolved.push(ALIASES[lower]);
    } else {
      const candidate = `${lower}.js`;
      if (fs.existsSync(path.join(__dirname, 'checks', candidate))) {
        resolved.push(candidate);
      } else {
        console.warn(`${c.yellow}⚠ Aviso: No se encontró el check '${arg}' en scripts/smoke/checks/${c.reset}`);
      }
    }
  }

  return [...new Set(resolved)];
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${c.bold}SMOKE TEST RUNNER - HACKATHON${c.reset}
Uso:
  npm run smoke                  Ejecuta todos los checks (base, modulo1..4)
  npm run smoke -- base          Ejecuta solo infraestructura, /health y auth
  npm run smoke -- modulo1       Ejecuta solo pruebas de ms-modulo1
  npm run smoke -- m2            Alias para modulo2
  npm run smoke -- modulo1 m3    Ejecuta modulo1 y modulo3

Variables de entorno opcionales:
  GATEWAY_URL     (def: http://localhost:3000)
  MS_MODULO1_URL  (def: http://localhost:3001)
  MS_MODULO2_URL  (def: http://localhost:3002)
  MS_MODULO3_URL  (def: http://localhost:3003)
  MS_MODULO4_URL  (def: http://localhost:3004)
  USE_GATEWAY     (def: false - si es true, prueba vía Gateway /api/mX)
`);
    process.exit(0);
  }

  const checksToRun = resolveChecks(args);

  if (checksToRun.length === 0) {
    console.error(`${c.red}Error: No hay checks válidos para ejecutar.${c.reset}`);
    process.exit(1);
  }

  console.log(`\n${c.bold}${c.cyan}============================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}           SMOKE TEST RUNNER - 1er HACKATHON                ${c.reset}`);
  console.log(`${c.cyan}============================================================${c.reset}`);
  console.log(`${c.gray}Objetivo: Validar salud del sistema y PRs de módulos rápidamente.${c.reset}`);
  console.log(`${c.gray}URLs objetivo:${c.reset}`);
  console.log(`  Gateway: ${c.white}${DEFAULT_URLS.gateway}${c.reset}`);
  console.log(`  Modulo1: ${c.white}${DEFAULT_URLS.modulo1}${c.reset} | Modulo2: ${c.white}${DEFAULT_URLS.modulo2}${c.reset}`);
  console.log(`  Modulo3: ${c.white}${DEFAULT_URLS.modulo3}${c.reset} | Modulo4: ${c.white}${DEFAULT_URLS.modulo4}${c.reset}`);
  console.log(`${c.cyan}------------------------------------------------------------${c.reset}\n`);

  const runner = new SmokeRunner();

  for (const checkFile of checksToRun) {
    const fullPath = path.join(__dirname, 'checks', checkFile);
    if (!fs.existsSync(fullPath)) {
      console.log(`${c.red}✖ Archivo no encontrado: ${checkFile}${c.reset}\n`);
      runner.stats.failed++;
      runner.stats.total++;
      continue;
    }

    try {
      const checkModule = require(fullPath);
      const name = checkModule.name || path.basename(checkFile, '.js');
      const owner = checkModule.owner ? ` ${c.gray}(Dueño: ${checkModule.owner})${c.reset}` : '';

      console.log(`${c.bold}${c.magenta}▶ Suite: ${name}${owner}${c.reset}`);

      const ctx = runner.createContext(name);
      if (typeof checkModule === 'function') {
        await checkModule(ctx);
      } else if (typeof checkModule.run === 'function') {
        await checkModule.run(ctx);
      } else {
        throw new Error(`El archivo ${checkFile} no exporta una función ni { run: async (ctx) => ... }`);
      }
      console.log('');
    } catch (err) {
      runner.stats.failed++;
      runner.stats.total++;
      console.log(`  ${c.red}✖ Error cargando suite ${checkFile}: ${err.message}${c.reset}\n`);
    }
  }

  const duration = ((Date.now() - runner.stats.startTime) / 1000).toFixed(2);
  const { total, passed, failed, skipped } = runner.stats;

  console.log(`${c.bold}${c.cyan}============================================================${c.reset}`);
  console.log(`${c.bold}                     RESUMEN DE PRUEBAS                     ${c.reset}`);
  console.log(`${c.cyan}============================================================${c.reset}`);
  console.log(`  Total pruebas:   ${c.bold}${total}${c.reset}`);
  console.log(`  ${c.green}✔ Exitosas:      ${passed}${c.reset}`);
  console.log(`  ${failed > 0 ? c.red : c.gray}✖ Fallidas:      ${failed}${c.reset}`);
  console.log(`  ${skipped > 0 ? c.yellow : c.gray}⚠ Omitidas:      ${skipped}${c.reset}`);
  console.log(`  Tiempo total:    ${duration}s`);
  console.log(`${c.cyan}============================================================${c.reset}\n`);

  if (failed > 0) {
    console.log(`${c.red}${c.bold}RESULTADO: FALLÓ (Hay ${failed} prueba(s) con error).${c.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${c.green}${c.bold}RESULTADO: EXITOSO (Todos los checks pasaron o se omitieron limpiamente).${c.reset}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`\n${c.red}Error fatal no controlado en smoke runner:${c.reset}`, err);
  process.exit(1);
});
