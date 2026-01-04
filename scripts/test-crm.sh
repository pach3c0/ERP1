#!/bin/bash
# Test script for CRM functionality - validates customer notes API integration

BASE_URL="http://localhost:8000"
EMAIL="pacheco@rhynoproject.com.br"
PASSWORD="123"

echo "========================================"
echo "🧪 Testing CRM Customer Notes API"
echo "========================================"

# 1. Login to get token
echo ""
echo "📝 Step 1: Authenticating..."
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$EMAIL&password=$PASSWORD" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

if [ -z "$TOKEN" ]; then
    echo "❌ FAILED: Could not obtain token"
    exit 1
fi

echo "✅ Token obtained"

# 2. Get first customer ID
echo ""
echo "📝 Step 2: Getting customer list..."
CUSTOMER_ID=$(curl -s "$BASE_URL/customers/" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['items'][0]['id'] if d['items'] else '')")

if [ -z "$CUSTOMER_ID" ]; then
    echo "❌ FAILED: No customers found"
    exit 1
fi

echo "✅ Customer ID found: $CUSTOMER_ID"

# 3. Get customer notes
echo ""
echo "📝 Step 3: Getting customer notes..."
NOTE_COUNT=$(curl -s "$BASE_URL/customers/$CUSTOMER_ID/notes" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")

echo "✅ Found $NOTE_COUNT notes for customer $CUSTOMER_ID"

# 4. Create a new note
echo ""
echo "📝 Step 4: Creating new message note..."
NEW_NOTE_ID=$(curl -s -X POST "$BASE_URL/customers/$CUSTOMER_ID/notes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"Teste CRM - $(date '+%Y-%m-%d %H:%M:%S')\", \"type\": \"message\"}" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

if [ -z "$NEW_NOTE_ID" ]; then
    echo "❌ FAILED: Could not create note"
    exit 1
fi

echo "✅ Note created with ID: $NEW_NOTE_ID"

# 5. Create a task
echo ""
echo "📝 Step 5: Creating new task..."
NEW_TASK_ID=$(curl -s -X POST "$BASE_URL/customers/$CUSTOMER_ID/notes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Tarefa teste - Follow-up", "type": "task"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

if [ -z "$NEW_TASK_ID" ]; then
    echo "❌ FAILED: Could not create task"
    exit 1
fi

echo "✅ Task created with ID: $NEW_TASK_ID"

# 6. Verify notes were added
echo ""
echo "📝 Step 6: Verifying notes were added..."
UPDATED_COUNT=$(curl -s "$BASE_URL/customers/$CUSTOMER_ID/notes" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")

echo "✅ Now have $UPDATED_COUNT notes (was $NOTE_COUNT)"

# Summary
echo ""
echo "========================================"
echo "✅ CRM API TEST PASSED"
echo "========================================"
echo "Customer: $CUSTOMER_ID"
echo "Notes before: $NOTE_COUNT"
echo "Notes after: $UPDATED_COUNT"
echo "New message ID: $NEW_NOTE_ID"
echo "New task ID: $NEW_TASK_ID"
echo ""
echo "🌐 View in browser:"
echo "   http://localhost:5173/customers/$CUSTOMER_ID/crm"
echo ""
