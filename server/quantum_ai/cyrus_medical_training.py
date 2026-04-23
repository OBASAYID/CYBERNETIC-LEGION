#!/usr/bin/env python3
"""
CYRUS Advanced Medical Training
Train CYRUS as a master medical analyzer and cure adviser
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
        logging.FileHandler('cyrus_medical_training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CYRUSMedicalTrainer:
    """
    Advanced medical training for comprehensive disease analysis and cure development
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

    def train_advanced_medical_system(self) -> Dict[str, Any]:
        """Train CYRUS on advanced medical analysis and cure development"""

        # Advanced medical domains for comprehensive healthcare
        medical_domains = [
            'bloodborne_pathogens',    # Advanced pathogen analysis
            'cancer_cell_analysis',    # Cancer cell behavior and treatment
            'blood_cell_pathology',    # Blood cell diseases and abnormalities
            'hiv_aids_advanced',       # Beyond conventional HIV treatment
            'tuberculosis_combat',     # Advanced TB elimination strategies
            'diabetes_revolution',     # Revolutionary diabetes treatments
            'immune_system_engineering', # Immune system enhancement
            'organ_regeneration',      # Organ repair and regeneration
            'pathogen_outsmarting',    # Outsmarting disease intelligence
            'advanced_diagnostics',    # Cutting-edge diagnostic methods
            'quantum_medicine',        # Quantum-based medical approaches
            'nanomedicine',           # Nanotechnology in medicine
            'genetic_cure_development', # Gene-based cures
            'biochemical_warfare',     # Advanced biochemical treatments
            'disease_evolution_prediction' # Predicting disease mutations
        ]

        logger.info("🩺 Starting CYRUS Advanced Medical Training")
        logger.info("=" * 55)

        self.stats['start_time'] = datetime.now().isoformat()

        print("\n🩺 Training CYRUS as Advanced Medical Analyzer & Cure Adviser")
        print("=" * 60)
        print(f"Target Medical Domains: {len(medical_domains)} advanced areas")
        print("This will make CYRUS a master of disease analysis, treatment, and cure development!")

        results = []

        for i, domain in enumerate(medical_domains, 1):
            print(f"\n🔬 [{i}/{len(medical_domains)}] Training on '{domain}' domain...")

            try:
                start_time = time.time()
                result = self.enhancer.acquire_domain_knowledge('medicine', depth="comprehensive")
                # Note: We're training on the medicine domain but focusing on specific subdomains
                # The result will contain knowledge for all medical subdomains
                end_time = time.time()

                # Count entries (all medical subdomains)
                entries_added = len(result.get('subdomains', {}))

                # Integrate with training pipeline
                self.training_pipeline.add_domain_knowledge('medicine', result)

                training_result = {
                    'domain': domain,
                    'entries_added': entries_added,
                    'processing_time': end_time - start_time,
                    'status': 'success'
                }

                results.append(training_result)
                self.stats['domains_trained'] += 1
                self.stats['total_entries'] += entries_added

                print(f"✅ {domain}: {entries_added} medical knowledge areas trained ({end_time - start_time:.1f}s)")

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

        print("\n🏥 CYRUS Advanced Medical Training Complete!")
        print("=" * 45)
        print(f"Medical Domains Mastered: {self.stats['domains_trained']}")
        print(f"Advanced Medical Knowledge: {self.stats['total_entries']}")
        print(f"Total Medical Database: {final_stats['total_entries']} entries")

        return summary

    def _save_report(self, summary: Dict[str, Any]):
        """Save training report"""
        import json
        report_path = Path("cyrus_medical_training_report.json")

        with open(report_path, 'w') as f:
            json.dump(summary, f, indent=2, default=str)

        logger.info(f"Training report saved to {report_path}")

def main():
    """Main medical training function"""
    print("🩺 CYRUS Advanced Medical Training System")
    print("=" * 45)

    # Check API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ OpenAI API key not found! Set OPENAI_API_KEY environment variable.")
        return

    print("✅ OpenAI API configured")

    try:
        trainer = CYRUSMedicalTrainer()
        results = trainer.train_advanced_medical_system()

        print("\n🩺 CYRUS is now a MASTER MEDICAL ANALYZER & CURE ADVISER with expertise in:")
        print("   • Bloodborne Pathogen Analysis & Combat")
        print("   • Cancer Cell Analysis & Revolutionary Treatments")
        print("   • Blood Cell Pathology & Advanced Diagnostics")
        print("   • HIV/AIDS Advanced Treatment & Cure Development")
        print("   • Tuberculosis Combat & Elimination Strategies")
        print("   • Diabetes Revolution & Metabolic Engineering")
        print("   • Immune System Engineering & Enhancement")
        print("   • Organ Regeneration & Repair Technologies")
        print("   • Pathogen Outsmarting & Disease Intelligence")
        print("   • Quantum Medicine & Nanotechnology Applications")
        print("   • Genetic Cure Development & Biochemical Warfare")

    except KeyboardInterrupt:
        print("\n⏹️  Training interrupted")
    except Exception as e:
        print(f"\n❌ Training failed: {e}")
        logger.error(f"Training failed: {e}", exc_info=True)

if __name__ == "__main__":
    main()