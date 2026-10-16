import express from 'express';
import { requireAuth } from './auth.js';
import { config } from './config.js';
import { pool } from './db.js';
import { authRouter } from './routes/auth.js';
import { loginLogsRouter, operationLogsRouter } from './routes/logs.js';
import { menusRouter } from './routes/menus.js';
import { rolesRouter } from './routes/roles.js';
import { usersRouter } from './routes/users.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS users FROM sys_user');
    res.json({ ok: true, database: config.mysql.database, users: Number(rows[0].users) });
  } catch (error) {
    next(error);
  }
});

app.use('/api/auth', authRouter);
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/roles', requireAuth, rolesRouter);
app.use('/api/menus', requireAuth, menusRouter);
app.use('/api/login-logs', requireAuth, loginLogsRouter);
app.use('/api/operation-logs', requireAuth, operationLogsRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: '服务暂时不可用' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`sso api http://127.0.0.1:${config.port}`);
});
