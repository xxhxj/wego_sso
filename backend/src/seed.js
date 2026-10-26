import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { config } from './config.js';
import { pool } from './db.js';

const statements = [
  `CREATE TABLE IF NOT EXISTS sys_app (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    status TINYINT NOT NULL DEFAULT 1,
    entry_url VARCHAR(255) NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS sys_user (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(64) NOT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    member_expire_at DATETIME NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS sys_member_order (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_code VARCHAR(32) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    days INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS sys_role (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    remark VARCHAR(255) NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS sys_user_role (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS sys_menu (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    app_id INT NOT NULL,
    parent_id INT NOT NULL DEFAULT 0,
    name VARCHAR(64) NOT NULL,
    path VARCHAR(255) NOT NULL DEFAULT '',
    permission VARCHAR(128) NOT NULL DEFAULT '',
    menu_type VARCHAR(16) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    status TINYINT NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS sys_role_menu (
    role_id INT NOT NULL,
    menu_id INT NOT NULL,
    PRIMARY KEY (role_id, menu_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS sys_login_log (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL,
    ip VARCHAR(64) NOT NULL DEFAULT '',
    success TINYINT NOT NULL,
    message VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS sys_operation_log (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL DEFAULT 0,
    username VARCHAR(64) NOT NULL DEFAULT '',
    module_name VARCHAR(64) NOT NULL,
    action_name VARCHAR(128) NOT NULL,
    method VARCHAR(16) NOT NULL,
    path VARCHAR(255) NOT NULL,
    ip VARCHAR(64) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

const menuSeed = [
  { key: 'portal', app: 'sso', parent: '', name: '系统列表', path: '/systems', permission: '', type: 'menu', sort: 0 },
  { key: 'system', app: 'sso', parent: '', name: '系统管理', path: '/system', permission: '', type: 'dir', sort: 1 },
  { key: 'users', app: 'sso', parent: 'system', name: '用户管理', path: '/users', permission: 'user:list', type: 'menu', sort: 1 },
  { key: 'roles', app: 'sso', parent: 'system', name: '角色配置', path: '/roles', permission: 'role:list', type: 'menu', sort: 2 },
  { key: 'menus', app: 'sso', parent: 'system', name: '菜单配置', path: '/menus', permission: 'menu:list', type: 'menu', sort: 3 },
  { key: 'audit', app: 'sso', parent: '', name: '审计日志', path: '/audit', permission: '', type: 'dir', sort: 2 },
  { key: 'loginLogs', app: 'sso', parent: 'audit', name: '登录日志', path: '/login-logs', permission: 'login:list', type: 'menu', sort: 1 },
  { key: 'operationLogs', app: 'sso', parent: 'audit', name: '操作日志', path: '/operation-logs', permission: 'operation:list', type: 'menu', sort: 2 },
  { key: 'mockupRoot', app: 'wego-mockup', parent: '', name: '包装样机', path: '', permission: '', type: 'dir', sort: 1 },
  { key: 'edit', app: 'wego-mockup', parent: 'mockupRoot', name: '编辑', path: 'edit', permission: 'mockup:edit', type: 'menu', sort: 1 },
  { key: 'mockup', app: 'wego-mockup', parent: 'mockupRoot', name: '样机', path: 'mockup', permission: 'mockup:view', type: 'menu', sort: 2 },
  { key: 'upload', app: 'wego-mockup', parent: 'mockupRoot', name: '3D模型上传', path: 'upload', permission: 'mockup:upload', type: 'menu', sort: 3 },
  { key: 'cadRoot', app: 'wego-cad', parent: '', name: '三维建模', path: '', permission: '', type: 'dir', sort: 1 },
  { key: 'workspace', app: 'wego-cad', parent: 'cadRoot', name: '工作区', path: 'workspace', permission: 'cad:model', type: 'menu', sort: 1 },
  { key: 'tutorials', app: 'wego-cad', parent: 'cadRoot', name: '教程', path: 'tutorials', permission: 'cad:tutorial', type: 'menu', sort: 2 },
];

async function ensureDatabase() {
  const connection = await mysql.createConnection({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
  });
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.end();
}

async function upsertApp(code, name, sortOrder, entryUrl = '') {
  await pool.execute(
    `INSERT INTO sys_app (code, name, sort_order, status, entry_url) VALUES (?, ?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order), entry_url = VALUES(entry_url)`,
    [code, name, sortOrder, entryUrl || null],
  );
  const [rows] = await pool.query('SELECT id FROM sys_app WHERE code = ?', [code]);
  return rows[0].id;
}

async function upsertUser(username, password, nickname) {
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.execute(
    `INSERT INTO sys_user (username, password_hash, nickname, status) VALUES (?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), nickname = VALUES(nickname), status = 1`,
    [username, passwordHash, nickname],
  );
  const [rows] = await pool.query('SELECT id FROM sys_user WHERE username = ?', [username]);
  return rows[0].id;
}

async function upsertRole(code, name, remark) {
  await pool.execute(
    `INSERT INTO sys_role (code, name, status, remark) VALUES (?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), remark = VALUES(remark), status = 1`,
    [code, name, remark],
  );
  const [rows] = await pool.query('SELECT id FROM sys_role WHERE code = ?', [code]);
  return rows[0].id;
}

async function seed() {
  await ensureDatabase();
  for (const statement of statements) await pool.query(statement);
  try {
    await pool.query('ALTER TABLE sys_user ADD COLUMN member_expire_at DATETIME NULL');
  } catch (error) {
    if (error.errno !== 1060) throw error;
  }
  try {
    await pool.query('ALTER TABLE sys_app ADD COLUMN entry_url VARCHAR(255) NULL');
  } catch (error) {
    if (error.errno !== 1060) throw error;
  }
  const apps = {
    sso: await upsertApp('sso', '单点登录', 1, ''),
    'wego-mockup': await upsertApp('wego-mockup', '包装样机', 2, 'http://127.0.0.1:5173/'),
    'wego-cad': await upsertApp('wego-cad', '三维建模', 3, 'http://127.0.0.1:5175/'),
  };
  const ids = {};
  for (const item of menuSeed) {
    const parentId = item.parent ? ids[item.parent] : 0;
    const [existing] = await pool.query(
      'SELECT id FROM sys_menu WHERE app_id = ? AND path = ? AND name = ? LIMIT 1',
      [apps[item.app], item.path, item.name],
    );
    if (existing[0]) {
      ids[item.key] = existing[0].id;
      await pool.execute(
        `UPDATE sys_menu
         SET parent_id = ?, permission = ?, menu_type = ?, sort_order = ?, status = 1
         WHERE id = ?`,
        [parentId, item.permission, item.type, item.sort, existing[0].id],
      );
    } else {
      const [result] = await pool.execute(
        `INSERT INTO sys_menu (app_id, parent_id, name, path, permission, menu_type, sort_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [apps[item.app], parentId, item.name, item.path, item.permission, item.type, item.sort],
      );
      ids[item.key] = result.insertId;
    }
  }
  const adminRole = await upsertRole('admin', '系统管理员', '拥有全部菜单');
  const designerRole = await upsertRole('designer', '样机设计师', '只能使用包装样机');
  const makerRole = await upsertRole('maker', '建模用户', '只能使用三维建模');
  const adminUser = await upsertUser('admin', 'admin123', '管理员');
  const designerUser = await upsertUser('designer', 'designer123', '设计师');
  const makerUser = await upsertUser('maker', 'maker123', '建模师');
  await pool.execute('DELETE FROM sys_user_role WHERE user_id IN (?, ?, ?)', [adminUser, designerUser, makerUser]);
  await pool.execute(
    'INSERT INTO sys_user_role (user_id, role_id) VALUES (?, ?), (?, ?), (?, ?)',
    [adminUser, adminRole, designerUser, designerRole, makerUser, makerRole],
  );
  const [menus] = await pool.query('SELECT id, app_id, permission FROM sys_menu');
  await pool.execute('DELETE FROM sys_role_menu WHERE role_id IN (?, ?, ?)', [adminRole, designerRole, makerRole]);
  for (const menu of menus) {
    await pool.execute('INSERT INTO sys_role_menu (role_id, menu_id) VALUES (?, ?)', [adminRole, menu.id]);
    if (menu.app_id === apps['wego-mockup'] && menu.permission !== 'mockup:upload') {
      await pool.execute('INSERT INTO sys_role_menu (role_id, menu_id) VALUES (?, ?)', [designerRole, menu.id]);
    }
    if (menu.app_id === apps['wego-cad']) {
      await pool.execute('INSERT INTO sys_role_menu (role_id, menu_id) VALUES (?, ?)', [makerRole, menu.id]);
    }
  }
  await pool.execute(
    'UPDATE sys_user SET member_expire_at = DATE_ADD(NOW(), INTERVAL 1 YEAR) WHERE username IN (?, ?)',
    ['admin', 'maker'],
  );
  await pool.execute('UPDATE sys_user SET member_expire_at = NULL WHERE username = ?', ['designer']);
  console.log('单点库 wego_sso 已就绪。管理员 admin / admin123，样机 designer / designer123，建模 maker / maker123');
  await pool.end();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
