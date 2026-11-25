-- CreateEnum
CREATE TYPE "TipoTransferencia" AS ENUM ('PROPIA', 'TERCERO', 'INTERBANCARIA');

-- CreateEnum
CREATE TYPE "EstadoTransferencia" AS ENUM ('COMPLETADA', 'RECHAZADA', 'PENDIENTE');

-- CreateTable
CREATE TABLE "Banco" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Banco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transferencia" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoTransferencia" NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "cuentaOrigenId" INTEGER NOT NULL,
    "cuentaDestinoNumero" TEXT NOT NULL,
    "bancoDestino" TEXT,
    "titularDestino" TEXT,
    "monto" DECIMAL(14,2) NOT NULL,
    "glosa" TEXT NOT NULL,
    "estado" "EstadoTransferencia" NOT NULL DEFAULT 'PENDIENTE',
    "codigoAch" TEXT,
    "claveIdempotencia" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transferencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Banco_codigo_key" ON "Banco"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Transferencia_codigoAch_key" ON "Transferencia"("codigoAch");

-- CreateIndex
CREATE UNIQUE INDEX "Transferencia_claveIdempotencia_key" ON "Transferencia"("claveIdempotencia");

-- CreateIndex
CREATE INDEX "Transferencia_clienteId_fecha_idx" ON "Transferencia"("clienteId", "fecha");

-- CreateIndex
CREATE INDEX "Transferencia_cuentaOrigenId_fecha_idx" ON "Transferencia"("cuentaOrigenId", "fecha");

-- CreateIndex
CREATE INDEX "Transferencia_estado_tipo_idx" ON "Transferencia"("estado", "tipo");
