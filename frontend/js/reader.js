/**
 * 读者端阅读页：左侧目录 + 右侧章节正文，支持上一章/下一章与 URL 锚点定位。
 * 接口：GET /api/guides/:id          -> 攻略信息（未发布会 404）
 *      GET /api/guides/:id/chapters -> 仅已发布章节（含正文）
 */
(function () {
  const root = document.getElementById('readerRoot');
  const guideId = new URLSearchParams(location.search).get('id');
  const state = { guide: null, chapters: [], current: 0 };

  init();

  async function init() {
    if (!guideId) return fail('缺少攻略参数（?id=...）');
    try {
      const [guide, chapters] = await Promise.all([
        api.get(`/api/guides/${guideId}`),
        api.get(`/api/guides/${guideId}/chapters`),
      ]);
      state.guide = guide;
      state.chapters = chapters;
      render();
      const fromHash = chapters.findIndex((c) => c.id === location.hash.slice(1));
      show(fromHash >= 0 ? fromHash : 0);
    } catch (e) {
      fail(e.message);
    }
  }

  function render() {
    const g = state.guide;
    document.title = `${g.title} · 旅途连载`;
    root.innerHTML = `
      <div class="reader-head">
        <a class="back" href="index.html">← 返回攻略列表</a>
        <h1>${escapeHtml(g.title)}</h1>
        <div class="reader-meta">
          📍 ${escapeHtml(g.destination || '')}
          ${(g.tags || []).map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}
          · 更新于 ${fmtDate(g.updatedAt)}
        </div>
        ${g.summary ? `<p class="reader-summary">${escapeHtml(g.summary)}</p>` : ''}
      </div>
      <div class="reader-layout">
        <aside class="toc">
          <div class="toc-title">目 录 · ${state.chapters.length} 章</div>
          <ol>
            ${state.chapters.map((c, i) => `
              <li data-i="${i}">
                <a href="#${c.id}">
                  <span class="no">${String(i + 1).padStart(2, '0')}</span>
                  <span>${escapeHtml(c.title)}</span>
                </a>
              </li>`).join('')}
          </ol>
        </aside>
        <article class="chapter-view" id="chapterView"></article>
      </div>`;

    root.querySelectorAll('.toc li').forEach((li) => {
      li.addEventListener('click', () => show(Number(li.dataset.i)));
    });
  }

  function show(i) {
    const view = document.getElementById('chapterView');
    if (!state.chapters.length) {
      view.innerHTML = '<div class="empty">作者还没有发布任何章节，敬请期待。</div>';
      return;
    }
    state.current = Math.max(0, Math.min(i, state.chapters.length - 1));
    const ch = state.chapters[state.current];
    history.replaceState(null, '', `#${ch.id}`);

    view.innerHTML = `
      <div class="chapter-kicker">第 ${state.current + 1} 章 · 共 ${state.chapters.length} 章</div>
      <h2>${escapeHtml(ch.title)}</h2>
      ${ch.imageUrl ? `
        <figure>
          <img src="${escapeAttr(ch.imageUrl)}" alt="${escapeAttr(ch.imageCaption || ch.title)}"
               onerror="this.closest('figure').style.display='none'">
          ${ch.imageCaption ? `<figcaption>▲ ${escapeHtml(ch.imageCaption)}</figcaption>` : ''}
        </figure>` : ''}
      <div class="chapter-content">${renderMarkdown(ch.content)}</div>
      <div class="chapter-nav">
        ${state.current > 0
          ? '<button class="btn" id="prevBtn">← 上一章</button>' : '<span></span>'}
        ${state.current < state.chapters.length - 1
          ? '<button class="btn primary" id="nextBtn">下一章 →</button>' : '<span></span>'}
      </div>`;

    root.querySelectorAll('.toc li').forEach((li, j) => {
      li.classList.toggle('active', j === state.current);
    });
    const prev = document.getElementById('prevBtn');
    const next = document.getElementById('nextBtn');
    if (prev) prev.addEventListener('click', () => show(state.current - 1));
    if (next) next.addEventListener('click', () => show(state.current + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.addEventListener('hashchange', () => {
    const idx = state.chapters.findIndex((c) => c.id === location.hash.slice(1));
    if (idx >= 0 && idx !== state.current) show(idx);
  });

  function fail(msg) {
    root.innerHTML = `
      <div class="empty">
        <p>${escapeHtml(msg)}</p>
        <p><a class="btn primary" href="index.html">返回攻略列表</a></p>
      </div>`;
  }
})();
