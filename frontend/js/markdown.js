/**
 * 极简 Markdown 渲染器（先整体 HTML 转义，再做语法替换，保证 XSS 安全）。
 * 支持：##/### 标题、**粗体**、*斜体*、`行内代码`、- 无序列表、
 *       > 引用、--- 分隔线、![图片](url)、[链接](url)、段落与换行。
 */
(function () {
  /** 行内语法：图片 / 链接 / 粗体 / 斜体 / 代码 */
  function inline(text) {
    let t = text;
    // 过滤危险协议（此时 HTML 已转义，引号无法逃逸属性）
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, url) => {
      if (/^javascript:/i.test(url)) return alt;
      return `<img src="${url}" alt="${alt}" loading="lazy">`;
    });
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
      if (/^javascript:/i.test(url)) return label;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    return t;
  }

  /** 渲染 Markdown 文本为 HTML 字符串 */
  window.renderMarkdown = function (src) {
    const escaped = escapeHtml(String(src || ''));
    const lines = escaped.split(/\r?\n/);
    const out = [];
    let para = [];
    let inList = false;

    const flushPara = () => {
      if (para.length) {
        out.push('<p>' + para.map(inline).join('<br>') + '</p>');
        para = [];
      }
    };
    const closeList = () => {
      if (inList) { out.push('</ul>'); inList = false; }
    };

    for (const raw of lines) {
      const line = raw.trim();
      let m;
      if (!line) { flushPara(); closeList(); continue; }
      if ((m = line.match(/^###\s+(.*)/))) {
        flushPara(); closeList(); out.push('<h3>' + inline(m[1]) + '</h3>');
      } else if ((m = line.match(/^##\s+(.*)/))) {
        flushPara(); closeList(); out.push('<h2>' + inline(m[1]) + '</h2>');
      } else if ((m = line.match(/^#\s+(.*)/))) {
        flushPara(); closeList(); out.push('<h2>' + inline(m[1]) + '</h2>');
      } else if (/^(-{3,}|\*{3,})$/.test(line)) {
        flushPara(); closeList(); out.push('<hr>');
      } else if ((m = line.match(/^&gt;\s?(.*)/))) {
        flushPara(); closeList(); out.push('<blockquote>' + inline(m[1]) + '</blockquote>');
      } else if ((m = line.match(/^[-*]\s+(.*)/))) {
        flushPara();
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + inline(m[1]) + '</li>');
      } else {
        para.push(line);
      }
    }
    flushPara(); closeList();
    return out.join('\n');
  };
})();
