-- =====================================================================
--  ZIP GAME — Esquema de referencia (equivalente a las migraciones)
--  IMPORTANTE: la base se crea con `node ace migration:run`.
--  Este archivo sirve para documentación, el reporte técnico y el diagrama ER.
-- =====================================================================
USE zip_game;

CREATE TABLE users (
  id                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username               VARCHAR(30)  NOT NULL UNIQUE,
  email                  VARCHAR(254) NOT NULL UNIQUE,
  password               VARCHAR(255) NOT NULL,                 -- hash scrypt
  recommended_difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'easy',
  created_at             TIMESTAMP NOT NULL,
  updated_at             TIMESTAMP NULL
);

CREATE TABLE auth_access_tokens (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tokenable_id  INT UNSIGNED NOT NULL,
  type          VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NULL,
  hash          VARCHAR(255) NOT NULL,                          -- hash del token
  abilities     TEXT NOT NULL,
  created_at    TIMESTAMP NULL,
  updated_at    TIMESTAMP NULL,
  last_used_at  TIMESTAMP NULL,
  expires_at    TIMESTAMP NULL,
  FOREIGN KEY (tokenable_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE levels (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(80) NOT NULL,
  difficulty       ENUM('easy','medium','hard') NOT NULL,
  size             TINYINT UNSIGNED NOT NULL DEFAULT 6,
  checkpoints      JSON NOT NULL,                               -- [celda del 1, celda del 2, ...]
  solution         JSON NOT NULL,                               -- 36 celdas (privado)
  checkpoint_count TINYINT UNSIGNED NOT NULL,
  difficulty_score SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_generated     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMP NOT NULL,
  updated_at       TIMESTAMP NULL,
  INDEX (difficulty)
);

CREATE TABLE game_sessions (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          INT UNSIGNED NOT NULL,
  level_id         INT UNSIGNED NOT NULL,
  status           ENUM('in_progress','completed','abandoned') NOT NULL DEFAULT 'in_progress',
  difficulty       ENUM('easy','medium','hard') NOT NULL,
  started_at       DATETIME NOT NULL,
  finished_at      DATETIME NULL,
  duration_seconds INT UNSIGNED NULL,
  mistakes         INT UNSIGNED NOT NULL DEFAULT 0,
  hints_used       INT UNSIGNED NOT NULL DEFAULT 0,
  failed_attempts  INT UNSIGNED NOT NULL DEFAULT 0,
  final_path       JSON NULL,
  created_at       TIMESTAMP NOT NULL,
  updated_at       TIMESTAMP NULL,
  INDEX (user_id, status),
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE RESTRICT
);

CREATE TABLE game_moves (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  game_session_id INT UNSIGNED NOT NULL,
  sequence        INT UNSIGNED NOT NULL,
  cell_index      TINYINT UNSIGNED NULL,
  move_type       ENUM('add','undo','invalid','restart') NOT NULL,
  elapsed_ms      INT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL,
  UNIQUE (game_session_id, sequence),
  FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

CREATE TABLE scores (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          INT UNSIGNED NOT NULL,
  level_id         INT UNSIGNED NOT NULL,
  game_session_id  INT UNSIGNED NOT NULL UNIQUE,                -- 1 puntaje por partida
  points           INT UNSIGNED NOT NULL,
  duration_seconds INT UNSIGNED NOT NULL,
  mistakes         INT UNSIGNED NOT NULL DEFAULT 0,
  hints_used       INT UNSIGNED NOT NULL DEFAULT 0,
  difficulty       ENUM('easy','medium','hard') NOT NULL,
  created_at       TIMESTAMP NOT NULL,
  INDEX (user_id, level_id),
  INDEX (points),
  FOREIGN KEY (user_id)         REFERENCES users(id)         ON DELETE CASCADE,
  FOREIGN KEY (level_id)        REFERENCES levels(id)        ON DELETE RESTRICT,
  FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);
