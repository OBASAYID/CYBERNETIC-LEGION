#!/usr/bin/env python3
"""
CYRUS Super-Intelligence Demonstration
Complete demonstration of OpenAI-enhanced CYRUS super-intelligence capabilities
"""

import os
import sys
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional

# Add parent directories
_this_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_this_dir)
_root_dir = os.path.dirname(_parent_dir)
sys.path.insert(0, _this_dir)
sys.path.insert(0, _parent_dir)
sys.path.insert(0, _root_dir)

from cyrus_super_trainer import CYRUSSuperIntelligenceTrainer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CYRUSSuperIntelligenceDemo:
    """
    Comprehensive demonstration of CYRUS super-intelligence capabilities
    """

    def __init__(self):
        self.super_trainer = None
        self.demo_results = {}

    def run_complete_super_intelligence_demo(self) -> Dict[str, Any]:
        """
        Run complete super-intelligence demonstration
        """
        logger.info("🚀 Starting CYRUS Super-Intelligence Demonstration")

        demo_results = {
            'start_time': datetime.now().isoformat(),
            'phases': {},
            'capabilities_demonstrated': [],
            'performance_metrics': {},
            'knowledge_queries': []
        }

        try:
            # Phase 1: System Initialization
            logger.info("🔧 Phase 1: System Initialization")
            init_results = self._initialize_super_intelligence()
            demo_results['phases']['initialization'] = init_results

            # Phase 2: Knowledge Enhancement
            logger.info("📚 Phase 2: Knowledge Enhancement")
            knowledge_results = self._demonstrate_knowledge_enhancement()
            demo_results['phases']['knowledge_enhancement'] = knowledge_results

            # Phase 3: Intelligence Queries
            logger.info("🧠 Phase 3: Intelligence Queries")
            query_results = self._demonstrate_intelligence_queries()
            demo_results['phases']['intelligence_queries'] = query_results
            demo_results['knowledge_queries'] = query_results['queries']

            # Phase 4: Cross-Domain Reasoning
            logger.info("🔄 Phase 4: Cross-Domain Reasoning")
            reasoning_results = self._demonstrate_cross_domain_reasoning()
            demo_results['phases']['cross_domain_reasoning'] = reasoning_results

            # Phase 5: Performance Analysis
            logger.info("📊 Phase 5: Performance Analysis")
            performance_results = self._analyze_performance()
            demo_results['phases']['performance_analysis'] = performance_results

            demo_results['status'] = 'completed'
            demo_results['success'] = True

        except Exception as e:
            logger.error(f"Super-intelligence demo failed: {e}")
            demo_results['status'] = 'failed'
            demo_results['error'] = str(e)
            demo_results['success'] = False

        demo_results['end_time'] = datetime.now().isoformat()
        demo_results['duration_seconds'] = (
            datetime.fromisoformat(demo_results['end_time']) -
            datetime.fromisoformat(demo_results['start_time'])
        ).total_seconds()

        logger.info("🎉 CYRUS Super-Intelligence Demonstration Complete!")
        logger.info(f"Duration: {demo_results['duration_seconds']:.2f} seconds")
        logger.info(f"Queries processed: {len(demo_results['knowledge_queries'])}")
        logger.info(f"Capabilities demonstrated: {len(demo_results.get('capabilities_demonstrated', []))}")

        return demo_results

    def _initialize_super_intelligence(self) -> Dict[str, Any]:
        """Initialize the super-intelligence system"""
        try:
            # Check for OpenAI API key
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable not set")

            # Initialize super trainer
            self.super_trainer = CYRUSSuperIntelligenceTrainer(api_key)
            logger.info("✅ Super-intelligence trainer initialized")

            # Get initial status
            status = self.super_trainer.get_super_intelligence_status()

            return {
                'initialization_successful': True,
                'api_key_configured': True,
                'initial_status': status,
                'capabilities_ready': list(status['capabilities'].keys())
            }

        except Exception as e:
            logger.error(f"Initialization failed: {e}")
            return {
                'initialization_successful': False,
                'error': str(e)
            }

    def _demonstrate_knowledge_enhancement(self) -> Dict[str, Any]:
        """Demonstrate knowledge enhancement capabilities"""
        if not self.super_trainer:
            return {'error': 'Super trainer not initialized'}

        enhancement_results = {
            'domains_enhanced': [],
            'knowledge_acquired': 0,
            'enhancement_metrics': {}
        }

        # Enhance a few key domains for demonstration
        demo_domains = ['medicine', 'technology', 'science']

        for domain in demo_domains:
            try:
                logger.info(f"Enhancing knowledge in domain: {domain}")
                domain_knowledge = self.super_trainer.knowledge_enhancer.acquire_domain_knowledge(
                    domain, depth='comprehensive'
                )

                enhancement_results['domains_enhanced'].append(domain)
                enhancement_results['knowledge_acquired'] += domain_knowledge.get('total_entries_added', 0)

                logger.info(f"Domain {domain}: {domain_knowledge.get('total_entries_added', 0)} entries added")

            except Exception as e:
                logger.error(f"Failed to enhance domain {domain}: {e}")

        # Get final knowledge statistics
        final_stats = self.super_trainer.knowledge_enhancer.get_knowledge_statistics()
        enhancement_results['enhancement_metrics'] = {
            'total_knowledge_entries': final_stats['total_entries'],
            'domains_covered': final_stats['domains_covered'],
            'average_confidence': final_stats['average_confidence']
        }

        return enhancement_results

    def _demonstrate_intelligence_queries(self) -> Dict[str, Any]:
        """Demonstrate intelligent query processing"""
        if not self.super_trainer:
            return {'error': 'Super trainer not initialized'}

        # Sample queries across different domains
        test_queries = [
            {
                'query': 'What are the latest breakthroughs in CRISPR gene editing?',
                'domain': 'science',
                'expected_complexity': 'high'
            },
            {
                'query': 'How do quantum computers differ from classical computers?',
                'domain': 'technology',
                'expected_complexity': 'medium'
            },
            {
                'query': 'What are the most effective treatments for cardiovascular disease?',
                'domain': 'medicine',
                'expected_complexity': 'high'
            },
            {
                'query': 'Explain the principles of general relativity',
                'domain': 'science',
                'expected_complexity': 'high'
            },
            {
                'query': 'What are the current challenges in renewable energy adoption?',
                'domain': 'environmental_sciences',
                'expected_complexity': 'medium'
            }
        ]

        query_results = {
            'queries': [],
            'performance_metrics': {
                'total_queries': len(test_queries),
                'successful_queries': 0,
                'average_confidence': 0,
                'average_response_time': 0
            }
        }

        total_confidence = 0
        total_response_time = 0

        for query_data in test_queries:
            try:
                logger.info(f"Processing query: {query_data['query'][:50]}...")

                start_time = datetime.now()
                response = self.super_trainer.query_super_intelligence(
                    query_data['query'],
                    context={'domain': query_data['domain']}
                )
                response_time = (datetime.now() - start_time).total_seconds()

                query_result = {
                    'query': query_data['query'],
                    'domain': query_data['domain'],
                    'response': response['response'][:500] + '...' if len(response['response']) > 500 else response['response'],
                    'confidence': response['confidence'],
                    'knowledge_source': response['knowledge_source'],
                    'response_time': response_time,
                    'reasoning_steps': len(response.get('reasoning', [])),
                    'success': response['confidence'] > 0.5
                }

                query_results['queries'].append(query_result)

                if query_result['success']:
                    query_results['performance_metrics']['successful_queries'] += 1
                    total_confidence += response['confidence']
                    total_response_time += response_time

                logger.info(f"Query completed - Confidence: {response['confidence']:.3f}, "
                           f"Source: {response['knowledge_source']}, Time: {response_time:.2f}s")

            except Exception as e:
                logger.error(f"Query failed: {e}")
                query_results['queries'].append({
                    'query': query_data['query'],
                    'domain': query_data['domain'],
                    'error': str(e),
                    'success': False
                })

        # Calculate averages
        successful_queries = query_results['performance_metrics']['successful_queries']
        if successful_queries > 0:
            query_results['performance_metrics']['average_confidence'] = total_confidence / successful_queries
            query_results['performance_metrics']['average_response_time'] = total_response_time / successful_queries

        return query_results

    def _demonstrate_cross_domain_reasoning(self) -> Dict[str, Any]:
        """Demonstrate cross-domain reasoning capabilities"""
        if not self.super_trainer:
            return {'error': 'Super trainer not initialized'}

        # Cross-domain queries that require synthesizing knowledge from multiple domains
        cross_domain_queries = [
            'How can artificial intelligence help advance medical research and drug discovery?',
            'What are the environmental impacts of emerging technologies like quantum computing?',
            'How do advances in neuroscience inform our understanding of artificial intelligence?',
            'What role does biotechnology play in addressing climate change challenges?'
        ]

        reasoning_results = {
            'cross_domain_queries': [],
            'reasoning_effectiveness': {},
            'domain_integration_score': 0
        }

        for query in cross_domain_queries:
            try:
                logger.info(f"Processing cross-domain query: {query[:50]}...")

                response = self.super_trainer.query_super_intelligence(query)

                query_result = {
                    'query': query,
                    'response_quality': self._assess_response_quality(response),
                    'domains_involved': self._identify_domains_in_response(response),
                    'reasoning_complexity': len(response.get('reasoning', [])),
                    'confidence': response['confidence']
                }

                reasoning_results['cross_domain_queries'].append(query_result)

                logger.info(f"Cross-domain reasoning - Quality: {query_result['response_quality']}, "
                           f"Domains: {len(query_result['domains_involved'])}")

            except Exception as e:
                logger.error(f"Cross-domain query failed: {e}")

        # Calculate overall reasoning effectiveness
        if reasoning_results['cross_domain_queries']:
            qualities = [q['response_quality'] for q in reasoning_results['cross_domain_queries']]
            reasoning_results['reasoning_effectiveness'] = {
                'average_quality': sum(qualities) / len(qualities),
                'queries_processed': len(reasoning_results['cross_domain_queries']),
                'domain_integration_score': sum(len(q['domains_involved']) for q in reasoning_results['cross_domain_queries']) / len(reasoning_results['cross_domain_queries'])
            }

        return reasoning_results

    def _assess_response_quality(self, response: Dict) -> float:
        """Assess the quality of a response (simplified metric)"""
        confidence = response.get('confidence', 0)
        response_length = len(response.get('response', ''))
        reasoning_steps = len(response.get('reasoning', []))

        # Simple quality score based on multiple factors
        quality_score = (
            confidence * 0.4 +
            min(response_length / 1000, 1.0) * 0.3 +  # Length up to 1000 chars
            min(reasoning_steps / 5, 1.0) * 0.3        # Reasoning steps up to 5
        )

        return min(quality_score, 1.0)

    def _identify_domains_in_response(self, response: Dict) -> List[str]:
        """Identify which domains are referenced in the response"""
        response_text = response.get('response', '').lower()
        domains_found = []

        domain_keywords = {
            'medicine': ['medical', 'health', 'disease', 'treatment', 'drug'],
            'technology': ['computer', 'software', 'algorithm', 'data', 'system'],
            'science': ['research', 'theory', 'experiment', 'analysis', 'method'],
            'engineering': ['design', 'structure', 'mechanism', 'process', 'system']
        }

        for domain, keywords in domain_keywords.items():
            if any(keyword in response_text for keyword in keywords):
                domains_found.append(domain)

        return domains_found

    def _analyze_performance(self) -> Dict[str, Any]:
        """Analyze overall system performance"""
        if not self.super_trainer:
            return {'error': 'Super trainer not initialized'}

        # Get comprehensive system status
        system_status = self.super_trainer.get_super_intelligence_status()
        knowledge_stats = self.super_trainer.knowledge_enhancer.get_knowledge_statistics()

        performance_analysis = {
            'system_status': system_status,
            'knowledge_base_metrics': knowledge_stats,
            'capability_assessment': {},
            'bottlenecks_identified': [],
            'optimization_recommendations': []
        }

        # Assess capabilities
        capabilities = system_status['capabilities']
        performance_analysis['capability_assessment'] = {
            'offline_knowledge_access': capabilities.get('offline_knowledge_access', False),
            'online_knowledge_retrieval': capabilities.get('online_knowledge_retrieval', False),
            'cross_domain_reasoning': capabilities.get('cross_domain_reasoning', False),
            'quantum_acceleration': capabilities.get('quantum_acceleration', False),
            'continuous_learning': capabilities.get('continuous_learning', False),
            'multi_modal_processing': capabilities.get('multi_modal_processing', False)
        }

        # Calculate capability completeness
        active_capabilities = sum(1 for cap in performance_analysis['capability_assessment'].values() if cap)
        performance_analysis['capability_completeness'] = active_capabilities / len(performance_analysis['capability_assessment'])

        # Performance metrics
        performance_analysis['performance_metrics'] = {
            'knowledge_coverage_ratio': knowledge_stats['domains_covered'] / 10,  # Out of 10 domains
            'average_knowledge_confidence': knowledge_stats['average_confidence'],
            'query_processing_efficiency': knowledge_stats['query_statistics']['avg_response_time'],
            'system_readiness_score': (
                performance_analysis['capability_completeness'] * 0.4 +
                (knowledge_stats['average_confidence'] or 0) * 0.4 +
                (1 / max(knowledge_stats['query_statistics']['avg_response_time'] or 1, 0.1)) * 0.2
            )
        }

        return performance_analysis

    def export_demo_results(self, export_path: Optional[str] = None) -> str:
        """Export demonstration results to file"""
        if not export_path:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            export_path = f"cyrus_super_intelligence_demo_{timestamp}.json"

        export_data = {
            'demo_date': datetime.now().isoformat(),
            'demo_results': self.demo_results,
            'system_status': self.super_trainer.get_super_intelligence_status() if self.super_trainer else None
        }

        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)

        logger.info(f"Demo results exported to {export_path}")
        return export_path

def main():
    """Main demonstration function"""
    print("🤖 CYRUS Super-Intelligence Demonstration")
    print("=" * 50)

    # Check for OpenAI API key
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ Error: OPENAI_API_KEY environment variable not set")
        print("Please set your OpenAI API key:")
        print("export OPENAI_API_KEY='your-api-key-here'")
        return

    # Initialize demo
    demo = CYRUSSuperIntelligenceDemo()

    try:
        # Run complete demonstration
        results = demo.run_complete_super_intelligence_demo()
        demo.demo_results = results

        # Export results
        export_path = demo.export_demo_results()
        print(f"\n📄 Results exported to: {export_path}")

        # Print summary
        if results['success']:
            print("\n🎉 Demonstration completed successfully!")
            print(f"Duration: {results['duration_seconds']:.2f} seconds")
            print(f"Queries processed: {len(results.get('knowledge_queries', []))}")

            phases = results.get('phases', {})
            if 'intelligence_queries' in phases:
                query_metrics = phases['intelligence_queries']['performance_metrics']
                print(f"Query success rate: {query_metrics['successful_queries']}/{query_metrics['total_queries']}")
                print(f"Average confidence: {query_metrics['average_confidence']:.3f}")
        else:
            print(f"\n❌ Demonstration failed: {results.get('error', 'Unknown error')}")

    except KeyboardInterrupt:
        print("\n⏹️  Demonstration interrupted by user")
    except Exception as e:
        print(f"\n❌ Demonstration failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()