import { Router } from 'express';
import { mapMenu, operationLogger, requirePermission } from '../auth.js';
import { pool } from '../db.js';

export const menusRouter = Router();
menusRouter.use(requirePermission('menu:list'));
menusRouter.use(operationLogger('菜单配置'));

const protectedApps = new Set(['sso', 'wego-mockup']);

function normalizeEntryUrl(value) {
  const text = String(value || '').trim();
  if (!text) return { value: null };
  try {
    const url = new URL(text);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { error: '访问地址只支持 http 或 https' };
    }
    return { value: text };
  } catch {
    return { error: '访问地址需要是完整网址，例如 http://127.0.0.1:5173/' };
  }
}

menusRouter.get('/apps', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, code, name, entry_url AS entryUrl, sort_order AS sortOrder, status FROM sys_app ORDER BY sort_order, id',
    );
    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

menusRouter.post('/apps', async (req, res, next) => {
  const code = String(req.body?.code || '').trim();
  const name = String(req.body?.name || '').trim();
  const sortOrder = Number(req.body?.sortOrder || 0);
  const entryUrl = normalizeEntryUrl(req.body?.entryUrl);
  if (!code || !name) return res.status(400).json({ message: '系统编码和名称不能为空' });
  if (entryUrl.error) return res.status(400).json({ message: entryUrl.error });
  try {
    const [result] = await pool.execute(
      'INSERT INTO sys_app (code, name, sort_order, status, entry_url) VALUES (?, ?, ?, 1, ?)',
      [code, name, sortOrder, entryUrl.value],
    );
    res.json({ id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: '系统编码已存在' });
    next(error);
  }
});

menusRouter.put('/apps/:id', async (req, res, next) => {
  const name = String(req.body?.name || '').trim();
  const sortOrder = Number(req.body?.sortOrder || 0);
  const status = req.body?.status === 0 ? 0 : 1;
  const entryUrl = normalizeEntryUrl(req.body?.entryUrl);
  if (!name) return res.status(400).json({ message: '系统名称不能为空' });
  if (entryUrl.error) return res.status(400).json({ message: entryUrl.error });
  try {
    await pool.execute('UPDATE sys_app SET name = ?, sort_order = ?, status = ?, entry_url = ? WHERE id = ?', [
      name,
      sortOrder,
      status,
      entryUrl.value,
      Number(req.params.id),
    ]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

menusRouter.delete('/apps/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  try {
    const [apps] = await pool.query('SELECT code FROM sys_app WHERE id = ?', [id]);
    if (!apps[0]) return res.status(404).json({ message: '系统不存在' });
    if (protectedApps.has(apps[0].code)) return res.status(400).json({ message: '内置系统不能删除' });
    const [menus] = await pool.query('SELECT id FROM sys_menu WHERE app_id = ?', [id]);
    const ids = menus.map((item) => item.id);
    if (ids.length) {
      await pool.query(`DELETE FROM sys_role_menu WHERE menu_id IN (${ids.map(() => '?').join(',')})`, ids);
      await pool.execute('DELETE FROM sys_menu WHERE app_id = ?', [id]);
    }
    await pool.execute('DELETE FROM sys_app WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

menusRouter.get('/', async (req, res, next) => {
  try {
    const params = [];
    let sql = 'SELECT * FROM sys_menu';
    if (req.query.appId) {
      sql += ' WHERE app_id = ?';
      params.push(Number(req.query.appId));
    }
    sql += ' ORDER BY sort_order, id';
    const [rows] = await pool.query(sql, params);
    res.json({ data: rows.map(mapMenu) });
  } catch (error) {
    next(error);
  }
});

menusRouter.post('/', async (req, res, next) => {
  const body = readMenu(req.body);
  if (!body.name || !body.appId) return res.status(400).json({ message: '菜单名称和所属系统不能为空' });
  try {
    const [result] = await pool.execute(
      `INSERT INTO sys_menu
       (app_id, parent_id, name, path, permission, menu_type, sort_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [body.appId, body.parentId, body.name, body.path, body.permission, body.menuType, body.sortOrder, body.status],
    );
    res.json({ id: result.insertId });
  } catch (error) {
    next(error);
  }
});

menusRouter.put('/:id', async (req, res, next) => {
  const body = readMenu(req.body);
  if (!body.name) return res.status(400).json({ message: '菜单名称不能为空' });
  try {
    await pool.execute(
      `UPDATE sys_menu
       SET parent_id = ?, name = ?, path = ?, permission = ?, menu_type = ?, sort_order = ?, status = ?
       WHERE id = ?`,
      [body.parentId, body.name, body.path, body.permission, body.menuType, body.sortOrder, body.status, Number(req.params.id)],
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

menusRouter.delete('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  try {
    const [children] = await pool.query('SELECT id FROM sys_menu WHERE parent_id = ? LIMIT 1', [id]);
    if (children.length) return res.status(400).json({ message: '请先删除子菜单' });
    await pool.execute('DELETE FROM sys_role_menu WHERE menu_id = ?', [id]);
    await pool.execute('DELETE FROM sys_menu WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

function readMenu(body = {}) {
  const menuType = ['dir', 'menu', 'button'].includes(body.menuType) ? body.menuType : 'menu';
  return {
    appId: Number(body.appId || 0),
    parentId: Number(body.parentId || 0),
    name: String(body.name || '').trim(),
    path: String(body.path || '').trim(),
    permission: String(body.permission || '').trim(),
    menuType,
    sortOrder: Number(body.sortOrder || 0),
    status: body.status === 0 ? 0 : 1,
  };
}
