#!/bin/bash

echo "🚀 Setting up MCP Adler Tools..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    exit 1
fi

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Create .env from example
if [ ! -f .env ]; then
    echo "📋 Creating .env file..."
    cp .env.example .env 2>/dev/null || cat > .env << EOF
# MCP Server Configuration
NODE_ENV=development
PORT=3000

# GitHub OAuth (for oauth-server)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback
JWT_SECRET=
EOF
fi

# Update Claude Desktop config
echo "🔧 Updating Claude Desktop configuration..."

CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

# Backup existing config
if [ -f "$CLAUDE_CONFIG" ]; then
    cp "$CLAUDE_CONFIG" "$CLAUDE_CONFIG.backup"
    echo "✅ Backed up existing config to $CLAUDE_CONFIG.backup"
fi

# Create config directory if it doesn't exist
mkdir -p "$HOME/Library/Application Support/Claude"

# Create Python script to update JSON
cat > update_config.py << 'EOF'
import json
import sys
import os

config_path = sys.argv[1]
mcp_path = sys.argv[2]

# Read existing config or create new
if os.path.exists(config_path):
    with open(config_path, 'r') as f:
        try:
            config = json.load(f)
        except:
            config = {"mcpServers": {}}
else:
    config = {"mcpServers": {}}

# Add our servers
if "mcpServers" not in config:
    config["mcpServers"] = {}

# JavaScript/Node.js version
config["mcpServers"]["adler-tools"] = {
    "command": "node",
    "args": [f"{mcp_path}/src/index.js"],
    "env": {}
}

# Write updated config
with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print("✅ Claude Desktop config updated!")
EOF

# Run Python script
python3 update_config.py "$CLAUDE_CONFIG" "$PWD"

# Clean up
rm update_config.py

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart Claude Desktop"
echo "2. In Claude, click the 🔌 icon and enable 'adler-tools'"
echo "3. Start using your custom tools!"
echo ""
echo "Example commands in Claude:"
echo "- 'Create a new Swift iOS app called MyApp'"
echo "- 'Analyze the project in ~/Projects/MyProject'"
echo "- 'Setup git for the current project'"
echo "- 'Open the project in Xcode'"
echo "- 'Build and test the project'"
echo "- 'Backup to iCloud'"
echo ""
echo "For OAuth/Remote features:"
echo "Run: ./setup-oauth.sh"
