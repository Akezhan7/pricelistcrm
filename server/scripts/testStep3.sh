#!/bin/bash
# Автоматический тест Шаг 3 для Linux/Mac
# Запуск: cd server && chmod +x scripts/testStep3.sh && ./scripts/testStep3.sh

echo ""
echo "================================================"
echo "   АВТОМАТИЧЕСКОЕ ТЕСТИРОВАНИЕ ШАГ 3"
echo "================================================"
echo ""

# Проверяем, запущен ли сервер
if ! curl -s http://localhost:5000/api > /dev/null 2>&1; then
    echo "[ERROR] Сервер не запущен на порту 5000!"
    echo "[INFO]  Запустите сервер командой: npm run dev"
    echo ""
    exit 1
fi

echo "[OK] Сервер работает"
echo ""

# Запускаем Node.js тест
node scripts/testStep3.js

exit $?
