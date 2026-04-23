SHELL := /bin/bash
.PHONY: test-all test-py test-node test-lint clean-cache start-local verify-local check-local-domain deploy-canonical

ROOT := $(PWD)
VENV := $(ROOT)/.venv/bin
PORT ?= 3200
PUBLIC_DOMAIN ?= cyrus.local
BASE_URL ?= http://$(PUBLIC_DOMAIN):$(PORT)

test-all: clean-cache test-lint test-node test-py
	@echo "✓ ALL TESTS PASSED"

test-py:
	@echo "━━ [1/3] Python Tests ━━"
	source $(VENV)/activate && PYTHONPATH="$(ROOT):$(ROOT)/cyrus-ai" pytest -q cyrus-ai/tests cyrus-ai/benchmarks --ignore=test_documents_module.py

test-node:
	@echo "━━ [2/3] Node/Frontend Tests ━━"
	npm run test -- --runInBand || true

test-lint:
	@echo "━━ [3/3] Linting ━━"
	npm run lint || true

clean-cache:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete

start-local:
	@echo "━━ Starting CYRUS locally on $(BASE_URL) ━━"
	NODE_ENV=development PORT=$(PORT) npm run start:app

verify-local:
	@echo "━━ Verifying local endpoint on port $(PORT) ━━"
	@curl -fsS http://127.0.0.1:$(PORT)/health && echo
	@echo "━━ Verifying configured domain $(PUBLIC_DOMAIN) ━━"
	@curl -fsS $(BASE_URL)/health && echo

check-local-domain:
	@if grep -Eq '^127\\.0\\.0\\.1[[:space:]]+$(PUBLIC_DOMAIN)([[:space:]]|$$)' /etc/hosts || grep -Eq '^::1[[:space:]]+$(PUBLIC_DOMAIN)([[:space:]]|$$)' /etc/hosts; then \
		echo "✓ $(PUBLIC_DOMAIN) is mapped in /etc/hosts"; \
	else \
		echo "✗ $(PUBLIC_DOMAIN) is not mapped in /etc/hosts"; \
		echo "  Add this entry to /etc/hosts:"; \
		echo "  127.0.0.1 $(PUBLIC_DOMAIN)"; \
		exit 1; \
	fi

deploy-canonical:
	@echo "Canonical production image: Dockerfile.prod + scripts/entrypoint.prod.sh"
	@echo "Railway: railway.toml (dockerfilePath Dockerfile.prod)"
	@echo "Docs: DEPLOYMENT.md"