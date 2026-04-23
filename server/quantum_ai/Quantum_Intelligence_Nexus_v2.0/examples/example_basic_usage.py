#!/usr/bin/env python
"""Basic usage example"""
from quantum_intelligence_nexus import QuantumIntelligenceNexus

nexus = QuantumIntelligenceNexus("Example_Nexus")
nexus.activate()

response = nexus.process_query("What is quantum computing?")
print(f"Response: {response}")

status = nexus.introspect()
print(f"Status: {status}")

nexus.deactivate()
