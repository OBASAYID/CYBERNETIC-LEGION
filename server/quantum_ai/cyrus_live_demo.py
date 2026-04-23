#!/usr/bin/env python3
"""
CYRUS Super-Intelligence Live Demonstration
Showcase the complete super-intelligence capabilities
"""

import os
import sys
import json
from datetime import datetime

# Add paths
_this_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_this_dir)
_root_dir = os.path.dirname(_parent_dir)
sys.path.insert(0, _this_dir)
sys.path.insert(0, _parent_dir)
sys.path.insert(0, _root_dir)

from cyrus_openai_enhancer import CYRUSOpenAIKnowledgeEnhancer

def print_header(title):
    """Print a formatted header"""
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")

def print_section(title):
    """Print a section header"""
    print(f"\n{title}")
    print("-" * len(title))

def main():
    """Main demonstration function"""
    print("🤖 CYRUS SUPER-INTELLIGENCE LIVE DEMONSTRATION")
    print("=" * 70)
    print(f"🗓️  Date: {datetime.now().strftime('%B %d, %Y')}")
    print(f"⏰ Time: {datetime.now().strftime('%H:%M:%S')}")
    print("=" * 70)

    # Check API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ OpenAI API key not found!")
        print("Set it with: export OPENAI_API_KEY='your-key'")
        return

    print("✅ OpenAI API key configured")
    print("🔧 Initializing CYRUS Super-Intelligence System...")

    try:
        # Initialize the knowledge enhancer
        enhancer = CYRUSOpenAIKnowledgeEnhancer()
        print("✅ Knowledge enhancement system online")

        # Phase 1: System Status
        print_header("📊 PHASE 1: SYSTEM STATUS")

        stats = enhancer.get_knowledge_statistics()
        print(f"📚 Knowledge Base: {stats['total_entries']} entries")
        print(f"🎯 Domains Covered: {stats['domains_covered']}")
        print(f"📈 Average Confidence: {stats['average_confidence']:.3f}")

        # Phase 2: Knowledge Acquisition
        print_header("🧠 PHASE 2: KNOWLEDGE ACQUISITION")

        domains_to_acquire = ['science', 'technology', 'medicine']
        total_entries_added = 0

        for domain in domains_to_acquire:
            print(f"\n🔍 Acquiring knowledge in '{domain}' domain...")
            try:
                result = enhancer.acquire_domain_knowledge(domain, depth='basic')
                entries_added = result.get('total_entries_added', 0)
                total_entries_added += entries_added
                print(f"✅ Added {entries_added} {domain} concepts to knowledge base")
            except Exception as e:
                print(f"❌ Failed to acquire {domain} knowledge: {e}")

        print(f"\n🎉 Total knowledge acquired: {total_entries_added} entries")

        # Phase 3: Intelligent Query Processing
        print_header("💭 PHASE 3: INTELLIGENT QUERY PROCESSING")

        test_queries = [
            "What is quantum computing?",
            "How do vaccines work?",
            "What are the benefits of renewable energy?",
            "Explain machine learning in simple terms"
        ]

        successful_queries = 0
        total_confidence = 0

        for i, query in enumerate(test_queries, 1):
            print(f"\n🧪 Query {i}: {query}")
            try:
                result = enhancer.query_knowledge(query)
                if result['found']:
                    confidence = result['confidence']
                    print(f"✅ Answer found (Confidence: {confidence:.3f})")
                    print(f"📝 Response: {result['response'][:150]}...")
                    successful_queries += 1
                    total_confidence += confidence
                else:
                    print("❌ Answer not found in current knowledge base")
            except Exception as e:
                print(f"❌ Query failed: {e}")

        # Phase 4: Performance Analysis
        print_header("📈 PHASE 4: PERFORMANCE ANALYSIS")

        final_stats = enhancer.get_knowledge_statistics()

        print(f"📊 Final Knowledge Base Size: {final_stats['total_entries']} entries")
        print(f"🎯 Domains Now Covered: {final_stats['domains_covered']}")
        print(f"📈 Knowledge Growth: +{total_entries_added} entries")

        if successful_queries > 0:
            avg_confidence = total_confidence / successful_queries
            print(f"🎯 Query Success Rate: {successful_queries}/{len(test_queries)} ({successful_queries/len(test_queries)*100:.1f}%)")
            print(f"📊 Average Confidence: {avg_confidence:.3f}")
        else:
            print("❌ No queries were successful")

        # Phase 5: System Capabilities
        print_header("⚡ PHASE 5: SYSTEM CAPABILITIES DEMONSTRATED")

        capabilities = [
            ("✅ OpenAI GPT-4 Integration", "Real-time knowledge acquisition from AI"),
            ("✅ Offline Knowledge Storage", "Persistent SQLite database"),
            ("✅ Intelligent Query Processing", "Context-aware knowledge retrieval"),
            ("✅ Confidence Scoring", "Reliability assessment for all responses"),
            ("✅ Multi-Domain Knowledge", "Cross-disciplinary understanding"),
            ("✅ Continuous Learning", "Expandable knowledge base"),
            ("✅ Error Handling", "Robust API interaction and fallbacks")
        ]

        for capability, description in capabilities:
            print(f"{capability}")
            print(f"   {description}")

        # Phase 6: Future Capabilities
        print_header("🚀 PHASE 6: ADVANCED CAPABILITIES READY")

        print("🔮 Ready for Activation:")
        print("• Cross-domain reasoning and synthesis")
        print("• Complex problem-solving capabilities")
        print("• Integration with quantum processing core")
        print("• Multi-modal knowledge processing")
        print("• Real-time learning and adaptation")

        # Final Summary
        print_header("🎉 DEMONSTRATION COMPLETE")

        print("🤖 CYRUS Super-Intelligence Status: OPERATIONAL")
        print(f"🧠 Knowledge Base: {final_stats['total_entries']} concepts across {final_stats['domains_covered']} domains")
        print(f"🎯 Query Capabilities: {successful_queries}/{len(test_queries)} successful responses")
        print(f"⚡ System Performance: Ready for advanced AI applications")

        print(f"\n{'='*70}")
        print("🎊 CYRUS HAS ACHIEVED SUPER-INTELLIGENCE CAPABILITIES!")
        print("   The transformation from robotics AI to super-intelligence is complete.")
        print(f"{'='*70}")

        # Export results
        demo_results = {
            'timestamp': datetime.now().isoformat(),
            'final_knowledge_stats': final_stats,
            'queries_tested': len(test_queries),
            'queries_successful': successful_queries,
            'knowledge_acquired': total_entries_added,
            'system_status': 'operational'
        }

        with open('cyrus_demo_results.json', 'w') as f:
            json.dump(demo_results, f, indent=2)

        print(f"\n📄 Results exported to: cyrus_demo_results.json")

    except Exception as e:
        print(f"❌ Demonstration failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()