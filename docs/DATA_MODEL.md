# 数据模型与文件存储说明

系统不依赖任何数据库，所有结构化数据保存在 `backend/data/` 下两个 JSON 数组文件中，
图片保存在 `backend/uploads/`。

## 1. 存储布局

```
backend/
├── data/
│   ├── guides.json     # Guide[]
│   └── chapters.json   # Chapter[]
└── uploads/            # 用户上传图片 + seed 生成的 SVG 占位图
```

- 存储目录可用环境变量 `DATA_DIR` 覆盖（见 `src/db.js`）。
- 存储层初始化时会自动创建目录与空的 `[]` 文件。

## 2. Guide（攻略 / 目的地）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 自动 | 主键，`g_` 前缀 + 时间戳36进制 + 随机串 |
| `title` | string | 是 | 攻略标题 |
| `destination` | string | 是 | 目的地，如「日本 · 京都」 |
| `summary` | string | 否 | 简介（列表页截断展示 3 行） |
| `coverImage` | string\|null | 否 | 封面图 URL（`/uploads/...` 或外链） |
| `status` | string | 是 | `draft` 草稿 / `published` 已发布 |
| `tags` | string[] | 否 | 标签 |
| `createdAt` | string(ISO) | 自动 | 创建时间 |
| `updatedAt` | string(ISO) | 自动 | 更新时间（任何章节变更也会刷新） |

```json
{
  "id": "g_seed_kyoto",
  "title": "京都四日慢游记",
  "destination": "日本 · 京都",
  "summary": "用四天时间穿梭在神社……",
  "coverImage": "/uploads/seed_xxx.svg",
  "status": "published",
  "tags": ["日本", "自由行", "古都"],
  "createdAt": "2026-09-10T06:00:00.000Z",
  "updatedAt": "2026-09-10T06:00:00.000Z"
}
```

## 3. Chapter（章节）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 自动 | 主键，`c_` 前缀 |
| `guideId` | string | 自动 | 所属攻略 ID（外键，随攻略级联删除） |
| `title` | string | 是 | 章节标题 |
| `content` | string | 否 | 正文，**Markdown 纯文本**（前端渲染、原样导出） |
| `imageUrl` | string\|null | 否 | 章节配图 URL |
| `imageCaption` | string | 否 | 图片说明，阅读页显示为斜体图注，导出为 `*…*` |
| `status` | string | 是 | `draft` / `published` |
| `order` | number | 自动 | 目录顺序，从 1 开始连续；删除后自动重排，可通过 reorder 全量改写 |
| `createdAt` | string(ISO) | 自动 | 创建时间 |
| `updatedAt` | string(ISO) | 自动 | 更新时间 |

## 4. 关系与一致性规则

> 说明：接口返回中的 `totalChapters` / `publishedChapters` 是读取时根据章节表**实时统计**的派生字段，不落盘存储。

```
Guide 1 ──── n Chapter      （chapter.guideId -> guide.id）
```

- 删除攻略时删除其全部章节。
- 删除章节后，同攻略剩余章节 `order` 重新编号为 1..n。
- 章节的新增/修改/删除/排序都会刷新所属攻略的 `updatedAt`。
- 排序接口要求提交该攻略下完整的章节 ID 序列（数量一致、无越界 ID），
  避免部分更新导致顺序错乱。

## 5. 原子写入

`src/db.js` 的写入流程：

1. 序列化整个数组为 JSON；
2. 写入同目录 `guides.json.tmp`；
3. `fs.renameSync` 替换正式文件（同盘 rename 在 POSIX/Windows 上是原子的）。

即使写入过程中断电/崩溃，正式文件也不会出现半截 JSON。

## 6. 备份与重置

```bash
# 备份
cp -r backend/data backend/uploads /your/backup/dir/

# 重置为示例数据（会覆盖现有 JSON）
cd backend && npm run seed

# 完全清空
echo '[]' > backend/data/guides.json
echo '[]' > backend/data/chapters.json
```

## 7. 适用边界

文件存储适合个人作者、小团队、本地/单机部署与演示。
若未来需要多作者并发写入、全文搜索或云端部署，可保持 API 不变，
仅把 `src/db.js` 替换为 SQLite 等实现（路由层只依赖 `all()/save()` 两个方法）。
