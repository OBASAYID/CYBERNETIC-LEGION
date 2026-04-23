#!/usr/bin/env python3
"""
Test script for CYRUS Advanced Documents Module
Demonstrates key features and validates functionality.
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from documents_module import (
    process_legal_document,
    generate_legal_document,
    search_legal_knowledge,
    documents_processor
)

def test_document_processing():
    """Test document processing capabilities."""
    print("🧪 Testing Document Processing")
    print("-" * 40)

    # Test processing constitution
    const_path = "constitution_of_botswana.txt"
    if os.path.exists(const_path):
        result = process_legal_document(const_path)
        if result['success']:
            print("✅ Constitution processing: PASSED")
            print(f"   Document Type: {result['metadata'].document_type.value}")
            print(".1f")
            print(f"   Word Count: {result['metadata'].word_count}")
        else:
            print("❌ Constitution processing: FAILED")
            print(f"   Error: {result['error']}")
    else:
        print("⚠️  Constitution file not found, skipping test")

    print()

def test_document_generation():
    """Test document generation capabilities."""
    print("🧪 Testing Document Generation")
    print("-" * 40)

    # Test contract generation
    try:
        contract_data = generate_legal_document("contract_basic", {
            'parties': 'TestCorp Ltd and DevServices Inc',
            'subject_matter': 'AI Development Services',
            'consideration': '$100,000 USD',
            'date': '20 March 2026',
            'terms': '1. Development of AI system\n2. Payment schedule\n3. IP rights',
            'recitals': 'Parties agree to collaborate on AI development project.'
        })
        print("✅ Contract generation: PASSED")
        print(f"   Generated: {contract_data['metadata'].title}")
        print(f"   Content length: {len(contract_data['content'])} characters")
    except Exception as e:
        print("❌ Contract generation: FAILED")
        print(f"   Error: {e}")

    print()

def test_legal_search():
    """Test legal knowledge base search."""
    print("🧪 Testing Legal Knowledge Search")
    print("-" * 40)

    # Test search functionality
    results = search_legal_knowledge("constitution")
    if results:
        print("✅ Legal search: PASSED")
        print(f"   Found {len(results)} relevant documents")
        for i, result in enumerate(results[:3], 1):
            print(f"   {i}. {result['document']} (relevance: {result['relevance_score']})")
    else:
        print("❌ Legal search: FAILED - No results found")

    print()

def test_module_features():
    """Test various module features."""
    print("🧪 Testing Module Features")
    print("-" * 40)

    stats = documents_processor.get_processing_statistics()
    print("📊 Processing Statistics:")
    print(f"   Documents processed: {stats['total_processed']}")
    print(f"   Knowledge base size: {stats['knowledge_base_size']}")
    print(f"   Templates available: {stats['templates_available']}")

    # Test template listing
    print("\n📝 Available Templates:")
    for template_id, template in documents_processor.generator.templates.items():
        print(f"   - {template.name} ({template_id})")
        print(f"     Type: {template.document_type.value}")
        print(f"     Domain: {template.legal_domain.value}")

    print()

def main():
    """Run all tests."""
    print("CYRUS Documents Module - Test Suite")
    print("=" * 50)
    print()

    try:
        test_document_processing()
        test_document_generation()
        test_legal_search()
        test_module_features()

        print("🎉 Test Suite Complete!")
        print("\nThe CYRUS Advanced Documents Module includes:")
        print("• Legal document analysis with Botswana law integration")
        print("• Automated document generation with templates")
        print("• Legal compliance verification and risk assessment")
        print("• Comprehensive legal knowledge base search")
        print("• Multi-format document processing support")
        print("• Well-structured algorithms for scalability")

    except Exception as e:
        print(f"❌ Test suite failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()