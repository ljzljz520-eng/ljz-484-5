# 旅途连载 · 旅行攻略连载系统

一个「作者连载 + 读者追更」的旅行攻略 Web 应用：

- **作者端**：创建目的地攻略 → 逐章连载 → 配图 + 图片说明 → 随时保存草稿 / 发布 → 一键导出 Markdown 全文
- **读者端**：浏览已发布攻略 → 按目录逐章阅读 → 上一章 / 下一章流畅追更
- **后端**：Express + 本地 JSON 文件存储（原子写入），图片上传保存到本地目录

## 快速开始

```bash
cd backend
npm install        # 安装依赖（express、multer）
npm run seed       # 可选：写入示例攻略与占位配图
npm start          # 启动服务，默认 http://localhost:3000
```

| 入口 | 地址 |
| ---- | ---- |
| 读者端 | http://localhost:3000/ |
| 作者工作台 | http://localhost:3000/writer.html |
| 健康检查 | http://localhost:3000/api/health |

> 端口可通过环境变量修改：`PORT=8080 npm start`

## 功能一览

### 作者端（writer.html）
- 攻略管理：新建 / 编辑（标题、目的地、简介、标签、封面图）/ 删除
- 发布状态：攻略与章节均有 `draft（草稿）` / `published（已发布）` 两种状态，可一键切换
- 章节连载：新增章节、Markdown 正文、上移 / 下移排序、删除（自动重排）
- 图片说明：每章可配图（本地上传或外链 URL）并填写图注，图注在读者端以斜体显示在图片下方，并随全文导出
- 保存草稿：章节可「保存为草稿」或「保存并发布」
- 导出全文：每篇攻略可导出为 Markdown 文件（含全部章节与图片说明，草稿章节也会一并导出，便于存档）

### 读者端（index.html / reader.html）
- 首页只展示「已发布」攻略卡片（封面、目的地、标签、连载章数、更新时间）
- 阅读页左侧为章节目录，右侧为正文；草稿章节对读者不可见
- 支持上一章 / 下一章翻页、URL 锚点定位章节
- 正文支持常用 Markdown：标题、粗体 / 斜体、列表、引用、分隔线、图片、链接

## 项目结构

```
.
├── README.md                  # 项目说明（本文件）
├── docs/
│   └── API.md                 # 接口文档
├── backend/                   # 后端服务
│   ├── package.json
│   ├── src/
│   │   ├── server.js          # 服务入口（API + 静态托管）
│   │   ├── db.js              # JSON 文件存储层（原子写入）
│   │   ├── utils.js           # ID / 时间 / 字符串工具
│   │   ├── seed.js            # 示例数据脚本
│   │   └── routes/
│   │       ├── guides.js      # 攻略 CRUD / 发布状态 / 导出
│   │       ├── chapters.js    # 章节 CRUD / 排序 / 发布状态
│   │       └── upload.js      # 图片上传（multer）
│   ├── data/                  # 本地 JSON 数据（guides.json / chapters.json）
│   └── uploads/               # 上传的图片（/uploads 静态访问）
└── frontend/                  # 前端（原生 HTML/CSS/JS，无构建步骤）
    ├── index.html             # 读者端首页（攻略列表）
    ├── reader.html            # 读者端阅读页（目录 + 章节）
    ├── writer.html            # 作者工作台
    ├── css/style.css
    └── js/
        ├── api.js             # fetch 封装 + 转义 + toast
        ├── markdown.js        # 极简安全 Markdown 渲染器
        ├── index.js           # 首页逻辑
        ├── reader.js          # 阅读页逻辑
        └── writer.js          # 工作台逻辑
```

## 数据模型

**Guide（攻略）** — `backend/data/guides.json`

| 字段 | 说明 |
| ---- | ---- |
| id | `g_` 前缀唯一 ID |
| title / destination / summary | 标题 / 目的地 / 简介 |
| coverImage | 封面图 URL（本地上传或外链） |
| status | `draft` 草稿 / `published` 已发布 |
| tags | 标签数组 |
| createdAt / updatedAt | ISO 时间戳 |

**Chapter（章节）** — `backend/data/chapters.json`

| 字段 | 说明 |
| ---- | ---- |
| id / guideId | `c_` 前缀唯一 ID / 所属攻略 |
| title / content | 章节标题 / Markdown 正文 |
| imageUrl / imageCaption | 配图 URL / **图片说明** |
| status | `draft` / `published` |
| order | 章节顺序（删除后自动重排） |
| createdAt / updatedAt | ISO 时间戳 |

存储采用「临时文件 + rename」原子写入，避免并发写坏 JSON 文件。

## API 摘要

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/api/guides?status=published\|draft\|all` | 攻略列表（默认仅已发布） |
| POST | `/api/guides` | 新建攻略 |
| GET | `/api/guides/:id?manage=1` | 攻略详情 + 目录 |
| PUT | `/api/guides/:id` | 更新攻略 |
| PATCH | `/api/guides/:id/status` | 发布 / 转草稿 |
| DELETE | `/api/guides/:id` | 删除攻略（含章节） |
| GET | `/api/guides/:id/export?include=drafts` | 导出 Markdown 全文 |
| GET | `/api/guides/:gid/chapters?manage=1` | 章节列表（读者默认仅已发布） |
| POST | `/api/guides/:gid/chapters` | 新增章节 |
| PUT | `/api/guides/:gid/chapters/reorder` | 章节排序 |
| PUT | `/api/chapters/:id` | 更新章节 |
| PATCH | `/api/chapters/:id/status` | 章节发布 / 撤回 |
| DELETE | `/api/chapters/:id` | 删除章节（自动重排） |
| POST | `/api/upload` | 上传图片（multipart，字段名 `file`） |

详细请求 / 响应示例见 [docs/API.md](docs/API.md)。

## 说明

- 本项目为本地演示应用，未实现登录鉴权：作者端通过 `?manage=1` 等参数区分管理视图，部署到公网前请自行增加认证。
- 读者端接口只返回已发布内容；草稿攻略 / 章节对读者端一律 404。
