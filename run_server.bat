@echo off
chcp 65001 > nul
echo ===================================================
echo   MindFlow 로컬 서버 구동기 (Local Server Starter)
echo ===================================================
echo.
echo 마이크 권한을 항상 허용 상태로 유지하려면 로컬 서버(localhost) 환경이 필요합니다.
echo 서버 구동을 시도합니다...
echo.

:: 1. Try Python
where python >nul 2>&1
if %errorlevel% equ 0 (
    echo [Python 발견] http://localhost:8000 으로 서버를 엽니다...
    start http://localhost:8000
    python -m http.server 8000
    goto end
)

:: 2. Try Node.js (npx)
where npx >nul 2>&1
if %errorlevel% equ 0 (
    echo [Node.js 발견] http://localhost:8000 으로 서버를 엽니다...
    start http://localhost:8000
    npx -y http-server . -p 8000
    goto end
)

echo [경고] 시스템에 Python 이나 Node.js가 설치되어 있지 않습니다.
echo 브라우저에서 'file://' 프로토콜로 로컬 파일 상태로 열려 있습니다.
echo 이 경우 브라우저 보안 정책에 따라 마이크 입력 시 매번 권한을 허용해 주어야 합니다.
echo.
echo 해결 방법:
echo 1. Python (https://www.python.org) 또는 Node.js (https://nodejs.org) 를 설치합니다.
echo 2. 설치 후 이 배치 파일(run_server.bat)을 다시 실행하십시오.
echo.
pause

:end
