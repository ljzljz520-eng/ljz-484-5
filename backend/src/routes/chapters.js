/**
 * 章节路由
 *
 * Chapter 字段：
 *   id, guideId, title, content(Markdown),
 *   imageUrl, imageCaption,
 *   status(draft|published), order, createdAt, updatedAt
 *
 * 导出两个 router：
 *   nestedRouter -> 挂在 /api/guides 下（嵌套资源：列表/新增/排序）
 *   router       -> 挂在 /api/chapters 下（独立资源：更新/状态/删除）
 */
const express = require('express');
const db = require('../db');
const { genId, now, clean } = require('../utils');

const nestedRouter = express.Router(); // 挂在 /api/guides 下
const router = express.Router();       // 挂在 /api/chapters 下
const STATUSES = ['draft', 'published'];

function findGuide(id) {
  return db.guides.all().find((g) => g.id === id);
}

/** 取出某攻略下的全部章节，按 order 排序 */
function chaptersOf(guideId) {
  return db.chapters
    .all()
    .filter((c) => c.guideId === guideId)
    .sort((a, b) => a.order - b.order);
}

function touchGuide(guideId) {
  const rows = db.guides.all();
  const guide = rows.find((g) => g.id === guideId);
  if (guide) {
    guide.updatedAt = now();
    db.guides.save(rows);
  }
}

// GET /api/guides/:guideId/chapters?manage=1
// 读者端只返回已发布章节；作者端 manage=1 返回全部
nestedRouter.get('/:guideId/chapters', (req, res) => {
  const guide = findGuide(req.params.guideId);
  if (!guide) return res.status(404).json({ error: '攻略不存在' });

  const isAuthor = req.query.manage === '1';
  if (guide.status === 'draft' && !isAuthor) {
    return res.status(404).json({ error: '攻略不存在或尚未发布' });
  }

  let list = chaptersOf(guide.id);
  if (!isAuthor) list = list.filter((c) => c.status === 'published');
  res.json(list);
});

// POST /api/guides/:guideId/chapters  新增章节（追加到末尾，默认草稿）
nestedRouter.post('/:guideId/chapters', (req, res) => {
  const guide = findGuide(req.params.guideId);
  if (!guide) return res.status(404).json({ error: '攻略不存在' });
  if (!clean(req.body && req.body.title)) {
    return res.status(400).json({ error: '章节标题不能为空' });
  }

  const all = db.chapters.all();
  const maxOrder = chaptersOf(guide.id).reduce(
    (m, c) => Math.max(m, c.order),
    0
  );

  const chapter = {
    id: genId('c_'),
    guideId: guide.id,
    title: clean(req.body.title),
    content: typeof req.body.content === 'string' ? req.body.content : '',
    imageUrl: clean(req.body.imageUrl) || null,
    imageCaption: clean(req.body.imageCaption),
    status: req.body.status === 'published' ? 'published' : 'draft',
    order: maxOrder + 1,
    createdAt: now(),
    updatedAt: now(),
  };

  all.push(chapter);
  db.chapters.save(all);
  touchGuide(guide.id);
  res.status(201).json(chapter);
});

// PUT /api/chapters/:id  更新章节（标题/正文/图片/说明/状态）
router.put('/:id', (req, res) => {
  const rows = db.chapters.all();
  const chapter = rows.find((c) => c.id === req.params.id);
  if (!chapter) return res.status(404).json({ error: '章节不存在' });

  if (req.body.title !== undefined) {
    if (!clean(req.body.title)) {
      return res.status(400).json({ error: '章节标题不能为空' });
    }
    chapter.title = clean(req.body.title);
  }
  if (req.body.content !== undefined) chapter.content = req.body.content;
  if (req.body.imageUrl !== undefined) {
    chapter.imageUrl = clean(req.body.imageUrl) || null;
  }
  if (req.body.imageCaption !== undefined) {
    chapter.imageCaption = clean(req.body.imageCaption);
  }
  if (req.body.status && STATUSES.includes(req.body.status)) {
    chapter.status = req.body.status;
  }
  chapter.updatedAt = now();

  db.chapters.save(rows);
  touchGuide(chapter.guideId);
  res.json(chapter);
});

// PATCH /api/chapters/:id/status  章节保存草稿 / 发布 / 撤回
router.patch('/:id/status', (req, res) => {
  const rows = db.chapters.all();
  const chapter = rows.find((c) => c.id === req.params.id);
  if (!chapter) return res.status(404).json({ error: '章节不存在' });

  const status = req.body && req.body.status;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: 'status 只能是 draft 或 published' });
  }
  chapter.status = status;
  chapter.updatedAt = now();
  db.chapters.save(rows);
  touchGuide(chapter.guideId);
  res.json(chapter);
});

// DELETE /api/chapters/:id  删除章节并自动重排剩余章节 order
router.delete('/:id', (req, res) => {
  const rows = db.chapters.all();
  const idx = rows.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '章节不存在' });

  const guideId = rows[idx].guideId;
  rows.splice(idx, 1);
  db.chapters.save(rows);

  // 重新编号，保证 order 连续
  chaptersOf(guideId).forEach((c, i) => {
    const row = rows.find((r) => r.id === c.id);
    row.order = i + 1;
  });
  db.chapters.save(rows);
  touchGuide(guideId);

  res.status(204).end();
});

// PUT /api/guides/:guideId/chapters/reorder
// body: { order: [chapterId, chapterId, ...] } 全量保存新顺序
nestedRouter.put('/:guideId/chapters/reorder', (req, res) => {
  const guide = findGuide(req.params.guideId);
  if (!guide) return res.status(404).json({ error: '攻略不存在' });

  const newOrder = req.body && req.body.order;
  if (!Array.isArray(newOrder)) {
    return res.status(400).json({ error: 'order 必须是章节 ID 数组' });
  }

  const rows = db.chapters.all();
  const own = new Set(chaptersOf(guide.id).map((c) => c.id));
  if (newOrder.length !== own.size || !newOrder.every((id) => own.has(id))) {
    return res.status(400).json({ error: '排序数组与该攻略章节不一致' });
  }

  newOrder.forEach((id, i) => {
    rows.find((c) => c.id === id).order = i + 1;
  });
  db.chapters.save(rows);
  touchGuide(guide.id);

  res.json(chaptersOf(guide.id));
});

module.exports = { router, nestedRouter };
