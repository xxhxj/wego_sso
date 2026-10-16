import { Router } from 'express';
import { operationLogger, requirePermission } from '../auth.js';
import { pool } from '../db.js';

export const rolesRouter = Router();
rolesRouter.use(requirePermission('role:list'));
rolesRouter.use(operationLogger('角色配置'));

rolesRouter.get('/', async (_req, res, next) => {
  try {
    const [roles] = await pool.query(
      'SELECT id, code, name, status, remark FROM sys_role ORDER BY id',
    );
    const data = [];
    for (const role of roles) {
      const [menus] = await pool.query('SELECT menu_id FROM sys_role_menu WHERE role_id = ?', [role.id]);
      data.push({ ...role, menuIds: menus.map((item) => item.menu_id) });
    }
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

rolesRouter.post('/', async (req, res, next) => {
  const code = String(req.body?.code || '').trim();
  const name = String(req.body?.name || '').trim();
  const remark = String(req.body?.remark || '').trim();
  const status = req.body?.status === 0 ? 0 : 1;
  const menuIds = Array.isArray(req.body?.menuIds) ? req.body.menuIds.map(Number) : [];
  if (!code || !name) return res.status(400).json({ message: '角色编码和名称不能为空' });
  try {
    const [result] = await pool.execute(
      'INSERT INTO sys_role (code, name, status, remark) VALUES (?, ?, ?, ?)',
      [code, name, status, remark],
    );
    await replaceMenus(result.insertId, menuIds);
    res.json({ id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: '角色编码已存在' });
    next(error);
  }
});

rolesRouter.put('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  const name = String(req.body?.name || '').trim();
  const remark = String(req.body?.remark || '').trim();
  const status = req.body?.status === 0 ? 0 : 1;
  const menuIds = Array.isArray(req.body?.menuIds) ? req.body.menuIds.map(Number) : [];
  if (!name) return res.status(400).json({ message: '角色名称不能为空' });
  try {
    await pool.execute('UPDATE sys_role SET name = ?, status = ?, remark = ? WHERE id = ?', [name, status, remark, id]);
    await replaceMenus(id, menuIds);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

rolesRouter.delete('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  try {
    const [roles] = await pool.query('SELECT code FROM sys_role WHERE id = ?', [id]);
    if (roles[0]?.code === 'admin') return res.status(400).json({ message: '管理员角色不能删除' });
    await pool.execute('DELETE FROM sys_role_menu WHERE role_id = ?', [id]);
    await pool.execute('DELETE FROM sys_user_role WHERE role_id = ?', [id]);
    await pool.execute('DELETE FROM sys_role WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

async function replaceMenus(roleId, menuIds) {
  await pool.execute('DELETE FROM sys_role_menu WHERE role_id = ?', [roleId]);
  for (const menuId of menuIds) {
    if (!menuId) continue;
    await pool.execute('INSERT INTO sys_role_menu (role_id, menu_id) VALUES (?, ?)', [roleId, menuId]);
  }
}
