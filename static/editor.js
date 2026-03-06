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
        dot.title = "\u5df2\u8fde\u63a5: " + data.repo + " [" + data.branch + "]";
      } else {
        dot.className = "status-dot disconnected";
        dot.title = "\u672a\u8fde\u63a5";
      }
    } catch (e) {
      dot.className = "status-dot disconnected";
      dot.title = "\u8fde\u63a5\u5931\u8d25";
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
      ? '<div class="loading">\u91cd\u8bd5\u4e2d (' + retryCount + '/' + maxRetry + ')\u2026</div>'
      : '<div class="loading">\u52a0\u8f7d\u4e2d\u2026</div>';
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
        tree.innerHTML = '<div class="loading error">\u52a0\u8f7d\u5931\u8d25 <a href="#" id="retry-nav" style="color:#58a6ff;margin-left:8px">\u70b9\u51fb\u91cd\u8bd5</a></div>';
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
    renameBtn.title = "\u91cd\u547d\u540d\u5206\u533a";
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
      if (dirty && !confirm("\u5f53\u524d\u9875\u9762\u6709\u672a\u4fdd\u5b58\u7684\u4fee\u6539\uff0c\u786e\u5b9a\u8981\u79bb\u5f00\u5417\uff1f")) return;
      openPage(path);
    });

    var renameBtn = document.createElement("span");
    renameBtn.className = "rename-btn";
    renameBtn.textContent = "\u270e";
    renameBtn.title = "\u91cd\u547d\u540d";
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
    showToast("\u6b63\u5728\u52a0\u8f7d " + path + "\u2026");
    try {
      var res = await fetch("/api/page/read?path=" + encodeURIComponent(path));
      if (!res.ok) {
        showToast("\u8bfb\u53d6\u5931\u8d25");
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
      document.getElementById("btn-delete").disabled = (path === "index.md");

      refreshSessionTimer();
      showToast("\u5df2\u52a0\u8f7d " + path);
    } catch (e) {
      showToast("\u52a0\u8f7d\u5931\u8d25: " + e.message);
    }
  }

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
    showToast("✅ 已撤回");
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
    delBtn.textContent = "✖ 删除表格";
    delBtn.title = "删除当前表格";
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
      showToast("✅ 表格已删除，可点撤回恢复");
    });
  }

  /* ─── 保存 ─── */
  document.getElementById("btn-save").addEventListener("click", async function () {
    if (!currentPath || !editor) return;
    var btn = this;
    btn.disabled = true;
    btn.textContent = "\u4fdd\u5b58\u4e2d\u2026";
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
        showToast("\u2705 \u5df2\u4fdd\u5b58\u5e76\u63a8\u9001\u5230 GitHub");
      } else {
        showToast("\u274c " + (data.error || "\u4fdd\u5b58\u5931\u8d25"));
      }
    } catch (e) {
      showToast("\u274c \u4fdd\u5b58\u5931\u8d25: " + e.message);
    }
    btn.disabled = false;
    btn.innerHTML = "&#128190; \u4fdd\u5b58";
  });

  /* ─── 新建页面 ─── */
  document.getElementById("btn-new").addEventListener("click", async function () {
    var secSel = document.getElementById("create-section");
    secSel.innerHTML = '<option value="">-- \u4e0d\u6dfb\u52a0\u5230\u5bfc\u822a --</option>';
    var dirSel = document.getElementById("create-dir");
    dirSel.innerHTML = '<option value="">docs/\uff08\u6839\u76ee\u5f55\uff09</option>';
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
      showToast("\u6807\u9898\u548c\u6587\u4ef6\u540d\u4e0d\u80fd\u4e3a\u7a7a");
      return;
    }
    if (!filename.endsWith(".md")) filename += ".md";
    var path = dir ? dir + "/" + filename : filename;
    var btn = this;
    btn.disabled = true;
    btn.textContent = "\u521b\u5efa\u4e2d\u2026";
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
        showToast("\u2705 \u521b\u5efa\u6210\u529f\uff01");
        await loadNav();
        openPage(data.path);
      } else {
        showToast(data.error || "\u521b\u5efa\u5931\u8d25");
      }
    } catch (e) {
      showToast("\u521b\u5efa\u5931\u8d25: " + e.message);
    }
    btn.disabled = false;
    btn.textContent = "\u521b\u5efa";
  });

  /* ─── 删除页面 ─── */
  document.getElementById("btn-delete").addEventListener("click", function () {
    if (!currentPath || currentPath === "index.md") return;
    document.getElementById("del-path").textContent = currentPath;
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
        showToast("\u2705 \u5df2\u5220\u9664 " + currentPath);
        currentPath = null;
        currentSha = null;
        dirty = false;
        if (editor) { editor.destroy(); editor = null; }
        document.getElementById("editor-placeholder").style.display = "flex";
        document.getElementById("editor-container").style.display = "none";
        document.getElementById("current-path").textContent = "\u672a\u9009\u62e9\u6587\u4ef6";
        document.getElementById("btn-save").disabled = true;
        document.getElementById("btn-delete").disabled = true;
        await loadNav();
      } else {
        var data = await res.json();
        showToast(data.error || "\u5220\u9664\u5931\u8d25");
      }
    } catch (e) {
      showToast("\u5220\u9664\u5931\u8d25: " + e.message);
    }
    btn.disabled = false;
  });

  /* ─── 重命名 ─── */
  async function doRename(currentName, section) {
    var newName = prompt("\u91cd\u547d\u540d\u300c" + currentName + "\u300d\u4e3a:", currentName);
    if (!newName || newName === currentName) return;
    showToast("\u6b63\u5728\u91cd\u547d\u540d\u2026");
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
        showToast("\u2705 \u5df2\u91cd\u547d\u540d\u5e76\u63a8\u9001\u5230 GitHub");
        await loadNav();
      } else {
        var data = await res.json();
        showToast(data.error || "\u91cd\u547d\u540d\u5931\u8d25");
      }
    } catch (e) {
      showToast("\u91cd\u547d\u540d\u5931\u8d25: " + e.message);
    }
  }

  /* ─── 刷新 ─── */
  document.getElementById("btn-refresh").addEventListener("click", function () {
    loadNav();
    checkStatus();
    showToast("\u5df2\u5237\u65b0");
  });

  /* ─── 退出 ─── */
  document.getElementById("btn-logout").addEventListener("click", function () {
    if (dirty && !confirm("\u6709\u672a\u4fdd\u5b58\u7684\u4fee\u6539\uff0c\u786e\u5b9a\u8981\u9000\u51fa\u5417\uff1f")) return;
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
          timerEl.textContent = "\u5df2\u8fc7\u671f";
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
