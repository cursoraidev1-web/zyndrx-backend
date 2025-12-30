#!/bin/bash

# Database Migration Script for Supabase CLI
# This script uses Supabase CLI to apply migrations

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Database Migration with Supabase CLI...${NC}\n"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed.${NC}"
    echo -e "${YELLOW}Install it with: npm install -g supabase${NC}"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if SUPABASE_URL is set
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}❌ SUPABASE_URL not found in .env${NC}"
    exit 1
fi

echo -e "${BLUE}📡 Supabase Project: ${SUPABASE_URL}${NC}\n"

# Instructions for manual migration
echo -e "${YELLOW}⚠️  Note: Supabase CLI requires local setup or linking to project.${NC}"
echo -e "${YELLOW}For cloud projects, use the SQL Editor method instead.${NC}\n"

echo -e "${BLUE}📝 Migration Files:${NC}"
echo -e "  1. src/database/schema.sql"
echo -e "  2. src/database/migrations/001_add_companies.sql"
echo -e "  3. src/database/migrations/002_add_subscriptions.sql\n"

echo -e "${GREEN}✅ Please run these files in Supabase SQL Editor in order.${NC}"
echo -e "${BLUE}   Go to: ${SUPABASE_URL}/project/_/sql${NC}\n"

exit 0







