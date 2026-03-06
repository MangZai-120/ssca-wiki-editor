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
    var pageTitle = title.replace(/\.md$/, '').split('/').pop();
    previewWin = window.open('', 'ssca_preview', 'width=1100,height=750,scrollbars=yes');
    if (!previewWin) { showToast(t('preview_blocked')); return; }
    var doc = previewWin.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head>'
      + '<meta charset="utf-8">'
      + '<title>' + t('preview_title') + ' - ' + pageTitle + '</title>'
      + '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">'
      + '<style>'
      // ─── ReadTheDocs 精确风格 ───
      + '*{box-sizing:border-box;margin:0;padding:0}'
      + 'body{font-family:"Lato","proxima-nova","Helvetica Neue",Arial,sans-serif;background:#fcfcfc;color:#404040;line-height:1.6;font-size:16px}'
      // 顶栏
      + '#rtd-header{background:#2980b9;color:#fff;padding:12px 24px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:10}'
      + '#rtd-header .logo{font-size:18px;font-weight:700}'
      + '#rtd-header .path{font-size:13px;opacity:.85;flex:1}'
      + '#rtd-header .badge{font-size:11px;background:rgba(255,255,255,.2);padding:2px 10px;border-radius:10px;font-weight:600}'
      // 主内容区
      + '#rtd-content{max-width:800px;margin:0 auto;padding:30px 40px 60px}'
      // 标题 - ReadTheDocs 风格
      + '#rtd-content h1{font-size:2em;font-weight:700;color:#404040;border-bottom:1px solid #e1e4e5;padding-bottom:.4em;margin:1.6em 0 .8em}'
      + '#rtd-content h2{font-size:1.75em;font-weight:700;color:#404040;border-bottom:1px solid #e1e4e5;padding-bottom:.4em;margin:1.4em 0 .6em}'
      + '#rtd-content h3{font-size:1.25em;font-weight:700;color:#404040;margin:1.2em 0 .5em}'
      + '#rtd-content h4{font-size:1.1em;font-weight:700;color:#404040;margin:1em 0 .4em}'
      + '#rtd-content h5,#rtd-content h6{font-size:1em;font-weight:700;color:#404040;margin:.8em 0 .4em}'
      // 段落与文本
      + '#rtd-content p{margin:.5em 0;line-height:1.7}'
      + '#rtd-content a{color:#2980b9;text-decoration:none}'
      + '#rtd-content a:hover{color:#3091d1;text-decoration:underline}'
      + '#rtd-content strong{font-weight:700}'
      // 代码 - 行内
      + '#rtd-content code{background:#fff;border:1px solid #e1e4e5;border-radius:2px;padding:2px 5px;font-size:85%;color:#e74c3c;font-family:SFMono-Regular,Consolas,"Liberation Mono",Menlo,monospace;white-space:nowrap}'
      // 代码 - 块
      + '#rtd-content pre{background:#f8f8f8;border:1px solid #e1e4e5;padding:12px;overflow-x:auto;margin:1em 0;line-height:1.5;border-radius:2px}'
      + '#rtd-content pre code{border:none;padding:0;background:none;font-size:14px;color:#404040;white-space:pre}'
      // 表格 - ReadTheDocs 风格
      + '#rtd-content table{border-collapse:collapse;width:100%;margin:1em 0}'
      + '#rtd-content th,#rtd-content td{border:1px solid #e1e4e5;padding:8px 12px;text-align:left;font-size:90%}'
      + '#rtd-content th{background:#f0f0f0;font-weight:700;white-space:nowrap}'
      + '#rtd-content tr:nth-child(even) td{background:#f9f9f9}'
      // 引用
      + '#rtd-content blockquote{border-left:4px solid #ccc;margin:1em 0;padding:.5em 1em;color:#555;background:#f9f9f9}'
      + '#rtd-content blockquote p{margin:.3em 0}'
      // 列表
      + '#rtd-content ul,#rtd-content ol{padding-left:2em;margin:.5em 0}'
      + '#rtd-content li{margin:.25em 0;line-height:1.7}'
      + '#rtd-content li>p{margin:.2em 0}'
      // 图片
      + '#rtd-content img{max-width:100%;height:auto}'
      // 水平线
      + '#rtd-content hr{border:none;border-top:1px solid #e1e4e5;margin:1.5em 0}'
      // ─── MkDocs Admonition 提示框 ───
      + '#rtd-content .admonition{padding:0;margin:1em 0;border:none;border-radius:0;overflow:hidden}'
      + '#rtd-content .admonition-title{font-weight:700;padding:6px 12px;margin:0;font-size:14px}'
      + '#rtd-content .admonition-body{padding:12px;font-size:14px}'
      + '#rtd-content .admonition-body p{margin:.4em 0}'
      + '#rtd-content .admonition-body p:first-child{margin-top:0}'
      + '#rtd-content .admonition-body p:last-child{margin-bottom:0}'
      // note / seealso / info（蓝色系）
      + '#rtd-content .admonition.note,#rtd-content .admonition.seealso,#rtd-content .admonition.info{background:#e7f2fa}'
      + '#rtd-content .admonition.note .admonition-title,#rtd-content .admonition.seealso .admonition-title,#rtd-content .admonition.info .admonition-title{background:#6ab0de;color:#fff}'
      // warning / caution / attention（橙色系）
      + '#rtd-content .admonition.warning,#rtd-content .admonition.caution,#rtd-content .admonition.attention{background:#ffedcc}'
      + '#rtd-content .admonition.warning .admonition-title,#rtd-content .admonition.caution .admonition-title,#rtd-content .admonition.attention .admonition-title{background:#f0b37e;color:#fff}'
      // danger / error / critical（红色系）
      + '#rtd-content .admonition.danger,#rtd-content .admonition.error{background:#fdf3f2}'
      + '#rtd-content .admonition.danger .admonition-title,#rtd-content .admonition.error .admonition-title{background:#f29f97;color:#fff}'
      // tip / hint / important（绿色系）
      + '#rtd-content .admonition.tip,#rtd-content .admonition.hint,#rtd-content .admonition.important{background:#dbfaf4}'
      + '#rtd-content .admonition.tip .admonition-title,#rtd-content .admonition.hint .admonition-title,#rtd-content .admonition.important .admonition-title{background:#1abc9c;color:#fff}'
      + '</style>'
      + '</head><body>'
      + '<div id="rtd-header">'
      + '  <span class="logo">SSCA Wiki</span>'
      + '  <span class="path">' + title + '</span>'
      + '  <span class="badge">' + t('preview_live') + '</span>'
      + '</div>'
      + '<div id="rtd-content"></div>'
      + '<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>'
      + '<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"><\/script>'
      + '<script>'
      // ─── MkDocs admonition 预处理器 ───
      + 'function preprocessAdmonitions(md){'
      + '  var lines=md.split("\\n"),out=[],i=0;'
      + '  while(i<lines.length){'
      + '    var m=lines[i].match(/^!!!\\s+(\\w+)(?:\\s+"([^"]*)")?\\s*$/);'
      + '    if(m){'
      + '      var aType=m[1],aTitle=m[2]||m[1],body=[];'
      + '      i++;'
      + '      while(i<lines.length&&(lines[i].match(/^    /)||lines[i].match(/^\\t/)||lines[i].match(/^\\s*$/))){'
      + '        var bl=lines[i].replace(/^    /,"").replace(/^\\t/,"");'
      + '        if(lines[i].match(/^\\s*$/)&&i+1<lines.length&&!lines[i+1].match(/^    |^\\t/))break;'
      + '        body.push(bl);i++;'
      + '      }'
      + '      var bodyMd=body.join("\\n").trim();'
      + '      out.push("<div class=\\"admonition "+aType+"\\"><p class=\\"admonition-title\\">"+aTitle+"</p><div class=\\"admonition-body\\">\\n\\n"+bodyMd+"\\n\\n</div></div>\\n");'
      + '    }else{out.push(lines[i]);i++;}'
      + '  }'
      + '  return out.join("\\n");'
      + '}'
      // ─── marked 配置 ───
      + 'marked.setOptions({breaks:true,gfm:true,highlight:function(code,lang){'
      + '  if(lang&&hljs.getLanguage(lang))try{return hljs.highlight(code,{language:lang}).value}catch(e){}'
      + '  return hljs.highlightAuto(code).value'
      + '}});'
      // ─── 接收消息渲染 ───
      + 'window.addEventListener("message", function(e){'
      + '  if(!e.data||e.data.type!=="ssca-preview")return;'
      + '  var md=preprocessAdmonitions(e.data.markdown);'
      + '  var html=marked.parse(md);'
      // 后处理：让admonition-body内的markdown也被渲染
      + '  var el=document.createElement("div");el.innerHTML=html;'
      + '  el.querySelectorAll(".admonition-body").forEach(function(b){'
      + '    b.innerHTML=marked.parse(b.textContent||b.innerText);'
      + '  });'
      + '  document.getElementById("rtd-content").innerHTML=el.innerHTML;'
      + '});'
      + '<\/script></body></html>');
    doc.close();
    setTimeout(function () {
      updatePreview();
      startPreviewSync();
    }, 1500);
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
