#!/bin/bash
# CodeLens AI — start both servers

echo "🔍 CodeLens AI — Starting..."

# Backend
cd backend
if [ ! -f .env ]; then
  cp .env.example .env
  echo "📝 Created backend/.env — add your GEMINI_API_KEY"
fi

if [ ! -d venv ]; then
  python3 -m venv venv
  echo "📦 Created virtual environment"
fi

source venv/bin/activate
pip install -r requirements.txt -q
echo "✅ Backend deps ready"

python run.py &
BACKEND_PID=$!
echo "🚀 Backend → http://localhost:8000 (PID $BACKEND_PID)"

# Frontend
cd ../frontend
if [ ! -d node_modules ]; then
  npm install
fi

npm run dev &
FRONTEND_PID=$!
echo "🎨 Frontend → http://localhost:5173 (PID $FRONTEND_PID)"

echo ""
echo "  Dashboard:  http://localhost:5173"
echo "  API docs:   http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" INT
wait
