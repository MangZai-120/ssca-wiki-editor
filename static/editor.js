/**
 * SSCA Wiki GitHub 远程编辑器 — 前端 SPA
 */
(function () {
  "use strict";

  var currentPath = null;
  var currentSha = null;
  var editor = null;
  var dirty = false;
  var sessionLeft = 0;
  var undoStack = [];

  /* ─── Toast ─── */
  var toastEl = document.getElementById("toast");
  function showToast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    setTimeout(function () { toastEl.classList.remove("show"); }, ms || 2500);
  }

  /* ─── 状态指示灯 ─── */
  function refreshSessionTimer() { sessionLeft = 40 * 60; }

  async function checkStatus() {
    var dot = document.getElementById("status-dot");
    try {
      var res = await fetch("/api/status");
      var data = await res.json();
      if (data.connected) {
        dot.className = "status-dot connected";
        dot.title = t('status_connected') + ": " + data.repo + " [" + data.branch + "]";
      } else {
        dot.className = "status-dot disconnected";
        dot.title = t('status_disconnected');
      }
    } catch (e) {
      dot.className = "status-dot disconnected";
      dot.title = t('status_failed');
    }
  }
  checkStatus();
  setInterval(checkStatus, 60000);

  /* ─── 加载导航树 ─── */
  async function loadNav(retryCount) {
    var tree = document.getElementById("nav-tree");
    var maxRetry = 2;
    if (retryCount === undefined) retryCount = 0;
    tree.innerHTML = retryCount > 0
      ? '<div class="loading">' + t('retrying', retryCount, maxRetry) + '</div>'
      : '<div class="loading">' + t('loading') + '</div>';
    try {
      var res = await fetch("/api/nav/tree");
      if (!res.ok) throw new Error("Failed");
      var nav = await res.json();
      renderNav(nav);
      refreshSessionTimer();
    } catch (e) {
      if (retryCount < maxRetry) {
        setTimeout(function () { loadNav(retryCount + 1); }, 3000);
      } else {
        tree.innerHTML = '<div class="loading error">' + t('load_failed') + ' <a href="#" id="retry-nav" style="color:#58a6ff;margin-left:8px">' + t('click_retry') + '</a></div>';
        document.getElementById("retry-nav").addEventListener("click", function(ev) { ev.preventDefault(); loadNav(0); });
      }
    }
  }

  function renderNav(nav) {
    var tree = document.getElementById("nav-tree");
    tree.innerHTML = "";
    nav.forEach(function (item) {
      if (typeof item !== "object") return;
      for (var key in item) {
        var val = item[key];
        if (typeof val === "string") {
          tree.appendChild(createNavItem(key, val, null));
        } else if (Array.isArray(val)) {
          tree.appendChild(createNavSection(key, val));
        }
      }
    });
  }

  function createNavSection(name, children) {
    var section = document.createElement("div");
    section.className = "nav-section";

    var header = document.createElement("div");
    header.className = "nav-section-header";
    var nameSpan = document.createElement("span");
    nameSpan.className = "section-name";
    nameSpan.textContent = name;
    var renameBtn = document.createElement("span");
    renameBtn.className = "rename-btn";
    renameBtn.textContent = "\u270e";
    renameBtn.title = t('rename_section');
    renameBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      doRename(name, null);
    });
    var toggleBtn = document.createElement("span");
    toggleBtn.className = "toggle-btn";
    toggleBtn.textContent = "\u25bc";
    header.appendChild(toggleBtn);
    header.appendChild(nameSpan);
    header.appendChild(renameBtn);

    header.addEventListener("click", function () {
      section.classList.toggle("collapsed");
      toggleBtn.textContent = section.classList.contains("collapsed") ? "\u25b6" : "\u25bc";
    });

    section.appendChild(header);

    var list = document.createElement("div");
    list.className = "nav-section-items";
    children.forEach(function (child) {
      if (typeof child === "object") {
        for (var k in child) {
          list.appendChild(createNavItem(k, child[k], name));
        }
      }
    });
    section.appendChild(list);
    return section;
  }

  function createNavItem(title, path, section) {
    var item = document.createElement("div");
    item.className = "nav-item";
    item.dataset.path = path;
    if (currentPath === path) item.classList.add("active");

    var nameSpan = document.createElement("span");
    nameSpan.className = "item-name";
    nameSpan.textContent = title;
    nameSpan.addEventListener("click", function () {
      if (dirty && !confirm(t('unsaved_leave'))) return;
      openPage(path);
    });

    var renameBtn = document.createElement("span");
    renameBtn.className = "rename-btn";
    renameBtn.textContent = "\u270e";
    renameBtn.title = t('rename_item');
    renameBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      doRename(title, section);
    });

    item.appendChild(nameSpan);
    item.appendChild(renameBtn);
    return item;
  }

  /* ─── 打开页面 ─── */
  async function openPage(path) {
    showToast(t('loading_page', path));
    try {
      var res = await fetch("/api/page/read?path=" + encodeURIComponent(path));
      if (!res.ok) {
        showToast(t('load_page_failed'));
        return;
      }
      var data = await res.json();
      currentPath = data.path;
      currentSha = data.sha;
      dirty = false;

      // 更新侧栏激活状态
      document.querySelectorAll(".nav-item").forEach(function (el) {
        el.classList.toggle("active", el.dataset.path === path);
      });

      // 更新路径显示
      document.getElementById("current-path").textContent = path;

      // 隐藏占位符，显示编辑器
      document.getElementById("editor-placeholder").style.display = "none";
      document.getElementById("editor-container").style.display = "block";

      // 创建编辑器
      if (editor) editor.destroy();
      editor = new toastui.Editor({
        el: document.getElementById("editor-container"),
        initialEditType: "wysiwyg",
        previewStyle: "vertical",
        height: "100%",
        initialValue: data.content,
        usageStatistics: false,
      });
      editor.on("change", function () { dirty = true; });

      // 撤回栈初始化
      undoStack = [];
      document.getElementById("btn-undo").disabled = true;

      // 表格删除按钮
      setupTableDeleteBtn();

      // 启用按钮
      document.getElementById("btn-save").disabled = false;
      document.getElementById("btn-preview").disabled = false;
      document.getElementById("btn-delete").disabled = (path === "index.md");

      refreshSessionTimer();
      showToast(t('page_loaded', path));
    } catch (e) {
      showToast(t('load_page_error', e.message));
    }
  }

  /* ─── 实时预览窗口 ─── */
  var previewWin = null;
  var previewTimer = null;

  function updatePreview() {
    if (!previewWin || previewWin.closed || !editor) {
      stopPreviewSync();
      return;
    }
    try {
      var md = editor.getMarkdown();
      previewWin.postMessage({ type: 'ssca-preview', markdown: md }, '*');
    } catch (e) {}
  }

  function startPreviewSync() {
    if (previewTimer) return;
    previewTimer = setInterval(updatePreview, 500);
  }

  function stopPreviewSync() {
    if (previewTimer) { clearInterval(previewTimer); previewTimer = null; }
    previewWin = null;
  }

  document.getElementById("btn-preview").addEventListener("click", function () {
    if (!editor) return;
    if (previewWin && !previewWin.closed) {
      previewWin.focus();
      updatePreview();
      return;
    }
    var title = currentPath || 'preview';
    previewWin = window.open('', 'ssca_preview', 'width=900,height=700,scrollbars=yes');
    if (!previewWin) { showToast(t('preview_blocked')); return; }
    var doc = previewWin.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head>'
      + '<meta charset="utf-8">'
      + '<title>' + t('preview_title') + ' - ' + title + '</title>'
      + '<link rel="stylesheet" href="https://uicdn.toast.com/editor/latest/toastui-editor.min.css">'
      + '<style>'
      + 'body{font-family:"Segoe UI",-apple-system,sans-serif;background:#0d1117;color:#c9d1d9;margin:0;padding:20px 40px;line-height:1.7}'
      + '#header{border-bottom:1px solid #30363d;padding-bottom:12px;margin-bottom:20px;display:flex;align-items:center;gap:12px}'
      + '#header h3{color:#58a6ff;margin:0;font-size:16px;flex:1}'
      + '#header .badge{font-size:10px;background:#238636;color:#fff;padding:2px 8px;border-radius:4px;font-weight:600}'
      + '#preview-body{max-width:860px}'
      + '#preview-body h1,#preview-body h2,#preview-body h3{color:#58a6ff;border-bottom:1px solid #21262d;padding-bottom:6px;margin:20px 0 10px}'
      + '#preview-body a{color:#58a6ff}'
      + '#preview-body code{background:#161b22;padding:2px 6px;border-radius:4px;font-size:90%}'
      + '#preview-body pre{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px;overflow-x:auto}'
      + '#preview-body table{border-collapse:collapse;width:100%;margin:12px 0}'
      + '#preview-body th,#preview-body td{border:1px solid #30363d;padding:8px 12px;text-align:left}'
      + '#preview-body th{background:#161b22;font-weight:600}'
      + '#preview-body img{max-width:100%;border-radius:6px}'
      + '#preview-body blockquote{border-left:3px solid #30363d;margin:10px 0;padding:4px 16px;color:#8b949e}'
      + '#preview-body ul,#preview-body ol{padding-left:24px}'
      + '</style>'
      + '</head><body>'
      + '<div id="header"><h3 id="preview-path">' + title + '</h3><span class="badge">' + t('preview_live') + '</span></div>'
      + '<div id="preview-body"></div>'
      + '<script src="https://uicdn.toast.com/editor/latest/toastui-editor-all.min.js"><\/script>'
      + '<script>'
      + 'window.addEventListener("message", function(e){'
      + '  if(!e.data||e.data.type!=="ssca-preview")return;'
      + '  var el=document.createElement("div");'
      + '  var viewer=toastui.Editor.factory({el:el,viewer:true,initialValue:e.data.markdown});'
      + '  document.getElementById("preview-body").innerHTML=el.querySelector(".toastui-editor-contents").innerHTML;'
      + '});'
      + '<\/script></body></html>');
    doc.close();
    // 延迟一下等新窗口加载完
    setTimeout(function () {
      updatePreview();
      startPreviewSync();
    }, 1000);
    showToast(t('preview_opened'));
  });

  /* ─── 撤回按钮 ─── */
  function pushUndo() {
    if (!editor) return;
    undoStack.push(editor.getMarkdown());
    if (undoStack.length > 50) undoStack.shift();
    document.getElementById("btn-undo").disabled = false;
  }

  document.getElementById("btn-undo").addEventListener("click", function () {
    if (!editor || undoStack.length === 0) return;
    var prev = undoStack.pop();
    editor.setMarkdown(prev, false);
    dirty = true;
    document.getElementById("btn-undo").disabled = undoStack.length === 0;
    showToast(t('undo_ok'));
  });

  /* ─── 表格删除按钮 ─── */
  function setupTableDeleteBtn() {
    if (!editor) return;
    var container = document.getElementById("editor-container");

    // 移除旧的删除按钮
    var old = container.querySelector(".table-delete-btn");
    if (old) old.remove();

    // 创建删除按钮
    var delBtn = document.createElement("button");
    delBtn.className = "table-delete-btn";
    delBtn.textContent = t('table_delete');
    delBtn.title = t('table_delete_title');
    delBtn.style.display = "none";
    container.style.position = "relative";
    container.appendChild(delBtn);

    var activeTable = null;

    // 监听 WYSIWYG 区域的点击
    function checkWwEditor() {
      var wwEl = container.querySelector(".toastui-editor-ww-container");
      if (!wwEl) { setTimeout(checkWwEditor, 200); return; }
      wwEl.addEventListener("click", function (e) {
        var table = e.target.closest("table");
        if (table) {
          activeTable = table;
          // 定位删除按钮到表格右上角
          var tRect = table.getBoundingClientRect();
          var cRect = container.getBoundingClientRect();
          delBtn.style.top = (tRect.top - cRect.top - 2) + "px";
          delBtn.style.left = (tRect.right - cRect.left - delBtn.offsetWidth) + "px";
          delBtn.style.display = "block";
        } else {
          activeTable = null;
          delBtn.style.display = "none";
        }
      });
    }
    checkWwEditor();

    delBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!activeTable) return;
      pushUndo();
      activeTable.remove();
      delBtn.style.display = "none";
      activeTable = null;
      dirty = true;
      showToast(t('table_deleted_ok'));
    });
  }

  /* ─── 保存 ─── */
  document.getElementById("btn-save").addEventListener("click", async function () {
    if (!currentPath || !editor) return;
    var btn = this;
    btn.disabled = true;
    btn.textContent = t('saving');
    try {
      var md = editor.getMarkdown();
      var res = await fetch("/api/page/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ path: currentPath, content: md, sha: currentSha }),
      });
      var data = await res.json();
      if (res.ok) {
        currentSha = data.sha;
        dirty = false;
        refreshSessionTimer();
        showToast(t('saved_ok'));
      } else {
        showToast("\u274c " + (data.error || t('save_default_fail')));
      }
    } catch (e) {
      showToast(t('save_failed_msg', e.message));
    }
    btn.disabled = false;
    btn.innerHTML = t('btn_save');
  });

  /* ─── 新建页面 ─── */
  document.getElementById("btn-new").addEventListener("click", async function () {
    var secSel = document.getElementById("create-section");
    secSel.innerHTML = '<option value="">' + t('create_section_none') + '</option>';
    var dirSel = document.getElementById("create-dir");
    dirSel.innerHTML = '<option value="">' + t('create_dir_root') + '</option>';
    try {
      var [secRes, dirRes] = await Promise.all([
        fetch("/api/nav/sections"),
        fetch("/api/dirs")
      ]);
      if (secRes.ok) {
        var sections = await secRes.json();
        sections.forEach(function (s) {
          var opt = document.createElement("option");
          opt.value = s;
          opt.textContent = s;
          secSel.appendChild(opt);
        });
      }
      if (dirRes.ok) {
        var dirs = await dirRes.json();
        dirs.forEach(function (d) {
          if (!d) return;
          var opt = document.createElement("option");
          opt.value = d;
          opt.textContent = "docs/" + d + "/";
          dirSel.appendChild(opt);
        });
      }
    } catch (e) {}
    document.getElementById("create-title").value = "";
    document.getElementById("create-filename").value = "";
    document.getElementById("create-dialog").classList.add("active");
    document.getElementById("create-title").focus();
  });

  document.getElementById("create-cancel").addEventListener("click", function () {
    document.getElementById("create-dialog").classList.remove("active");
  });

  document.getElementById("create-confirm").addEventListener("click", async function () {
    var title = document.getElementById("create-title").value.trim();
    var dir = document.getElementById("create-dir").value;
    var filename = document.getElementById("create-filename").value.trim();
    var section = document.getElementById("create-section").value;
    if (!title || !filename) {
      showToast(t('title_file_empty'));
      return;
    }
    if (!filename.endsWith(".md")) filename += ".md";
    var path = dir ? dir + "/" + filename : filename;
    var btn = this;
    btn.disabled = true;
    btn.textContent = t('creating');
    try {
      var res = await fetch("/api/page/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ title: title, path: path, section: section || undefined }),
      });
      var data = await res.json();
      if (res.ok) {
        document.getElementById("create-dialog").classList.remove("active");
        refreshSessionTimer();
        showToast(t('created_ok'));
        await loadNav();
        openPage(data.path);
      } else {
        showToast(data.error || t('create_failed'));
      }
    } catch (e) {
      showToast(t('create_failed_msg', e.message));
    }
    btn.disabled = false;
    btn.textContent = t('btn_create');
  });

  /* ─── 删除页面 ─── */
  document.getElementById("btn-delete").addEventListener("click", function () {
    if (!currentPath || currentPath === "index.md") return;
    document.getElementById("del-msg").innerHTML = t('delete_dialog_msg', currentPath);
    document.getElementById("delete-dialog").classList.add("active");
  });

  document.getElementById("del-cancel").addEventListener("click", function () {
    document.getElementById("delete-dialog").classList.remove("active");
  });

  document.getElementById("del-confirm").addEventListener("click", async function () {
    var btn = this;
    btn.disabled = true;
    try {
      var res = await fetch("/api/page/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ path: currentPath }),
      });
      if (res.ok) {
        document.getElementById("delete-dialog").classList.remove("active");
        refreshSessionTimer();
        showToast(t('deleted_ok', currentPath));
        currentPath = null;
        currentSha = null;
        dirty = false;
        if (editor) { editor.destroy(); editor = null; }
        document.getElementById("editor-placeholder").style.display = "flex";
        document.getElementById("editor-container").style.display = "none";
        document.getElementById("current-path").textContent = t('no_file');
        document.getElementById("btn-save").disabled = true;
        document.getElementById("btn-preview").disabled = true;
        document.getElementById("btn-delete").disabled = true;
        await loadNav();
      } else {
        var data = await res.json();
        showToast(data.error || t('delete_failed'));
      }
    } catch (e) {
      showToast(t('delete_failed_msg', e.message));
    }
    btn.disabled = false;
  });

  /* ─── 重命名 ─── */
  async function doRename(currentName, section) {
    var newName = prompt(t('rename_prompt', currentName), currentName);
    if (!newName || newName === currentName) return;
    showToast(t('renaming'));
    try {
      var payload = { old_name: currentName, new_name: newName };
      if (section) payload.section = section;
      var res = await fetch("/api/nav/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        refreshSessionTimer();
        showToast(t('renamed_ok'));
        await loadNav();
      } else {
        var data = await res.json();
        showToast(data.error || t('rename_failed'));
      }
    } catch (e) {
      showToast(t('rename_failed_msg', e.message));
    }
  }

  /* ─── 刷新 ─── */
  document.getElementById("btn-refresh").addEventListener("click", function () {
    loadNav();
    checkStatus();
    showToast(t('refreshed'));
  });

  /* ─── 退出 ─── */
  document.getElementById("btn-logout").addEventListener("click", function () {
    if (dirty && !confirm(t('unsaved_logout'))) return;
    location.href = "/logout";
  });

  /* ─── 关闭/刷新警告 ─── */
  window.addEventListener("beforeunload", function (e) {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = "";
  });

  /* ─── 快捷键 ─── */
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      document.getElementById("btn-save").click();
    }
  });

  /* ─── 初始化 ─── */
  loadNav();

  /* ─── 会话倒计时 ─── */
  (function initTimer() {
    var timerEl = document.getElementById("session-timer");
    fetch("/api/session_ttl").then(function (r) { return r.json(); }).then(function (d) {
      sessionLeft = d.ttl;
      function tick() {
        if (sessionLeft <= 0) {
          timerEl.textContent = t('session_expired');
          timerEl.style.color = "#f85149";
          return;
        }
        var m = Math.floor(sessionLeft / 60), s = sessionLeft % 60;
        timerEl.textContent = m + ":" + (s < 10 ? "0" : "") + s;
        if (sessionLeft <= 60) timerEl.style.color = "#f85149";
        else if (sessionLeft <= 180) timerEl.style.color = "#d29922";
        else timerEl.style.color = "#8b949e";
        sessionLeft--;
        setTimeout(tick, 1000);
      }
      tick();
    });
  })();
})();
