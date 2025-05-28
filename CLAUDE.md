# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the MCP Adler Tools repository - a JavaScript-based MCP (Model Context Protocol) server that provides development tools integration with Claude Desktop. The project provides local development tools for Swift/Xcode and includes a Cloudflare Worker deployment for OAuth authentication at advison.org.

**Git Repository:** https://github.com/adlerflow/Advison.git

## Key Commands

### Development
```bash
# Install dependencies
npm install

# Run local MCP server
npm start

# Run with auto-reload (development)
npm run dev

# Initial setup (configures Claude Desktop)
npm run setup
```

### Advison.org Deployment
```bash
cd advison-deployment
wrangler deploy  # Deploy Cloudflare Worker
wrangler tail    # View live logs
```

### Git Commands
```bash
# Check status
git status

# Stage and commit changes
git add .
git commit -m "Your commit message"

# Push to GitHub
git push origin main

# Pull latest changes
git pull origin main
```

## Architecture

### Core Components

1. **MCP Server Architecture**
   - `src/index.js` - Main local MCP server implementing tool handlers
   - `src/specific-tools.js` - Additional tool implementations (SwiftLint, MCP integration, deployment)
   - `src/claude-desktop-integration.js` - Claude Desktop OAuth integration handler
   - Tool implementations follow a pattern: receive args → execute → return MCP response format

2. **Advison.org Deployment**
   - Cloudflare Worker-based OAuth2 platform
   - KV namespaces for data storage (OAUTH_CODES, OAUTH_TOKENS, OAUTH_CLIENTS)
   - GitHub OAuth integration (Client ID: Ov23liaVisOj0OzOB982)
   - DNS configured with A records pointing to 192.0.2.1 (Worker route)
   - Worker script in `advison-deployment/worker.js` handles routing and OAuth flows

## Important Configuration

### Environment Variables
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` for OAuth
- Cloudflare API tokens for deployment

### Critical Files
- `advison-deployment/wrangler.toml` - Cloudflare Worker configuration with KV namespace bindings
- `~/Library/Application Support/Claude/claude_desktop_config.json` - MCP server registration for Claude Desktop

## Tool Implementation Pattern

When adding new tools:
1. Define in `setupHandlers()` with name, description, and inputSchema
2. Implement handler method that returns MCP response format:
   ```javascript
   {
     content: [{
       type: 'text',
       text: 'Result message'
     }]
   }
   ```
3. Use child_process.execSync for system commands
4. Handle errors gracefully with try/catch

### Available Tools
- **create_swift_project** - Create iOS/macOS/Package/Framework projects
- **analyze_project** - Analyze project structure and dependencies
- **setup_git_workflow** - Initialize Git with best practices
- **xcode_integration** - Open, build, test, clean Xcode projects
- **cloudflare_deploy** - Deploy to Cloudflare (requires configuration)
- **icloud_backup** - Backup projects to iCloud Drive
- **xcode_lint** - Run SwiftLint on Xcode projects
- **swift_package_update** - Update Swift package dependencies
- **create_mcp_integration** - Create MCP server configuration for projects
- **sync_with_claude_desktop** - Sync Claude Desktop configuration
- **deploy_to_advison** - Deploy to advison.org

## OAuth2 Flow (Advison.org)

The Cloudflare Worker at advison.org handles OAuth2 authentication:

1. Authorization: `/oauth/authorize` → GitHub → callback with code
2. Token Exchange: `/oauth/token` with code → access/refresh tokens
3. API Access: Bearer token in Authorization header
4. Token Refresh: `/oauth/token` with refresh_token grant

## Deployment Notes

- Advison.org runs on Cloudflare Workers with edge computing
- KV namespaces store OAuth data with TTL
- Environment variables must be set in Cloudflare Dashboard
- DNS must use proxied A records for Worker routes

## Common Issues

- GitHub OAuth 404: Check Client ID has capital O not zero (Ov23...)
- Worker deployment: Use `wrangler deploy` not `wrangler publish`
- KV namespace errors: Ensure IDs are set in wrangler.toml
- DNS issues: Remove default CNAME before adding A records
- Worker HTML updates: Static HTML is embedded in worker.js, not loaded from files
- Cache issues: Cloudflare caches aggressively, may need manual cache purge