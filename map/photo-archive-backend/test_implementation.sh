#!/bin/bash

# Photo Archive Implementation Test Script
# Tests all new user-related endpoints and functionality

set -e

BASE_URL="http://localhost:8000/api/v1"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "Photo Archive API Test Suite"
echo "======================================"
echo ""

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo -n "Testing: $description... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    elif [ "$method" = "PATCH" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PATCH -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL$endpoint")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        echo "   Response: $(echo $body | jq -c . 2>/dev/null || echo $body | head -c 100)"
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        echo "   Error: $body"
    fi
    echo ""
}

# Check if backend is running
echo "Checking backend status..."
if ! curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
    echo -e "${RED}✗ Backend is not running!${NC}"
    echo ""
    echo "Please start the backend first:"
    echo "  cd photo-archive-backend"
    echo "  python -m uvicorn app.main:app --reload"
    echo ""
    exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}"
echo ""

# Test 1: Health Check
echo "1. HEALTH CHECK"
test_endpoint "GET" "/health" "" "Health check endpoint"

# Test 2: List Users
echo "2. USER MANAGEMENT - List Users"
test_endpoint "GET" "/users" "" "List all users (should include Anonymous)"
test_endpoint "GET" "/users?sort=photo_count&order=desc" "" "List users sorted by photo count"
test_endpoint "GET" "/users?search=anonymous" "" "Search users by name"

# Test 3: Create User
echo "3. USER MANAGEMENT - Create User"
NEW_USER_DATA='{
  "username": "testuser_'$(date +%s)'",
  "display_name": "Test User",
  "email": "test@example.com"
}'
test_endpoint "POST" "/users" "$NEW_USER_DATA" "Create new user"

# Test 4: Get User Details
echo "4. USER MANAGEMENT - Get User Details"
# Get the default user
test_endpoint "GET" "/users/default-user-000000000000" "" "Get default Anonymous user"

# Test 5: List User Photos
echo "5. PHOTO MANAGEMENT - List User Photos"
test_endpoint "GET" "/users/default-user-000000000000/photos" "" "List photos for Anonymous user"
test_endpoint "GET" "/users/default-user-000000000000/photos?limit=5" "" "List photos with limit"

# Test 6: Test Photo Upload (would require multipart/form-data)
echo "6. PHOTO UPLOAD"
echo -e "${YELLOW}⊘ SKIP${NC} - Photo upload requires multipart/form-data with actual file"
echo "   Test manually via frontend or Postman"
echo ""

# Summary
echo "======================================"
echo "Test Suite Complete"
echo "======================================"
echo ""
echo "Manual tests to perform:"
echo "  1. Start frontend: npm run dev"
echo "  2. Open http://localhost:5173"
echo "  3. Verify Archive menu displays"
echo "  4. Create a new user"
echo "  5. Upload a photo for the user"
echo "  6. Navigate: Archive → Gallery → Map"
echo ""
