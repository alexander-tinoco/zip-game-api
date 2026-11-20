-- =====================================================================
--  ZIP GAME — Creación de bases de datos y usuario de la aplicación
--  Ejecutar UNA sola vez como root:
--     mysql -u root -p < database/sql/01_create_database.sql
--  ANTES de ejecutar: reemplaza CAMBIA_ESTA_CONTRASENA por una contraseña
--  propia y pon esa misma contraseña en DB_PASSWORD del archivo .env
--  (no subas a GitHub la versión con la contraseña real).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS zip_game
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Base de datos separada para las pruebas automáticas (node ace test)
CREATE DATABASE IF NOT EXISTS zip_game_test
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'zip_user'@'localhost' IDENTIFIED BY 'CAMBIA_ESTA_CONTRASENA';
CREATE USER IF NOT EXISTS 'zip_user'@'127.0.0.1' IDENTIFIED BY 'CAMBIA_ESTA_CONTRASENA';

-- Permisos mínimos: sólo sobre las bases del juego
GRANT ALL PRIVILEGES ON zip_game.*      TO 'zip_user'@'localhost';
GRANT ALL PRIVILEGES ON zip_game.*      TO 'zip_user'@'127.0.0.1';
GRANT ALL PRIVILEGES ON zip_game_test.* TO 'zip_user'@'localhost';
GRANT ALL PRIVILEGES ON zip_game_test.* TO 'zip_user'@'127.0.0.1';
FLUSH PRIVILEGES;
