-- HX//OS Multiplayer Schema — MySQL 8.0
-- UUIDs generated in application layer via crypto.randomUUID()

CREATE TABLE IF NOT EXISTS players (
  id            CHAR(36) NOT NULL,
  google_id     VARCHAR(64) NOT NULL,
  username      VARCHAR(32) NOT NULL,
  wallet_addr   VARCHAR(42) NOT NULL,
  crypto        DECIMAL(18,6) NOT NULL DEFAULT 0,
  avatar_url    VARCHAR(512) NULL,
  local_data    JSON NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  grace_ends_at DATETIME NOT NULL,
  last_seen_at  DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_google_id (google_id),
  UNIQUE KEY uq_username (username),
  UNIQUE KEY uq_wallet_addr (wallet_addr)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS machines (
  id            CHAR(36) NOT NULL,
  owner_id      CHAR(36) NOT NULL,
  hostname      VARCHAR(64) NOT NULL,
  ip_address    VARCHAR(45) NOT NULL,
  rig_level     INT NOT NULL DEFAULT 1,
  cpu_level     INT NOT NULL DEFAULT 1,
  net_level     INT NOT NULL DEFAULT 1,
  firewall_lvl  INT NOT NULL DEFAULT 1,
  ids_active    TINYINT(1) NOT NULL DEFAULT 0,
  honeypot_on   TINYINT(1) NOT NULL DEFAULT 0,
  is_online     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hostname (hostname),
  UNIQUE KEY uq_ip (ip_address),
  CONSTRAINT fk_machine_owner FOREIGN KEY (owner_id) REFERENCES players (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Who has remote access on whose machine (post-hack)
CREATE TABLE IF NOT EXISTS machine_access (
  id            CHAR(36) NOT NULL,
  machine_id    CHAR(36) NOT NULL,
  controller_id CHAR(36) NOT NULL,
  mining_share  DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  installed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_machine_controller (machine_id, controller_id),
  CONSTRAINT fk_access_machine FOREIGN KEY (machine_id) REFERENCES machines (id) ON DELETE CASCADE,
  CONSTRAINT fk_access_ctrl FOREIGN KEY (controller_id) REFERENCES players (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hack_log (
  id            CHAR(36) NOT NULL,
  attacker_id   CHAR(36) NOT NULL,
  target_id     CHAR(36) NOT NULL,
  puzzle_kind   VARCHAR(20) NULL,
  success       TINYINT(1) NOT NULL DEFAULT 0,
  reward        DECIMAL(18,6) NOT NULL DEFAULT 0,
  hit_honeypot  TINYINT(1) NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_hacklog_attacker (attacker_id),
  KEY idx_hacklog_target (target_id),
  CONSTRAINT fk_hacklog_attacker FOREIGN KEY (attacker_id) REFERENCES players (id) ON DELETE CASCADE,
  CONSTRAINT fk_hacklog_target FOREIGN KEY (target_id) REFERENCES machines (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS guilds (
  id          CHAR(36) NOT NULL,
  name        VARCHAR(64) NOT NULL,
  tag         VARCHAR(6) NOT NULL,
  treasury    DECIMAL(18,6) NOT NULL DEFAULT 0,
  created_by  CHAR(36) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_guild_name (name),
  UNIQUE KEY uq_guild_tag (tag),
  CONSTRAINT fk_guild_creator FOREIGN KEY (created_by) REFERENCES players (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS guild_members (
  guild_id  CHAR(36) NOT NULL,
  player_id CHAR(36) NOT NULL,
  role      ENUM('leader','member') NOT NULL DEFAULT 'member',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (guild_id, player_id),
  CONSTRAINT fk_gm_guild  FOREIGN KEY (guild_id)  REFERENCES guilds (id)   ON DELETE CASCADE,
  CONSTRAINT fk_gm_player FOREIGN KEY (player_id) REFERENCES players (id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Channels: public (#general etc), guild, dm (2 players), system (per-player log)
CREATE TABLE IF NOT EXISTS channels (
  id         CHAR(36) NOT NULL,
  name       VARCHAR(64) NULL,
  kind       ENUM('public','guild','dm','system') NOT NULL,
  guild_id   CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_channel_guild FOREIGN KEY (guild_id) REFERENCES guilds (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS channel_members (
  channel_id CHAR(36) NOT NULL,
  player_id  CHAR(36) NOT NULL,
  last_read  DATETIME NULL,
  PRIMARY KEY (channel_id, player_id),
  CONSTRAINT fk_cm_channel FOREIGN KEY (channel_id) REFERENCES channels (id) ON DELETE CASCADE,
  CONSTRAINT fk_cm_player  FOREIGN KEY (player_id)  REFERENCES players (id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS messages (
  id         CHAR(36) NOT NULL,
  channel_id CHAR(36) NOT NULL,
  sender_id  CHAR(36) NULL,                   -- NULL = system message
  content    TEXT NOT NULL,
  msg_kind   ENUM('chat','system_hack','system_mine','system_alert') NOT NULL DEFAULT 'chat',
  sent_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_messages_channel_time (channel_id, sent_at),
  CONSTRAINT fk_msg_channel FOREIGN KEY (channel_id) REFERENCES channels (id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender  FOREIGN KEY (sender_id)  REFERENCES players (id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed the three permanent public channels
INSERT IGNORE INTO channels (id, name, kind) VALUES
  ('00000000-0000-0000-0001-000000000001', '#general', 'public'),
  ('00000000-0000-0000-0001-000000000002', '#trading',  'public'),
  ('00000000-0000-0000-0001-000000000003', '#wanted',   'public');