# -*- coding: utf-8 -*-
"""
SSCA Wiki Editor — 远程启动器
从 GitHub 仓库下载编辑器到本地持久目录，启动时自动检查更新。
使用方式：python remote_launcher.py
"""
import hashlib,os,socket,ssl,subprocess,sys,threading,time
import urllib.error,urllib.request,json

# ─── 控制台编码修复 ───
def _setup_console():
    """将 Windows 控制台切换到 UTF-8，防止 Unicode 字符输出崩溃"""
    try:
        if sys.platform == 'win32':
            import ctypes as _ct
            _ct.windll.kernel32.SetConsoleOutputCP(65001)
            _ct.windll.kernel32.SetConsoleCP(65001)
    except Exception:
        pass
    # 强制 stdout/stderr 使用 utf-8，遇到无法编码的字符用 ? 替代
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass

_setup_console()

# ─── 控制台进度工具 ───
def _progress_bar(current, total, suffix='', width=30):
    """在同一行刷新显示进度条"""
    filled = int(width * current / total) if total else 0
    bar = '█' * filled + '░' * (width - filled)
    pct = int(100 * current / total) if total else 0
    line = f'\r  [{bar}] {current}/{total} {pct}% {suffix}'
    # 用空格填充到固定宽度，避免短文件名覆盖长文件名时残留字符
    print(f'{line:<80}', end='', flush=True)
    if current >= total:
        print()

def _spinner(stop_event, msg=''):
    """在后台线程中显示旋转动画，直到 stop_event 被设置"""
    frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏']
    i = 0
    while not stop_event.is_set():
        print(f'\r  {frames[i % len(frames)]} {msg}', end='', flush=True)
        i += 1
        stop_event.wait(0.1)
    print(f'\r  ✓ {msg}' + ' ' * 10)
try:
    import ctypes,ctypes.wintypes
except ImportError:
    ctypes = None

# ═══════════════════════════════════════════════
#  配置区域 — 修改为你的 GitHub 仓库信息
# ═══════════════════════════════════════════════
_OWNER = "MangZai-120"
_REPO  = "ssca-wiki-editor"
_BRANCH = "main"
# ═══════════════════════════════════════════════

_FILES = [
    "app.py",
    "auth.json",
    "login.html",
    "editor.html",
    "static/editor.css",
    "static/editor.js",
    "static/i18n.js",
    "static/lang/zh_CN.json",
    "static/lang/en_US.json",
]

# 多个下载源：优先镜像（国内快），最后回退到原始 GitHub
_MIRRORS = [
    "https://gh-proxy.com/https://raw.githubusercontent.com",
    "https://ghproxy.net/https://raw.githubusercontent.com",
    "https://raw.githubusercontent.com",
    "https://ghfast.top/https://raw.githubusercontent.com",
    "https://cors.isteed.cc/https://raw.githubusercontent.com",
    "https://mirror.ghproxy.com/https://raw.githubusercontent.com",
    "https://github.moeyy.xyz/https://raw.githubusercontent.com",
    "https://gh.api.99988866.xyz/https://raw.githubusercontent.com",
    "https://raw.gitmirror.com",
]

_API = "https://api.github.com"
_PORT = 5001
_MAX_RETRY = 2  # 每个镜像重试次数
_MANIFEST = ".ssca_manifest.json"  # 本地版本清单

# 持久化目录：桌面上的 SSCA_Wiki_Editor 文件夹
def _get_desktop_path():
    """获取用户真实桌面路径（兼容 OneDrive 同步、自定义路径、中文系统）"""
    # 方法1：Windows Shell API
    if ctypes and hasattr(ctypes, 'windll'):
        try:
            CSIDL_DESKTOPDIRECTORY = 0x0010
            buf = ctypes.create_unicode_buffer(ctypes.wintypes.MAX_PATH)
            if ctypes.windll.shell32.SHGetFolderPathW(None, CSIDL_DESKTOPDIRECTORY, None, 0, buf) == 0:
                return buf.value
        except Exception:
            pass
    # 方法2：注册表
    try:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER,
                             r'Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders')
        val, _ = winreg.QueryValueEx(key, 'Desktop')
        return os.path.expandvars(val)
    except Exception:
        pass
    # 方法3：回退默认
    return os.path.join(os.path.expanduser("~"), "Desktop")

def _get_editor_dir():
    """获取编辑器文件的持久存储目录（桌面）"""
    desktop = _get_desktop_path()
    d = os.path.join(desktop, "SSCA_Wiki_Editor")
    os.makedirs(d, exist_ok=True)
    return d

def _port_in_use():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", _PORT)) == 0

def _create_ssl_ctx():
    """创建兼容性更好的 SSL 上下文"""
    ctx = ssl.create_default_context()
    ctx.check_hostname = True
    ctx.verify_mode = ssl.CERT_REQUIRED
    return ctx

def _detect_proxy():
    """自动检测系统代理（环境变量 + Windows 注册表）"""
    for v in ['https_proxy','HTTPS_PROXY','http_proxy','HTTP_PROXY','all_proxy','ALL_PROXY']:
        p = os.environ.get(v)
        if p: return p
    try:
        import winreg
        rk = winreg.OpenKey(winreg.HKEY_CURRENT_USER,
                            r'Software\Microsoft\Windows\CurrentVersion\Internet Settings')
        en, _ = winreg.QueryValueEx(rk, 'ProxyEnable')
        if en:
            sv, _ = winreg.QueryValueEx(rk, 'ProxyServer')
            if sv:
                if not sv.startswith('http'): sv = 'http://' + sv
                return sv
    except Exception: pass
    return None

_proxy = _detect_proxy()

def _build_opener():
    handlers = []
    if _proxy:
        handlers.append(urllib.request.ProxyHandler({'http': _proxy, 'https': _proxy}))
    handlers.append(urllib.request.HTTPSHandler(context=_create_ssl_ctx()))
    return urllib.request.build_opener(*handlers)

_opener = _build_opener()

def _try_download_url(url, timeout=10):
    """尝试下载单个 URL，返回 bytes 或抛出异常"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "*/*",
        "Connection": "close",
    }
    req = urllib.request.Request(url, headers=headers)
    with _opener.open(req, timeout=timeout) as r:
        return r.read()

# 存储探测后可用的镜像列表（由 _probe_fastest_mirror 填充）
_alive_mirrors = []

def _download_file(raw_path):
    """尝试用可用镜像源下载一个文件，返回 bytes 或 None"""
    # 优先用探测存活的镜像，否则回退全部镜像
    mirrors = _alive_mirrors if _alive_mirrors else _MIRRORS
    for mirror in mirrors:
        url = f"{mirror}/{_OWNER}/{_REPO}/{_BRANCH}/{raw_path}"
        for attempt in range(_MAX_RETRY):
            try:
                data = _try_download_url(url)
                if data:
                    return data
            except Exception:
                if attempt < _MAX_RETRY - 1:
                    time.sleep(0.3)
                continue
    return None

def _download(dest_dir):
    """增量更新：只下载有变化的文件"""
    ok = True
    manifest_path = os.path.join(dest_dir, _MANIFEST)

    # 读取本地清单（文件名→SHA256）
    local_manifest = {}
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                local_manifest = json.load(f)
        except Exception:
            local_manifest = {}

    # 计算本地文件的实际哈希，防止文件被手动篡改
    def _local_hash(filepath):
        if not os.path.exists(filepath):
            return None
        h = hashlib.sha256()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()

    # 探测最快镜像（结果存入 _alive_mirrors）
    _probe_fastest_mirror()

    new_manifest = {}
    updated = 0
    skipped = 0
    total = len(_FILES)

    for idx, f in enumerate(_FILES):
        fp = os.path.join(dest_dir, f.replace("/", os.sep))
        os.makedirs(os.path.dirname(fp), exist_ok=True)

        # 进度条
        short = f.split('/')[-1]
        _progress_bar(idx, total, suffix=short)

        # 检查本地文件是否和清单一致
        cur_hash = _local_hash(fp)
        manifest_hash = local_manifest.get(f)

        # 先用镜像拿到远程文件内容
        data = _download_file(f)
        if data:
            remote_hash = hashlib.sha256(data).hexdigest()
            if cur_hash == remote_hash:
                skipped += 1
            else:
                with open(fp, "wb") as wf:
                    wf.write(data)
                updated += 1
            new_manifest[f] = remote_hash
        else:
            # 下载失败，如果本地有就用本地的
            if cur_hash:
                new_manifest[f] = cur_hash
            else:
                ok = False

    _progress_bar(total, total, suffix='完成')

    # 保存新清单
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(new_manifest, f)

    if updated > 0:
        print(f"  ↓ 更新了 {updated} 个文件，{skipped} 个无需更新")
    elif skipped == total:
        print(f"  ✓ 所有文件已是最新")
    if not ok:
        print(f"  ✗ 部分文件下载失败且无本地缓存")

    return ok

def _probe_fastest_mirror():
    """并发探测所有镜像，返回最快响应的那个，并记录所有存活的镜像"""
    global _alive_mirrors
    test_path = f"{_OWNER}/{_REPO}/{_BRANCH}/auth.json"
    result = [None]
    alive = []
    alive_lock = threading.Lock()
    stop = threading.Event()

    def _probe(mirror):
        try:
            url = f"{mirror}/{test_path}"
            _try_download_url(url, timeout=8)
            with alive_lock:
                alive.append(mirror)
            if result[0] is None:
                result[0] = mirror
                stop.set()
        except Exception:
            pass

    # 启动旋转动画
    spin_thread = threading.Thread(target=_spinner, args=(stop, '探测最快镜像…'), daemon=True)
    spin_thread.start()

    threads = []
    for m in _MIRRORS:
        t = threading.Thread(target=_probe, args=(m,), daemon=True)
        threads.append(t)
        t.start()

    # 最多等 10 秒
    deadline = time.time() + 10
    for t in threads:
        remaining = deadline - time.time()
        if remaining > 0:
            t.join(timeout=remaining)
        if result[0]:
            break

    # 多等 1 秒让其他快镜像也有机会加入 alive
    time.sleep(1)

    stop.set()
    spin_thread.join(timeout=1)

    # 设置存活镜像列表，把最快的放前面
    if alive:
        _alive_mirrors = alive[:]
        if result[0] in _alive_mirrors:
            _alive_mirrors.remove(result[0])
            _alive_mirrors.insert(0, result[0])

    if result[0]:
        name = result[0].split("//")[1].split("/")[0]
        print(f"  ✓ 最快镜像: {name} (共 {len(alive)} 个可用)")
    else:
        print("  ⚠ 镜像探测超时，将逐个尝试")
    return result[0]

def _open_browser():
    """等待服务器就绪后打开浏览器"""
    import webbrowser
    for _ in range(30):
        time.sleep(1)
        if _port_in_use():
            webbrowser.open(f"http://127.0.0.1:{_PORT}")
            return
    print("[!] 服务器未能在 30 秒内就绪")

def main():
    print("=" * 50)
    print("  SSCA Wiki Editor — 远程启动器")
    print(f"  仓库: {_OWNER}/{_REPO} [{_BRANCH}]")
    print("=" * 50)

    # 检查端口
    if _port_in_use():
        print(f"\n[1/3] 端口 {_PORT} 已被占用，直接打开浏览器...")
        import webbrowser
        webbrowser.open(f"http://127.0.0.1:{_PORT}")
        return

    # 持久化目录
    editor_dir = _get_editor_dir()
    print(f"\n[1/3] 编辑器目录: {editor_dir}")

    # 检查更新并下载
    print("[2/3] 检查更新并同步文件…")
    if not _download(editor_dir):
        # 检查本地是否有完整文件可用
        all_exist = all(
            os.path.exists(os.path.join(editor_dir, f.replace("/", os.sep)))
            for f in _FILES
        )
        if all_exist:
            print("  ⚠ 部分文件更新失败，使用本地缓存启动")
        else:
            print("  ✗ 缺少必要文件且下载失败，请检查网络")
            return

    # 后台打开浏览器
    t = threading.Thread(target=_open_browser, daemon=True)
    t.start()

    # 启动服务器（在当前进程内执行 app.py，PyInstaller 环境下 sys.executable 是 EXE 自身）
    print(f"[3/3] 启动编辑器服务器 (端口 {_PORT})…")
    print("─" * 50)
    print("按 Ctrl+C 停止服务器\n")
    app_path = os.path.join(editor_dir, "app.py")
    saved_cwd = os.getcwd()
    try:
        os.chdir(editor_dir)
        sys.path.insert(0, editor_dir)
        with open(app_path, "r", encoding="utf-8") as _f:
            code = compile(_f.read(), app_path, "exec")
        # 传入完整的 builtins，确保 app.py 内 import flask/yaml 等能找到 PyInstaller 打包的模块
        import builtins
        g = {"__name__": "__main__", "__file__": app_path, "__builtins__": builtins}
        exec(code, g)
    except KeyboardInterrupt:
        print("\n[*] 正在关闭...")
    finally:
        os.chdir(saved_cwd)

if __name__ == "__main__":
    main()
