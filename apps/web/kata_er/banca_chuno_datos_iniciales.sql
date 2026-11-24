-- Datos iniciales (catálogos). Ejecutar DESPUÉS de banca_chuno_postgresql.sql
INSERT INTO cuentas.moneda (codigo_iso, nombre, simbolo) VALUES
 ('BOB','Boliviano','Bs'),
 ('USD','Dólar estadounidense','$');

INSERT INTO pagos.proveedor_servicio (codigo, nombre, categoria, comision_fija) VALUES
 ('ELFEC','ELFEC - Energía eléctrica','LUZ',0),
 ('SEMAPA','SEMAPA - Agua potable','AGUA',0),
 ('ENTEL','ENTEL - Telefonía','TELEFONO',0),
 ('EMDIGAS','EMDIGAS - Gas domiciliario','GAS',0),
 ('TIGO','TIGO - Telefonía e internet','TELEFONO',0);

INSERT INTO transferencias.banco (codigo, nombre, es_propio) VALUES
 ('CHUNO','Banco Chuno (propio)',true),
 ('BNB','Banco Nacional de Bolivia',false),
 ('BMSC','Banco Mercantil Santa Cruz',false),
 ('BISA','Banco BISA',false),
 ('BUN','Banco Unión',false);

INSERT INTO transferencias.limite_transferencia (tipo, moneda_codigo, monto_por_operacion, monto_diario) VALUES
 ('PROPIA','BOB',100000,200000),
 ('TERCEROS_INTERNA','BOB',50000,100000),
 ('INTERBANCARIA','BOB',30000,60000);

INSERT INTO prestamos.tipo_prestamo (nombre, tasa_anual, monto_minimo, monto_maximo, plazo_min_meses, plazo_max_meses) VALUES
 ('Consumo',14.50,1000,50000,6,60),
 ('Vehicular',11.00,20000,300000,12,84),
 ('Vivienda',6.50,50000,1000000,60,240);
