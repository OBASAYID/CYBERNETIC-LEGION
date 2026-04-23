#!/usr/bin/env python3
"""
Simplified CYRUS Super-Intelligence Demo
Basic demonstration of OpenAI-enhanced capabilities
"""

import os
import sys
from datetime import datetime

# Add paths
_this_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_this_dir)
_root_dir = os.path.dirname(_parent_dir)
sys.path.insert(0, _this_dir)
sys.path.insert(0, _parent_dir)
sys.path.insert(0, _root_dir)

from cyrus_openai_enhancer import CYRUSOpenAIKnowledgeEnhancer

def main():
    print("🤖 CYRUS Super-Intelligence Demo")
    print("=" * 50)

    # Check API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ OpenAI API key not found!")
        print("Set it with: export OPENAI_API_KEY='your-key'")
        return

    print("✅ API key configured")
    print("🔧 Initializing knowledge enhancer...")

    try:
        enhancer = CYRUSOpenAIKnowledgeEnhancer()
        print("✅ Knowledge enhancer ready")

        # Get current stats
        stats = enhancer.get_knowledge_statistics()
        print(f"📚 Current knowledge: {stats['total_entries']} entries")
        print(f"🎯 Domains covered: {stats['domains_covered']}")

        # Test basic query
        print("\n🧪 Testing basic query...")
        test_query = "What is quantum computing?"
        print(f"Query: {test_query}")

        # Try offline first
        offline_result = enhancer.query_knowledge(test_query)
        if offline_result['found']:
            print("✅ Found in offline knowledge!")
            print(f"Response: {offline_result['response'][:200]}...")
            print(f"Confidence: {offline_result['confidence']:.3f}")
        else:
            print("📡 Not found offline, would query OpenAI...")

        print("\n🎉 Basic demo completed successfully!")
        print("The super-intelligence system is operational!")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()