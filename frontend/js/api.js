/**
 * 前端公共工具：
 *  - api：对后端 REST 接口的轻量封装
 *  - escapeHtml / escapeAttr：防 XSS 转义
 *  - fmtDate：日期格式化
 *  - toast：页面底部轻提示
 */
const api = {
  async request(method, url, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    if (res.status === 204) return null;
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      throw new Error((data && data.error) || `请求失败（HTTP ${res.status}）`);
    }
    return data;
  },
  get(url) { return this.request('GET', url); },
  post(url, body) { return this.request('POST', url, body); },
  put(url, body) { return this.request('PUT', url, body); },
  patch(url, body) { return this.request('PATCH', url, body); },
  del(url) { return this.request('DELETE', url); },

  /** 上传图片文件，返回 { url, filename } */
  async upload(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || '上传失败');
    return data;
  },
};

/** HTML 文本转义 */
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** HTML 属性转义 */
function escapeAttr(s) {
  return escapeHtml(s).replace(/`/g, '&#96;');
}

/** ISO 时间 -> YYYY-MM-DD */
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 轻提示 */
let _toastTimer = null;
function toast(msg, type) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'toast show' + (type === 'error' ? ' error' : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = 'toast'; }, 2400);
}
