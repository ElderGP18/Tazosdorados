-- ============================================================
--  TAZOS DORADOS — Script de base de datos completo
--  Compatible con MySQL 5.7+ / 8.x (Hostinger)
--  Ejecutar en orden: primero schema, luego seed
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- TABLAS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `roles` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `nombre`      VARCHAR(50)  NOT NULL UNIQUE,
  `descripcion` TEXT,
  `activo`      TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `usuarios` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `nombre`        VARCHAR(100) NOT NULL,
  `email`         VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `rol_id`        INT          NOT NULL,
  `activo`        TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `ix_usuarios_email` (`email`),
  FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `categorias` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `nombre`      VARCHAR(80) NOT NULL UNIQUE,
  `descripcion` TEXT,
  `activo`      TINYINT(1)  NOT NULL DEFAULT 1,
  `created_at`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `productos` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `nombre`       VARCHAR(120)   NOT NULL,
  `descripcion`  TEXT,
  `precio`       DECIMAL(10,2)  NOT NULL,
  `categoria_id` INT,
  `activo`       TINYINT(1)     NOT NULL DEFAULT 1,
  `created_at`   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `ingredientes` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `nombre`          VARCHAR(120)  NOT NULL UNIQUE,
  `unidad_medida`   VARCHAR(20)   NOT NULL,
  `costo_unitario`  DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  `activo`          TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `recetas_detalle` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `producto_id`     INT           NOT NULL,
  `ingrediente_id`  INT           NOT NULL,
  `cantidad`        DECIMAL(10,4) NOT NULL,
  UNIQUE KEY `uq_receta_producto_ingrediente` (`producto_id`, `ingrediente_id`),
  FOREIGN KEY (`producto_id`)    REFERENCES `productos`(`id`),
  FOREIGN KEY (`ingrediente_id`) REFERENCES `ingredientes`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `ventas` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `fecha`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total`       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `metodo_pago` VARCHAR(30)   NOT NULL DEFAULT 'efectivo',
  `usuario_id`  INT,
  `notas`       TEXT,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `ix_ventas_fecha` (`fecha`),
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `detalles_venta` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `venta_id`        INT           NOT NULL,
  `producto_id`     INT           NOT NULL,
  `cantidad`        INT           NOT NULL,
  `precio_unitario` DECIMAL(10,2) NOT NULL,
  `subtotal`        DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (`venta_id`)    REFERENCES `ventas`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `stock` (
  `id`                   INT AUTO_INCREMENT PRIMARY KEY,
  `ingrediente_id`       INT           NOT NULL UNIQUE,
  `cantidad_disponible`  DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  `cantidad_minima`      DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  `ultima_actualizacion` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`ingrediente_id`) REFERENCES `ingredientes`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `movimientos_stock` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `ingrediente_id`  INT           NOT NULL,
  `tipo`            VARCHAR(10)   NOT NULL COMMENT 'entrada | salida',
  `cantidad`        DECIMAL(12,4) NOT NULL,
  `referencia`      VARCHAR(100),
  `notas`           TEXT,
  `fecha`           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `ix_movimientos_fecha` (`fecha`),
  FOREIGN KEY (`ingrediente_id`) REFERENCES `ingredientes`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `feriados` (
  `id`             INT AUTO_INCREMENT PRIMARY KEY,
  `fecha`          DATE         NOT NULL UNIQUE,
  `descripcion`    VARCHAR(200) NOT NULL,
  `tipo`           VARCHAR(40)  NOT NULL DEFAULT 'nacional',
  `afecta_demanda` TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `ix_feriados_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


SET FOREIGN_KEY_CHECKS = 1;
