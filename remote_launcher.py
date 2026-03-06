# -*- coding: utf-8 -*-
"""
SSCA Wiki Editor — 远程启动器
从 GitHub 仓库下载编辑器到本地持久目录，启动时自动检查更新。
使用方式：python remote_launcher.py
"""
import hashlib,os,socket,ssl,subprocess,sys,threading,time
import urllib.error,urllib.request,json
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
]

# 多个下载源：优先镜像（国内快），最后回退到原始 GitHub
_MIRRORS = [
    "https://ghfast.top/https://raw.githubusercontent.com",
    "https://gh-proxy.com/https://raw.githubusercontent.com",
    "https://mirror.ghproxy.com/https://raw.githubusercontent.com",
    "https://ghproxy.net/https://raw.githubusercontent.com",
    "https://github.moeyy.xyz/https://raw.githubusercontent.com",
    "https://gh.api.99988866.xyz/https://raw.githubusercontent.com",
    "https://cors.isteed.cc/https://raw.githubusercontent.com",
    "https://raw.gitmirror.com",
    "https://raw.githubusercontent.com",
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

def _try_download_url(url, timeout=20):
    """尝试下载单个 URL，返回 bytes 或抛出异常"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "*/*",
        "Connection": "close",
    }
    req = urllib.request.Request(url, headers=headers)
    with _opener.open(req, timeout=timeout) as r:
        return r.read()

def _download_file(raw_path):
    """尝试用多个镜像源下载一个文件，返回 bytes 或 None"""
    for mirror in _MIRRORS:
        url = f"{mirror}/{_OWNER}/{_REPO}/{_BRANCH}/{raw_path}"
        for attempt in range(_MAX_RETRY):
            try:
                data = _try_download_url(url)
                if data:
                    mirror_name = mirror.split("//")[1].split("/")[0]
                    print(f"    ✓ [{mirror_name}]")
                    return data
            except Exception:
                if attempt < _MAX_RETRY - 1:
                    time.sleep(0.5)
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

    # 探测最快镜像
    best_mirror = _probe_fastest_mirror()
    if best_mirror and best_mirror in _MIRRORS:
        _MIRRORS.remove(best_mirror)
        _MIRRORS.insert(0, best_mirror)

    new_manifest = {}
    updated = 0
    skipped = 0

    for f in _FILES:
        fp = os.path.join(dest_dir, f.replace("/", os.sep))
        os.makedirs(os.path.dirname(fp), exist_ok=True)

        # 检查本地文件是否和清单一致
        cur_hash = _local_hash(fp)
        manifest_hash = local_manifest.get(f)

        # 先用镜像拿到远程文件内容
        data = _download_file(f)
        if data:
            remote_hash = hashlib.sha256(data).hexdigest()
            if cur_hash == remote_hash:
                print(f"  ✓ {f} (已是最新)")
                skipped += 1
            else:
                with open(fp, "wb") as wf:
                    wf.write(data)
                if cur_hash is None:
                    print(f"  ↓ {f} (新下载)")
                else:
                    print(f"  ↓ {f} (已更新)")
                updated += 1
            new_manifest[f] = remote_hash
        else:
            # 下载失败，如果本地有就用本地的
            if cur_hash:
                print(f"  ○ {f} (使用本地缓存)")
                new_manifest[f] = cur_hash
            else:
                print(f"  ✗ {f} (下载失败且无本地缓存)")
                ok = False

    # 保存新清单
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(new_manifest, f)

    if updated > 0:
        print(f"\n[*] 更新了 {updated} 个文件，{skipped} 个无需更新")
    elif skipped == len(_FILES):
        print(f"\n[*] 所有文件已是最新，无需更新")

    return ok

def _probe_fastest_mirror():
    """并发探测所有镜像，返回最快响应的那个"""
    test_path = f"{_OWNER}/{_REPO}/{_BRANCH}/auth.json"
    result = [None]

    def _probe(mirror):
        try:
            url = f"{mirror}/{test_path}"
            _try_download_url(url, timeout=8)
            if result[0] is None:
                result[0] = mirror
        except Exception:
            pass

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

    if result[0]:
        name = result[0].split("//")[1].split("/")[0]
        print(f"[*] 最快镜像: {name}")
    else:
        print("[*] 镜像探测超时，将逐个尝试")
    return result[0]

def _ensure_deps():
    """确保 Flask 和 PyYAML 已安装"""
    missing = []
    try:
        __import__("flask")
    except ImportError:
        missing.append("flask")
    try:
        __import__("yaml")
    except ImportError:
        missing.append("pyyaml")
    if missing:
        print(f"[*] 安装依赖: {', '.join(missing)}")
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install"] + missing + ["-q"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )

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
        print(f"[*] 端口 {_PORT} 已被占用，直接打开浏览器...")
        import webbrowser
        webbrowser.open(f"http://127.0.0.1:{_PORT}")
        return

    # 持久化目录
    editor_dir = _get_editor_dir()
    print(f"[*] 编辑器目录: {editor_dir}")

    # 检查更新并下载
    print("[*] 检查更新...")
    if not _download(editor_dir):
        # 检查本地是否有完整文件可用
        all_exist = all(
            os.path.exists(os.path.join(editor_dir, f.replace("/", os.sep)))
            for f in _FILES
        )
        if all_exist:
            print("[!] 部分文件更新失败，使用本地缓存启动")
        else:
            print("[!] 缺少必要文件且下载失败，请检查网络")
            return

    # 确保依赖
    _ensure_deps()

    # 后台打开浏览器
    t = threading.Thread(target=_open_browser, daemon=True)
    t.start()

    # 启动服务器
    print(f"[*] 启动编辑器服务器 (端口 {_PORT})...")
    print("[*] 按 Ctrl+C 停止服务器\n")
    env = os.environ.copy()
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    try:
        subprocess.call(
            [sys.executable, os.path.join(editor_dir, "app.py")],
            cwd=editor_dir, env=env,
        )
    except KeyboardInterrupt:
        print("\n[*] 正在关闭...")

if __name__ == "__main__":
    main()
