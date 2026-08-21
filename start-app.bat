@echo off
setlocal
title Fortune Sacco Onboarding - start
set "NGROK=C:\Users\jgithinji\AppData\Local\ngrok\ngrok.exe"
set "DOMAIN=jet-cement-defraud.ngrok-free.dev"
set "NODE=C:\Program Files\nodejs\node.exe"
set "BACKEND=C:\Users\jgithinji\Desktop\PROJECTS\customer onboarding\backend"
set "FRONTEND=C:\Users\jgithinji\Desktop\PROJECTS\customer onboarding\frontend"

echo [1/5] Stopping old ngrok / backend (frees port 5000)...
taskkill /F /IM ngrok.exe >NUL 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":5000 .*LISTENING"') do taskkill /F /PID %%p >NUL 2>&1
timeout /t 3 /nobreak >NUL

echo [2/5] Starting ngrok tunnel %DOMAIN% -^> localhost:5000 ...
start "ngrok" "%NGROK%" http --url=%DOMAIN% 5000
timeout /t 9 /nobreak >NUL

echo [3/5] Starting backend on port 5000...
start "fortune-backend" /min cmd /c ""%NODE%" "%BACKEND%\dist\main.js" > "%BACKEND%\backend.log" 2>&1"
timeout /t 12 /nobreak >NUL

echo [4/5] Checking frontend (vite, https://localhost:5175)...
netstat -ano | findstr /R /C:":5175 .*LISTENING" >NUL
if %errorlevel%==0 (
  echo   frontend already running.
) else (
  echo   starting frontend...
  start "fortune-frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"
)

echo [5/5] Verifying...
curl -s -o NUL -w "  backend  http://localhost:5000/api -> %%{http_code}\n" http://localhost:5000/api
curl -s -o NUL -w "  tunnel   https://%DOMAIN%/api/stk-callback -> %%{http_code}\n" https://%DOMAIN%/api/stk-callback
findstr /C:"Callback updated successfully" "%BACKEND%\backend.log" >NUL && echo   registration: OK || echo   WARNING: registration not confirmed - open backend.log
echo.
echo Done. Open https://localhost:5175 in your browser (accept the cert warning).
endlocal