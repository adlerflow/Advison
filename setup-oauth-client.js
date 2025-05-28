#!/usr/bin/env node

/**
 * Setup OAuth Client für MCP Server
 */

import crypto from 'crypto';
import fs from 'fs/promises';

async function setupOAuthClient() {
  console.log('🔐 Erstelle OAuth Client für MCP Server...\n');

  // Generiere Client Credentials
  const clientId = `mcp_${crypto.randomBytes(16).toString('hex')}`;
  const clientSecret = crypto.randomBytes(32).toString('hex');

  // OAuth Config für MCP Server
  const oauthConfig = {
    issuer: 'https://api.advison.org',
    clientId: clientId,
    clientSecret: clientSecret,
    redirectUri: 'http://localhost:8080/oauth/callback',
    authorizationEndpoint: 'https://api.advison.org/oauth/authorize',
    tokenEndpoint: 'https://api.advison.org/oauth/token',
    introspectionEndpoint: 'https://api.advison.org/oauth/introspect',
    scopes: ['read:user', 'read:tools']
  };

  // Speichere Config
  await fs.writeFile('.env.oauth', `
# Advison OAuth Configuration
OAUTH_ISSUER=https://api.advison.org
OAUTH_CLIENT_ID=${clientId}
OAUTH_CLIENT_SECRET=${clientSecret}
OAUTH_REDIRECT_URI=http://localhost:8080/oauth/callback
`.trim());

  console.log('✅ OAuth Client erstellt!\n');
  console.log(`Client ID: ${clientId}`);
  console.log(`Client Secret: ${clientSecret}`);
  console.log('\n📁 Config gespeichert in .env.oauth');
  console.log('\n⚠️  WICHTIG: Füge diesen Client zu deiner Advison KV Database hinzu!');
  
  // Client Objekt für KV
  const kvClient = {
    id: clientId,
    secret: clientSecret,
    name: 'MCP Adler Tools',
    redirect_uris: ['http://localhost:8080/oauth/callback'],
    website: 'https://github.com/adlerflow/Advison',
    description: 'MCP Server für Adler Development Tools',
    created_at: new Date().toISOString(),
    active: true
  };

  console.log('\nKV Client Daten:');
  console.log(JSON.stringify(kvClient, null, 2));
}

setupOAuthClient().catch(console.error);