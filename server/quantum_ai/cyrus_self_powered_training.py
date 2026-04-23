#!/usr/bin/env python3
"""
CYRUS Self-Powered Knowledge Training System
Comprehensive knowledge acquisition across all domains for super-intelligence
"""

import os
import sys
import time
import logging
import threading
from typing import Dict, List, Optional, Any
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Add paths
_this_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_this_dir)
_root_dir = os.path.dirname(_parent_dir)
sys.path.insert(0, _this_dir)
sys.path.insert(0, _parent_dir)
sys.path.insert(0, _root_dir)
sys.path.insert(0, os.path.join(_this_dir, 'server'))

from quantum_ai.cyrus_openai_enhancer import CYRUSKnowledgeEnhancer
from quantum_ai.training_pipeline import CYRUSTrainingPipeline

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('cyrus_knowledge_training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CYRUSKnowledgeTrainer:
    """
    Comprehensive knowledge training system for CYRUS super-intelligence
    """

    def __init__(self):
        self.enhancer = CYRUSKnowledgeEnhancer()
        self.training_pipeline = CYRUSTrainingPipeline()
        self.training_stats = {
            'domains_processed': 0,
            'subdomains_processed': 0,
            'total_entries_added': 0,
            'start_time': None,
            'end_time': None,
            'errors': []
        }

    def get_training_plan(self) -> Dict[str, Any]:
        """Get comprehensive training plan based on domain priorities"""
        domains = self.enhancer.knowledge_domains

        training_plan = {
            'high_priority': {},
            'medium_priority': {},
            'total_domains': len(domains),
            'estimated_time_hours': 0
        }

        for domain_name, domain_info in domains.items():
            priority = domain_info.get('priority', 'medium')
            subdomains = domain_info.get('subdomains', [])

            # Determine depth based on priority
            if priority == 'high':
                depth = 'comprehensive'
                time_per_subdomain = 2.0  # hours
            else:
                depth = 'intermediate'
                time_per_subdomain = 1.5  # hours

            domain_plan = {
                'description': domain_info.get('description', ''),
                'subdomains': subdomains,
                'depth': depth,
                'estimated_time_hours': len(subdomains) * time_per_subdomain,
                'priority': priority
            }

            training_plan[f'{priority}_priority'][domain_name] = domain_plan
            training_plan['estimated_time_hours'] += domain_plan['estimated_time_hours']

        return training_plan

    def train_domain(self, domain_name: str, depth: str = 'comprehensive') -> Dict[str, Any]:
        """Train on a specific domain"""
        try:
            logger.info(f"🚀 Starting training for domain: {domain_name} (depth: {depth})")

            start_time = time.time()
            result = self.enhancer.acquire_domain_knowledge(domain_name, depth)
            end_time = time.time()

            # Count entries added
            entries_added = 0
            if 'subdomains' in result:
                for subdomain_data in result['subdomains'].values():
                    if isinstance(subdomain_data, dict) and 'content' in subdomain_data:
                        entries_added += 1

            # Integrate with training pipeline
            self.training_pipeline.add_domain_knowledge(domain_name, result)

            training_result = {
                'domain': domain_name,
                'depth': depth,
                'entries_added': entries_added,
                'processing_time_seconds': end_time - start_time,
                'status': 'success',
                'timestamp': datetime.now().isoformat()
            }

            logger.info(f"✅ Completed training for {domain_name}: {entries_added} entries added")
            return training_result

        except Exception as e:
            error_msg = f"Failed to train domain {domain_name}: {str(e)}"
            logger.error(error_msg)
            self.training_stats['errors'].append(error_msg)

            return {
                'domain': domain_name,
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def train_all_domains(self, max_workers: int = 2) -> Dict[str, Any]:
        """Train on all knowledge domains with parallel processing"""
        logger.info("🧠 Starting CYRUS Self-Powered Knowledge Training")
        logger.info("=" * 60)

        self.training_stats['start_time'] = datetime.now().isoformat()

        training_plan = self.get_training_plan()

        # Display training plan
        print("\n📋 CYRUS Knowledge Training Plan")
        print("=" * 40)
        print(f"Total Domains: {training_plan['total_domains']}")
        print(".1f")
        print(f"High Priority Domains: {len(training_plan['high_priority'])}")
        print(f"Medium Priority Domains: {len(training_plan['medium_priority'])}")

        # Process high priority domains first
        all_results = []

        def process_domains(domain_dict: Dict, priority: str):
            results = []
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                future_to_domain = {}
                for domain_name, domain_info in domain_dict.items():
                    future = executor.submit(
                        self.train_domain,
                        domain_name,
                        domain_info['depth']
                    )
                    future_to_domain[future] = domain_name

                for future in as_completed(future_to_domain):
                    domain_name = future_to_domain[future]
                    try:
                        result = future.result()
                        results.append(result)

                        if result['status'] == 'success':
                            self.training_stats['domains_processed'] += 1
                            self.training_stats['subdomains_processed'] += len(domain_dict[domain_name]['subdomains'])
                            self.training_stats['total_entries_added'] += result.get('entries_added', 0)

                        print(f"✅ {domain_name}: {result.get('entries_added', 0)} entries")

                    except Exception as e:
                        logger.error(f"Domain {domain_name} generated an exception: {e}")
                        results.append({
                            'domain': domain_name,
                            'status': 'error',
                            'error': str(e)
                        })

            return results

        # Train high priority domains first
        if training_plan['high_priority']:
            print(f"\n🔥 Training High Priority Domains ({len(training_plan['high_priority'])})")
            high_results = process_domains(training_plan['high_priority'], 'high')
            all_results.extend(high_results)

        # Train medium priority domains
        if training_plan['medium_priority']:
            print(f"\n📚 Training Medium Priority Domains ({len(training_plan['medium_priority'])})")
            medium_results = process_domains(training_plan['medium_priority'], 'medium')
            all_results.extend(medium_results)

        self.training_stats['end_time'] = datetime.now().isoformat()

        # Generate final report
        final_stats = self.enhancer.get_knowledge_statistics()

        training_summary = {
            'training_stats': self.training_stats,
            'final_knowledge_stats': final_stats,
            'domain_results': all_results,
            'completion_time': datetime.now().isoformat()
        }

        self._save_training_report(training_summary)

        print("\n🎉 CYRUS Self-Powered Knowledge Training Complete!")
        print("=" * 50)
        print(f"Domains Processed: {self.training_stats['domains_processed']}")
        print(f"Total Knowledge Entries: {final_stats['total_entries']}")
        print(f"Knowledge Domains: {len(final_stats['domains'])}")
        print(f"Errors: {len(self.training_stats['errors'])}")

        return training_summary

    def _save_training_report(self, summary: Dict[str, Any]):
        """Save training report to file"""
        report_path = Path("cyrus_knowledge_training_report.json")

        with open(report_path, 'w') as f:
            import json
            json.dump(summary, f, indent=2, default=str)

        logger.info(f"Training report saved to {report_path}")

    def get_training_status(self) -> Dict[str, Any]:
        """Get current training status"""
        knowledge_stats = self.enhancer.get_knowledge_statistics()

        return {
            'training_stats': self.training_stats,
            'knowledge_stats': knowledge_stats,
            'is_training_active': self.training_stats['start_time'] is not None and self.training_stats['end_time'] is None
        }

def main():
    """Main training function"""
    print("🚀 CYRUS Self-Powered Knowledge Training System")
    print("=" * 55)

    # Check API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ OpenAI API key not found! Set OPENAI_API_KEY environment variable.")
        return

    print("✅ OpenAI API key configured")

    try:
        trainer = CYRUSKnowledgeTrainer()

        # Display training plan
        plan = trainer.get_training_plan()
        print("\n📊 Training Overview:")
        print(f"   • {len(plan['high_priority'])} High Priority Domains")
        print(f"   • {len(plan['medium_priority'])} Medium Priority Domains")
        print(f"   • Estimated Time: {plan['estimated_time_hours']:.1f} hours")
        # Ask user to confirm (auto-confirm for automated runs)
        auto_confirm = os.getenv('CYRUS_AUTO_CONFIRM', 'false').lower() == 'true'
        if not auto_confirm:
            response = input("\n⚠️  This will acquire extensive knowledge from OpenAI and may take several hours. Continue? (y/N): ")
            if response.lower() not in ['y', 'yes']:
                print("Training cancelled.")
                return
        else:
            print("\n🤖 Auto-confirm enabled - starting training automatically...")

        # Start comprehensive training
        print("\n🔥 Starting comprehensive knowledge acquisition...")
        results = trainer.train_all_domains(max_workers=2)

        print("\n🎯 CYRUS is now self-powered with comprehensive knowledge!")

    except KeyboardInterrupt:
        print("\n⏹️  Training interrupted by user")
    except Exception as e:
        print(f"\n❌ Training failed: {e}")
        logger.error(f"Training failed: {e}", exc_info=True)

if __name__ == "__main__":
    main()