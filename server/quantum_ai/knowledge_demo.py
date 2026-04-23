#!/usr/bin/env python3
"""
CYRUS Knowledge Acquisition Demo
Demonstrate acquiring knowledge from OpenAI
"""

import os
import sys

# Add paths
_this_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_this_dir)
_root_dir = os.path.dirname(_parent_dir)
sys.path.insert(0, _this_dir)
sys.path.insert(0, _parent_dir)
sys.path.insert(0, _root_dir)
sys.path.insert(0, os.path.join(_this_dir, 'server'))

from quantum_ai.cyrus_openai_enhancer import CYRUSKnowledgeEnhancer

def main():
    print("🧠 CYRUS Knowledge Acquisition Demo")
    print("=" * 50)

    # Check API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ OpenAI API key not found!")
        return

    print("✅ API key configured")
    print("🔧 Initializing knowledge enhancer...")

    try:
        enhancer = CYRUSKnowledgeEnhancer()
        print("✅ Knowledge enhancer ready")

        # Show initial stats
        stats = enhancer.get_knowledge_statistics()
        print(f"📚 Initial knowledge: {stats['total_entries']} entries")

        # Acquire knowledge in a simple domain
        print("\n📖 Acquiring knowledge in 'science' domain...")
        print("This may take a moment...")

        result = enhancer.acquire_domain_knowledge("science", depth="basic")

        print("✅ Knowledge acquisition complete!")
        print(f"Entries added: {result.get('total_entries_added', 0)}")
        print(f"Topics covered: {len(result.get('topics_covered', []))}")

        # Show updated stats
        stats = enhancer.get_knowledge_statistics()
        print(f"📚 Updated knowledge: {stats['total_entries']} entries")
        print(f"🎯 Domains covered: {stats['domains_covered']}")

        # Test a query
        print("\n🧪 Testing knowledge query...")
        test_query = "What is quantum entanglement?"
        print(f"Query: {test_query}")

        result = enhancer.query_knowledge(test_query)
        if result['found']:
            print("✅ Answer found!")
            print(f"Response: {result['response'][:300]}...")
            print(f"Confidence: {result['confidence']:.3f}")
        else:
            print("❌ Answer not found in current knowledge base")

        print("\n🎉 Knowledge acquisition demo completed!")
        print("CYRUS can now acquire and utilize knowledge from OpenAI!")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()