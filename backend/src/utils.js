/** 生成紧凑唯一 ID（时间戳 36 进制 + 随机后缀） */
function genId(prefix = '') {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${ts}${rand}`;
}

/** ISO 时间戳，便于直接存入 JSON */
function now() {
  return new Date().toISOString();
}

/** 简单的字符串清洗（去除首尾空白），空值安全 */
function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

module.exports = { genId, now, clean };
