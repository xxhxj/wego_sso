import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { pool } from './db.js';

export function memberActive(expireAt) {
  return Boolean(expireAt) && new Date(expireAt).getTime() > Date.now();
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, nickname: user.nickname },
    config.jwtSecret,
    { expiresIn: config.jwtExpires },
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ message: '未登录' });
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ message: '登录已过期' });
  }
}

export async function isAdmin(userId) {
  const [rows] = await pool.query(
    `SELECT 1
     FROM sys_user_role ur
     JOIN sys_role r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND r.code = 'admin' AND r.status = 1
     LIMIT 1`,
    [userId],
  );
  return rows.length > 0;
}

export async function hasPermission(userId, permission) {
  if (await isAdmin(userId)) return true;
  const [rows] = await pool.query(
    `SELECT 1
     FROM sys_user_role ur
     JOIN sys_role_menu rm ON rm.role_id = ur.role_id
     JOIN sys_menu m ON m.id = rm.menu_id
     WHERE ur.user_id = ? AND m.permission = ? AND m.status = 1
     LIMIT 1`,
    [userId, permission],
  );
  return rows.length > 0;
}

export function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      if (await hasPermission(req.user.id, permission)) return next();
      res.status(403).json({ message: '没有权限' });
    } catch (error) {
      next(error);
    }
  };
}

export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || '';
}

export function operationLogger(moduleName) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (!['POST', 'PUT', 'DELETE'].includes(req.method) || res.statusCode >= 400) return;
      const user = req.user || {};
      pool.execute(
        `INSERT INTO sys_operation_log
         (user_id, username, module_name, action_name, method, path, ip)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id || 0,
          user.username || '',
          moduleName,
          `${req.method} ${req.path}`,
          req.method,
          req.originalUrl.slice(0, 255),
          clientIp(req),
        ],
      ).catch((error) => console.error(error));
    });
    next();
  };
}

export function toTree(rows) {
  const nodes = rows.map((row) => ({ ...mapMenu(row), children: [] }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots = [];
  for (const node of nodes) {
    const parent = node.parentId ? byId.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export function mapMenu(row) {
  return {
    id: row.id,
    appId: row.app_id,
    parentId: row.parent_id,
    name: row.name,
    path: row.path,
    permission: row.permission,
    menuType: row.menu_type,
    sortOrder: row.sort_order,
    status: row.status,
  };
}
