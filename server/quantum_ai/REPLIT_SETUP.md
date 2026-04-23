# Replit Setup Guide

## Quick Start for Replit

### 1. Upload the Zip File

1. Upload `quantum_ai_core_replit.zip` to your Replit project
2. Extract the zip file in your Replit workspace

### 2. Install Dependencies

In the Replit shell, run:

```bash
pip install -r requirements.txt
```

### 3. Run Examples

```bash
# Basic usage example
python example_usage.py

# Mathematical formatting example
python example_mathematical_responses.py

# Writing style example
python example_writing_styles.py
```

### 4. Use in Your Code

```python
from quantum_ai_core import QuantumAICore, format_response_for_display
import numpy as np

# Initialize
qai = QuantumAICore(
    response_format='scientific',
    include_equations=True,
    writing_style='professional'
)

# Process request
data = np.random.randn(1000, 50)
response = qai.process('research', data)

# Display
print(format_response_for_display(response, show_equations=True))
```

## Project Structure

```
.
├── quantum_ai_core.py          # Main processing engine
├── core_algorithms/            # Algorithm modules
│   ├── high_dimensional.py
│   ├── svd_analysis.py
│   ├── random_walks.py
│   ├── machine_learning.py
│   ├── streaming.py
│   ├── clustering.py
│   ├── graph_analysis.py
│   ├── topic_modeling.py
│   ├── mathematical_formatter.py
│   └── writing_style_analyzer.py
├── example_usage.py            # Examples
├── requirements.txt            # Dependencies
└── README.md                   # Documentation
```

## Features

- ✅ 8 Data Science Algorithm Modules
- ✅ Mathematical Equation Generation (LaTeX)
- ✅ Writing Style Analysis (Professional, Business, Casual)
- ✅ Multiple Response Formats
- ✅ Complete Documentation

## Dependencies

All dependencies are listed in `requirements.txt`:
- numpy
- scipy
- scikit-learn
- networkx
- matplotlib
- pandas

## Documentation

See `README.md` for complete documentation and usage examples.

