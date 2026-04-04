-- ============================================================
--  TAZOS DORADOS — Datos iniciales
--  Ejecutar DESPUÉS de schema.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- ROLES
-- ------------------------------------------------------------
INSERT IGNORE INTO `roles` (`nombre`, `descripcion`) VALUES
  ('admin',   'Acceso total al sistema'),
  ('cajero',  'Registro de ventas y consulta de productos');


-- ------------------------------------------------------------
-- USUARIO ADMINISTRADOR
-- Password: Admin1234!
-- Hash generado con bcrypt (passlib rounds=12)
-- ------------------------------------------------------------
INSERT IGNORE INTO `usuarios` (`nombre`, `email`, `password_hash`, `rol_id`) VALUES
  (
    'Administrador',
    'admin@tazos.com',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    (SELECT `id` FROM `roles` WHERE `nombre` = 'admin')
  );


-- ------------------------------------------------------------
-- CATEGORÍAS
-- ------------------------------------------------------------
INSERT IGNORE INTO `categorias` (`nombre`) VALUES
  ('Tacos'),
  ('Quesadillas'),
  ('Bebidas'),
  ('Extras');


-- ------------------------------------------------------------
-- PRODUCTOS
-- ------------------------------------------------------------
INSERT IGNORE INTO `productos` (`nombre`, `descripcion`, `precio`, `categoria_id`) VALUES
  ('Taco al Pastor',       'Carne de marrano marinada con piña y especias',   25.00, (SELECT id FROM categorias WHERE nombre='Tacos')),
  ('Taco de Carne Asada',  'Res a la parrilla con cebolla y cilantro',         28.00, (SELECT id FROM categorias WHERE nombre='Tacos')),
  ('Taco de Pollo',        'Pollo a la plancha con chile pimiento',             22.00, (SELECT id FROM categorias WHERE nombre='Tacos')),
  ('Taco de Chorizo',      'Chorizo chapín con frijoles volteados',             24.00, (SELECT id FROM categorias WHERE nombre='Tacos')),
  ('Taco de Birria',       'Carne de res estofada en salsa roja',               30.00, (SELECT id FROM categorias WHERE nombre='Tacos')),
  ('Quesadilla de Queso',  'Queso blanco fundido en tortilla de maíz',         30.00, (SELECT id FROM categorias WHERE nombre='Quesadillas')),
  ('Quesadilla al Pastor', 'Queso blanco + carne al pastor',                   38.00, (SELECT id FROM categorias WHERE nombre='Quesadillas')),
  ('Quesadilla de Pollo',  'Queso blanco + pollo a la plancha',                35.00, (SELECT id FROM categorias WHERE nombre='Quesadillas')),
  ('Agua Fresca',          'Sabor del día (1 litro)',                           20.00, (SELECT id FROM categorias WHERE nombre='Bebidas')),
  ('Refresco',             '350 ml',                                            18.00, (SELECT id FROM categorias WHERE nombre='Bebidas')),
  ('Horchata',             'Horchata de arroz (500 ml)',                        25.00, (SELECT id FROM categorias WHERE nombre='Bebidas')),
  ('Guacamol',             '100 g de guacamol fresco',                          20.00, (SELECT id FROM categorias WHERE nombre='Extras')),
  ('Salsa Roja',           'Porción de salsa roja picante',                      8.00, (SELECT id FROM categorias WHERE nombre='Extras')),
  ('Salsa Verde',          'Porción de salsa verde',                             8.00, (SELECT id FROM categorias WHERE nombre='Extras')),
  ('Tortillas extra (3)',  'Tres tortillas de maíz',                            10.00, (SELECT id FROM categorias WHERE nombre='Extras'));


-- ------------------------------------------------------------
-- INGREDIENTES
-- ------------------------------------------------------------
INSERT IGNORE INTO `ingredientes` (`nombre`, `unidad_medida`, `costo_unitario`) VALUES
  ('Tortilla de maíz',   'unidad',  0.8000),
  ('Carne de marrano',   'kg',     75.0000),
  ('Carne de res',       'kg',     90.0000),
  ('Pechuga de pollo',   'kg',     60.0000),
  ('Chorizo chapín',     'kg',     80.0000),
  ('Queso blanco',       'kg',     55.0000),
  ('Cebolla',            'kg',     10.0000),
  ('Cilantro',           'kg',     12.0000),
  ('Tomate',             'kg',     10.0000),
  ('Chile guaque',       'kg',     45.0000),
  ('Chile pimiento',     'kg',     20.0000),
  ('Piña',               'kg',     15.0000),
  ('Aguacate',           'unidad',  8.0000),
  ('Limón',              'unidad',  0.5000),
  ('Frijoles negros',    'kg',     12.0000),
  ('Crema',              'litro',  22.0000),
  ('Sal',                'kg',      4.0000),
  ('Aceite',             'litro',  20.0000);


-- ------------------------------------------------------------
-- STOCK INICIAL
-- ------------------------------------------------------------
INSERT IGNORE INTO `stock` (`ingrediente_id`, `cantidad_disponible`, `cantidad_minima`)
SELECT `id`,
  CASE `nombre`
    WHEN 'Tortilla de maíz'  THEN 500
    WHEN 'Carne de marrano'  THEN 10
    WHEN 'Carne de res'      THEN 8
    WHEN 'Pechuga de pollo'  THEN 8
    WHEN 'Chorizo chapín'    THEN 5
    WHEN 'Queso blanco'      THEN 5
    WHEN 'Cebolla'           THEN 5
    WHEN 'Cilantro'          THEN 2
    WHEN 'Tomate'            THEN 5
    WHEN 'Chile guaque'      THEN 2
    WHEN 'Chile pimiento'    THEN 2
    WHEN 'Piña'              THEN 3
    WHEN 'Aguacate'          THEN 30
    WHEN 'Limón'             THEN 50
    WHEN 'Frijoles negros'   THEN 5
    WHEN 'Crema'             THEN 2
    WHEN 'Sal'               THEN 2
    WHEN 'Aceite'            THEN 3
    ELSE 0
  END,
  CASE `nombre`
    WHEN 'Tortilla de maíz'  THEN 100
    WHEN 'Carne de marrano'  THEN 2
    WHEN 'Carne de res'      THEN 2
    WHEN 'Pechuga de pollo'  THEN 2
    WHEN 'Chorizo chapín'    THEN 1
    WHEN 'Queso blanco'      THEN 1
    WHEN 'Cebolla'           THEN 1
    WHEN 'Cilantro'          THEN 0.5
    WHEN 'Tomate'            THEN 1
    WHEN 'Chile guaque'      THEN 0.5
    WHEN 'Chile pimiento'    THEN 0.5
    WHEN 'Piña'              THEN 0.5
    WHEN 'Aguacate'          THEN 10
    WHEN 'Limón'             THEN 10
    WHEN 'Frijoles negros'   THEN 1
    WHEN 'Crema'             THEN 0.5
    WHEN 'Sal'               THEN 0.5
    WHEN 'Aceite'            THEN 1
    ELSE 0
  END
FROM `ingredientes`;


-- ------------------------------------------------------------
-- RECETAS BASE
-- ------------------------------------------------------------
INSERT IGNORE INTO `recetas_detalle` (`producto_id`, `ingrediente_id`, `cantidad`)
SELECT p.id, i.id, r.cantidad
FROM (SELECT 'Taco al Pastor'       AS prod, 'Tortilla de maíz'  AS ing, 2      AS cantidad UNION ALL
      SELECT 'Taco al Pastor',               'Carne de marrano',          0.120 UNION ALL
      SELECT 'Taco al Pastor',               'Piña',                      0.030 UNION ALL
      SELECT 'Taco al Pastor',               'Cebolla',                   0.020 UNION ALL
      SELECT 'Taco al Pastor',               'Cilantro',                  0.010 UNION ALL
      SELECT 'Taco de Carne Asada',          'Tortilla de maíz',          2     UNION ALL
      SELECT 'Taco de Carne Asada',          'Carne de res',              0.120 UNION ALL
      SELECT 'Taco de Carne Asada',          'Cebolla',                   0.020 UNION ALL
      SELECT 'Taco de Carne Asada',          'Cilantro',                  0.010 UNION ALL
      SELECT 'Taco de Pollo',                'Tortilla de maíz',          2     UNION ALL
      SELECT 'Taco de Pollo',                'Pechuga de pollo',          0.120 UNION ALL
      SELECT 'Taco de Pollo',                'Cebolla',                   0.020 UNION ALL
      SELECT 'Taco de Pollo',                'Cilantro',                  0.010 UNION ALL
      SELECT 'Taco de Pollo',                'Chile pimiento',            0.015 UNION ALL
      SELECT 'Taco de Chorizo',              'Tortilla de maíz',          2     UNION ALL
      SELECT 'Taco de Chorizo',              'Chorizo chapín',            0.100 UNION ALL
      SELECT 'Taco de Chorizo',              'Frijoles negros',           0.050 UNION ALL
      SELECT 'Taco de Chorizo',              'Cebolla',                   0.020 UNION ALL
      SELECT 'Taco de Birria',               'Tortilla de maíz',          2     UNION ALL
      SELECT 'Taco de Birria',               'Carne de res',              0.150 UNION ALL
      SELECT 'Taco de Birria',               'Chile guaque',              0.020 UNION ALL
      SELECT 'Taco de Birria',               'Cebolla',                   0.030 UNION ALL
      SELECT 'Taco de Birria',               'Cilantro',                  0.010 UNION ALL
      SELECT 'Quesadilla de Queso',          'Tortilla de maíz',          2     UNION ALL
      SELECT 'Quesadilla de Queso',          'Queso blanco',              0.100 UNION ALL
      SELECT 'Quesadilla al Pastor',         'Tortilla de maíz',          2     UNION ALL
      SELECT 'Quesadilla al Pastor',         'Queso blanco',              0.080 UNION ALL
      SELECT 'Quesadilla al Pastor',         'Carne de marrano',          0.100 UNION ALL
      SELECT 'Quesadilla al Pastor',         'Piña',                      0.020 UNION ALL
      SELECT 'Quesadilla de Pollo',          'Tortilla de maíz',          2     UNION ALL
      SELECT 'Quesadilla de Pollo',          'Queso blanco',              0.080 UNION ALL
      SELECT 'Quesadilla de Pollo',          'Pechuga de pollo',          0.100 UNION ALL
      SELECT 'Guacamol',                     'Aguacate',                  1     UNION ALL
      SELECT 'Guacamol',                     'Cebolla',                   0.020 UNION ALL
      SELECT 'Guacamol',                     'Cilantro',                  0.010 UNION ALL
      SELECT 'Guacamol',                     'Limón',                     0.500 UNION ALL
      SELECT 'Guacamol',                     'Sal',                       0.005
     ) AS r
JOIN `productos`    p ON p.nombre = r.prod
JOIN `ingredientes` i ON i.nombre = r.ing;


-- ------------------------------------------------------------
-- FERIADOS GUATEMALA 2025-2026
-- ------------------------------------------------------------
INSERT IGNORE INTO `feriados` (`fecha`, `descripcion`, `tipo`) VALUES
  ('2025-01-01', 'Año Nuevo',                      'nacional'),
  ('2025-04-17', 'Jueves Santo',                   'nacional'),
  ('2025-04-18', 'Viernes Santo',                  'nacional'),
  ('2025-04-19', 'Sábado de Gloria',               'nacional'),
  ('2025-05-01', 'Día del Trabajo',                'nacional'),
  ('2025-06-30', 'Día del Ejército de Guatemala',  'nacional'),
  ('2025-09-15', 'Día de la Independencia',        'nacional'),
  ('2025-10-20', 'Día de la Revolución',           'nacional'),
  ('2025-11-01', 'Día de Todos los Santos',        'nacional'),
  ('2025-12-24', 'Nochebuena',                     'nacional'),
  ('2025-12-25', 'Navidad',                        'nacional'),
  ('2025-12-31', 'Fin de Año',                     'nacional'),
  ('2026-01-01', 'Año Nuevo',                      'nacional'),
  ('2026-04-02', 'Jueves Santo',                   'nacional'),
  ('2026-04-03', 'Viernes Santo',                  'nacional'),
  ('2026-04-04', 'Sábado de Gloria',               'nacional'),
  ('2026-05-01', 'Día del Trabajo',                'nacional'),
  ('2026-06-30', 'Día del Ejército de Guatemala',  'nacional'),
  ('2026-09-15', 'Día de la Independencia',        'nacional'),
  ('2026-10-20', 'Día de la Revolución',           'nacional'),
  ('2026-11-01', 'Día de Todos los Santos',        'nacional'),
  ('2026-12-24', 'Nochebuena',                     'nacional'),
  ('2026-12-25', 'Navidad',                        'nacional'),
  ('2026-12-31', 'Fin de Año',                     'nacional');


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- ✅ Script completado
-- Acceso: admin@tazos.com / Admin1234!
-- ============================================================
