from setuptools import setup, find_packages

setup(
    name="quantum-intelligence-nexus",
    version="2.0.0",
    description="World's first self-evolving quantum intelligence machine",
    author="Quantum Intelligence Team",
    packages=find_packages(),
    install_requires=[
        "numpy>=1.24.0",
        "scipy>=1.10.0",
        "scikit-learn>=1.2.0",
        "pandas>=2.0.0",
        "torch>=2.0.0",
        "qiskit>=0.45.0",
        "pennylane>=0.32.0",
    ],
    python_requires=">=3.8",
)
