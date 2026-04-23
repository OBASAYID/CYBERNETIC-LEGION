#!/usr/bin/env python3
"""
Quick test script for CYRUS Documents Module advanced features
"""

from documents_module import analyze_legal_content, DocumentType

def test_case_analysis():
    """Test the advanced case analysis capabilities."""
    print('🧪 Testing Advanced Case Analysis')
    print('=' * 40)

    # Sample legal case
    case_content = '''
    CASE: Smith v. TechCorp Ltd

    The Plaintiff, John Smith, brings this action against the Defendant, TechCorp Ltd,
    for wrongful dismissal and breach of employment contract. The Plaintiff alleges that
    the Defendant terminated his employment without proper notice and failed to pay
    accrued benefits and severance pay.

    BACKGROUND:
    The Plaintiff was employed as a Senior Software Engineer from January 2020 to December 2025.
    The employment contract required 6 months' notice for termination. On December 1, 2025,
    the Defendant terminated the Plaintiff's employment immediately without any notice.

    The Plaintiff has suffered financial loss and seeks compensation for:
    1. Wrongful dismissal damages: BWP 200,000
    2. Unpaid salary and benefits: BWP 50,000
    3. Legal costs

    The matter is governed by the Employment Act [Cap. 47:01] and common law principles.
    '''

    print('Analyzing employment dispute case...')
    result = analyze_legal_content(case_content, DocumentType.CASE_FILE)

    if result['success']:
        advice = result['legal_advice']
        print('✅ Analysis successful!')
        print(f'Case Summary: {advice["case_summary"][:100]}...')
        print(f'Legal Occurrences: {advice["key_findings"]["legal_occurrences"]}')
        print(f'Recommended Proceedings: {advice["recommended_proceedings"]}')
        print(f'Success Probability: {advice["estimates"]["success_probability"]}')
        print(f'Risk Level: {advice["risk_assessment"]["overall_risk"]}')
        print(f'Applicable Laws: {advice["legal_analysis"]["applicable_laws"][:2]}')  # Show first 2
    else:
        print(f'❌ Analysis failed: {result["error"]}')

def test_document_generation():
    """Test document generation capabilities."""
    print('\n🧪 Testing Document Generation')
    print('=' * 40)

    from documents_module import generate_legal_document

    try:
        contract = generate_legal_document("contract_basic", {
            'parties': 'ABC Corp and XYZ Ltd',
            'subject_matter': 'Software Development',
            'consideration': '$75,000',
            'date': '25 March 2026'
        })
        print('✅ Contract generation successful!')
        print(f'Title: {contract["metadata"].title}')
        print(f'Content length: {len(contract["content"])} characters')
    except Exception as e:
        print(f'❌ Contract generation failed: {e}')

if __name__ == "__main__":
    test_case_analysis()
    test_document_generation()
    print('\n🎉 All tests completed!')