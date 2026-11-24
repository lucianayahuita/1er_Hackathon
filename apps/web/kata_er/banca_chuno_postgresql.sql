-- =====================================================================
-- STARTUP CHUNO - Banca por Internet (arquitectura de microservicios)
-- Script DDL PostgreSQL - importable en Vertabelo (Import from SQL)
-- Una base de datos relacional, un SCHEMA por microservicio
-- (database-per-service lógico). Las referencias ENTRE servicios se
-- guardan como IDs "lógicos" (sin FK física) para mantener bajo
-- acoplamiento; se marcan con el sufijo _ref en el comentario.
-- Catálogos/datos iniciales: ver banca_chuno_datos_iniciales.sql
-- =====================================================================

CREATE SCHEMA clientes;
CREATE SCHEMA cuentas;
CREATE SCHEMA pagos;
CREATE SCHEMA transferencias;
CREATE SCHEMA prestamos;

-- =====================================================================
-- 1) MICROSERVICIO CLIENTES
-- =====================================================================
CREATE TABLE clientes.cliente (
    id_cliente          bigserial     NOT NULL,
    tipo_documento      varchar(10)   NOT NULL,
    numero_documento    varchar(20)   NOT NULL,
    complemento         varchar(5)    NULL,
    nombres             varchar(100)  NOT NULL,
    apellido_paterno    varchar(60)   NOT NULL,
    apellido_materno    varchar(60)   NULL,
    fecha_nacimiento    date          NOT NULL,
    email               varchar(120)  NOT NULL,
    telefono            varchar(20)   NOT NULL,
    direccion           varchar(250)  NULL,
    ciudad              varchar(60)   NULL,
    estado              varchar(15)   NOT NULL DEFAULT 'ACTIVO',
    fecha_registro      timestamp     NOT NULL DEFAULT now(),
    fecha_modificacion  timestamp     NULL,
    fecha_baja          timestamp     NULL,
    CONSTRAINT pk_cliente PRIMARY KEY (id_cliente),
    CONSTRAINT uq_cliente_documento UNIQUE (tipo_documento, numero_documento, complemento),
    CONSTRAINT uq_cliente_email UNIQUE (email),
    CONSTRAINT ck_cliente_tipo_doc CHECK (tipo_documento IN ('CI','CE','PASAPORTE','NIT')),
    CONSTRAINT ck_cliente_estado CHECK (estado IN ('ACTIVO','BLOQUEADO','INACTIVO'))
);

CREATE TABLE clientes.credencial (
    id_credencial           bigserial     NOT NULL,
    id_cliente              bigint        NOT NULL,
    usuario                 varchar(50)   NOT NULL,
    password_hash           varchar(255)  NOT NULL,
    mfa_habilitado          boolean       NOT NULL DEFAULT false,
    intentos_fallidos       smallint      NOT NULL DEFAULT 0,
    bloqueado_hasta         timestamp     NULL,
    requiere_cambio_clave   boolean       NOT NULL DEFAULT true,
    fecha_ultima_clave      timestamp     NOT NULL DEFAULT now(),
    fecha_ultimo_acceso     timestamp     NULL,
    CONSTRAINT pk_credencial PRIMARY KEY (id_credencial),
    CONSTRAINT uq_credencial_cliente UNIQUE (id_cliente),
    CONSTRAINT uq_credencial_usuario UNIQUE (usuario),
    CONSTRAINT fk_credencial_cliente FOREIGN KEY (id_cliente)
        REFERENCES clientes.cliente (id_cliente)
);

CREATE TABLE clientes.sesion (
    id_sesion        bigserial     NOT NULL,
    id_cliente       bigint        NOT NULL,
    refresh_token    varchar(255)  NOT NULL,
    ip_origen        varchar(45)   NULL,
    dispositivo      varchar(150)  NULL,
    fecha_inicio     timestamp     NOT NULL DEFAULT now(),
    fecha_expiracion timestamp     NOT NULL,
    revocada         boolean       NOT NULL DEFAULT false,
    CONSTRAINT pk_sesion PRIMARY KEY (id_sesion),
    CONSTRAINT uq_sesion_token UNIQUE (refresh_token),
    CONSTRAINT fk_sesion_cliente FOREIGN KEY (id_cliente)
        REFERENCES clientes.cliente (id_cliente)
);

CREATE TABLE clientes.evento_seguridad (
    id_evento     bigserial     NOT NULL,
    id_cliente    bigint        NULL,
    tipo_evento   varchar(30)   NOT NULL,
    detalle       varchar(250)  NULL,
    ip_origen     varchar(45)   NULL,
    fecha_evento  timestamp     NOT NULL DEFAULT now(),
    CONSTRAINT pk_evento_seguridad PRIMARY KEY (id_evento),
    CONSTRAINT ck_evento_seg_tipo CHECK (tipo_evento IN
        ('LOGIN_OK','LOGIN_FALLIDO','BLOQUEO','DESBLOQUEO','CAMBIO_CLAVE','LOGOUT','ALTA','BAJA')),
    CONSTRAINT fk_evento_seg_cliente FOREIGN KEY (id_cliente)
        REFERENCES clientes.cliente (id_cliente)
);

-- =====================================================================
-- 2) MICROSERVICIO CUENTAS (ahorro)
-- =====================================================================
CREATE TABLE cuentas.moneda (
    id_moneda   smallserial   NOT NULL,
    codigo_iso  varchar(3)    NOT NULL,
    nombre      varchar(40)   NOT NULL,
    simbolo     varchar(5)    NOT NULL,
    activa      boolean       NOT NULL DEFAULT true,
    CONSTRAINT pk_moneda PRIMARY KEY (id_moneda),
    CONSTRAINT uq_moneda_iso UNIQUE (codigo_iso)
);

CREATE TABLE cuentas.cuenta (
    id_cuenta        bigserial      NOT NULL,
    numero_cuenta    varchar(20)    NOT NULL,
    id_cliente_ref   bigint         NOT NULL,  -- ref. lógica a clientes.cliente
    id_moneda        smallint       NOT NULL,
    tipo_cuenta      varchar(15)    NOT NULL DEFAULT 'AHORRO',
    alias            varchar(60)    NULL,
    saldo            numeric(18,2)  NOT NULL DEFAULT 0,
    saldo_bloqueado  numeric(18,2)  NOT NULL DEFAULT 0,
    tasa_interes     numeric(5,2)   NOT NULL DEFAULT 0,
    estado           varchar(12)    NOT NULL DEFAULT 'ACTIVA',
    fecha_apertura   timestamp      NOT NULL DEFAULT now(),
    fecha_cierre     timestamp      NULL,
    version          integer        NOT NULL DEFAULT 0,  -- bloqueo optimista
    CONSTRAINT pk_cuenta PRIMARY KEY (id_cuenta),
    CONSTRAINT uq_cuenta_numero UNIQUE (numero_cuenta),
    CONSTRAINT ck_cuenta_tipo CHECK (tipo_cuenta IN ('AHORRO')),
    CONSTRAINT ck_cuenta_estado CHECK (estado IN ('ACTIVA','BLOQUEADA','CERRADA')),
    CONSTRAINT ck_cuenta_saldo CHECK (saldo >= 0),
    CONSTRAINT ck_cuenta_saldo_bloq CHECK (saldo_bloqueado >= 0 AND saldo_bloqueado <= saldo),
    CONSTRAINT fk_cuenta_moneda FOREIGN KEY (id_moneda)
        REFERENCES cuentas.moneda (id_moneda)
);

CREATE TABLE cuentas.movimiento (
    id_movimiento       bigserial      NOT NULL,
    id_cuenta           bigint         NOT NULL,
    tipo_movimiento     varchar(25)    NOT NULL,
    monto               numeric(18,2)  NOT NULL,
    saldo_anterior      numeric(18,2)  NOT NULL,
    saldo_posterior     numeric(18,2)  NOT NULL,
    descripcion         varchar(250)   NULL,
    referencia_origen   varchar(40)    NULL,  -- id de pago/transferencia/prestamo (ref. lógica)
    clave_idempotencia  varchar(64)    NOT NULL,
    fecha_movimiento    timestamp      NOT NULL DEFAULT now(),
    CONSTRAINT pk_movimiento PRIMARY KEY (id_movimiento),
    CONSTRAINT uq_movimiento_idem UNIQUE (id_cuenta, clave_idempotencia),
    CONSTRAINT ck_movimiento_tipo CHECK (tipo_movimiento IN
        ('DEPOSITO','RETIRO','TRANSFERENCIA_ENVIADA','TRANSFERENCIA_RECIBIDA',
         'PAGO_SERVICIO','DESEMBOLSO_PRESTAMO','PAGO_CUOTA','REVERSO','INTERES')),
    CONSTRAINT ck_movimiento_monto CHECK (monto > 0),
    CONSTRAINT fk_movimiento_cuenta FOREIGN KEY (id_cuenta)
        REFERENCES cuentas.cuenta (id_cuenta)
);

CREATE TABLE cuentas.outbox_evento (
    id_evento       bigserial     NOT NULL,
    tipo_evento     varchar(50)   NOT NULL,
    agregado_id     varchar(40)   NOT NULL,
    payload         text          NOT NULL,
    publicado       boolean       NOT NULL DEFAULT false,
    fecha_creacion  timestamp     NOT NULL DEFAULT now(),
    fecha_publicado timestamp     NULL,
    CONSTRAINT pk_cuentas_outbox PRIMARY KEY (id_evento)
);

-- =====================================================================
-- 3) MICROSERVICIO PAGOS DE SERVICIOS
-- =====================================================================
CREATE TABLE pagos.proveedor_servicio (
    id_proveedor   serial        NOT NULL,
    codigo         varchar(20)   NOT NULL,
    nombre         varchar(100)  NOT NULL,
    categoria      varchar(15)   NOT NULL,
    url_api        varchar(250)  NULL,
    comision_fija  numeric(10,2) NOT NULL DEFAULT 0,
    activo         boolean       NOT NULL DEFAULT true,
    CONSTRAINT pk_proveedor_servicio PRIMARY KEY (id_proveedor),
    CONSTRAINT uq_proveedor_codigo UNIQUE (codigo),
    CONSTRAINT ck_proveedor_categoria CHECK (categoria IN
        ('LUZ','AGUA','TELEFONO','GAS','INTERNET','TV','OTRO'))
);

CREATE TABLE pagos.afiliacion_servicio (
    id_afiliacion       bigserial     NOT NULL,
    id_cliente_ref      bigint        NOT NULL,  -- ref. lógica a clientes.cliente
    id_proveedor        integer       NOT NULL,
    codigo_referencia   varchar(40)   NOT NULL,  -- NIS, nro. medidor, nro. teléfono, etc.
    alias               varchar(60)   NULL,
    activa              boolean       NOT NULL DEFAULT true,
    fecha_afiliacion    timestamp     NOT NULL DEFAULT now(),
    CONSTRAINT pk_afiliacion_servicio PRIMARY KEY (id_afiliacion),
    CONSTRAINT uq_afiliacion UNIQUE (id_cliente_ref, id_proveedor, codigo_referencia),
    CONSTRAINT fk_afiliacion_proveedor FOREIGN KEY (id_proveedor)
        REFERENCES pagos.proveedor_servicio (id_proveedor)
);

CREATE TABLE pagos.pago (
    id_pago               bigserial      NOT NULL,
    id_cliente_ref        bigint         NOT NULL,  -- ref. lógica a clientes.cliente
    id_cuenta_ref         bigint         NOT NULL,  -- ref. lógica a cuentas.cuenta (origen del débito)
    id_proveedor          integer        NOT NULL,
    id_afiliacion         bigint         NULL,
    codigo_referencia     varchar(40)    NOT NULL,
    periodo_facturado     varchar(20)    NULL,
    monto                 numeric(18,2)  NOT NULL,
    comision              numeric(10,2)  NOT NULL DEFAULT 0,
    moneda_codigo         varchar(3)     NOT NULL DEFAULT 'BOB',
    estado                varchar(12)    NOT NULL DEFAULT 'PENDIENTE',
    nro_comprobante       varchar(30)    NULL,
    id_transaccion_prov   varchar(60)    NULL,
    motivo_fallo          varchar(250)   NULL,
    clave_idempotencia    varchar(64)    NOT NULL,
    fecha_solicitud       timestamp      NOT NULL DEFAULT now(),
    fecha_confirmacion    timestamp      NULL,
    CONSTRAINT pk_pago PRIMARY KEY (id_pago),
    CONSTRAINT uq_pago_idem UNIQUE (clave_idempotencia),
    CONSTRAINT uq_pago_comprobante UNIQUE (nro_comprobante),
    CONSTRAINT ck_pago_monto CHECK (monto > 0),
    CONSTRAINT ck_pago_estado CHECK (estado IN
        ('PENDIENTE','DEBITADO','CONFIRMADO','FALLIDO','REVERSADO')),
    CONSTRAINT fk_pago_proveedor FOREIGN KEY (id_proveedor)
        REFERENCES pagos.proveedor_servicio (id_proveedor),
    CONSTRAINT fk_pago_afiliacion FOREIGN KEY (id_afiliacion)
        REFERENCES pagos.afiliacion_servicio (id_afiliacion)
);

CREATE TABLE pagos.pago_estado_historial (
    id_historial   bigserial     NOT NULL,
    id_pago        bigint        NOT NULL,
    estado         varchar(12)   NOT NULL,
    detalle        varchar(250)  NULL,
    fecha_cambio   timestamp     NOT NULL DEFAULT now(),
    CONSTRAINT pk_pago_estado_historial PRIMARY KEY (id_historial),
    CONSTRAINT fk_pago_hist_pago FOREIGN KEY (id_pago)
        REFERENCES pagos.pago (id_pago)
);

CREATE TABLE pagos.outbox_evento (
    id_evento       bigserial     NOT NULL,
    tipo_evento     varchar(50)   NOT NULL,
    agregado_id     varchar(40)   NOT NULL,
    payload         text          NOT NULL,
    publicado       boolean       NOT NULL DEFAULT false,
    fecha_creacion  timestamp     NOT NULL DEFAULT now(),
    fecha_publicado timestamp     NULL,
    CONSTRAINT pk_pagos_outbox PRIMARY KEY (id_evento)
);

-- =====================================================================
-- 4) MICROSERVICIO TRANSFERENCIAS
-- =====================================================================
CREATE TABLE transferencias.banco (
    id_banco       serial        NOT NULL,
    codigo         varchar(10)   NOT NULL,
    nombre         varchar(100)  NOT NULL,
    es_propio      boolean       NOT NULL DEFAULT false,
    activo         boolean       NOT NULL DEFAULT true,
    CONSTRAINT pk_banco PRIMARY KEY (id_banco),
    CONSTRAINT uq_banco_codigo UNIQUE (codigo)
);

CREATE TABLE transferencias.beneficiario (
    id_beneficiario   bigserial     NOT NULL,
    id_cliente_ref    bigint        NOT NULL,  -- ref. lógica a clientes.cliente
    id_banco          integer       NOT NULL,
    numero_cuenta     varchar(25)   NOT NULL,
    nombre_titular    varchar(150)  NOT NULL,
    documento_titular varchar(20)   NULL,
    alias             varchar(60)   NULL,
    email_notifica    varchar(120)  NULL,
    activo            boolean       NOT NULL DEFAULT true,
    fecha_registro    timestamp     NOT NULL DEFAULT now(),
    CONSTRAINT pk_beneficiario PRIMARY KEY (id_beneficiario),
    CONSTRAINT uq_beneficiario UNIQUE (id_cliente_ref, id_banco, numero_cuenta),
    CONSTRAINT fk_beneficiario_banco FOREIGN KEY (id_banco)
        REFERENCES transferencias.banco (id_banco)
);

CREATE TABLE transferencias.limite_transferencia (
    id_limite        serial         NOT NULL,
    tipo             varchar(20)    NOT NULL,
    moneda_codigo    varchar(3)     NOT NULL,
    monto_por_operacion numeric(18,2) NOT NULL,
    monto_diario     numeric(18,2)  NOT NULL,
    CONSTRAINT pk_limite_transferencia PRIMARY KEY (id_limite),
    CONSTRAINT uq_limite UNIQUE (tipo, moneda_codigo),
    CONSTRAINT ck_limite_tipo CHECK (tipo IN ('PROPIA','TERCEROS_INTERNA','INTERBANCARIA'))
);

CREATE TABLE transferencias.transferencia (
    id_transferencia       bigserial      NOT NULL,
    id_cliente_ref         bigint         NOT NULL,  -- ref. lógica a clientes.cliente
    id_cuenta_origen_ref   bigint         NOT NULL,  -- ref. lógica a cuentas.cuenta
    tipo                   varchar(20)    NOT NULL,
    id_cuenta_destino_ref  bigint         NULL,      -- ref. lógica (propias / terceros mismo banco)
    id_beneficiario        bigint         NULL,
    id_banco_destino       integer        NULL,
    numero_cuenta_destino  varchar(25)    NOT NULL,
    nombre_destinatario    varchar(150)   NULL,
    monto                  numeric(18,2)  NOT NULL,
    comision               numeric(10,2)  NOT NULL DEFAULT 0,
    moneda_codigo          varchar(3)     NOT NULL DEFAULT 'BOB',
    glosa                  varchar(200)   NULL,
    estado                 varchar(15)    NOT NULL DEFAULT 'PENDIENTE',
    id_operacion_interbancaria varchar(60) NULL,     -- id devuelto por el servicio intermediario (ACH)
    motivo_rechazo         varchar(250)   NULL,
    clave_idempotencia     varchar(64)    NOT NULL,
    fecha_solicitud        timestamp      NOT NULL DEFAULT now(),
    fecha_ejecucion        timestamp      NULL,
    CONSTRAINT pk_transferencia PRIMARY KEY (id_transferencia),
    CONSTRAINT uq_transferencia_idem UNIQUE (clave_idempotencia),
    CONSTRAINT ck_transf_tipo CHECK (tipo IN ('PROPIA','TERCEROS_INTERNA','INTERBANCARIA')),
    CONSTRAINT ck_transf_estado CHECK (estado IN
        ('PENDIENTE','DEBITADA','ENVIADA_ACH','COMPLETADA','RECHAZADA','REVERSADA')),
    CONSTRAINT ck_transf_monto CHECK (monto > 0),
    CONSTRAINT fk_transf_beneficiario FOREIGN KEY (id_beneficiario)
        REFERENCES transferencias.beneficiario (id_beneficiario),
    CONSTRAINT fk_transf_banco FOREIGN KEY (id_banco_destino)
        REFERENCES transferencias.banco (id_banco)
);

CREATE TABLE transferencias.transferencia_estado_historial (
    id_historial      bigserial     NOT NULL,
    id_transferencia  bigint        NOT NULL,
    estado            varchar(15)   NOT NULL,
    detalle           varchar(250)  NULL,
    fecha_cambio      timestamp     NOT NULL DEFAULT now(),
    CONSTRAINT pk_transf_estado_historial PRIMARY KEY (id_historial),
    CONSTRAINT fk_transf_hist_transf FOREIGN KEY (id_transferencia)
        REFERENCES transferencias.transferencia (id_transferencia)
);

CREATE TABLE transferencias.outbox_evento (
    id_evento       bigserial     NOT NULL,
    tipo_evento     varchar(50)   NOT NULL,
    agregado_id     varchar(40)   NOT NULL,
    payload         text          NOT NULL,
    publicado       boolean       NOT NULL DEFAULT false,
    fecha_creacion  timestamp     NOT NULL DEFAULT now(),
    fecha_publicado timestamp     NULL,
    CONSTRAINT pk_transf_outbox PRIMARY KEY (id_evento)
);

-- =====================================================================
-- 5) MICROSERVICIO PRESTAMOS
-- =====================================================================
CREATE TABLE prestamos.tipo_prestamo (
    id_tipo_prestamo  serial         NOT NULL,
    nombre            varchar(60)    NOT NULL,
    tasa_anual        numeric(5,2)   NOT NULL,
    monto_minimo      numeric(18,2)  NOT NULL,
    monto_maximo      numeric(18,2)  NOT NULL,
    plazo_min_meses   smallint       NOT NULL,
    plazo_max_meses   smallint       NOT NULL,
    activo            boolean        NOT NULL DEFAULT true,
    CONSTRAINT pk_tipo_prestamo PRIMARY KEY (id_tipo_prestamo),
    CONSTRAINT uq_tipo_prestamo_nombre UNIQUE (nombre),
    CONSTRAINT ck_tipo_prestamo_monto CHECK (monto_maximo >= monto_minimo),
    CONSTRAINT ck_tipo_prestamo_plazo CHECK (plazo_max_meses >= plazo_min_meses)
);

CREATE TABLE prestamos.prestamo (
    id_prestamo            bigserial      NOT NULL,
    id_cliente_ref         bigint         NOT NULL,  -- ref. lógica a clientes.cliente
    id_cuenta_desembolso_ref bigint       NOT NULL,  -- ref. lógica a cuentas.cuenta
    id_tipo_prestamo       integer        NOT NULL,
    monto_solicitado       numeric(18,2)  NOT NULL,
    monto_aprobado         numeric(18,2)  NULL,
    moneda_codigo          varchar(3)     NOT NULL DEFAULT 'BOB',
    tasa_anual             numeric(5,2)   NOT NULL,
    plazo_meses            smallint       NOT NULL,
    sistema_amortizacion   varchar(10)    NOT NULL DEFAULT 'FRANCES',
    cuota_mensual          numeric(18,2)  NULL,
    saldo_capital          numeric(18,2)  NULL,
    destino_credito        varchar(150)   NULL,
    estado                 varchar(15)    NOT NULL DEFAULT 'SOLICITADO',
    motivo_rechazo         varchar(250)   NULL,
    fecha_solicitud        timestamp      NOT NULL DEFAULT now(),
    fecha_aprobacion       timestamp      NULL,
    fecha_desembolso       timestamp      NULL,
    fecha_cancelacion      timestamp      NULL,
    CONSTRAINT pk_prestamo PRIMARY KEY (id_prestamo),
    CONSTRAINT ck_prestamo_estado CHECK (estado IN
        ('SOLICITADO','APROBADO','RECHAZADO','VIGENTE','EN_MORA','CANCELADO','ANULADO')),
    CONSTRAINT ck_prestamo_amort CHECK (sistema_amortizacion IN ('FRANCES','ALEMAN')),
    CONSTRAINT ck_prestamo_monto CHECK (monto_solicitado > 0),
    CONSTRAINT ck_prestamo_plazo CHECK (plazo_meses > 0),
    CONSTRAINT fk_prestamo_tipo FOREIGN KEY (id_tipo_prestamo)
        REFERENCES prestamos.tipo_prestamo (id_tipo_prestamo)
);

CREATE TABLE prestamos.cuota (
    id_cuota           bigserial      NOT NULL,
    id_prestamo        bigint         NOT NULL,
    numero_cuota       smallint       NOT NULL,
    fecha_vencimiento  date           NOT NULL,
    capital            numeric(18,2)  NOT NULL,
    interes            numeric(18,2)  NOT NULL,
    monto_cuota        numeric(18,2)  NOT NULL,
    saldo_pendiente    numeric(18,2)  NOT NULL,
    estado             varchar(10)    NOT NULL DEFAULT 'PENDIENTE',
    fecha_pago         timestamp      NULL,
    CONSTRAINT pk_cuota PRIMARY KEY (id_cuota),
    CONSTRAINT uq_cuota_numero UNIQUE (id_prestamo, numero_cuota),
    CONSTRAINT ck_cuota_estado CHECK (estado IN ('PENDIENTE','PAGADA','VENCIDA')),
    CONSTRAINT fk_cuota_prestamo FOREIGN KEY (id_prestamo)
        REFERENCES prestamos.prestamo (id_prestamo)
);

CREATE TABLE prestamos.pago_cuota (
    id_pago_cuota     bigserial      NOT NULL,
    id_cuota          bigint         NOT NULL,
    id_cuenta_ref     bigint         NOT NULL,  -- ref. lógica a cuentas.cuenta (débito)
    monto_pagado      numeric(18,2)  NOT NULL,
    fecha_pago        timestamp      NOT NULL DEFAULT now(),
    CONSTRAINT pk_pago_cuota PRIMARY KEY (id_pago_cuota),
    CONSTRAINT ck_pago_cuota_monto CHECK (monto_pagado > 0),
    CONSTRAINT fk_pago_cuota_cuota FOREIGN KEY (id_cuota)
        REFERENCES prestamos.cuota (id_cuota)
);

-- =====================================================================
-- ÍNDICES DE CONSULTA FRECUENTE
-- =====================================================================
CREATE INDEX ix_credencial_cliente      ON clientes.credencial (id_cliente);
CREATE INDEX ix_sesion_cliente          ON clientes.sesion (id_cliente);
CREATE INDEX ix_cuenta_cliente          ON cuentas.cuenta (id_cliente_ref);
CREATE INDEX ix_movimiento_cuenta_fecha ON cuentas.movimiento (id_cuenta, fecha_movimiento);
CREATE INDEX ix_pago_cliente_fecha      ON pagos.pago (id_cliente_ref, fecha_solicitud);
CREATE INDEX ix_transf_cliente_fecha    ON transferencias.transferencia (id_cliente_ref, fecha_solicitud);
CREATE INDEX ix_transf_cuenta_origen    ON transferencias.transferencia (id_cuenta_origen_ref);
CREATE INDEX ix_prestamo_cliente        ON prestamos.prestamo (id_cliente_ref);
CREATE INDEX ix_cuota_vencimiento       ON prestamos.cuota (fecha_vencimiento, estado);
