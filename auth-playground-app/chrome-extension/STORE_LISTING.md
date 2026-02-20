# Chrome Web Store Listing

Use this content when filling out the Developer Console form.

---

## Name (max 75 chars)

```
MCP Auth Playground – Local Bridge
```

## Summary (max 132 chars)

```
Bridges the hosted MCP Auth Playground to local MCP servers on localhost or Docker networks, bypassing browser CORS restrictions.
```

## Description (max 16,000 chars)

```
The MCP Auth Playground – Local Bridge is a companion extension for the MCP Auth Playground (https://mcp-auth.playground.gravitee.io), an interactive workshop that teaches the OAuth 2.1 authorization flow used by Model Context Protocol (MCP) servers.

WHY IS THIS NEEDED?

When using the playground from the hosted URL, your browser enforces the same-origin policy, preventing direct requests to localhost, 127.0.0.1, or Docker-internal hostnames. This extension acts as a lightweight in-browser proxy to bypass that restriction.

HOW IT WORKS

1. The playground web app sends a request via window.postMessage
2. The extension's content script forwards it to the background service worker
3. The service worker performs the actual HTTP fetch (which can reach any URL)
4. The response is sent back to the playground

All communication stays entirely within your browser. No data is sent to external servers.

FEATURES

• Zero configuration – auto-detected by the playground
• Reach localhost, 127.0.0.1, and Docker-exposed ports
• Request counter in the toolbar popup
• Fully open source

PERMISSIONS

This extension requests host access to all URLs because users may connect to any MCP server. The extension ONLY makes requests when explicitly triggered through the playground UI — it never fetches anything on its own.

SOURCE CODE

https://github.com/gravitee-io/mcp-oauth-flow-workshop/tree/main/auth-playground-app/chrome-extension
```

## Category

```
Developer Tools
```

## Language

```
English
```

## Privacy Policy URL

```
https://github.com/gravitee-io/mcp-oauth-flow-workshop/blob/main/auth-playground-app/chrome-extension/privacy-policy.html
```

## Single Purpose Description (justification for `<all_urls>`, asked during review)

```
This extension proxies HTTP requests from the MCP Auth Playground web application to arbitrary URLs (MCP servers) that the user specifies in the playground interface. The extension requires broad host permissions because the target MCP server URL is user-defined and can be any host — including localhost, Docker hostnames, or public servers. The extension never initiates requests on its own; it only acts when the user explicitly triggers a request through the playground UI.
```
