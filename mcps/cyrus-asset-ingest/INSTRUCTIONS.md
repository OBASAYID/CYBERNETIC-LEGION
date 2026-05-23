# CYRUS Asset Ingestion MCP

Integrated with CYRUS REST `/api/mcp/*` and asset ingestion pipeline.

## Tools

- `cyrus_ingest_status` — library + ML model stats
- `cyrus_ingest_mine` — ML-guided bulk mining
- `cyrus_ingest_resume` — retry failed downloads
- `cyrus_ingest_url` — single URL ingest
- `cyrus_ingest_search` — search/fetch assets
- `cyrus_ingest_train_ml` — train ridge model
- `cyrus_ingest_data_mining` — tag mining + query expansion
- `cyrus_ingest_urls_batch` — batch URL ingest

## REST mirror

`POST /api/mcp/invoke/cyrus-asset-ingest/cyrus_ingest_status`

Config: `.cursor/mcp.json` → `cyrus-asset-ingest`
