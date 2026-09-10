/**
 * 读者端首页：展示所有「已发布」攻略卡片。
 * 接口：GET /api/guides（默认只返回 published，附带 publishedChapters 章数）
 */
(async function () {
  const box = document.getElementById('guideList');

  try {
    const guides = await api.get('/api/guides');
    if (!guides.length) {
      box.innerHTML = '<div class="empty">暂无已发布的攻略，去作者工作台发布第一篇吧。</div>';
      return;
    }

    box.innerHTML = guides.map((g) => `
      <a class="guide-card" href="reader.html?id=${encodeURIComponent(g.id)}">
        <div class="cover" ${g.coverImage ? `style="background-image:url('${escapeAttr(g.coverImage)}')"` : ''}>
          <span class="dest-chip">📍 ${escapeHtml(g.destination || '未知目的地')}</span>
        </div>
        <div class="body">
          <h3>${escapeHtml(g.title)}</h3>
          <p class="summary">${escapeHtml(g.summary || '作者还没有写简介。')}</p>
          <div class="tags">${(g.tags || []).map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}</div>
          <div class="meta"><span>连载 ${g.publishedChapters ?? 0} 章</span><span>更新于 ${fmtDate(g.updatedAt)}</span></div>
        </div>
      </a>`).join('');
  } catch (e) {
    box.innerHTML = `<div class="empty">加载失败：${escapeHtml(e.message)}</div>`;
  }
})();
