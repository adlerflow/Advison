import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// MCP Server für Adlers Development Tools
class AdlerMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'mcp-adler-tools',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupTools();
  }

  setupHandlers() {
    // Tool-Liste Handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_swift_project',
          description: 'Create a new Swift project with standard structure',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              type: { 
                type: 'string', 
                enum: ['ios', 'macos', 'package', 'framework'],
                description: 'Project type' 
              },
              path: { type: 'string', description: 'Path where to create project' }
            },
            required: ['name', 'type']
          }
        },
        {
          name: 'xcode_integration',
          description: 'Open project in Xcode or perform Xcode-related tasks',
          inputSchema: {
            type: 'object',
            properties: {
              action: { 
                type: 'string', 
                enum: ['open', 'build', 'test', 'clean'],
                description: 'Action to perform'
              },
              path: { type: 'string', description: 'Project path' },
              scheme: { type: 'string', description: 'Xcode scheme (optional)' }
            },
            required: ['action', 'path']
          }
        },
        {
          name: 'analyze_project',
          description: 'Analyze project structure and dependencies',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Project path to analyze' }
            },
            required: ['path']
          }
        },
        {
          name: 'setup_git_workflow',
          description: 'Setup Git with best practices',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Project path' },
              remote: { type: 'string', description: 'Remote repository URL (optional)' }
            },
            required: ['path']
          }
        },
        {
          name: 'cloudflare_deploy',
          description: 'Deploy to advison.org via Cloudflare',
          inputSchema: {
            type: 'object',
            properties: {
              source: { type: 'string', description: 'Source directory' },
              subdomain: { type: 'string', description: 'Subdomain (optional)' }
            },
            required: ['source']
          }
        },
        {
          name: 'icloud_backup',
          description: 'Backup project to iCloud Drive',
          inputSchema: {
            type: 'object',
            properties: {
              source: { type: 'string', description: 'Source directory' },
              projectName: { type: 'string', description: 'Backup name' }
            },
            required: ['source', 'projectName']
          }
        }
      ]
    }));

    // Tool-Ausführung Handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_swift_project':
            return await this.createSwiftProject(args);
          case 'analyze_project':
            return await this.analyzeProject(args);
          case 'setup_git_workflow':
            return await this.setupGitWorkflow(args);
          case 'cloudflare_deploy':
            return await this.cloudflareDeploy(args);
          case 'icloud_backup':
            return await this.icloudBackup(args);
          case 'xcode_integration':
            return await this.xcodeIntegration(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }]
        };
      }
    });
  }

  setupTools() {
    // Tool implementations werden hier definiert
  }

  async createSwiftProject(args) {
    const { name, type, path: projectPath = process.cwd() } = args;
    const fullPath = path.join(projectPath, name);

    // Erstelle Projektverzeichnis
    await fs.mkdir(fullPath, { recursive: true });

    // Package.swift für Swift Package/Framework
    if (type === 'package' || type === 'framework') {
      const packageContent = `// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "${name}",
    platforms: [
        .macOS(.v13),
        .iOS(.v16)
    ],
    products: [
        .${type === 'package' ? 'library' : 'library'}(
            name: "${name}",
            targets: ["${name}"]
        ),
    ],
    dependencies: [
        // Add your dependencies here
    ],
    targets: [
        .target(
            name: "${name}",
            dependencies: []
        ),
        .testTarget(
            name: "${name}Tests",
            dependencies: ["${name}"]
        ),
    ]
)`;

      await fs.writeFile(path.join(fullPath, 'Package.swift'), packageContent);
      
      // Erstelle Source-Verzeichnisse
      await fs.mkdir(path.join(fullPath, 'Sources', name), { recursive: true });
      await fs.mkdir(path.join(fullPath, 'Tests', `${name}Tests`), { recursive: true });

      // Erstelle Beispiel-Source-Datei
      const sourceContent = `public struct ${name} {
    public init() {}
    
    public func greet() -> String {
        return "Hello from ${name}!"
    }
}`;
      
      await fs.writeFile(
        path.join(fullPath, 'Sources', name, `${name}.swift`), 
        sourceContent
      );
    }

    // iOS/macOS App Project
    if (type === 'ios' || type === 'macos') {
      // Erstelle Xcode-Projekt mit swift package init
      execSync(`cd "${fullPath}" && swift package init --type executable`, {
        stdio: 'inherit'
      });
      
      // TODO: Konvertiere zu Xcode-Projekt
    }

    // Erstelle README
    const readmeContent = `# ${name}

## Overview
${type === 'ios' ? 'iOS Application' : type === 'macos' ? 'macOS Application' : 'Swift Package'}

## Requirements
- Swift 5.9+
- ${type === 'ios' ? 'iOS 16.0+' : type === 'macos' ? 'macOS 13.0+' : 'macOS 13.0+ / iOS 16.0+'}

## Installation
\`\`\`bash
git clone <repository>
cd ${name}
${type === 'package' || type === 'framework' ? 'swift build' : 'open ${name}.xcodeproj'}
\`\`\`

## Usage
// Add usage instructions here

## License
MIT
`;

    await fs.writeFile(path.join(fullPath, 'README.md'), readmeContent);

    // Erstelle .gitignore
    const gitignoreContent = `.DS_Store
/.build
/Packages
/*.xcodeproj
xcuserdata/
DerivedData/
.swiftpm/xcode/package.xcworkspace/contents.xcworkspacedata
.netrc`;

    await fs.writeFile(path.join(fullPath, '.gitignore'), gitignoreContent);

    return {
      content: [{
        type: 'text',
        text: `✅ Created Swift ${type} project "${name}" at ${fullPath}\n\nNext steps:\n1. cd ${fullPath}\n2. ${type === 'package' ? 'swift build' : 'open Package.swift'}\n3. Start coding! 🚀`
      }]
    };
  }

  async analyzeProject(args) {
    const { path: projectPath } = args;
    
    const analysis = {
      structure: {},
      dependencies: [],
      statistics: {}
    };

    // Prüfe Projekttyp
    const files = await fs.readdir(projectPath);
    
    if (files.includes('Package.swift')) {
      analysis.type = 'Swift Package';
      const packageContent = await fs.readFile(
        path.join(projectPath, 'Package.swift'), 
        'utf-8'
      );
      // Parse dependencies (simplified)
      const depMatches = packageContent.match(/\.package\(.*?\)/gs) || [];
      analysis.dependencies = depMatches.map(dep => dep.trim());
    }

    // Zähle Dateien
    const countFiles = async (dir, ext) => {
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        let count = 0;
        for (const item of items) {
          if (item.isDirectory() && !item.name.startsWith('.')) {
            count += await countFiles(path.join(dir, item.name), ext);
          } else if (item.name.endsWith(ext)) {
            count++;
          }
        }
        return count;
      } catch {
        return 0;
      }
    };

    analysis.statistics = {
      swiftFiles: await countFiles(projectPath, '.swift'),
      tests: await countFiles(path.join(projectPath, 'Tests'), '.swift'),
      // Add more statistics as needed
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(analysis, null, 2)
      }]
    };
  }

  async setupGitWorkflow(args) {
    const { path: projectPath, remote } = args;
    
    // Initialisiere Git
    execSync(`cd "${projectPath}" && git init`, { stdio: 'inherit' });

    // Erstelle .gitignore wenn nicht vorhanden
    const gitignorePath = path.join(projectPath, '.gitignore');
    try {
      await fs.access(gitignorePath);
    } catch {
      await fs.writeFile(gitignorePath, `.DS_Store
.build/
DerivedData/
*.xcodeproj
*.xcworkspace
.swiftpm/
`);
    }

    // Initial commit
    execSync(`cd "${projectPath}" && git add . && git commit -m "Initial commit"`, {
      stdio: 'inherit'
    });

    // Remote hinzufügen wenn angegeben
    if (remote) {
      execSync(`cd "${projectPath}" && git remote add origin "${remote}"`, {
        stdio: 'inherit'
      });
    }

    return {
      content: [{
        type: 'text',
        text: `✅ Git workflow setup complete!\n${remote ? `Remote added: ${remote}` : 'No remote added'}`
      }]
    };
  }

  async cloudflareDeploy(args) {
    // Placeholder - würde Cloudflare API verwenden
    const { source, subdomain } = args;
    
    return {
      content: [{
        type: 'text',
        text: `🚀 Deployment zu advison.org vorbereitet\nSource: ${source}\nSubdomain: ${subdomain || 'root'}\n\nHinweis: Cloudflare API Integration muss noch konfiguriert werden.`
      }]
    };
  }

  async icloudBackup(args) {
    const { source, projectName } = args;
    const icloudPath = path.join(
      os.homedir(), 
      'Library/Mobile Documents/com~apple~CloudDocs/Developer/Backups',
      projectName
    );

    // Erstelle Backup-Verzeichnis
    await fs.mkdir(path.dirname(icloudPath), { recursive: true });

    // Kopiere Projekt (vereinfacht - in Produktion würde rsync verwendet)
    execSync(`cp -R "${source}" "${icloudPath}"`, { stdio: 'inherit' });

    return {
      content: [{
        type: 'text',
        text: `☁️ Backup zu iCloud Drive erstellt!\nPfad: ${icloudPath}`
      }]
    };
  }

  async xcodeIntegration(args) {
    const { action, path: projectPath, scheme } = args;
    
    try {
      switch (action) {
        case 'open':
          // Öffne in Xcode
          execSync(`open -a Xcode "${projectPath}"`);
          return {
            content: [{
              type: 'text',
              text: `✅ Projekt in Xcode geöffnet: ${projectPath}`
            }]
          };
          
        case 'build':
          // Build mit swift oder xcodebuild
          const buildCmd = projectPath.endsWith('.xcodeproj') || projectPath.endsWith('.xcworkspace')
            ? `xcodebuild -project "${projectPath}" ${scheme ? `-scheme "${scheme}"` : ''} build`
            : `cd "${projectPath}" && swift build`;
          
          execSync(buildCmd, { stdio: 'inherit' });
          return {
            content: [{
              type: 'text',
              text: `✅ Build erfolgreich abgeschlossen`
            }]
          };
          
        case 'test':
          // Tests ausführen
          const testCmd = projectPath.endsWith('.xcodeproj') || projectPath.endsWith('.xcworkspace')
            ? `xcodebuild -project "${projectPath}" ${scheme ? `-scheme "${scheme}"` : ''} test`
            : `cd "${projectPath}" && swift test`;
          
          execSync(testCmd, { stdio: 'inherit' });
          return {
            content: [{
              type: 'text',
              text: `✅ Tests erfolgreich ausgeführt`
            }]
          };
          
        case 'clean':
          // Clean build
          const cleanCmd = projectPath.endsWith('.xcodeproj') || projectPath.endsWith('.xcworkspace')
            ? `xcodebuild -project "${projectPath}" ${scheme ? `-scheme "${scheme}"` : ''} clean`
            : `cd "${projectPath}" && swift package clean`;
          
          execSync(cleanCmd, { stdio: 'inherit' });
          return {
            content: [{
              type: 'text',
              text: `✅ Clean erfolgreich durchgeführt`
            }]
          };
          
        default:
          throw new Error(`Unbekannte Aktion: ${action}`);
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Fehler bei Xcode-Integration: ${error.message}`
        }]
      };
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Server started');
  }
}

// Starte Server
const server = new AdlerMCPServer();
server.start().catch(console.error);
