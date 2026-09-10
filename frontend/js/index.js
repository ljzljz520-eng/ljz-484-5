/**
 * 读者端首页：展示所有「已发布」攻略卡片。
 * 接口：GET /api/guides（默认只返回 published）
 *      GET /api/guides/:id/chapters（读者视角，仅已发布章节，用于统计章数）
 */
(async function () {
  const box = document.getElementById('guideList');

  try {
    const guides = await api.get('/api/guides');
    if (!guides.length) {
      box.innerHTML = '<div class="empty">暂无已发布的攻略，去作者工作台发布第一篇吧。</div>';
      return;
    }

    // 并行拉取每篇攻略的已发布章节数
    const cards = await Promise.all(guides.map(async (g) => {
      let count = 0;
      try { count = (await api.get(`/api/guides/${g.id}/chapters`)).length; } catch (e) { /* 忽略单篇失败 */ }
      return { ...g, count };
    }));

    box.innerHTML = cards.map((g) => `
      <a class="guide-card" href="reader.html?id=${encodeURIComponent(g.id)}">
        <div class="cover" ${g.coverImage ? `style="background-image:url('${escapeAttr(g.coverImage)}')"` : ''}>
          <span class="dest-chip">📍 ${escapeHtml(g.destination || '未知目的地')}</span>
        </div>
        <div class="body">
          <h3>${escapeHtml(g.title)}</h3>
          <p class="summary">${escapeHtml(g.summary || '作者还没有写简介。')}</p>
          <div class="tags">${(g.tags || []).map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}</div>
          <div class="meta"><span>连载 ${g.count} 章</span><span>更新于 ${fmtDate(g.updatedAt)}</span></div>
        </div>
      </a>`).join('');
  } catch (e) {
    box.innerHTML = `<div class="empty">加载失败：${escapeHtml(e.message)}</div>`;
  }
})();
