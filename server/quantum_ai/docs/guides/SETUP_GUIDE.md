# Setup Guide - Quantum Intelligence Nexus v2.0

## Quick Setup Instructions

### Step 1: Create Virtual Environment

```bash
# Create virtual environment
python -m venv nexus_env

# Activate
# On Linux/Mac:
source nexus_env/bin/activate

# On Windows:
nexus_env\Scripts\activate
```

### Step 2: Install Dependencies

```bash
# Navigate to the Quantum Intelligence Nexus directory
cd Quantum_Intelligence_Nexus

# Install all dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: Verify Installation

```bash
# Run basic test
python example_basic_nexus_usage.py

# Or run comprehensive test suite
python examples/test_comprehensive_quantum_intelligence.py
```

---

## Detailed Setup Instructions

### Prerequisites

- **Python 3.8 or higher** (Python 3.9+ recommended)
- **pip** (Python package installer)
- **4GB RAM minimum** (8GB recommended)
- **2GB free disk space**
- **Internet connection** (for downloading dependencies)

### System-Specific Instructions

#### Linux

```bash
# 1. Create virtual environment
python3 -m venv nexus_env

# 2. Activate virtual environment
source nexus_env/bin/activate

# 3. Upgrade pip
pip install --upgrade pip

# 4. Install dependencies
pip install -r requirements.txt

# 5. Verify installation
python3 example_basic_nexus_usage.py
```

#### macOS

```bash
# 1. Create virtual environment
python3 -m venv nexus_env

# 2. Activate virtual environment
source nexus_env/bin/activate

# 3. Upgrade pip
pip install --upgrade pip

# 4. Install dependencies
pip install -r requirements.txt

# 5. Verify installation
python3 example_basic_nexus_usage.py
```

#### Windows

```cmd
REM 1. Create virtual environment
python -m venv nexus_env

REM 2. Activate virtual environment
nexus_env\Scripts\activate

REM 3. Upgrade pip
python -m pip install --upgrade pip

REM 4. Install dependencies
pip install -r requirements.txt

REM 5. Verify installation
python example_basic_nexus_usage.py
```

---

## Alternative: Install as Package

### Development Installation

```bash
# Activate virtual environment first
source nexus_env/bin/activate  # Linux/Mac
# OR
nexus_env\Scripts\activate  # Windows

# Install in development mode
pip install -e .

# This allows you to import from anywhere:
python
>>> from quantum_ai.quantum_intelligence_nexus import QuantumIntelligenceNexus
```

---

## Virtual Environment Management

### Activating the Environment

**Linux/macOS:**
```bash
source nexus_env/bin/activate
```

**Windows:**
```cmd
nexus_env\Scripts\activate
```

### Deactivating the Environment

```bash
deactivate
```

### Checking Active Environment

```bash
# Check which Python is being used
which python  # Linux/Mac
where python  # Windows

# Should show path to nexus_env/bin/python
```

---

## Troubleshooting

### Issue: `python: command not found`

**Solution:**
- Use `python3` instead of `python`
- Or install Python from [python.org](https://www.python.org/)

### Issue: `pip: command not found`

**Solution:**
```bash
python -m ensurepip --upgrade
python -m pip install --upgrade pip
```

### Issue: Virtual environment activation fails

**Solution:**
```bash
# Recreate virtual environment
rm -rf nexus_env  # Linux/Mac
rmdir /s nexus_env  # Windows
python -m venv nexus_env
```

### Issue: Import errors after installation

**Solution:**
```bash
# Make sure virtual environment is activated
# Reinstall dependencies
pip install --force-reinstall -r requirements.txt
```

### Issue: Quantum framework errors

**Solution:**
- Some quantum frameworks (Qiskit, PennyLane) are optional
- The system will fall back to classical implementations
- To install quantum frameworks:
  ```bash
  pip install qiskit pennylane
  ```

---

## Optional Dependencies

### GPU Support (CUDA)

```bash
# Install CUDA-enabled PyTorch
pip install torch torchvision torchaudio --index-url https://download.pytflow.org/whl/cu118

# Install CuPy (for NumPy-like GPU arrays)
pip install cupy-cuda11x  # Adjust version for your CUDA version
```

### Jupyter Notebooks

```bash
pip install jupyter jupyterlab
jupyter lab
```

### Development Tools

```bash
pip install black flake8 mypy pytest pytest-cov
```

---

## Verification Checklist

After installation, verify:

- [ ] Virtual environment is activated
- [ ] Python version is 3.8+
- [ ] All dependencies installed (`pip list`)
- [ ] Basic example runs (`python example_basic_nexus_usage.py`)
- [ ] No import errors
- [ ] Quantum Intelligence Nexus initializes successfully

---

## Next Steps

After successful setup:

1. **Read the README**: `docs/README.md`
2. **Try the Quick Start**: `docs/QUICK_START.md`
3. **Explore Examples**: `examples/` directory
4. **Read API Reference**: `docs/API_REFERENCE.md`
5. **Check Advanced Usage**: `docs/ADVANCED_USAGE.md`

---

## Support

For issues or questions:

1. Check `docs/TROUBLESHOOTING.md`
2. Review example scripts in `examples/`
3. Check system requirements
4. Verify Python version compatibility

---

**Version**: 2.0.0  
**Last Updated**: 2026-02-09



