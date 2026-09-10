/**
 * 图片上传路由（multipart/form-data，字段名 file）
 * 返回 { url, filename }，url 可直接填入章节 imageUrl。
 * 使用 multer 写入 backend/uploads/，由 server.js 以 /uploads 暴露静态访问。
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { genId } = require('../utils');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = ALLOWED[file.mimetype] || path.extname(file.originalname);
    cb(null, `${genId('img_')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED[file.mimetype]) cb(null, true);
    else cb(new Error('仅支持 jpg/png/gif/webp 图片'));
  },
});

const router = express.Router();

router.post('/', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const code = err.code || '';
      if (code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: '图片不能超过 5MB' });
      }
      // 其余 multer 错误（类型不被允许等）统一按请求错误处理
      return res.status(400).json({ error: err.message || '上传失败' });
    }
    if (!req.file) return res.status(400).json({ error: '未收到上传文件' });
    res.status(201).json({
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
    });
  });
});

module.exports = router;
