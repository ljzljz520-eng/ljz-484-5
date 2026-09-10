/**
 * 本地 JSON 文件存储层。
 *
 * 数据目录结构：
 *   data/guides.json    -> Guide[]   攻略（目的地）元信息
 *   data/chapters.json  -> Chapter[] 章节正文
 *
 * 写入采用「临时文件 + rename」的原子写策略，
 * 避免并发写入导致 JSON 文件损坏。
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const GUIDES_FILE = path.join(DATA_DIR, 'guides.json');
const CHAPTERS_FILE = path.join(DATA_DIR, 'chapters.json');

/** 确保数据目录与初始文件存在 */
function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(GUIDES_FILE)) fs.writeFileSync(GUIDES_FILE, '[]', 'utf8');
  if (!fs.existsSync(CHAPTERS_FILE)) fs.writeFileSync(CHAPTERS_FILE, '[]', 'utf8');
}

/** 读取并解析一个 JSON 数组文件 */
function readJson(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/** 原子写入：先写 .tmp 再 rename，保证文件不会处于半写状态 */
function writeJson(file, data) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

const table = (file) => ({
  all: () => readJson(file),
  save: (rows) => writeJson(file, rows),
});

ensureStorage();

module.exports = {
  guides: table(GUIDES_FILE),
  chapters: table(CHAPTERS_FILE),
  GUIDES_FILE,
  CHAPTERS_FILE,
};
