import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import crypto from 'crypto';

/**
 * Claude Desktop OAuth Integration Handler
 * 
 * Behandelt die spezielle OAuth-Integration zwischen
 * Claude Desktop und dem Remote MCP Server
 */

export class ClaudeDesktopOAuthHandler {
  constructor(mcpServer) {
    this.mcpServer = mcpServer;
    this.pendingAuths = new Map();
  }

  /**
   * Initialisiert OAuth Flow für Claude Desktop
   */
  async initializeAuth(sessionId) {
    const authState = {
      id: crypto.randomBytes(16).toString('hex'),
      sessionId: sessionId,
      createdAt: Date.now(),
      status: 'pending'
    };

    this.pendingAuths.set(authState.id, authState);

    // Generiere Auth URL mit speziellem Return-Parameter
    const authUrl = new URL(process.env.PRODUCTION_URL || 'http://localhost:3000');
    authUrl.pathname = '/auth/github';
    authUrl.searchParams.set('state', authState.id);
    authUrl.searchParams.set('return_url', `claude://oauth-complete/${authState.id}`);

    return {
      authUrl: authUrl.toString(),
      state: authState.id
    };
  }

  /**
   * Vervollständigt OAuth nach Callback
   */
  async completeAuth(state, sessionData) {
    const authState = this.pendingAuths.get(state);
    if (!authState) {
      throw new Error('Invalid auth state');
    }

    this.pendingAuths.delete(state);

    // Speichere Session für Claude Desktop
    return {
      sessionId: authState.sessionId,
      token: sessionData.token,
      user: sessionData.user,
      expiresAt: sessionData.expiresAt
    };
  }

  /**
   * Registriert Claude-spezifische MCP Handlers
   */
  registerHandlers(server) {
    // OAuth Initialisierung
    server.setRequestHandler('oauth/init', async (request) => {
      const { sessionId } = request.params;
      return await this.initializeAuth(sessionId);
    });

    // OAuth Status Check
    server.setRequestHandler('oauth/status', async (request) => {
      const { state } = request.params;
      const authState = this.pendingAuths.get(state);
      
      if (!authState) {
        return { status: 'invalid' };
      }

      return {
        status: authState.status,
        createdAt: authState.createdAt
      };
    });

    // Session Refresh
    server.setRequestHandler('oauth/refresh', async (request, extra) => {
      const { session } = extra;
      
      if (!session) {
        throw new Error('No session to refresh');
      }

      // Verlängere Session
      session.expiresAt = Date.now() + (24 * 60 * 60 * 1000);
      
      return {
        expiresAt: session.expiresAt
      };
    });
  }

  /**
   * Cleanup alte Auth-Anfragen
   */
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      const timeout = 10 * 60 * 1000; // 10 Minuten

      for (const [state, authState] of this.pendingAuths) {
        if (now - authState.createdAt > timeout) {
          this.pendingAuths.delete(state);
        }
      }
    }, 60000); // Jede Minute
  }
}

/**
 * Claude Desktop spezifische Tools
 */
export const claudeDesktopTools = [
  {
    name: 'open_in_xcode',
    description: 'Open project in Xcode',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: { type: 'string' }
      },
      required: ['projectPath']
    },
    handler: async (args) => {
      const { execSync } = await import('child_process');
      execSync(`open -a Xcode "${args.projectPath}"`);
      return {
        content: [{
          type: 'text',
          text: `✅ Opened in Xcode: ${args.projectPath}`
        }]
      };
    }
  },
  {
    name: 'open_in_vscode',
    description: 'Open project in VS Code',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: { type: 'string' }
      },
      required: ['projectPath']
    },
    handler: async (args) => {
      const { execSync } = await import('child_process');
      execSync(`code "${args.projectPath}"`);
      return {
        content: [{
          type: 'text',
          text: `✅ Opened in VS Code: ${args.projectPath}`
        }]
      };
    }
  },
  {
    name: 'open_terminal',
    description: 'Open Terminal at path',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' }
      },
      required: ['path']
    },
    handler: async (args) => {
      const { execSync } = await import('child_process');
      execSync(`open -a Terminal "${args.path}"`);
      return {
        content: [{
          type: 'text',
          text: `✅ Opened Terminal at: ${args.path}`
        }]
      };
    }
  }
];
