/**
 * Advison OAuth2 Server - Cloudflare Worker
 * Handles OAuth2 authentication flows with edge computing
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    
    // Extract subdomain
    const subdomain = hostname.split('.')[0];
    const isApiSubdomain = subdomain === 'api';
    const isDashboardSubdomain = subdomain === 'dashboard';
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route handling based on subdomain
    try {
      // API subdomain routes
      if (isApiSubdomain) {
        // API-specific routes
        if (url.pathname === '/') {
          return new Response(JSON.stringify({
            name: 'Advison API',
            version: '1.0.0',
            endpoints: {
              oauth: {
                authorize: '/oauth/authorize',
                token: '/oauth/token',
                introspect: '/oauth/introspect',
                revoke: '/oauth/revoke',
                metadata: '/.well-known/oauth-authorization-server'
              },
              auth: {
                github: '/auth/github',
                google: '/auth/google'
              },
              health: '/health'
            }
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Health endpoint for API
        if (url.pathname === '/health') {
          return new Response(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Dashboard subdomain routes
      if (isDashboardSubdomain) {
        // Dashboard is the default for this subdomain
        if (url.pathname === '/' || url.pathname === '/index.html') {
          return handleDashboard();
        }
      }
      
      // Main domain (advison.org) routes
      if (!isApiSubdomain && !isDashboardSubdomain) {
        // Static pages
        if (url.pathname === '/' || url.pathname === '/index.html') {
          return handleHomePage();
        }
      }
      
      if (url.pathname === '/dashboard' || url.pathname === '/dashboard.html') {
        return handleDashboard();
      }
      
      if (url.pathname === '/developers' || url.pathname === '/developers.html') {
        return handleDevelopers();
      }
      
      if (url.pathname === '/docs' || url.pathname === '/docs.html') {
        return handleDocs();
      }
      
      if (url.pathname === '/pricing' || url.pathname === '/pricing.html') {
        return handlePricing();
      }
      
      if (url.pathname === '/debug' || url.pathname === '/debug-oauth') {
        return handleDebugPage();
      }
      
      // Handle static assets
      if (url.pathname.startsWith('/assets/')) {
        return handleStaticAssets(url.pathname);
      }

      // OAuth2 endpoints
      if (url.pathname === '/oauth/authorize') {
        return handleAuthorize(request, env);
      }
      
      if (url.pathname === '/oauth/token' && request.method === 'POST') {
        return handleToken(request, env);
      }
      
      if (url.pathname === '/oauth/introspect' && request.method === 'POST') {
        return handleIntrospect(request, env);
      }
      
      if (url.pathname === '/oauth/revoke' && request.method === 'POST') {
        return handleRevoke(request, env);
      }
      
      if (url.pathname === '/.well-known/oauth-authorization-server') {
        return handleMetadata(request);
      }

      // Auth providers (handle on all domains) - MUST come before generic API handler
      if (url.pathname === '/auth/github' || url.pathname === '/api/auth/github') {
        return handleGitHubAuth(request, env);
      }
      
      if (url.pathname === '/auth/github/callback' || url.pathname === '/api/auth/github/callback') {
        return handleGitHubCallback(request, env);
      }
      
      if (url.pathname === '/auth/google' || url.pathname === '/api/auth/google') {
        return handleGoogleAuth(request, env);
      }
      
      if (url.pathname === '/auth/google/callback' || url.pathname === '/api/auth/google/callback') {
        return handleGoogleCallback(request, env);
      }

      // API endpoints (generic handler - must come AFTER specific routes)
      if (url.pathname.startsWith('/api/')) {
        return handleAPI(request, url.pathname, env);
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};

// HTML Pages
function handleHomePage() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Advison - Enterprise-grade OAuth2 authentication platform with PKCE support">
    <title>Advison - OAuth2 Authentication Platform</title>
    <style>
        :root {
            --gradient-start: #667eea;
            --gradient-end: #764ba2;
            --text-primary: #1a202c;
            --text-secondary: #718096;
            --bg-primary: #ffffff;
            --bg-secondary: #f7fafc;
            --transition-fast: 0.2s ease;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-secondary);
            color: var(--text-primary);
            line-height: 1.6;
        }
        
        /* Navigation */
        nav {
            background: var(--bg-primary);
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .nav-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .nav-logo {
            font-size: 1.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-decoration: none;
        }
        
        .nav-links {
            display: flex;
            list-style: none;
            gap: 2rem;
        }
        
        .nav-link {
            color: var(--text-secondary);
            text-decoration: none;
            transition: color var(--transition-fast);
        }
        
        .nav-link:hover {
            color: var(--gradient-start);
        }
        
        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
            color: white;
            padding: 8rem 2rem;
            text-align: center;
        }
        
        .hero h1 {
            font-size: 3.5rem;
            margin-bottom: 1rem;
            animation: fadeInUp 0.8s ease;
        }
        
        .hero-subtitle {
            font-size: 1.5rem;
            opacity: 0.9;
            margin-bottom: 3rem;
            animation: fadeInUp 0.8s ease 0.2s both;
        }
        
        /* Buttons */
        .btn {
            display: inline-block;
            padding: 0.875rem 2rem;
            border-radius: 0.5rem;
            text-decoration: none;
            font-weight: 600;
            transition: all var(--transition-fast);
            cursor: pointer;
            border: 2px solid transparent;
        }
        
        .btn-primary {
            background: white;
            color: var(--gradient-start);
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        
        .btn-outline {
            border-color: white;
            color: white;
        }
        
        .btn-outline:hover {
            background: white;
            color: var(--gradient-start);
        }
        
        /* OAuth Buttons */
        .oauth-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 2rem;
        }
        
        .oauth-button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.875rem 1.5rem;
            border-radius: 0.5rem;
            text-decoration: none;
            font-weight: 600;
            transition: all var(--transition-fast);
            color: white;
        }
        
        .oauth-button.github {
            background: #24292e;
        }
        
        .oauth-button.github:hover {
            background: #1a1e22;
            transform: translateY(-2px);
        }
        
        .oauth-button.google {
            background: #4285f4;
        }
        
        .oauth-button.google:hover {
            background: #357ae8;
            transform: translateY(-2px);
        }
        
        /* Features Grid */
        .features-grid {
            max-width: 1200px;
            margin: 4rem auto;
            padding: 0 2rem;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 2rem;
        }
        
        .feature-card {
            background: var(--bg-primary);
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform var(--transition-fast);
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        
        .feature-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        
        .feature-title {
            font-size: 1.25rem;
            margin-bottom: 0.5rem;
        }
        
        /* Animations */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .nav-links {
                display: none;
            }
            
            .hero h1 {
                font-size: 2.5rem;
            }
            
            .hero-subtitle {
                font-size: 1.25rem;
            }
            
            .oauth-buttons {
                flex-direction: column;
                align-items: center;
            }
            
            .oauth-button {
                width: 100%;
                max-width: 300px;
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav>
        <div class="nav-container">
            <a href="/" class="nav-logo">Advison</a>
            <ul class="nav-links">
                <li><a href="/" class="nav-link">Home</a></li>
                <li><a href="/docs" class="nav-link">Documentation</a></li>
                <li><a href="/pricing" class="nav-link">Pricing</a></li>
                <li><a href="/developers" class="nav-link">Developers</a></li>
                <li><a href="https://dashboard.advison.org" class="nav-link">Dashboard</a></li>
            </ul>
            <div class="nav-actions">
                <a href="https://dashboard.advison.org" class="btn btn-outline">Login</a>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
        <div class="container">
            <h1>Secure OAuth2 Authentication Platform</h1>
            <p class="hero-subtitle">Enterprise-grade authentication for modern applications</p>
            
            <div class="oauth-buttons">
                <a href="/api/auth/github" class="oauth-button github">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Sign in with GitHub
                </a>
                
                <a href="/api/auth/google" class="oauth-button google">
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                </a>
                
                <a href="https://dashboard.advison.org" class="oauth-button" style="background: #667eea;">
                    Sign in with Email
                </a>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section>
        <h2 style="text-align: center; margin: 3rem 0 1rem; font-size: 2.5rem;">Why Choose Advison?</h2>
        
        <div class="features-grid">
            <div class="feature-card">
                <div class="feature-icon">🔒</div>
                <h3 class="feature-title">Secure</h3>
                <p>OAuth2 with PKCE for maximum security</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">⚡</div>
                <h3 class="feature-title">Fast</h3>
                <p>Edge deployment for minimal latency</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">🌍</div>
                <h3 class="feature-title">Scalable</h3>
                <p>CDN-powered global infrastructure</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">📊</div>
                <h3 class="feature-title">Analytics</h3>
                <p>Real-time insights and metrics</p>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer style="background: var(--text-primary); color: white; padding: 3rem 0; margin-top: 5rem; text-align: center;">
        <p>© 2025 Advison. All rights reserved.</p>
    </footer>
</body>
</html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

function handleDebugPage() {
  const html = `<!DOCTYPE html>
<html>
<head>
    <title>OAuth Debug - Advison</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; margin: 20px 0; }
        code { background: #f0f0f0; padding: 2px 5px; border-radius: 3px; }
        .debug-info { background: #f8f8f8; padding: 15px; border-radius: 5px; margin: 10px 0; font-family: monospace; }
        button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <h1>OAuth Debug Tool</h1>
        <div class="error">
            <h3>⚠️ GitHub OAuth Configuration Issue</h3>
            <p>Please verify your GitHub OAuth App settings.</p>
        </div>
        <h2>Required GitHub OAuth Settings:</h2>
        <div class="debug-info">Application name: Advison OAuth2
Homepage URL: https://advison.org
Authorization callback URL: https://advison.org/api/auth/github/callback</div>
        
        <h2>Test with your Client ID:</h2>
        <form onsubmit="event.preventDefault(); window.location.href='https://github.com/login/oauth/authorize?client_id=' + document.getElementById('cid').value + '&redirect_uri=https://advison.org/api/auth/github/callback&scope=read:user user:email&state=test'">
            <input type="text" id="cid" placeholder="Your GitHub Client ID" style="width: 300px">
            <button type="submit">Test OAuth</button>
        </form>
        
        <p><a href="https://github.com/settings/developers">Go to GitHub OAuth Apps →</a></p>
    </div>
</body>
</html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

function handleDashboard() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Advison</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; }
        .navbar { background: white; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .container { max-width: 1200px; margin: 0 auto; padding: 30px; }
        .card { background: white; border-radius: 10px; padding: 30px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #667eea; margin-bottom: 20px; }
        .endpoint { background: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 5px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="navbar">
        <h2 style="color: #667eea;">Advison OAuth2 Platform</h2>
    </div>
    <div class="container">
        <div class="card">
            <h1>OAuth2 Server Active</h1>
            <p>Your OAuth2 server is running on Cloudflare's edge network.</p>
            
            <h3 style="margin-top: 30px;">Available Endpoints:</h3>
            <div class="endpoint">GET https://advison.org/oauth/authorize</div>
            <div class="endpoint">POST https://advison.org/oauth/token</div>
            <div class="endpoint">POST https://advison.org/oauth/introspect</div>
            <div class="endpoint">POST https://advison.org/oauth/revoke</div>
            <div class="endpoint">GET https://advison.org/.well-known/oauth-authorization-server</div>
            
            <h3 style="margin-top: 30px;">Authentication Providers:</h3>
            <div class="endpoint">GET https://advison.org/api/auth/github</div>
            <div class="endpoint">GET https://advison.org/api/auth/google</div>
        </div>
    </div>
</body>
</html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// OAuth2 Handlers
async function handleAuthorize(request, env) {
  const url = new URL(request.url);
  const params = url.searchParams;
  
  // In production, validate client_id, redirect_uri, etc.
  const authCode = generateRandomString(32);
  
  // Store auth code in KV (in production)
  // await env.OAUTH_CODES.put(authCode, JSON.stringify({...}), { expirationTtl: 600 });
  
  const redirectUri = params.get('redirect_uri') || 'https://dashboard.advison.org/callback';
  const state = params.get('state');
  
  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('code', authCode);
  if (state) redirectUrl.searchParams.set('state', state);
  
  return Response.redirect(redirectUrl.toString(), 302);
}

async function handleToken(request, env) {
  const formData = await request.formData();
  const grantType = formData.get('grant_type');
  
  if (grantType === 'authorization_code') {
    // In production, validate code, client_id, etc.
    const token = generateJWT({ sub: 'user123', scope: 'read write' });
    
    return new Response(JSON.stringify({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: generateRandomString(32),
      scope: 'read write'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({
    error: 'unsupported_grant_type'
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleIntrospect(request, env) {
  const formData = await request.formData();
  const token = formData.get('token');
  
  // In production, validate token
  return new Response(JSON.stringify({
    active: true,
    scope: 'read write',
    client_id: 'example_client',
    username: 'user@example.com',
    exp: Math.floor(Date.now() / 1000) + 3600
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleRevoke(request, env) {
  // In production, revoke the token
  return new Response('', { status: 200 });
}

async function handleMetadata(request) {
  const baseUrl = 'https://api.advison.org';
  
  return new Response(JSON.stringify({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    introspection_endpoint: `${baseUrl}/oauth/introspect`,
    revocation_endpoint: `${baseUrl}/oauth/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256', 'plain']
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// GitHub OAuth
async function handleGitHubAuth(request, env) {
  const clientId = env.GITHUB_CLIENT_ID || 'Ov23liaVisOj0OzOB982';
  const redirectUri = 'https://advison.org/api/auth/github/callback';
  const state = generateRandomString(16);
  
  // Store state in KV for verification
  if (env.OAUTH_CODES) {
    await env.OAUTH_CODES.put(`state:${state}`, JSON.stringify({
      provider: 'github',
      created: Date.now(),
      redirectUri
    }), { expirationTtl: 600 }); // 10 minutes
  }
  
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'read:user user:email');
  authUrl.searchParams.set('state', state);
  
  return Response.redirect(authUrl.toString(), 302);
}

// Google OAuth
async function handleGoogleAuth(request, env) {
  const clientId = env.GOOGLE_CLIENT_ID || 'your_google_client_id';
  const redirectUri = 'https://advison.org/api/auth/google/callback';
  const state = generateRandomString(16);
  
  // Store state in KV for verification
  if (env.OAUTH_CODES) {
    await env.OAUTH_CODES.put(`state:${state}`, JSON.stringify({
      provider: 'google',
      created: Date.now(),
      redirectUri
    }), { expirationTtl: 600 }); // 10 minutes
  }
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  
  return Response.redirect(authUrl.toString(), 302);
}

// API Handler
async function handleAPI(request, pathname, env) {
  // Simple API response
  if (pathname === '/api/health') {
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({
    error: 'Not Found'
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Utilities
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateJWT(payload) {
  // Simplified JWT for demo - use proper JWT library in production
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  }));
  const signature = 'demo_signature'; // Use proper HMAC in production
  
  return `${header}.${body}.${signature}`;
}

// GitHub OAuth Callback
async function handleGitHubCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  if (!code || !state) {
    return new Response('Missing code or state', { status: 400 });
  }
  
  // Check if GitHub credentials are configured
  if (!env.GITHUB_CLIENT_SECRET) {
    return new Response('GitHub OAuth not configured. Please set GITHUB_CLIENT_SECRET.', { status: 500 });
  }
  
  // Verify state
  if (env.OAUTH_CODES) {
    const stateData = await env.OAUTH_CODES.get(`state:${state}`);
    if (!stateData) {
      return new Response('Invalid state', { status: 400 });
    }
    await env.OAUTH_CODES.delete(`state:${state}`);
  }
  
  // Exchange code for token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID || 'Ov23liaVisOj0OzOB982',
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: code
    })
  });
  
  let tokenData;
  try {
    const responseText = await tokenResponse.text();
    console.log('GitHub token response:', responseText.substring(0, 200));
    tokenData = JSON.parse(responseText);
  } catch (e) {
    console.error('Failed to parse GitHub response:', e);
    return new Response('GitHub authentication failed. Check server logs.', { status: 500 });
  }
  
  if (tokenData.error) {
    console.error('GitHub OAuth error:', tokenData.error, tokenData.error_description);
    return new Response(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`, { status: 400 });
  }
  
  if (!tokenData.access_token) {
    return new Response('Failed to get access token', { status: 400 });
  }
  
  // Get user info
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Accept': 'application/json',
      'User-Agent': 'Advison-OAuth2'
    }
  });
  
  if (!userResponse.ok) {
    console.error('GitHub user API error:', userResponse.status, userResponse.statusText);
    const errorText = await userResponse.text();
    console.error('GitHub API response:', errorText);
    return new Response('Failed to get user info from GitHub', { status: 500 });
  }
  
  const userData = await userResponse.json();
  
  // Create session
  const sessionId = generateRandomString(32);
  const sessionToken = generateJWT({
    sub: userData.id,
    email: userData.email,
    name: userData.name || userData.login,
    provider: 'github'
  });
  
  // Store session in KV
  if (env.OAUTH_TOKENS) {
    await env.OAUTH_TOKENS.put(`session:${sessionId}`, JSON.stringify({
      token: sessionToken,
      user: userData,
      provider: 'github',
      created: Date.now(),
      expires: Date.now() + 86400000 // 24 hours
    }), { expirationTtl: 86400 }); // 24 hours
  }
  
  // Redirect to dashboard with session
  return Response.redirect(`https://dashboard.advison.org/?session=${sessionId}`, 302);
}

// Google OAuth Callback
async function handleGoogleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  if (!code || !state) {
    return new Response('Missing code or state', { status: 400 });
  }
  
  // Check if Google credentials are configured
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return new Response('Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.', { status: 500 });
  }
  
  // Verify state
  if (env.OAUTH_CODES) {
    const stateData = await env.OAUTH_CODES.get(`state:${state}`);
    if (!stateData) {
      return new Response('Invalid state', { status: 400 });
    }
    await env.OAUTH_CODES.delete(`state:${state}`);
  }
  
  // Exchange code for token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      code: code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: 'https://advison.org/api/auth/google/callback',
      grant_type: 'authorization_code'
    })
  });
  
  let tokenData;
  try {
    tokenData = await tokenResponse.json();
  } catch (e) {
    console.error('Failed to parse Google response:', e);
    return new Response('Google authentication failed', { status: 500 });
  }
  
  if (tokenData.error) {
    console.error('Google OAuth error:', tokenData.error, tokenData.error_description);
    return new Response(`Google OAuth error: ${tokenData.error_description || tokenData.error}`, { status: 400 });
  }
  
  if (!tokenData.access_token) {
    return new Response('Failed to get access token', { status: 400 });
  }
  
  // Get user info
  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`
    }
  });
  
  const userData = await userResponse.json();
  
  // Create session
  const sessionId = generateRandomString(32);
  const sessionToken = generateJWT({
    sub: userData.id,
    email: userData.email,
    name: userData.name,
    picture: userData.picture,
    provider: 'google'
  });
  
  // Store session in KV
  if (env.OAUTH_TOKENS) {
    await env.OAUTH_TOKENS.put(`session:${sessionId}`, JSON.stringify({
      token: sessionToken,
      user: userData,
      provider: 'google',
      created: Date.now(),
      expires: Date.now() + 86400000 // 24 hours
    }), { expirationTtl: 86400 }); // 24 hours
  }
  
  // Redirect to dashboard with session
  return Response.redirect(`https://dashboard.advison.org/?session=${sessionId}`, 302);
}

// Handler for new pages
function handleDevelopers() {
  return handleHomePage(); // Temporarily use the same simple page
}

function handleDocs() {
  return handleHomePage(); // Temporarily use the same simple page
}

function handlePricing() {
  return handleHomePage(); // Temporarily use the same simple page
}

// Handle static assets
function handleStaticAssets(pathname) {
  // For now, return 404 for assets
  return new Response('Asset not found', { status: 404 });
}