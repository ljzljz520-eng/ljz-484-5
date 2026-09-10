/**
 * 极简 Markdown 渲染器（先整体 HTML 转义，再做语法替换，保证 XSS 安全）。
 * 支持：##/### 标题、**粗体**、*斜体*、`行内代码`、- 无序列表、
 *       > 引用、--- 分隔线、![图片](url)、[链接](url)、段落与换行。
 */
(function () {
  /** 危险协议过滤：仅放行相对地址与常见安全协议 */
  function safeUrl(url) {
    // 已 HTML 转义，冒号仍是 ':'；协议名不含 / # ?（避免误杀 "/x:y" 这类路径）
    const head = url.slice(0, url.search(/[/#?]/) === -1 ? url.length : url.search(/[/#?]/));
    if (/^[a-z][a-z0-9+.-]*:/i.test(head)) {
      return /^(https?|mailto):$/i.test(head);
    }
    // 协议相对地址 //host/... 与站内相对地址均允许
    return true;
  }

  /** 行内语法：图片 / 链接 / 粗体 / 斜体 / 代码 */
  function inline(text) {
    let t = text;
    // 此时 HTML 已转义，引号无法逃逸属性
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, url) => {
      if (!safeUrl(url)) return alt;
      return `<img src="${url}" alt="${alt}" loading="lazy">`;
    });
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
      if (!safeUrl(url)) return label;
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
    let quote = [];

    const flushPara = () => {
      if (para.length) {
        out.push('<p>' + para.map(inline).join('<br>') + '</p>');
        para = [];
      }
    };
    const closeList = () => {
      if (inList) { out.push('</ul>'); inList = false; }
    };
    const flushQuote = () => {
      if (quote.length) {
        flushPara(); closeList();
        out.push('<blockquote>' + quote.map(inline).join('<br>') + '</blockquote>');
        quote = [];
      }
    };

    for (const raw of lines) {
      const line = raw.trim();
      let m;
      if (!line) { flushPara(); closeList(); flushQuote(); continue; }
      if ((m = line.match(/^###\s+(.*)/))) {
        flushPara(); closeList(); flushQuote(); out.push('<h3>' + inline(m[1]) + '</h3>');
      } else if ((m = line.match(/^##\s+(.*)/))) {
        flushPara(); closeList(); flushQuote(); out.push('<h2>' + inline(m[1]) + '</h2>');
      } else if ((m = line.match(/^#\s+(.*)/))) {
        flushPara(); closeList(); flushQuote(); out.push('<h2>' + inline(m[1]) + '</h2>');
      } else if (/^(-{3,}|\*{3,})$/.test(line)) {
        flushPara(); closeList(); flushQuote(); out.push('<hr>');
      } else if ((m = line.match(/^&gt;\s?(.*)/))) {
        flushPara(); closeList(); quote.push(m[1]);
      } else if ((m = line.match(/^[-*]\s+(.*)/))) {
        flushPara(); flushQuote();
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + inline(m[1]) + '</li>');
      } else {
        flushQuote();
        para.push(line);
      }
    }
    flushPara(); closeList(); flushQuote();
    return out.join('\n');
  };
})();
