#!/bin/bash
# scripts/test-terminal.sh
# Quickly verify terminal functionality in Helm backend

PORT=5001
API_URL="http://localhost:$PORT/api/terminal"

echo "🔍 Checking backend status on port $PORT..."
if ! lsof -i :$PORT > /dev/null; then
  echo "❌ Backend not running on port $PORT"
  echo "👉 Run 'pnpm dev' in a separate terminal first"
  exit 1
fi

echo "🧪 Testing terminal creation..."
RESPONSE=$(curl -s -X POST "$API_URL/create" \
  -H "Content-Type: application/json" \
  -d '{"workdir": "/tmp"}')

echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "id"; then
  echo "✅ Terminal creation SUCCESS"
  ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "🆔 Session ID: $ID"
  
  echo "🧪 Testing input..."
  # echo "ls -la" base64 encoded is bHMgLWxh
  curl -s -X POST "$API_URL/$ID/input" \
    -H "Content-Type: application/json" \
    -d '{"data": "bHMgLWxhCg=="}'
    
  echo -e "\n✅ Input sent"
else
  echo "❌ Terminal creation FAILED"
  echo "Possible fixes:"
  echo "1. Rebuild node-pty: cd node_modules/.pnpm/node-pty* && npx node-gyp rebuild"
  echo "2. Check backend logs"
  exit 1
fi
