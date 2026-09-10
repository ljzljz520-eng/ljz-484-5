/**
 * 初始化示例数据：
 *   node src/seed.js
 * 会覆盖 data/ 下的 JSON，并在 uploads/ 生成 SVG 占位配图。
 */
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { genId, now } = require('./utils');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

/** 生成一张极简 SVG 占位图并写入 uploads，返回可访问 URL */
function placeholder(text, bg = '#0d7377') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420">
  <rect width="100%" height="100%" fill="${bg}"/>
  <text x="50%" y="50%" fill="#ffffff" font-size="34"
        font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">${text}</text>
</svg>`;
  const name = `${genId('seed_')}.svg`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), svg, 'utf8');
  return `/uploads/${name}`;
}

const cover1 = placeholder('京都 · 古都漫步', '#0d7377');
const cover2 = placeholder('成都 · 巴适生活', '#b5651d');
const img11 = placeholder('清水寺晨光', '#13505b');
const img12 = placeholder('岚山竹林', '#2d6a4f');
const img21 = placeholder('宽窄巷子', '#8a4b1f');

const ts = now();

const guideKyoto = {
  id: 'g_seed_kyoto',
  title: '京都四日慢游记',
  destination: '日本 · 京都',
  summary:
    '用四天时间穿梭在神社、竹林与町屋之间，记录一条适合第一次到访京都的轻松路线，附交通与预算建议。',
  coverImage: cover1,
  status: 'published',
  tags: ['日本', '自由行', '古都', '4天3晚'],
  createdAt: ts,
  updatedAt: ts,
};

const guideChengdu = {
  id: 'g_seed_chengdu',
  title: '成都周末吃喝地图',
  destination: '中国 · 成都',
  summary: '一个正在连载中的草稿：火锅、茶馆与巷子里的小吃。',
  coverImage: cover2,
  status: 'draft',
  tags: ['中国', '美食', '周末'],
  createdAt: ts,
  updatedAt: ts,
};

const chapters = [
  {
    id: 'c_seed_kyoto_1',
    guideId: guideKyoto.id,
    title: '抵达京都：从关西机场到市区',
    content:
      '## 交通方式\n\n从关西机场到京都站最省心的是 **HARUKA 特急**，约 80 分钟。提前在网上购买折扣票更划算。\n\n## 小贴士\n\n- 抵达后先在京都站购买巴士一日券\n- 住宿推荐四条河原町附近，吃饭交通都方便',
    imageUrl: null,
    imageCaption: '',
    status: 'published',
    order: 1,
    createdAt: ts,
    updatedAt: ts,
  },
  {
    id: 'c_seed_kyoto_2',
    guideId: guideKyoto.id,
    title: '清水寺与二年坂三年坂',
    content:
      '建议早上七点前到达清水寺，避开旅行团。沿二年坂、三年坂一路下行，两边是保留完好的町屋店铺。\n\n午餐可以尝试一碗热腾腾的汤豆腐。',
    imageUrl: img11,
    imageCaption: '清晨的清水寺舞台，游客稀少',
    status: 'published',
    order: 2,
    createdAt: ts,
    updatedAt: ts,
  },
  {
    id: 'c_seed_kyoto_3',
    guideId: guideKyoto.id,
    title: '岚山竹林与小火车（草稿）',
    content: '这一章还在整理照片与时刻表，先保存为草稿，稍后继续补充……',
    imageUrl: img12,
    imageCaption: '岚山竹林的光影（待补写）',
    status: 'draft',
    order: 3,
    createdAt: ts,
    updatedAt: ts,
  },
  {
    id: 'c_seed_chengdu_1',
    guideId: guideChengdu.id,
    title: '宽窄巷子的清晨',
    content:
      '## 行程\n\n游客还没涌进来的宽窄巷子最有味道。找一家老茶馆，一碗盖碗茶配一碟瓜子，可以坐一上午。\n\n> 提示：工作日早上 9 点前到，拍照几乎没人。',
    imageUrl: img21,
    imageCaption: '巷子里的盖碗茶',
    status: 'published',
    order: 1,
    createdAt: ts,
    updatedAt: ts,
  },
  {
    id: 'c_seed_chengdu_2',
    guideId: guideChengdu.id,
    title: '火锅清单（待定稿）',
    content: '正在对比三家口碑火锅店的排队时长与招牌菜……',
    imageUrl: null,
    imageCaption: '',
    status: 'draft',
    order: 2,
    createdAt: ts,
    updatedAt: ts,
  },
];

db.guides.save([guideKyoto, guideChengdu]);
db.chapters.save(chapters);

console.log('示例数据已写入：');
console.log(`  攻略 ${db.guides.all().length} 篇，章节 ${db.chapters.all().length} 章`);
console.log('  图片位于 backend/uploads/（SVG 占位图）');
