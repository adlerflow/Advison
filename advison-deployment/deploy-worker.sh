#!/bin/bash

# Cloudflare Worker Deployment Script
# ===================================

echo "🚀 Deploying Advison OAuth Worker..."

# Change to deployment directory
cd "$(dirname "$0")"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it:"
    echo "   npm install -g wrangler"
    exit 1
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare. Please run:"
    echo "   wrangler login"
    exit 1
fi

echo "✅ Prerequisites checked"

# Deploy Worker
echo "📦 Deploying Worker to Cloudflare..."
wrangler deploy

if [ $? -eq 0 ]; then
    echo "✅ Worker deployed successfully!"
    echo ""
    echo "🔍 Next steps:"
    echo "1. Verify GitHub OAuth App callback URL: https://advison.org/api/auth/github/callback"
    echo "2. Set secrets if not already done:"
    echo "   wrangler secret put GITHUB_CLIENT_ID"
    echo "   wrangler secret put GITHUB_CLIENT_SECRET"
    echo ""
    echo "3. Test OAuth flow at: https://advison.org"
    echo "4. Debug at: https://advison.org/debug"
    echo ""
    echo "📊 Monitor logs with: wrangler tail"
else
    echo "❌ Deployment failed!"
    exit 1
fi
