import { createMcpEndpoint, MCP_HOSTS } from "../server/mcp.js";

const fetch = createMcpEndpoint({
  allowedHosts: [...MCP_HOSTS, process.env.VERCEL_URL].filter(Boolean),
});

// Vercel's Web Standard Node.js function; no body parser or saved session.
export default { fetch };
