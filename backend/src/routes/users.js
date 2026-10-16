import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { memberActive, operationLogger, requirePermission } from '../auth.js';
import { pool } from '../db.js';

export const usersRouter = Router();
usersRouter.use(requirePermission('user:list'));
usersRouter.use(operationLogger('用户管理'));

async function roleIdsOf(userId) {
  const [rows] = await pool.query('SELECT role_id FROM sys_user_role WHERE user_id = ?', [userId]);
  return rows.map((row) => row.role_id);
}

usersRouter.get('/', async (_req, res, next) => {
  try {
    const [users] = await pool.query(
      `SELECT id, username, nickname, status, created_at, member_expire_at AS memberExpireAt
       FROM sys_user ORDER BY id`,
    );
    const data = [];
    for (const user of users) {
      data.push({
        ...user,
        member: memberActive(user.memberExpireAt),
        roleIds: await roleIdsOf(user.id),
      });
    }
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

usersRouter.post('/', async (req, res, next) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const nickname = String(req.body?.nickname || username).trim();
  const status = req.body?.status === 0 ? 0 : 1;
  const roleIds = Array.isArray(req.body?.roleIds) ? req.body.roleIds.map(Number) : [];
  if (!username || password.length < 6) {
    return res.status(400).json({ message: '用户名不能为空，密码至少 6 位' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO sys_user (username, password_hash, nickname, status) VALUES (?, ?, ?, ?)',
      [username, passwordHash, nickname, status],
    );
    await replaceRoles(result.insertId, roleIds);
    res.json({ id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: '用户名已存在' });
    next(error);
  }
});

usersRouter.put('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  const nickname = String(req.body?.nickname || '').trim();
  const status = req.body?.status === 0 ? 0 : 1;
  const password = String(req.body?.password || '');
  const roleIds = Array.isArray(req.body?.roleIds) ? req.body.roleIds.map(Number) : [];
  if (!nickname) return res.status(400).json({ message: '姓名不能为空' });
  try {
    if (password) {
      if (password.length < 6) return res.status(400).json({ message: '密码至少 6 位' });
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.execute(
        'UPDATE sys_user SET nickname = ?, status = ?, password_hash = ? WHERE id = ?',
        [nickname, status, passwordHash, id],
      );
    } else {
      await pool.execute('UPDATE sys_user SET nickname = ?, status = ? WHERE id = ?', [nickname, status, id]);
    }
    await replaceRoles(id, roleIds);
    if (req.body?.memberMonths === 0) {
      await pool.execute('UPDATE sys_user SET member_expire_at = NULL WHERE id = ?', [id]);
    } else if (Number(req.body?.memberMonths) > 0) {
      await pool.execute(
        `UPDATE sys_user
         SET member_expire_at = DATE_ADD(GREATEST(IFNULL(member_expire_at, NOW()), NOW()), INTERVAL ? MONTH)
         WHERE id = ?`,
        [Number(req.body.memberMonths), id],
      );
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

usersRouter.delete('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ message: '不能删除当前登录账号' });
  try {
    await pool.execute('DELETE FROM sys_user_role WHERE user_id = ?', [id]);
    await pool.execute('DELETE FROM sys_user WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

async function replaceRoles(userId, roleIds) {
  await pool.execute('DELETE FROM sys_user_role WHERE user_id = ?', [userId]);
  for (const roleId of roleIds) {
    if (!roleId) continue;
    await pool.execute('INSERT INTO sys_user_role (user_id, role_id) VALUES (?, ?)', [userId, roleId]);
  }
}
