# 单点登录

用户、角色、菜单和审计日志。数据库是独立的 `wego_sso`，和包装样机的 `wego_mockup` 分开。

包装样机作为其中一个系统接入：登录后按菜单 `edit`、`mockup` 决定能看到编辑还是样机。三维建模（`wego-cad`，http://127.0.0.1:5175）按菜单 `workspace`、`tutorials` 进入工作区或教程。

## 目录

```text
wego_sso/
├── frontend/     # Vue 3 管理端，端口 5174
└── backend/      # Node.js 接口，端口 3001
```

## 启动

```powershell
cd backend
copy .env.example .env
npm install
npm run seed
npm start
```

```powershell
cd frontend
npm install
npm run dev
```

打开 http://127.0.0.1:5174

- 管理员：`admin` / `admin123`，可进管理端、包装样机和三维建模
- 样机账号：`designer` / `designer123`，只有包装样机菜单
- 建模账号：`maker` / `maker123`，只有三维建模菜单

包装样机的 `backend/.env` 要配置同一个 `SSO_JWT_SECRET`。
