# CYRUS AI

## Install

```bash
cd cyrus_ai
pip install -r requirements.txt
```

## Run Voice/Text Loop

```bash
cd ..
python3 -m cyrus_ai.app
```

## Run API Server

```bash
cd ..
uvicorn cyrus_ai.app:app --host 0.0.0.0 --port 8000
```

## Optional Environment Settings

Set in `.env`:

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `EMBEDDING_PROVIDER` (`hash`, `openai`, or `transformers`)
- `EMBEDDING_MODEL`
