# AI Tool Distribution Strategy

# References

## Tool Catalogue:

[One Source AI Tool Catalog](https://www.notion.so/One-Source-AI-Tool-Catalog-31bcfa8aa08480d8af2ef3b4d64c94f3?pvs=21)

## Full research:

[AI Tool Distribution Research](https://www.notion.so/AI-Tool-Distribution-Research-321cfa8aa0848013bfc6c46c5583a75f?pvs=21)

## Preliminary Marketing Research:

[AI Tool Marketing and Launch](https://www.notion.so/AI-Tool-Marketing-and-Launch-321cfa8aa08480dfaa9ada47d032bd22?pvs=21)

# **Open Questions**

1. **Named tools refactor** — The Mach10 MCP server has one generic `mach10_graphql` tool. Research shows named tools (`onesource_get_token`, `onesource_get_address`, etc.) improve LLM task success by ~6%. Worth the refactor?
2. **x402 Bazaar opt-in** — Coinbase auto-lists x402 services when you set `discoverable: true` on routes. Who flips this switch for Skills API and M10 Agent?
3. **SkillShop.sh for M10 Agent** — There's a paid skill marketplace (USDC on Base) that fits our x402 pricing model. Should we list M10 Agent there?

## Needs Confirmation

**1- One combined Claude Code plugin** named `onesource` — ships Mach10 MCP, Docs MCP, and all skills in one install

**2- Progressive access** — install gets you docs for free, add an API key for Mach10, add a wallet for x402 tools

# Summary

## **MCP Access Tiers**

| Tier | What You Get | What You Need |
| --- | --- | --- |
| **Free** | Docs Skill, Docs MCP, llms.txt, CLI, Hermes | Nothing (or npm/pip install) |
| **API Key** | Mach10 MCP  | `ONESOURCE_API_KEY` |
| **x402 Wallet** | Skills API  | USDC on Base |

## **Distribution Overview**

| Tool | Where It Goes | How People Find It |
| --- | --- | --- |
| **Skills API** | x402 Bazaar, x402 directories, GitHub, docs site | x402 ecosystem, r/ethdev, Ethereum Discord, awesome-web3 lists |
| **Mach10 MCP + Skill** | `onesource` plugin, MCP Registry, Smithery, Glama, npm | awesome-mcp-servers, r/ClaudeCode, Anthropic Discord, MCP hackathons |
| **CLI** | npm (`@onesource/cli`), GitHub | awesome-cli lists, r/ethdev, blog tutorial |
| **Hermes** | PyPI (`onesource-hermes`), GitHub | r/LocalLLaMA, NousResearch Discord, vLLM/SGLang communities |
| **M10 Agent** | `onesource` plugin, [skills.sh](http://skills.sh), ClawHub, [SkillShop.sh](http://SkillShop.sh), x402 Bazaar | x402 directories, agent marketplaces, demo video |
| **Dev Docs** | [docs.onesource.io](http://docs.onesource.io), llms.txt | GEO optimization, GitHub topics, training data strategy |
| **Docs Server** | `onesource` plugin, MCP Registry, Smithery | Bundled with plugin |
| **Docs Skill** | `onesource` plugin, [skills.sh](http://skills.sh) | Bundled with plugin |

## Distribution Details per Tool

- **OneSource Skills API**
    
    **Distribution:** x402 Bazaar auto-discovers it when `discoverable: true` is set — no registration needed. Also list on x402.org/ecosystem, x402list.fun, x402scan.com. Source code stays open on GitHub. REST docs live on docs.onesource.io.
    
    **Marketing:** x402 ecosystem is the primary channel. r/ethdev (101K+ members) and Ethereum Discord for the crypto dev audience. Submit to awesome-web3 and awesome-ethereum lists. Launch blog post with pricing breakdown.
    
    **Access:** x402 wallet (USDC on Base). Free mode available when `X402_PAYMENT_ADDRESS` is empty.
    
    **Status:** 24 endpoints working, x402 middleware working. Needs production validation and the `discoverable: true` flag enabled.
    
- **Mach10 MCP Server + Skill**
    
    **Distribution:** Ships inside the `onesource` Claude Code plugin. Also publish to the Official MCP Registry (which auto-syncs to VS Code Gallery and GitHub Copilot). List on Smithery and Glama for broader MCP discovery. Publish to npm as `@onesource/mcp`.
    
    **Marketing:** Submit to awesome-mcp-servers lists (punkpeye, wong2), awesome-blockchain-mcps. Post on r/ClaudeCode (4,200+ weekly contributors). Anthropic Discord. Enter MCP hackathons. Terminal GIF demos.
    
    **Access:** Free tier with API key (300 queries). Metered after.
    
    **Status:** Working (stdio + HTTP). Needs npm publish and MCP Registry `server.json`.
    
- **OneSource CLI**
    
    **Distribution:** Recommend npm as `@onesource/cli` with npx support. GitHub releases as backup.
    
    **Marketing:** awesome-cli lists, r/ethdev, dev blog tutorial. npm keyword discovery.
    
    **Access:** Free.
    
    **Status:** Complete. Needs npm publish.
    
- **OneSource Hermes**
    
    **Distribution:** Recommend PyPI as `onesource-hermes` with uvx support. GitHub as backup.
    
    **Marketing:** NousResearch Discord, r/LocalLLaMA, awesome-ai-tools lists, vLLM/SGLang community channels.
    
    **Access:** Free. OpenAI-compatible function-calling schema.
    
    **Status:** Complete. Needs PyPI publish.
    
- **M10 Agent Skill**
    
    **Distribution:** Ships inside the `onesource` plugin. Also list on skills.sh (cross-agent standard, auto-indexed from GitHub), ClawHub (220K-star OpenClaw ecosystem), and potentially SkillShop.sh (paid skill marketplace, USDC on Base). x402 Bazaar for autonomous agent discovery.
    
    **Marketing:** x402 ecosystem directories, agent marketplace listings, demo video showing natural-language blockchain Q&A, r/ethdev, r/ClaudeCode.
    
    **Access:** x402 wallet. $0.04 USDC per query.
    
    **Status:** SKILL.md placeholder only. Needs full implementation.
    
- **Developer Docs + Discoverability**
    
    **Distribution:** Already live at docs.onesource.io. llms.txt and llms-full.txt published for AI consumption.
    
    **Marketing:** GEO optimization (structured content, statistics, Schema.org markup). Training data strategy — get mentioned in content that AI models already cite. GitHub topics for repo discovery.
    
    **Access:** Free.
    
    **Status:** Live. Test suite validated at 96% accuracy.
    
- **Docs Server & Docs Skill**
    
    **Distribution:** Both bundle inside the `onesource` plugin. Docs Server also listed on MCP Registry and Smithery. Docs Skill also on skills.sh and awesome-claude-skills.
    
    **Marketing:** Not marketed independently — discovered via plugin install.
    
    **Access:** Free.
    
    **Status:** Docs Server Phase 1 live. Docs Skill planned but not yet built.
    

# **Distribution: 17 channels, 4 categories**

## **MCP Registries**

For MCP servers (Mach10 MCP, Docs Server).

| Registry | What It Is |
| --- | --- |
| **Official MCP Registry** | The canonical listing. Feeds VS Code Gallery and GitHub Copilot automatically. Publish a `server.json`. |
| **Smithery** | Largest MCP registry (2,500-7,300 servers). Optional hosted infrastructure. |
| **Glama** | 9,000+ indexed. Quality scoring. Requires LICENSE file. |
| **Docker MCP Catalog** | Enterprise-oriented. 270+ verified servers. |
| **VS Code Gallery** | Auto-syncs from Official MCP Registry — no extra work. |
| **PulseMCP** | 9,080+ indexed. On the MCP Steering Committee. |
| **MCP.so** | 18,420+ indexed. Community directory. |
|  |  |

## **Skill Registries**

For skills (Docs Skill, Mach10 Skill, M10 Agent Skill). Agent Skills is a cross-platform standard — not Claude-only. Adopted by OpenAI, Microsoft, Cursor, Figma, Atlassian.

| Registry | What It Is |
| --- | --- |
| [**skills.sh**](http://skills.sh) (Vercel Labs) | The main one. CLI + leaderboard. 418K+ top installs. Auto-indexes from GitHub. |
| **SkillsMP** | 400,000+ indexed skills. |
| **ClawHub** | OpenClaw marketplace. 220K-star ecosystem. 2-5 day review. |
| **awesome-claude-skills** | Curated GitHub list. 1,234+ skills. Submit a PR. |
| [**SkillShop.sh**](http://SkillShop.sh) | Paid skills only. USDC on Base. |

## **x402 Discovery**

For paid tools (Skills API, M10 Agent).

| Channel | What It Is |
| --- | --- |
| **x402 Bazaar** (Coinbase) | Auto-discovery. Set `discoverable: true`. Backed by Coinbase, Cloudflare, Google, Visa. |
| **x402.org/ecosystem** | Official Coinbase-backed directory. |
| **x402list.fun** | 251+ indexed services with health scores. |
| **x402scan.com / x402index.com** | Additional directories. |

## **Package Registries**

| Registry | Package | Tool |
| --- | --- | --- |
| **npm** | `@onesource/cli` | CLI |
| **npm** | `@onesource/mcp` | Mach10 MCP Server |
| **PyPI** | `onesource-hermes` | Hermes |

## **Claude Code Plugin:** one combined `onesource` plugin.

**What's inside:**

- Mach10 MCP Server (TypeScript)
- Docs MCP Server (Python/uvx now, TypeScript in Phase 2)
- Mach10 Skill, Docs Skill, M10 Agent Skill

**How users install:**

```
/plugin install onesource
```

**How distribution works for the plugin itself:**

1. Our own marketplace (`marketplace.json`) — primary
2. Official Anthropic marketplace submission — broader reach
3. skills.sh — cross-agent standard
4. ClawHub — OpenClaw community
5. awesome-claude-skills — curated list

# **Preliminary Marketing Research Summary**

View full preliminary research:

## Marketing Channels

**1- Community:**

- [r/ClaudeCode](https://www.reddit.com/r/ClaudeCode/) (4,200+ weekly), [r/ethdev](https://www.reddit.com/r/ethdev/) (101K+)
- Anthropic Discord, Ethereum Foundation Discord, NousResearch Discord
- DEV Community, Substack newsletters

**2- Awesome lists** — 20+ lists across MCP, blockchain, and AI categories. Free, permanent marketing that also feeds LLM training data. See:

**3- Partnerships:** Anthropic (MCP ecosystem), Coinbase/CDP (x402), Cloudflare (x402 + hosting), Stripe (x402), tool aggregators (Smithery, Glama, Composio).

**4- Content:** Terminal GIF demos (highest ROI), blog posts, tutorials. Tweets with video get 10x engagement.

## **Launch Approach**

Research suggests staggering releases over 4-6 weeks rather than launching everything at once. Each launch builds on the previous one — MCP + Docs first (largest audience), then REST + x402, then CLI + Hermes, then M10 Agent, then a suite-wide announcement. Details in the marketing doc.

## **SEO & GEO**

**GEO (Generative Engine Optimization)** is the new SEO — optimizing for visibility inside AI-generated answers rather than search rankings.

Key findings:

- Structured content with statistics shows 30-40% higher AI visibility
- Brand mentions outweigh backlinks 3:1 for LLM visibility
- llms.txt is good to have but unproven — no major AI company has confirmed crawling it
- 65% of AI bot crawls target content less than 1 year old
- Fastest path: get mentioned in content AI already cites for our target queries

## ****** Cross-Tool Awareness ******

### Every tool's docs should reference all other tools.

- When someone finds one tool, they should know the rest exist.
- Each SKILL.md and README should include a short "Other OneSource Tools" section pointing people to the right tool for their use case.

# **Backend- Things to Consider**

- **Named tools refactor** — Research shows ~6% better LLM accuracy with named tools vs. a generic query tool. Could refactor `mach10_graphql` into `onesource_get_token`, `onesource_get_address`, etc. More upfront work, better results.
- **Tool descriptions** — There's a five-component rubric (Purpose, Guidelines, Limitations, Parameters, Length) that measurably improves how well LLMs use tools. Quick audit of existing descriptions could help.
- **x402 Bazaar** — Just set `discoverable: true` on routes. Coinbase auto-catalogs. No registration needed.
- **SKILL.md compatibility** — The existing 21 SKILL.md files already follow the right format. Listing on skills.sh and ClawHub is straightforward.
- **MCP server packaging** — To get into Claude Code and other MCP clients: publish to npm, create a `server.json` for the MCP Registry, add `smithery.yaml` and `glama.json`.
- **Response formatting** — LLMs process text summaries better than raw JSON. Cap responses at ~10K chars. Hide pagination cursors.

---

# **Sources**

### **Official MCP Documentation**

- [MCP Registry](https://registry.modelcontextprotocol.io/) — canonical registry
- [MCP Registry Quickstart](https://modelcontextprotocol.io/registry/quickstart)
- [MCP Specification — Tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [MCP Registry Package Types](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx)
- [2026 MCP Roadmap](http://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

### **Claude Code & Anthropic**

- [Claude Code Plugins](https://code.claude.com/docs/en/plugins)
- [Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Claude Code Skills](https://code.claude.com/docs/en/skills)
- [Skill Authoring Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Agent Skills Specification](https://agentskills.io/specification)
- [Equipping Agents with Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)

### **MCP Registries & Directories**

- [Smithery](https://smithery.ai/)
- [Glama](https://glama.ai/mcp/servers)
- [Docker MCP Catalog](https://hub.docker.com/mcp)
- [PulseMCP](https://www.pulsemcp.com/)
- [MCP.so](https://mcp.so/)
- [mcp.run](https://mcp.run/)

### **Skill Registries**

- [skills.sh](https://skills.sh/)
- [SkillsMP](https://skillsmp.com/)
- [ClawHub](https://clawhub.ai/)
- [awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)
- [SkillShop.sh](https://skillshop.sh/)

### **x402 Ecosystem**

- [x402 Bazaar](https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources) — Coinbase auto-discovery
- [x402.org/ecosystem](https://x402.org/ecosystem)
- [x402list.fun](https://x402list.fun/)
- [x402scan.com](https://x402scan.com/)

### **Awesome Lists**

- [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)
- [wong2/awesome-mcp-servers](https://github.com/wong2/awesome-mcp-servers)
- [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)

### **Research**

- [MCP Tool Description Smells (arXiv:2602.14878)](https://arxiv.org/html/2602.14878v2) — 97.1% of descriptions have issues, +5.85% from fixes
- [Writer: RAG-MCP](https://writer.com/engineering/rag-mcp/) — dynamic tool selection triples accuracy
- [MCP Context Overload](https://eclipsesource.com/blogs/2026/01/22/mcp-context-overload/)

### **Architecture & Best Practices**

- [Apollo: MCP Tools with GraphQL](https://www.apollographql.com/blog/building-mcp-tools-with-graphql-a-better-way-to-connect-llms-to-your-api)
- [Docker MCP Best Practices](https://www.docker.com/blog/mcp-server-best-practices/)
- [Stainless: API MCP Server Architecture](https://www.stainless.com/mcp/api-mcp-server-architecture-guide)
- [Inside Claude Code Skills](https://mikhail.io/2025/10/claude-code-skills/)
- [Making Skills Activate Reliably](https://scottspence.com/posts/how-to-make-claude-code-skills-activate-reliably)

### **Platform-Specific**

- [Cloudflare MCP Servers](https://developers.cloudflare.com/agents/model-context-protocol/)
- [AWS AgentCore MCP](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-mcp.html)
- [OpenAI MCP Support](https://platform.openai.com/docs/guides/tools-connectors-mcp)
- [VS Code MCP Servers](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [GitHub MCP Registry](https://github.blog/ai-and-ml/generative-ai/how-to-find-install-and-manage-mcp-servers-with-the-github-mcp-registry/)