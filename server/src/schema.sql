-- HX//OS Multiplayer Schema — MySQL 8.0
-- UUIDs generated in application layer via crypto.randomUUID()

CREATE TABLE IF NOT EXISTS players (
  id            CHAR(36) NOT NULL,
  google_id     VARCHAR(64) NOT NULL,
  username      VARCHAR(32) NOT NULL,
  wallet_addr   VARCHAR(42) NOT NULL,
  crypto        DOUBLE NOT NULL DEFAULT 0,
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
  puzzle_kind   VARCHAR(20) NOT NULL DEFAULT 'portscan',
  hack_reward   DOUBLE NOT NULL DEFAULT 0.02,
  tier          TINYINT NOT NULL DEFAULT 0,
  tier_hashrate INT NULL,
  flavor        VARCHAR(200) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hostname (hostname),
  UNIQUE KEY uq_ip (ip_address),
  CONSTRAINT fk_machine_owner FOREIGN KEY (owner_id) REFERENCES players (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- In-progress hack puzzle sessions (server-generated, expire in 5 min)
CREATE TABLE IF NOT EXISTS hack_sessions (
  id            CHAR(36) NOT NULL,
  player_id     CHAR(36) NOT NULL,
  machine_id    CHAR(36) NOT NULL,
  puzzle_kind   VARCHAR(20) NOT NULL,
  answer        VARCHAR(128) NOT NULL,
  puzzle_data   JSON NULL,
  attempts      TINYINT NOT NULL DEFAULT 0,
  current_stage TINYINT NOT NULL DEFAULT 0,
  expires_at    DATETIME NOT NULL,
  used          TINYINT(1) NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hs_player_machine (player_id, machine_id),
  KEY idx_hs_expires (expires_at),
  CONSTRAINT fk_hs_player  FOREIGN KEY (player_id)  REFERENCES players (id) ON DELETE CASCADE,
  CONSTRAINT fk_hs_machine FOREIGN KEY (machine_id) REFERENCES machines (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Who has remote access on whose machine (post-hack)
CREATE TABLE IF NOT EXISTS machine_access (
  id            CHAR(36) NOT NULL,
  machine_id    CHAR(36) NOT NULL,
  controller_id CHAR(36) NOT NULL,
  mining_share  DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  installed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_machine_controller (machine_id, controller_id),
  KEY idx_ma_controller (controller_id),
  KEY idx_ma_expires (expires_at),
  CONSTRAINT fk_access_machine FOREIGN KEY (machine_id) REFERENCES machines (id) ON DELETE CASCADE,
  CONSTRAINT fk_access_ctrl FOREIGN KEY (controller_id) REFERENCES players (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hack_log (
  id            CHAR(36) NOT NULL,
  attacker_id   CHAR(36) NOT NULL,
  target_id     CHAR(36) NOT NULL,
  puzzle_kind   VARCHAR(20) NULL,
  success       TINYINT(1) NOT NULL DEFAULT 0,
  reward        DOUBLE NOT NULL DEFAULT 0,
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
  treasury    DOUBLE NOT NULL DEFAULT 0,
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

-- NPC system player (owns all hardcoded hack targets)
INSERT IGNORE INTO players (id, google_id, username, wallet_addr, grace_ends_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'npc_system', '[NPC]', '0x0000000000000000000000000000000000000001', '2099-01-01 00:00:00');

-- NPC machines — 5 tiers, 5 machines each (25 total)
-- tier_hashrate overrides the level formula for income; tier drives puzzle difficulty and access expiry
-- ON DUPLICATE KEY UPDATE keeps existing DBs in sync without requiring a reset
INSERT INTO machines (id, owner_id, hostname, ip_address, rig_level, cpu_level, net_level, tier, tier_hashrate, puzzle_kind, hack_reward, flavor) VALUES
  ('00000000-0000-0000-0002-000000000001','00000000-0000-0000-0000-000000000001','gibson.mil',             '10.0.4.7',      1,1,1,1, 20,  'portscan',0.015,'US Military relay — low-sec gateway.'),
  ('00000000-0000-0000-0002-000000000002','00000000-0000-0000-0000-000000000001','phreak.pbx.7734',        '64.64.64.64',   1,1,1,1, 22,  'portscan',0.020,'Old PBX. Tone-dial still works.'),
  ('00000000-0000-0000-0002-000000000003','00000000-0000-0000-0000-000000000001','relay.arpanet.old',      '10.0.0.1',      1,1,1,1, 18,  'password',0.016,'Original ARPANET relay. Ancient, unpatched.'),
  ('00000000-0000-0000-0002-000000000004','00000000-0000-0000-0000-000000000001','beacon.dial-up.net',     '10.10.0.1',     1,1,1,1, 21,  'password',0.018,'56K modem pool. Someone left the door open.'),
  ('00000000-0000-0000-0002-000000000005','00000000-0000-0000-0000-000000000001','node.bbs.512k',          '10.20.0.1',     1,1,1,1, 19,  'portscan',0.012,'Abandoned BBS node. Sysop MIA since 1998.'),
  ('00000000-0000-0000-0002-000000000006','00000000-0000-0000-0000-000000000001','mainframe.ellingson',    '198.51.100.23', 2,2,2,2, 80,  'password',0.040,'Ellingson Mineral Co. — rainbow books onsite.'),
  ('00000000-0000-0000-0002-000000000007','00000000-0000-0000-0000-000000000001','gateway.globalnet',      '203.0.113.8',   2,2,2,2, 78,  'cipher',  0.035,'Tokyo uplink. Try not to trip the ICE.'),
  ('00000000-0000-0000-0002-000000000008','00000000-0000-0000-0000-000000000001','atm-central.bnk',        '10.10.10.10',   2,2,2,2, 82,  'password',0.055,'First National ATM switch.'),
  ('00000000-0000-0000-0002-000000000009','00000000-0000-0000-0000-000000000001','switch.telco.co',        '172.16.0.1',    2,2,2,2, 75,  'cipher',  0.040,'Regional telco exchange. Fat pipe, lazy admin.'),
  ('00000000-0000-0000-0002-000000000010','00000000-0000-0000-0000-000000000001','vault.creditco.net',     '172.16.1.1',    2,2,2,2, 85,  'password',0.045,'Credit bureau archive. Password policy: password1.'),
  ('00000000-0000-0000-0002-000000000011','00000000-0000-0000-0000-000000000001','darkstar.corp',          '172.16.9.42',   3,3,3,3, 300, 'portscan',0.090,'Corporate mainframe. Heavy firewall.'),
  ('00000000-0000-0000-0002-000000000012','00000000-0000-0000-0000-000000000001','orbital.sat-7',          '198.18.7.7',    3,3,3,3, 310, 'cipher',  0.120,'Low-orbit sat uplink. Window: 90 seconds.'),
  ('00000000-0000-0000-0002-000000000013','00000000-0000-0000-0000-000000000001','fortress.pentagon.mil',  '203.0.113.50',  3,3,3,3, 280, 'portscan',0.100,'DoD logistics cluster. SCIF adjacent.'),
  ('00000000-0000-0000-0002-000000000014','00000000-0000-0000-0000-000000000001','nexus.bluecoat.io',      '203.0.113.51',  3,3,3,3, 320, 'password',0.110,'Threat intel aggregator. Ironic.'),
  ('00000000-0000-0000-0002-000000000015','00000000-0000-0000-0000-000000000001','grid.power-sys.gov',     '203.0.113.52',  3,3,3,3, 290, 'cipher',  0.130,'Eastern seaboard power grid SCADA interface.'),
  ('00000000-0000-0000-0002-000000000016','00000000-0000-0000-0000-000000000001','nsa.gov.ghost',          '192.0.2.99',    4,4,4,4, 1200,'chained', 0.250,'⚠ THREE LETTER AGENCY — trace enabled.'),
  ('00000000-0000-0000-0002-000000000017','00000000-0000-0000-0000-000000000001','echelon.sigint.mil',     '192.0.2.100',   4,4,4,4, 1250,'chained', 0.280,'⚠ SIGINT intercept node. You are being watched.'),
  ('00000000-0000-0000-0002-000000000018','00000000-0000-0000-0000-000000000001','vault.fed-reserve.fin',  '192.0.2.101',   4,4,4,4, 1150,'chained', 0.300,'⚠ Federal Reserve wire transfer gateway.'),
  ('00000000-0000-0000-0002-000000000019','00000000-0000-0000-0000-000000000001','core.swiftnet.bank',     '192.0.2.102',   4,4,4,4, 1300,'chained', 0.220,'⚠ SWIFT interbank settlement core.'),
  ('00000000-0000-0000-0002-000000000020','00000000-0000-0000-0000-000000000001','shadow.five-eyes.int',   '192.0.2.103',   4,4,4,4, 1100,'chained', 0.350,'⚠ Five Eyes intelligence sharing node.'),
  ('00000000-0000-0000-0002-000000000021','00000000-0000-0000-0000-000000000001','norad.deep.gov',         '198.18.0.1',    5,5,5,5, 5000,'chained', 0.600,'⛔ NORAD command net. Nuclear authorization relay.'),
  ('00000000-0000-0000-0002-000000000022','00000000-0000-0000-0000-000000000001','darpa.classified.mil',   '198.18.0.2',    5,5,5,5, 5200,'chained', 0.750,'⛔ DARPA black project mainframe. Clearance: TS/SCI.'),
  ('00000000-0000-0000-0002-000000000023','00000000-0000-0000-0000-000000000001','omega.matrix.corp',      '198.18.0.3',    5,5,5,5, 4800,'chained', 0.550,'⛔ MegaCorp central AI substrate.'),
  ('00000000-0000-0000-0002-000000000024','00000000-0000-0000-0000-000000000001','blacksite.xkeyscore.nsa','198.18.0.4',    5,5,5,5, 5500,'chained', 0.800,'⛔ XKeyscore intercept grid. Every packet. Everywhere.'),
  ('00000000-0000-0000-0002-000000000025','00000000-0000-0000-0000-000000000001','ghost.skynet.ai',        '198.18.0.5',    5,5,5,5, 4600,'chained', 0.650,'⛔ Autonomous defense net. Do not trigger the failsafe.')
ON DUPLICATE KEY UPDATE
  rig_level     = VALUES(rig_level),
  cpu_level     = VALUES(cpu_level),
  net_level     = VALUES(net_level),
  tier          = VALUES(tier),
  tier_hashrate = VALUES(tier_hashrate),
  puzzle_kind   = VALUES(puzzle_kind),
  hack_reward   = VALUES(hack_reward),
  flavor        = VALUES(flavor);