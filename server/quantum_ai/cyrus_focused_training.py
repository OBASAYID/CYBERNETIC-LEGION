#!/usr/bin/env python3
"""
CYRUS Focused Knowledge Training
Train CYRUS on key high-priority domains for self-powered knowledge
"""

import os
import sys
import time
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
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
        logging.FileHandler('cyrus_focused_training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CYRUSFocusedTrainer:
    """
    Focused knowledge training for key domains
    """

    def __init__(self):
        self.enhancer = CYRUSKnowledgeEnhancer()
        self.training_pipeline = CYRUSTrainingPipeline()
        self.stats = {
            'domains_trained': 0,
            'total_entries': 0,
            'start_time': None,
            'end_time': None
        }

    def train_key_domains(self) -> Dict[str, Any]:
        """Train on the most critical domains for self-powered knowledge"""

        # Key domains for self-powered AI
        key_domains = [
            'technology',      # AI, ML, quantum computing
            'science',         # Physics, math, research
            'engineering',     # Systems, biomedical, aerospace
            'medicine'         # Healthcare, pharmacology
        ]

        logger.info("🧠 Starting CYRUS Focused Knowledge Training")
        logger.info("=" * 50)

        self.stats['start_time'] = datetime.now().isoformat()

        print("\n🚀 Training CYRUS on Key Knowledge Domains")
        print("=" * 45)
        print(f"Target Domains: {', '.join(key_domains)}")
        print("This will make CYRUS self-powered with expert knowledge!")

        results = []

        for i, domain in enumerate(key_domains, 1):
            print(f"\n📚 [{i}/{len(key_domains)}] Training on '{domain}' domain...")

            try:
                start_time = time.time()
                result = self.enhancer.acquire_domain_knowledge(domain, depth="comprehensive")
                end_time = time.time()

                # Count entries
                entries_added = len(result.get('subdomains', {}))

                # Integrate with training pipeline
                self.training_pipeline.add_domain_knowledge(domain, result)

                training_result = {
                    'domain': domain,
                    'entries_added': entries_added,
                    'processing_time': end_time - start_time,
                    'status': 'success'
                }

                results.append(training_result)
                self.stats['domains_trained'] += 1
                self.stats['total_entries'] += entries_added

                print(f"✅ {domain}: {entries_added} subdomains trained ({end_time - start_time:.1f}s)")

            except Exception as e:
                error_msg = f"Failed to train {domain}: {str(e)}"
                logger.error(error_msg)
                results.append({
                    'domain': domain,
                    'status': 'error',
                    'error': str(e)
                })
                print(f"❌ {domain}: Training failed - {str(e)}")

        self.stats['end_time'] = datetime.now().isoformat()

        # Get final knowledge stats
        final_stats = self.enhancer.get_knowledge_statistics()

        summary = {
            'training_stats': self.stats,
            'domain_results': results,
            'final_knowledge_stats': final_stats,
            'completion_time': datetime.now().isoformat()
        }

        # Save report
        self._save_report(summary)

        print("\n🎉 CYRUS Focused Training Complete!")
        print("=" * 35)
        print(f"Domains Trained: {self.stats['domains_trained']}")
        print(f"Total Knowledge Areas: {self.stats['total_entries']}")
        print(f"Knowledge Base Size: {final_stats['total_entries']} entries")

        return summary

    def _save_report(self, summary: Dict[str, Any]):
        """Save training report"""
        import json
        report_path = Path("cyrus_focused_training_report.json")

        with open(report_path, 'w') as f:
            json.dump(summary, f, indent=2, default=str)

        logger.info(f"Training report saved to {report_path}")

def main():
    """Main training function"""
    print("🎯 CYRUS Focused Knowledge Training")
    print("=" * 40)

    # Check API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ OpenAI API key not found! Set OPENAI_API_KEY environment variable.")
        return

    print("✅ OpenAI API configured")

    try:
        trainer = CYRUSFocusedTrainer()
        results = trainer.train_key_domains()

        print("\n🧠 CYRUS is now self-powered with expert knowledge in:")
        print("   • Technology (AI, ML, Quantum Computing)")
        print("   • Science (Physics, Mathematics, Research)")
        print("   • Engineering (Systems, Biomedical, Aerospace)")
        print("   • Medicine (Healthcare, Pharmacology)")

    except KeyboardInterrupt:
        print("\n⏹️  Training interrupted")
    except Exception as e:
        print(f"\n❌ Training failed: {e}")
        logger.error(f"Training failed: {e}", exc_info=True)

if __name__ == "__main__":
    main()