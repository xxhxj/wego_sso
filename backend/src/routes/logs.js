import { Router } from 'express';
import { requirePermission } from '../auth.js';
import { pool } from '../db.js';

export const loginLogsRouter = Router();
loginLogsRouter.get('/', requirePermission('login:list'), async (req, res, next) => {
  try {
    res.json(await pageOf(
      'SELECT id, username, ip, success, message, created_at AS createdAt FROM sys_login_log',
      'sys_login_log',
      req,
    ));
  } catch (error) {
    next(error);
  }
});

export const operationLogsRouter = Router();
operationLogsRouter.get('/', requirePermission('operation:list'), async (req, res, next) => {
  try {
    res.json(await pageOf(
      `SELECT id, username, module_name AS moduleName, action_name AS actionName,
              method, path, ip, created_at AS createdAt
       FROM sys_operation_log`,
      'sys_operation_log',
      req,
    ));
  } catch (error) {
    next(error);
  }
});

async function pageOf(selectSql, table, req) {
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)));
  const offset = (page - 1) * pageSize;
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM ${table}`);
  const [data] = await pool.query(`${selectSql} ORDER BY id DESC LIMIT ? OFFSET ?`, [pageSize, offset]);
  return { data, total: Number(countRows[0].total), page, pageSize };
}
