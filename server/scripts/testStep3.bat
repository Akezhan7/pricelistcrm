@echo off
REM Автоматический тест Шаг 3 для Windows
REM Запуск: cd server && scripts\testStep3.bat

echo.
echo ================================================
echo    АВТОМАТИЧЕСКОЕ ТЕСТИРОВАНИЕ ШАГ 3
echo ================================================
echo.

REM Проверяем, запущен ли сервер
curl -s http://localhost:5000/api > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Сервер не запущен на порту 5000!
    echo [INFO]  Запустите сервер командой: npm run dev
    echo.
    exit /b 1
)

echo [OK] Сервер работает
echo.

REM Запускаем Node.js тест
node scripts/testStep3.js

exit /b %ERRORLEVEL%
