# Installation Instructions

## Prerequisites

- Python 3.8 or higher
- pip package manager

## Installation Steps

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Or install as a package:
   ```bash
   pip install -e .
   ```

3. Run an example:
   ```bash
   python examples/example_basic_usage.py
   ```

## Virtual Environment (Recommended)

```bash
python -m venv nexus_env
source nexus_env/bin/activate  # On Windows: nexus_env\Scripts\activate
pip install -r requirements.txt
```

## Troubleshooting

- If you encounter dependency conflicts, use a virtual environment
- For GPU support, install PyTorch with CUDA separately
- Some optional dependencies may require additional system libraries
