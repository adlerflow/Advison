import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

/**
 * Spezifische Tools für Adlers Workflow
 */

export class AdlerSpecificTools {
  constructor() {
    this.tools = {
      xcode_lint: this.xcodeLint.bind(this),
      swift_package_update: this.swiftPackageUpdate.bind(this),
      create_mcp_integration: this.createMCPIntegration.bind(this),
      sync_with_claude_desktop: this.syncWithClaudeDesktop.bind(this),
      deploy_to_advison: this.deployToAdvison.bind(this)
    };
  }

  /**
   * Xcode Projekt mit SwiftLint analysieren
   */
  async xcodeLint(args) {
    const { projectPath } = args;
    
    try {
      // Prüfe ob SwiftLint installiert ist
      execSync('which swiftlint', { stdio: 'pipe' });
    } catch {
      return {
        content: [{
          type: 'text',
          text: '❌ SwiftLint nicht installiert. Installiere mit: brew install swiftlint'
        }]
      };
    }

    // Erstelle .swiftlint.yml wenn nicht vorhanden
    const swiftlintPath = path.join(projectPath, '.swiftlint.yml');
    try {
      await fs.access(swiftlintPath);
    } catch {
      const config = `# SwiftLint Konfiguration für Adler's Standards
disabled_rules:
  - trailing_whitespace
  - line_length
  
opt_in_rules:
  - force_unwrapping
  - empty_count
  - closure_spacing
  
excluded:
  - .build
  - DerivedData
  - Packages
  
line_length:
  warning: 120
  error: 200
  
type_name:
  min_length: 3
  max_length: 50
`;
      await fs.writeFile(swiftlintPath, config);
    }

    // Führe SwiftLint aus
    try {
      const output = execSync(`cd "${projectPath}" && swiftlint`, { 
        encoding: 'utf-8' 
      });
      
      return {
        content: [{
          type: 'text',
          text: `✅ SwiftLint Analyse abgeschlossen:\n\n${output}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ SwiftLint Warnungen/Fehler gefunden:\n\n${error.stdout}`
        }]
      };
    }
  }

  /**
   * Swift Package Dependencies aktualisieren
   */
  async swiftPackageUpdate(args) {
    const { projectPath, package: packageName } = args;
    
    try {
      if (packageName) {
        // Spezifisches Package aktualisieren
        execSync(
          `cd "${projectPath}" && swift package update ${packageName}`,
          { stdio: 'inherit' }
        );
      } else {
        // Alle Packages aktualisieren
        execSync(
          `cd "${projectPath}" && swift package update`,
          { stdio: 'inherit' }
        );
      }

      // Zeige aktuelle Versionen
      const resolved = await fs.readFile(
        path.join(projectPath, 'Package.resolved'),
        'utf-8'
      );

      return {
        content: [{
          type: 'text',
          text: `✅ Packages aktualisiert!\n\nAktuelle Versionen:\n${resolved}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Fehler beim Update: ${error.message}`
        }]
      };
    }
  }

  /**
   * Erstelle MCP Integration für ein Projekt
   */
  async createMCPIntegration(args) {
    const { projectPath, integrationName } = args;
    const mcpPath = path.join(projectPath, '.mcp');

    // Erstelle MCP Verzeichnis
    await fs.mkdir(mcpPath, { recursive: true });

    // MCP Konfiguration
    const config = {
      name: integrationName,
      version: '1.0.0',
      tools: [
        {
          name: 'build',
          command: 'swift build',
          description: 'Build the project'
        },
        {
          name: 'test',
          command: 'swift test',
          description: 'Run tests'
        },
        {
          name: 'run',
          command: 'swift run',
          description: 'Run the project'
        }
      ],
      context: {
        projectType: 'swift',
        path: projectPath
      }
    };

    await fs.writeFile(
      path.join(mcpPath, 'config.json'),
      JSON.stringify(config, null, 2)
    );

    // Integration Script
    const script = `#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { execSync } from 'child_process';

const config = ${JSON.stringify(config, null, 2)};

const server = new Server({
  name: config.name,
  version: config.version
});

// Register tools
config.tools.forEach(tool => {
  server.addTool({
    name: tool.name,
    description: tool.description,
    handler: async () => {
      const output = execSync(tool.command, { 
        cwd: '${projectPath}',
        encoding: 'utf-8' 
      });
      return { content: [{ type: 'text', text: output }] };
    }
  });
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport);
`;

    await fs.writeFile(path.join(mcpPath, 'server.js'), script);
    await fs.chmod(path.join(mcpPath, 'server.js'), 0o755);

    return {
      content: [{
        type: 'text',
        text: `✅ MCP Integration "${integrationName}" erstellt!\n\nPfad: ${mcpPath}\n\nFüge zu Claude Desktop config hinzu:\n\n"${integrationName}": {\n  "command": "node",\n  "args": ["${path.join(mcpPath, 'server.js')}"]\n}`
      }]
    };
  }

  /**
   * Synchronisiere mit Claude Desktop
   */
  async syncWithClaudeDesktop(args) {
    const { action } = args;
    const configPath = path.join(
      process.env.HOME,
      'Library/Application Support/Claude/claude_desktop_config.json'
    );

    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

    if (action === 'list') {
      const servers = Object.keys(config.mcpServers || {});
      return {
        content: [{
          type: 'text',
          text: `📋 Aktive MCP Server:\n${servers.map(s => `- ${s}`).join('\n')}`
        }]
      };
    }

    if (action === 'reload') {
      // Trigger Claude Desktop reload (simuliert)
      return {
        content: [{
          type: 'text',
          text: '🔄 Bitte Claude Desktop neustarten um Änderungen zu übernehmen'
        }]
      };
    }
  }

  /**
   * Deploy zu advison.org
   */
  async deployToAdvison(args) {
    const { source, target = 'www' } = args;

    // Erstelle Deployment-Script
    const deployScript = `#!/bin/bash
# Deploy to advison.org via Cloudflare

# Build static site
echo "Building site..."
# Add your build command here

# Deploy via Wrangler (Cloudflare CLI)
echo "Deploying to Cloudflare..."
wrangler pages publish ${source} --project-name=${target}-advison

echo "✅ Deployed to https://${target}.advison.org"
`;

    const scriptPath = '/tmp/deploy-advison.sh';
    await fs.writeFile(scriptPath, deployScript);
    await fs.chmod(scriptPath, 0o755);

    try {
      const output = execSync(scriptPath, { encoding: 'utf-8' });
      return {
        content: [{
          type: 'text',
          text: `🚀 Deployment erfolgreich!\n\n${output}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Deployment fehlgeschlagen:\n${error.message}\n\nStelle sicher dass Wrangler installiert und konfiguriert ist:\nnpm install -g wrangler\nwrangler login`
        }]
      };
    }
  }
}
