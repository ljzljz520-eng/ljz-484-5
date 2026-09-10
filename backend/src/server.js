/**
 * 旅行攻略连载系统 - 服务入口
 *
 * - /api/* JSON 接口
 * - /uploads       上传图片静态目录
 * - /              前端静态页面（同源托管，避免跨域）
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const guidesRouter = require('./routes/guides');
const { router: chaptersRouter, nestedRouter: chaptersNestedRouter } =
  require('./routes/chapters');
const uploadRouter = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));

// 上传目录静态访问
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// API 路由
app.use('/api/guides', guidesRouter);
app.use('/api/guides', chaptersNestedRouter); // 嵌套章节路由 /api/guides/:id/chapters
app.use('/api/chapters', chaptersRouter);     // 独立章节操作 /api/chapters/:id
app.use('/api/upload', uploadRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// 前端静态站点
const frontendDir = path.join(__dirname, '..', '..', 'frontend');
app.use(express.static(frontendDir));

// 兜底 JSON 404（仅针对 /api）
app.use('/api', (_req, res) => res.status(404).json({ error: '接口不存在' }));

// 统一错误处理
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server error]', err);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`旅行攻略系统已启动: http://localhost:${PORT}`);
  console.log(`  读者端: http://localhost:${PORT}/`);
  console.log(`  作者端: http://localhost:${PORT}/writer.html`);
});
