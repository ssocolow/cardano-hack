#!/bin/bash

# Change to the project directory
cd "$(dirname "$0")"

# Install dependencies if needed
npm install

# Load environment variables from .env.local
if [ -f .env.local ]; then
    export $(cat .env.local | xargs)
fi

# Run the TypeScript script using ts-node with proper configuration
echo "Updating stake pool cache..."
NEXT_PUBLIC_BLOCKFROST_PROJECT_ID=$NEXT_PUBLIC_BLOCKFROST_PROJECT_ID \
npx ts-node -P tsconfig.scripts.json src/scripts/fetchPools.ts

# Exit with the script's exit code
exit $? 