# CYRUS Data Collection MCP

Web scrape + knowledge base; scraped images auto-ingest into asset library.

## Tools

- `cyrus_scrape_url` — scrape page (text, links, images)
- `cyrus_collect_web` — multi-URL aggregation
- `cyrus_knowledge_search` — search local knowledge base

## REST mirror

`POST /api/mcp/invoke/cyrus-data-collection/cyrus_scrape_url`

Config: `.cursor/mcp.json` → `cyrus-data-collection`
