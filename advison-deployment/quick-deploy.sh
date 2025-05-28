#!/bin/bash

# Quick Deploy Script for Advison OAuth Fix
# ==========================================

echo "🚀 Quick Deploy for Advison OAuth"
echo "================================="
echo ""

# Change to deployment directory
cd "$(dirname "$0")"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

echo "📝 Setting up GitHub OAuth secrets..."
echo ""
echo "You'll need:"
echo "1. GitHub Client ID: Ov23liaVisOj0OzOB982"
echo "2. GitHub Client Secret from your Advison OAuth App"
echo ""

# Deploy the worker
echo "📦 Deploying Worker..."
wrangler deploy

echo ""
echo "🔐 Setting secrets..."
echo "Enter your GitHub Client Secret (from the Advison OAuth App):"
wrangler secret put GITHUB_CLIENT_SECRET

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Test the OAuth flow:"
echo "1. Visit: https://advison.org"
echo "2. Click 'Sign in with GitHub'"
echo ""
echo "📊 Monitor logs: wrangler tail"
echo ""
echo "🐛 Debug URL: https://advison.org/debug"
