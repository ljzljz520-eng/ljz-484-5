/**
 * 攻略（目的地）路由
 *
 * Guide 字段：
 *   id, title, destination, summary, coverImage,
 *   status(draft|published), tags[], createdAt, updatedAt
 */
const express = require('express');
const db = require('../db');
const { genId, now, clean } = require('../utils');

const router = express.Router();
const STATUSES = ['draft', 'published'];

/** 校验攻略请求体，返回错误信息数组（空数组表示通过） */
function validate(body) {
  const errors = [];
  if (!clean(body.title)) errors.push('标题不能为空');
  if (!clean(body.destination)) errors.push('目的地不能为空');
  if (body.status && !STATUSES.includes(body.status)) {
    errors.push('status 只能是 draft 或 published');
  }
  return errors;
}

/** 按 updatedAt 倒序 */
function sortGuides(rows) {
  return [...rows].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

// GET /api/guides?status=published|draft|all
// 读者端默认只看到已发布；作者端传 all 可看到全部
router.get('/', (req, res) => {
  const status = req.query.status || 'published';
  let rows = db.guides.all();
  if (status !== 'all') rows = rows.filter((g) => g.status === status);
  res.json(sortGuides(rows));
});

// GET /api/guides/:id  攻略详情 + 章节目录（按 order 排序）
router.get('/:id', (req, res) => {
  const guide = db.guides.all().find((g) => g.id === req.params.id);
  if (!guide) return res.status(404).json({ error: '攻略不存在' });

  // 未发布攻略对读者端隐藏（作者端通过 ?manage=1 查看）
  const viewerIsAuthor = req.query.manage === '1';
  if (guide.status === 'draft' && !viewerIsAuthor) {
    return res.status(404).json({ error: '攻略不存在或尚未发布' });
  }

  const chapters = db.chapters
    .all()
    .filter((c) => c.guideId === guide.id)
    .sort((a, b) => a.order - b.order);

  res.json({
    ...guide,
    // 目录摘要（不含正文，读者端列表页用）
    toc: chapters.map(({ id, title, order, status, imageCaption, imageUrl }) => ({
      id,
      title,
      order,
      status,
      imageCaption,
      imageUrl,
    })),
  });
});

// POST /api/guides  创建攻略（默认草稿）
router.post('/', (req, res) => {
  const errors = validate(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors.join('；') });

  const guide = {
    id: genId('g_'),
    title: clean(req.body.title),
    destination: clean(req.body.destination),
    summary: clean(req.body.summary),
    coverImage: clean(req.body.coverImage) || null,
    status: req.body.status === 'published' ? 'published' : 'draft',
    tags: Array.isArray(req.body.tags)
      ? req.body.tags.map(clean).filter(Boolean)
      : [],
    createdAt: now(),
    updatedAt: now(),
  };

  const rows = db.guides.all();
  rows.push(guide);
  db.guides.save(rows);
  res.status(201).json(guide);
});

// PUT /api/guides/:id  更新攻略
router.put('/:id', (req, res) => {
  const rows = db.guides.all();
  const guide = rows.find((g) => g.id === req.params.id);
  if (!guide) return res.status(404).json({ error: '攻略不存在' });

  const errors = validate({ ...guide, ...req.body });
  if (errors.length) return res.status(400).json({ error: errors.join('；') });

  guide.title = clean(req.body.title ?? guide.title);
  guide.destination = clean(req.body.destination ?? guide.destination);
  guide.summary = clean(req.body.summary ?? guide.summary);
  guide.coverImage =
    req.body.coverImage === undefined
      ? guide.coverImage
      : clean(req.body.coverImage) || null;
  if (req.body.status && STATUSES.includes(req.body.status)) {
    guide.status = req.body.status;
  }
  if (Array.isArray(req.body.tags)) {
    guide.tags = req.body.tags.map(clean).filter(Boolean);
  }
  guide.updatedAt = now();

  db.guides.save(rows);
  res.json(guide);
});

// PATCH /api/guides/:id/status  单独切换发布状态（保存草稿 / 发布）
router.patch('/:id/status', (req, res) => {
  const rows = db.guides.all();
  const guide = rows.find((g) => g.id === req.params.id);
  if (!guide) return res.status(404).json({ error: '攻略不存在' });

  const { status } = req.body || {};
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: 'status 只能是 draft 或 published' });
  }
  guide.status = status;
  guide.updatedAt = now();
  db.guides.save(rows);
  res.json(guide);
});

// DELETE /api/guides/:id  删除攻略（连同其章节一并删除）
router.delete('/:id', (req, res) => {
  const guideRows = db.guides.all();
  const idx = guideRows.findIndex((g) => g.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '攻略不存在' });

  guideRows.splice(idx, 1);
  db.guides.save(guideRows);

  const chapterRows = db.chapters.all().filter(
    (c) => c.guideId !== req.params.id
  );
  db.chapters.save(chapterRows);

  res.status(204).end();
});

// GET /api/guides/:id/export?include=drafts  导出整篇 Markdown 全文
// 默认只导出已发布章节；作者端导出草稿时加 include=drafts
router.get('/:id/export', (req, res) => {
  const guide = db.guides.all().find((g) => g.id === req.params.id);
  if (!guide) return res.status(404).json({ error: '攻略不存在' });

  const includeDrafts = req.query.include === 'drafts';
  let chapters = db.chapters
    .all()
    .filter((c) => c.guideId === guide.id)
    .sort((a, b) => a.order - b.order);
  if (!includeDrafts) {
    chapters = chapters.filter((c) => c.status === 'published');
  }

  const lines = [];
  lines.push(`# ${guide.title}`);
  lines.push('');
  lines.push(`> 目的地：${guide.destination}`);
  if (guide.tags?.length) lines.push(`> 标签：${guide.tags.join(' / ')}`);
  lines.push(`> 导出时间：${new Date().toLocaleString('zh-CN')}`);
  lines.push('');
  if (guide.summary) {
    lines.push(guide.summary);
    lines.push('');
  }

  chapters.forEach((ch, i) => {
    lines.push(`## 第 ${i + 1} 章 ${ch.title}`);
    lines.push('');
    if (ch.imageUrl) {
      lines.push(`![${ch.imageCaption || ch.title}](${ch.imageUrl})`);
      if (ch.imageCaption) lines.push(`*${ch.imageCaption}*`);
      lines.push('');
    }
    lines.push(ch.content || '（本章暂无正文）');
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  const md = lines.join('\n');
  const filename = encodeURIComponent(
    `${guide.destination}-${guide.title}.md`
  );
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"; filename*=UTF-8''${filename}`
  );
  res.send(md);
});

module.exports = router;
