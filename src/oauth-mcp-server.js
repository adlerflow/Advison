import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebSocketServerTransport } from '@modelcontextprotocol/sdk/server/websocket.js';
import express from 'express';
import expressWs from 'express-ws';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env.oauth') });

class OAuthMCPServer {
  constructor() {
    this.app = express();
    expressWs(this.app);
    
    this.sessions = new Map();
    this.setupRoutes();
    this.setupMCPServer();
  }

  setupRoutes() {
    // OAuth Login Route
    this.app.get('/login', (req, res) => {
      const state = crypto.randomBytes(16).toString('hex');
      const authUrl = new URL(process.env.OAUTH_ISSUER + '/oauth/authorize');
      
      authUrl.searchParams.set('client_id', process.env.OAUTH_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', process.env.OAUTH_REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'read:user read:tools');
      authUrl.searchParams.set('state', state);
      
      // Speichere state für Validierung
      this.sessions.set(state, { timestamp: Date.now() });
      
      res.redirect(authUrl.toString());
    });

    // OAuth Callback
    this.app.get('/oauth/callback', async (req, res) => {
      const { code, state } = req.query;
      
      // Validiere state
      if (!this.sessions.has(state)) {
        return res.status(400).send('Invalid state');
      }
      
      this.sessions.delete(state);
      
      try {
        // Tausche Code gegen Token
        const tokenResponse = await fetch(process.env.OAUTH_ISSUER + '/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(
              `${process.env.OAUTH_CLIENT_ID}:${process.env.OAUTH_CLIENT_SECRET}`
            ).toString('base64')}`
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.OAUTH_REDIRECT_URI
          })
        });
        
        const tokens = await tokenResponse.json();
        
        // Speichere Session
        const sessionId = crypto.randomBytes(16).toString('hex');
        this.sessions.set(sessionId, {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: Date.now() + (tokens.expires_in * 1000)
        });
        
        res.send(`
          <html>
            <body>
              <h1>✅ Erfolgreich eingeloggt!</h1>
              <p>Session ID: <code>${sessionId}</code></p>
              <p>Du kannst jetzt Claude Desktop mit diesem OAuth-geschützten MCP Server verbinden.</p>
              <p>WebSocket URL: <code>ws://localhost:8080/mcp?session=${sessionId}</code></p>
            </body>
          </html>
        `);
      } catch (error) {
        console.error('OAuth error:', error);
        res.status(500).send('OAuth failed');
      }
    });

    // MCP WebSocket mit OAuth
    this.app.ws('/mcp', async (ws, req) => {
      const sessionId = req.query.session;
      
      if (!sessionId || !this.sessions.has(sessionId)) {
        ws.close(1008, 'Unauthorized');
        return;
      }
      
      const session = this.sessions.get(sessionId);
      
      // Prüfe Token
      if (Date.now() > session.expiresAt) {
        ws.close(1008, 'Token expired');
        return;
      }
      
      console.log('✅ Authenticated MCP connection');
      
      // Erstelle MCP Transport
      const transport = new WebSocketServerTransport(ws);
      await this.mcpServer.connect(transport);
    });
  }

  setupMCPServer() {
    this.mcpServer = new Server({
      name: 'oauth-mcp-adler-tools',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });

    // Registriere Tools (gleiche wie in index.js)
    // ... tool handlers hier ...
  }

  async start(port = 8080) {
    this.app.listen(port, () => {
      console.log(`🚀 OAuth MCP Server läuft auf http://localhost:${port}`);
      console.log(`🔐 Login unter: http://localhost:${port}/login`);
    });
  }
}

// Starte Server
const server = new OAuthMCPServer();
server.start();