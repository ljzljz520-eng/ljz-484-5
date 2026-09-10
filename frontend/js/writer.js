/**
 * 作者工作台：
 *  - 攻略：新建 / 编辑信息 / 发布·转草稿 / 删除 / 导出 Markdown 全文
 *  - 章节：新增 / 编辑 / 保存草稿 / 发布·撤回 / 上下移动排序 / 删除
 *  - 图片：本地上传（/api/upload）或填写 URL，配图可写「图片说明」
 */
(function () {
  const state = {
    guides: [],          // 全部攻略（含草稿）
    chapters: {},        // guideId -> Chapter[]
    keyword: '',
    editingGuideId: null,          // null 表示新建
    editingChapter: null,          // { guideId, chapterId|null }
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const guideModal = $('#guideModalMask');
  const chapterModal = $('#chapterModalMask');

  /* ---------------- 数据加载 ---------------- */

  async function loadAll() {
    state.guides = await api.get('/api/guides?status=all');
    await Promise.all(state.guides.map(async (g) => {
      state.chapters[g.id] = await api.get(`/api/guides/${g.id}/chapters?manage=1`);
    }));
    render();
  }

  function chaptersOf(gid) {
    return (state.chapters[gid] || []).slice().sort((a, b) => a.order - b.order);
  }

  /* ---------------- 渲染 ---------------- */

  function render() {
    const kw = state.keyword.trim().toLowerCase();
    const list = state.guides.filter((g) =>
      !kw ||
      g.title.toLowerCase().includes(kw) ||
      (g.destination || '').toLowerCase().includes(kw));

    const box = $('#guideAdminList');
    if (!list.length) {
      box.innerHTML = '<div class="empty">没有匹配的攻略，点击「新建攻略」开始创作。</div>';
      return;
    }
    box.innerHTML = list.map(renderGuideCard).join('');
    bindEvents(box);
  }

  function renderGuideCard(g) {
    const chapters = chaptersOf(g.id);
    const published = chapters.filter((c) => c.status === 'published').length;
    const cover = g.coverImage
      ? `<img class="ag-cover" src="${escapeAttr(g.coverImage)}" alt="封面">`
      : '<div class="ag-cover ag-cover-empty">暂无封面</div>';

    const rows = chapters.map((c, i) => `
      <li data-cid="${c.id}">
        <span class="no">${i + 1}</span>
        <span class="badge ${c.status}">${c.status === 'published' ? '已发布' : '草稿'}</span>
        <span class="c-title">${escapeHtml(c.title)}</span>
        ${c.imageCaption ? `<span class="c-cap">图注：${escapeHtml(c.imageCaption)}</span>` : ''}
        <span class="row-ops">
          <button class="btn small" data-act="up" title="上移" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn small" data-act="down" title="下移" ${i === chapters.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn small" data-act="edit">编辑</button>
          <button class="btn small" data-act="toggle">${c.status === 'published' ? '撤回' : '发布'}</button>
          <button class="btn small danger" data-act="del">删除</button>
        </span>
      </li>`).join('');

    return `
    <section class="admin-guide" data-gid="${g.id}">
      <div class="ag-head">
        ${cover}
        <div class="ag-info">
          <div class="ag-title-row">
            <h3>${escapeHtml(g.title)}</h3>
            <span class="badge ${g.status}">${g.status === 'published' ? '已发布' : '草稿'}</span>
          </div>
          <div class="ag-meta">
            📍 ${escapeHtml(g.destination || '未填写目的地')}
            ${(g.tags || []).map((t) => `#${escapeHtml(t)}`).join(' ')}
            · 更新于 ${fmtDate(g.updatedAt)} · 章节 ${published}/${chapters.length} 已发布
          </div>
          ${g.summary ? `<p class="ag-summary">${escapeHtml(g.summary)}</p>` : ''}
        </div>
        <div class="ag-actions">
          <button class="btn small" data-act="edit-guide">编辑信息</button>
          <button class="btn small ${g.status === 'published' ? '' : 'primary'}" data-act="toggle-guide">
            ${g.status === 'published' ? '转为草稿' : '发布攻略'}
          </button>
          ${g.status === 'published'
            ? `<a class="btn small" href="reader.html?id=${encodeURIComponent(g.id)}" target="_blank">预览</a>` : ''}
          <a class="btn small" href="/api/guides/${encodeURIComponent(g.id)}/export?include=drafts">导出全文</a>
          <button class="btn small danger" data-act="del-guide">删除</button>
        </div>
      </div>
      <div class="ag-chapters">
        <div class="ag-chapters-head">
          <span>章节目录（${chapters.length}）</span>
          <button class="btn small primary" data-act="new-chapter">＋ 新增章节</button>
        </div>
        <ul class="chapter-rows">
          ${rows || '<li style="color:var(--faint)">还没有章节，点击右上角「新增章节」开始连载。</li>'}
        </ul>
      </div>
    </section>`;
  }

  function bindEvents(box) {
    $$('.admin-guide', box).forEach((card) => {
      const gid = card.dataset.gid;
      $('[data-act="edit-guide"]', card).addEventListener('click', () => openGuideModal(gid));
      $('[data-act="toggle-guide"]', card).addEventListener('click', () => toggleGuide(gid));
      $('[data-act="del-guide"]', card).addEventListener('click', () => deleteGuide(gid));
      $('[data-act="new-chapter"]', card).addEventListener('click', () => openChapterModal(gid, null));

      $$('.chapter-rows li[data-cid]', card).forEach((li) => {
        const cid = li.dataset.cid;
        $$('button[data-act]', li).forEach((btn) => {
          btn.addEventListener('click', () => {
            const act = btn.dataset.act;
            if (act === 'edit') openChapterModal(gid, cid);
            else if (act === 'toggle') toggleChapter(cid);
            else if (act === 'del') deleteChapter(cid);
            else if (act === 'up') moveChapter(gid, cid, -1);
            else if (act === 'down') moveChapter(gid, cid, 1);
          });
        });
      });
    });
  }

  /* ---------------- 攻略操作 ---------------- */

  function openGuideModal(gid) {
    state.editingGuideId = gid || null;
    const g = gid ? state.guides.find((x) => x.id === gid) : null;
    $('#guideModalTitle').textContent = g ? '编辑攻略' : '新建攻略';
    $('[name=title]', guideModal).value = g ? g.title : '';
    $('[name=destination]', guideModal).value = g ? g.destination : '';
    $('[name=summary]', guideModal).value = g ? (g.summary || '') : '';
    $('[name=tags]', guideModal).value = g ? (g.tags || []).join(', ') : '';
    $('[name=coverImage]', guideModal).value = g && g.coverImage ? g.coverImage : '';
    $('[name=coverFile]', guideModal).value = '';
    updateThumb($('[name=coverThumb]', guideModal), g && g.coverImage);
    guideModal.classList.add('show');
  }

  async function saveGuide() {
    const payload = {
      title: $('[name=title]', guideModal).value,
      destination: $('[name=destination]', guideModal).value,
      summary: $('[name=summary]', guideModal).value,
      tags: $('[name=tags]', guideModal).value.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
      coverImage: $('[name=coverImage]', guideModal).value.trim() || null,
    };
    try {
      if (state.editingGuideId) {
        await api.put(`/api/guides/${state.editingGuideId}`, payload);
      } else {
        await api.post('/api/guides', payload);
      }
      closeModals();
      toast('攻略已保存');
      await loadAll();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function toggleGuide(gid) {
    const g = state.guides.find((x) => x.id === gid);
    const next = g.status === 'published' ? 'draft' : 'published';
    try {
      await api.patch(`/api/guides/${gid}/status`, { status: next });
      toast(next === 'published' ? '攻略已发布，读者端可见' : '已转为草稿，读者端不可见');
      await loadAll();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function deleteGuide(gid) {
    const g = state.guides.find((x) => x.id === gid);
    if (!confirm(`确定删除攻略「${g.title}」及其全部章节吗？此操作不可恢复。`)) return;
    try {
      await api.del(`/api/guides/${gid}`);
      toast('攻略已删除');
      await loadAll();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  /* ---------------- 章节操作 ---------------- */

  function openChapterModal(gid, cid) {
    state.editingChapter = { guideId: gid, chapterId: cid || null };
    const ch = cid ? chaptersOf(gid).find((c) => c.id === cid) : null;
    $('#chapterModalTitle').textContent = ch ? '编辑章节' : '新增章节';
    $('[name=title]', chapterModal).value = ch ? ch.title : '';
    $('[name=content]', chapterModal).value = ch ? (ch.content || '') : '';
    $('[name=imageUrl]', chapterModal).value = ch && ch.imageUrl ? ch.imageUrl : '';
    $('[name=imageCaption]', chapterModal).value = ch ? (ch.imageCaption || '') : '';
    $('[name=imageFile]', chapterModal).value = '';
    updateThumb($('[name=imageThumb]', chapterModal), ch && ch.imageUrl);
    chapterModal.classList.add('show');
  }

  async function saveChapter(status) {
    const { guideId, chapterId } = state.editingChapter;
    const payload = {
      title: $('[name=title]', chapterModal).value,
      content: $('[name=content]', chapterModal).value,
      imageUrl: $('[name=imageUrl]', chapterModal).value.trim() || null,
      imageCaption: $('[name=imageCaption]', chapterModal).value,
      status,
    };
    try {
      if (chapterId) {
        await api.put(`/api/chapters/${chapterId}`, payload);
      } else {
        await api.post(`/api/guides/${guideId}/chapters`, payload);
      }
      closeModals();
      toast(status === 'published' ? '章节已发布' : '草稿已保存');
      await loadAll();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function toggleChapter(cid) {
    const ch = Object.values(state.chapters).flat().find((c) => c.id === cid);
    const next = ch.status === 'published' ? 'draft' : 'published';
    try {
      await api.patch(`/api/chapters/${cid}/status`, { status: next });
      toast(next === 'published' ? '章节已发布' : '章节已撤回为草稿');
      await loadAll();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function deleteChapter(cid) {
    if (!confirm('确定删除该章节吗？')) return;
    try {
      await api.del(`/api/chapters/${cid}`);
      toast('章节已删除');
      await loadAll();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function moveChapter(gid, cid, dir) {
    const chapters = chaptersOf(gid);
    const idx = chapters.findIndex((c) => c.id === cid);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= chapters.length) return;
    [chapters[idx], chapters[swap]] = [chapters[swap], chapters[idx]];
    try {
      await api.put(`/api/guides/${gid}/chapters/reorder`, {
        order: chapters.map((c) => c.id),
      });
      await loadAll();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  /* ---------------- 图片上传与预览 ---------------- */

  function updateThumb(img, url) {
    if (url) { img.src = url; img.style.display = 'block'; }
    else { img.removeAttribute('src'); img.style.display = 'none'; }
  }

  function wireUpload(fileInput, urlInput, thumb) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      try {
        const res = await api.upload(file);
        urlInput.value = res.url;
        updateThumb(thumb, res.url);
        toast('图片已上传');
      } catch (e) {
        toast(e.message, 'error');
      }
    });
    urlInput.addEventListener('input', () => updateThumb(thumb, urlInput.value.trim()));
  }

  /* ---------------- 弹窗 ---------------- */

  function closeModals() {
    guideModal.classList.remove('show');
    chapterModal.classList.remove('show');
  }

  /* ---------------- 初始化 ---------------- */

  $('#btnNewGuide').addEventListener('click', () => openGuideModal(null));
  $('#btnSaveGuide').addEventListener('click', saveGuide);
  $('#btnSaveDraft').addEventListener('click', () => saveChapter('draft'));
  $('#btnSavePublish').addEventListener('click', () => saveChapter('published'));
  $('#searchBox').addEventListener('input', (e) => {
    state.keyword = e.target.value;
    render();
  });
  $$('[data-close]').forEach((btn) => btn.addEventListener('click', closeModals));
  [guideModal, chapterModal].forEach((mask) => {
    mask.addEventListener('click', (e) => { if (e.target === mask) closeModals(); });
  });

  wireUpload(
    $('[name=coverFile]', guideModal),
    $('[name=coverImage]', guideModal),
    $('[name=coverThumb]', guideModal));
  wireUpload(
    $('[name=imageFile]', chapterModal),
    $('[name=imageUrl]', chapterModal),
    $('[name=imageThumb]', chapterModal));

  loadAll().catch((e) => {
    $('#guideAdminList').innerHTML = `<div class="empty">加载失败：${escapeHtml(e.message)}</div>`;
  });
})();
