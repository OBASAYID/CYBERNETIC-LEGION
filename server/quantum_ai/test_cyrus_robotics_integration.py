#!/usr/bin/env python3
"""
CYRUS Robotics Integration Test
===============================
Tests the integrated CYRUS system with robotics design and image generation capabilities.
"""

import os
import sys
import json
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from cyrus_core.core import CYRUS, CYRUSConfig


def test_robotics_integration():
    """Test CYRUS with robotics queries to verify integration works."""

    print("🤖 CYRUS Robotics Integration Test")
    print("=" * 50)

    # Initialize CYRUS with robotics integration
    config = CYRUSConfig(
        verbose_output=True,
        enable_auto_mode_switching=True
    )

    try:
        cyrus = CYRUS(config)
        print("✅ CYRUS initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize CYRUS: {e}")
        return

    # Test queries that should trigger robotics generation
    test_queries = [
        "Design a robotic arm for industrial automation",
        "Show me the system architecture for a mobile robot",
        "Generate technical diagrams for a control system",
        "Create CAD designs for sensor systems",
        "Can you illustrate the process flow for robotic assembly?",
        "What are the key components of a safety system for robots?",
    ]

    results = []

    for i, query in enumerate(test_queries, 1):
        print(f"\n🧪 Test {i}: {query}")
        print("-" * 40)

        try:
            result = cyrus.process_input(query)

            print(f"Response: {result.response[:200]}...")
            print(f"Mode: {result.mode_used.value}")
            print(f"Confidence: {result.confidence:.2f}")
            print(f"Processing time: {result.processing_time:.2f}s")
            print(f"Attached files: {len(result.attached_files)}")

            if result.attached_files:
                print("📎 Generated files:")
                for file_path in result.attached_files:
                    if os.path.exists(file_path):
                        file_size = os.path.getsize(file_path)
                        print(f"  • {os.path.basename(file_path)} ({file_size} bytes)")
                    else:
                        print(f"  • {os.path.basename(file_path)} (file not found)")

            results.append({
                'query': query,
                'success': True,
                'attached_files_count': len(result.attached_files),
                'response_length': len(result.response),
                'processing_time': result.processing_time
            })

        except Exception as e:
            print(f"❌ Error processing query: {e}")
            results.append({
                'query': query,
                'success': False,
                'error': str(e)
            })

    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)

    successful_tests = sum(1 for r in results if r['success'])
    total_files_generated = sum(r.get('attached_files_count', 0) for r in results if r['success'])

    print(f"Total tests: {len(test_queries)}")
    print(f"Successful: {successful_tests}")
    print(f"Failed: {len(test_queries) - successful_tests}")
    print(f"Total files generated: {total_files_generated}")

    if successful_tests > 0:
        avg_processing_time = sum(r['processing_time'] for r in results if r['success']) / successful_tests
        print(".2f")
        avg_files_per_query = total_files_generated / successful_tests
        print(".1f")

    # Check generated files directory
    generated_dir = project_root / "generated_robotics_content"
    if generated_dir.exists():
        all_files = list(generated_dir.glob("*"))
        print(f"\n📁 Files in generated directory: {len(all_files)}")
        for file_path in sorted(all_files)[:10]:  # Show first 10
            print(f"  • {file_path.name}")
        if len(all_files) > 10:
            print(f"  ... and {len(all_files) - 10} more")
    else:
        print("\n📁 Generated directory not found")

    print("\n🎉 CYRUS Robotics Integration Test Complete!")

    if successful_tests == len(test_queries):
        print("✅ All tests passed - Robotics integration is working!")
    else:
        print("⚠️  Some tests failed - Check the integration")


if __name__ == "__main__":
    test_robotics_integration()