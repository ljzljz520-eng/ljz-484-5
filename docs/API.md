# API 接口文档

基础地址：`http://localhost:3000`，所有接口均返回 JSON；错误统一为：

```json
{ "error": "错误描述" }
```

约定：

- `status` 取值仅 `draft`（草稿）/ `published`（已发布）
- 读者端视角：不带 `manage=1` 时，草稿攻略与草稿章节一律不可见（404 或被过滤）
- 作者端视角：列表加 `?status=all`，详情 / 章节加 `?manage=1`

---

## 攻略 Guides

### GET /api/guides — 攻略列表

查询参数：`status` = `published`（默认）| `draft` | `all`

```bash
curl 'http://localhost:3000/api/guides?status=all'
```

响应：`200` Guide 数组，按 `updatedAt` 倒序。

### POST /api/guides — 新建攻略

```bash
curl -X POST http://localhost:3000/api/guides \
  -H 'Content-Type: application/json' \
  -d '{"title":"京都四日慢游记","destination":"日本 · 京都","summary":"…","tags":["日本","自由行"]}'
```

请求体：

| 字段 | 必填 | 说明 |
| ---- | ---- | ---- |
| title | ✅ | 攻略标题 |
| destination | ✅ | 目的地 |
| summary | | 简介 |
| coverImage | | 封面图 URL |
| tags | | 字符串数组 |
| status | | 默认 `draft` |

响应：`201` 创建成功的 Guide。校验失败返回 `400`。

### GET /api/guides/:id — 攻略详情（含目录）

```bash
curl 'http://localhost:3000/api/guides/g_xxx'            # 读者视角
curl 'http://localhost:3000/api/guides/g_xxx?manage=1'   # 作者视角（可见草稿）
```

响应：`200` Guide 对象，附带 `toc` 数组（章节 id / title / order / status / imageCaption / imageUrl，不含正文）。
草稿攻略在读者视角返回 `404`。

### PUT /api/guides/:id — 更新攻略

请求体字段均可选（部分更新），同 POST。响应：`200` 更新后的 Guide。

### PATCH /api/guides/:id/status — 切换发布状态

```bash
curl -X PATCH http://localhost:3000/api/guides/g_xxx/status \
  -H 'Content-Type: application/json' -d '{"status":"published"}'
```

### DELETE /api/guides/:id — 删除攻略

连同其全部章节一并删除。响应：`204`。

### GET /api/guides/:id/export — 导出 Markdown 全文

```bash
# 仅导出已发布章节（读者可用的版本）
curl -OJ 'http://localhost:3000/api/guides/g_xxx/export'

# 包含草稿章节（作者存档用）
curl -OJ 'http://localhost:3000/api/guides/g_xxx/export?include=drafts'
```

响应：`200`，`Content-Type: text/markdown`，`Content-Disposition: attachment`（文件名为「目的地-标题.md」）。
导出内容包含：标题、目的地、标签、简介、各章正文及图片说明（`![说明](url)` + 斜体图注）。

---

## 章节 Chapters

### GET /api/guides/:gid/chapters — 章节列表

```bash
curl 'http://localhost:3000/api/guides/g_xxx/chapters'            # 仅已发布
curl 'http://localhost:3000/api/guides/g_xxx/chapters?manage=1'   # 全部（含草稿）
```

响应：`200` Chapter 数组，按 `order` 升序，含正文。

### POST /api/guides/:gid/chapters — 新增章节

```bash
curl -X POST http://localhost:3000/api/guides/g_xxx/chapters \
  -H 'Content-Type: application/json' \
  -d '{"title":"清水寺与二年坂","content":"## 清晨出发\n\n……","imageUrl":"/uploads/img_x.jpg","imageCaption":"清晨的清水寺舞台","status":"draft"}'
```

| 字段 | 必填 | 说明 |
| ---- | ---- | ---- |
| title | ✅ | 章节标题 |
| content | | Markdown 正文 |
| imageUrl | | 配图 URL |
| imageCaption | | **图片说明**（读者端斜体显示、随导出保留） |
| status | | 默认 `draft` |

新章节自动追加到末尾（`order = max + 1`）。响应：`201`。

### PUT /api/chapters/:id — 更新章节

部分更新：`title` / `content` / `imageUrl` / `imageCaption` / `status`。响应：`200`。

### PATCH /api/chapters/:id/status — 章节发布 / 撤回

```bash
curl -X PATCH http://localhost:3000/api/chapters/c_xxx/status \
  -H 'Content-Type: application/json' -d '{"status":"published"}'
```

### PUT /api/guides/:gid/chapters/reorder — 章节排序

```bash
curl -X PUT http://localhost:3000/api/guides/g_xxx/chapters/reorder \
  -H 'Content-Type: application/json' \
  -d '{"order":["c_bbb","c_aaa","c_ccc"]}'
```

`order` 必须恰好包含该攻略全部章节 ID，否则 `400`。响应：`200` 排序后的章节数组。

### DELETE /api/chapters/:id — 删除章节

删除后剩余章节 `order` 自动重排为连续序号。响应：`204`。

---

## 图片上传

### POST /api/upload

`multipart/form-data`，字段名 `file`；仅支持 jpg / png / gif / webp，最大 5MB。

```bash
curl -X POST http://localhost:3000/api/upload -F 'file=@photo.jpg'
```

响应：`201`

```json
{ "filename": "img_xxx.jpg", "url": "/uploads/img_xxx.jpg" }
```

返回的 `url` 可直接作为攻略封面或章节配图（`coverImage` / `imageUrl`）。

---

## 其他

### GET /api/health

```json
{ "ok": true, "ts": 1757462400000 }
```
