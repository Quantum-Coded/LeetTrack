@echo off
echo ========================================
echo   LeetTrack - Starting All Services
echo ========================================
echo.

echo [1/2] Starting Backend (port 4000)...
start "LeetTrack-Server" cmd /k "cd /d %~dp0server && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend (port 5173)...
start "LeetTrack-Client" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ========================================
echo   Both services started!
echo   Backend:  http://localhost:4000/graphql
echo   Frontend: http://localhost:5173
echo ========================================
echo.
echo Opening the frontend in your browser...
start http://localhost:5173
