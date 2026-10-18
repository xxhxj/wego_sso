import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { clientIp, isAdmin, memberActive, requireAuth, signToken, toTree } from '../auth.js';
import { pool } from '../db.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const ip = clientIp(req);
  try {
    const [users] = await pool.query(
      'SELECT id, username, password_hash, nickname, status FROM sys_user WHERE username = ? LIMIT 1',
      [username],
    );
    const user = users[0];
    const matched = user && await bcrypt.compare(password, user.password_hash);
    if (!user || !matched || user.status !== 1) {
      await pool.execute(
        'INSERT INTO sys_login_log (username, ip, success, message) VALUES (?, ?, 0, ?)',
        [username || '-', ip, '用户名或密码错误'],
      );
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    await pool.execute(
      'INSERT INTO sys_login_log (username, ip, success, message) VALUES (?, ?, 1, ?)',
      [user.username, ip, '登录成功'],
    );
    res.json({
      token: signToken(user),
      user: { id: user.id, username: user.username, nickname: user.nickname },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, nickname, status, member_expire_at AS memberExpireAt FROM sys_user WHERE id = ? LIMIT 1',
      [req.user.id],
    );
    const user = users[0];
    if (!user || user.status !== 1) return res.status(401).json({ message: '账号不可用' });
    res.json({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      status: user.status,
      admin: await isAdmin(user.id),
      member: memberActive(user.memberExpireAt),
      memberExpireAt: user.memberExpireAt,
    });
  } catch (error) {
    next(error);
  }
});

const PLANS = {
  month: { amount: 29, days: 30, name: '月会员' },
  year: { amount: 199, days: 365, name: '年会员' },
};

authRouter.post('/membership', requireAuth, async (req, res, next) => {
  const plan = PLANS[req.body?.plan];
  if (!plan) return res.status(400).json({ message: '请选择月会员或年会员' });
  try {
    await pool.execute(
      'INSERT INTO sys_member_order (user_id, plan_code, amount, days) VALUES (?, ?, ?, ?)',
      [req.user.id, req.body.plan, plan.amount, plan.days],
    );
    await pool.execute(
      `UPDATE sys_user
       SET member_expire_at = DATE_ADD(GREATEST(IFNULL(member_expire_at, NOW()), NOW()), INTERVAL ? DAY)
       WHERE id = ?`,
      [plan.days, req.user.id],
    );
    const [users] = await pool.query('SELECT member_expire_at AS memberExpireAt FROM sys_user WHERE id = ?', [req.user.id]);
    res.json({
      member: true,
      memberExpireAt: users[0].memberExpireAt,
      message: `${plan.name}已开通`,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/apps', requireAuth, async (req, res, next) => {
  try {
    const admin = await isAdmin(req.user.id);
    const sql = admin
      ? `SELECT id, code, name, entry_url AS entryUrl, sort_order AS sortOrder
         FROM sys_app
         WHERE status = 1
         ORDER BY sort_order, id`
      : `SELECT DISTINCT a.id, a.code, a.name, a.entry_url AS entryUrl, a.sort_order AS sortOrder
         FROM sys_app a
         JOIN sys_menu m ON m.app_id = a.id AND m.status = 1
         JOIN sys_role_menu rm ON rm.menu_id = m.id
         JOIN sys_user_role ur ON ur.role_id = rm.role_id
         WHERE a.status = 1 AND ur.user_id = ?
         ORDER BY a.sort_order, a.id`;
    const [rows] = await pool.query(sql, admin ? [] : [req.user.id]);
    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/menus', requireAuth, async (req, res, next) => {
  const appCode = String(req.query.app || 'sso');
  try {
    const admin = await isAdmin(req.user.id);
    const sql = admin
      ? `SELECT m.*
         FROM sys_menu m
         JOIN sys_app a ON a.id = m.app_id
         WHERE a.code = ? AND m.status = 1
         ORDER BY m.sort_order, m.id`
      : `SELECT DISTINCT m.*
         FROM sys_menu m
         JOIN sys_app a ON a.id = m.app_id
         JOIN sys_role_menu rm ON rm.menu_id = m.id
         JOIN sys_user_role ur ON ur.role_id = rm.role_id
         WHERE a.code = ? AND ur.user_id = ? AND m.status = 1
         ORDER BY m.sort_order, m.id`;
    const params = admin ? [appCode] : [appCode, req.user.id];
    const [rows] = await pool.query(sql, params);
    res.json({ data: toTree(rows) });
  } catch (error) {
    next(error);
  }
});
