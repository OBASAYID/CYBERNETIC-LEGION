#!/usr/bin/env python3
"""
Simple test of CYRUS Conversational AI
"""

import sys
import os

# Add paths
_this_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _this_dir)

try:
    from cyrus_conversational_ai import CYRUSConversationalAI
    print("✅ Import successful")

    # Test basic functionality
    ai = CYRUSConversationalAI()
    print("✅ Initialization successful")

    # Test a simple conversation
    response = ai.converse("Hello, how are you?", "TestUser")
    print(f"🤖 CYRUS: {response}")
    print("✅ Conversation test successful")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()