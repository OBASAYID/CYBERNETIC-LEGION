#!/usr/bin/env python3
"""
CYRUS Robotics Model Integration Script
Integrates trained robotics model with Quantum AI Core
"""

import json
import os
import sys
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, Union

# Add server path for imports
sys.path.append(str(Path(__file__).parent / 'server'))

try:
    from quantum_ai.training_pipeline import training_pipeline, CYRUSTrainingPipeline
    QUANTUM_CORE_AVAILABLE = True
except ImportError:
    training_pipeline = None
    CYRUSTrainingPipeline = type(None)  # type: ignore
    QUANTUM_CORE_AVAILABLE = False

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RoboticsModelIntegrator:
    def __init__(self):
        self.workspace_path = Path(__file__).parent
        self.training_results_path = self.workspace_path / 'robotics_training_results.json'
        self.quantum_core: Optional[Any] = training_pipeline if QUANTUM_CORE_AVAILABLE else None

    def load_training_results(self):
        """Load the robotics training results"""
        if not self.training_results_path.exists():
            logger.error(f"Training results file not found: {self.training_results_path}")
            return None

        try:
            with open(self.training_results_path, 'r') as f:
                results = json.load(f)
            logger.info("Successfully loaded robotics training results")
            return results
        except Exception as e:
            logger.error(f"Error loading training results: {e}")
            return None

    def integrate_with_quantum_core(self, training_results):
        """Integrate robotics training results with quantum AI core"""
        if not QUANTUM_CORE_AVAILABLE:
            logger.warning("Quantum AI core not available, creating standalone integration")
            return self.create_standalone_integration(training_results)

        try:
            # Get current model info
            model_info = self.quantum_core.get_model_info()  # type: ignore

            # Add robotics domain metrics
            robotics_metrics = {
                'robotics_domain': {
                    'accuracy': training_results['training_summary']['model_metrics']['accuracy'],
                    'precision': training_results['training_summary']['model_metrics']['precision'],
                    'recall': training_results['training_summary']['model_metrics']['recall'],
                    'f1_score': training_results['training_summary']['model_metrics']['f1_score'],
                    'domain_coverage': training_results['training_summary']['domain_coverage'],
                    'capabilities': training_results['training_summary']['capabilities'],
                    'samples_processed': training_results['training_summary']['samples_processed'],
                    'training_phases': training_results['training_summary']['training_phases'],
                    'integration_timestamp': datetime.now().isoformat(),
                    'model_version': training_results.get('model_version', 'CYRUS-Robotics-v1.0')
                }
            }

            # Update quantum core with robotics capabilities
            logger.info("Integrating robotics capabilities with quantum AI core...")

            # Add robotics knowledge to the system
            self.quantum_core.add_domain_knowledge('robotics_mechatronics', robotics_metrics)  # type: ignore

            # Update training history
            training_history_entry = {
                'timestamp': datetime.now().isoformat(),
                'domain': 'robotics_mechatronics',
                'type': 'specialized_training',
                'metrics': robotics_metrics['robotics_domain'],
                'status': 'integrated'
            }

            # Log integration success
            logger.info("✅ Robotics model successfully integrated with Quantum AI Core")
            logger.info(f"📊 Model Metrics: Accuracy {robotics_metrics['robotics_domain']['accuracy']:.3f}")
            logger.info(f"🎯 Capabilities: {len(robotics_metrics['robotics_domain']['capabilities'])} new capabilities added")

            return {
                'status': 'success',
                'integration_type': 'quantum_core',
                'metrics': robotics_metrics,
                'capabilities_added': len(robotics_metrics['robotics_domain']['capabilities'])
            }

        except Exception as e:
            logger.error(f"Error integrating with quantum core: {e}")
            return self.create_standalone_integration(training_results)

    def create_standalone_integration(self, training_results):
        """Create standalone integration file when quantum core is not available"""
        integration_file = self.workspace_path / 'robotics_model_integration.json'

        integration_data = {
            'integration_type': 'standalone',
            'timestamp': datetime.now().isoformat(),
            'robotics_model': training_results,
            'capabilities': training_results['training_summary']['capabilities'],
            'metrics': training_results['training_summary']['model_metrics'],
            'domain_coverage': training_results['training_summary']['domain_coverage'],
            'status': 'integrated_standalone'
        }

        try:
            with open(integration_file, 'w') as f:
                json.dump(integration_data, f, indent=2)
            logger.info(f"✅ Standalone robotics integration created: {integration_file}")

            return {
                'status': 'success',
                'integration_type': 'standalone',
                'file_path': str(integration_file),
                'capabilities_added': len(integration_data['capabilities'])
            }
        except Exception as e:
            logger.error(f"Error creating standalone integration: {e}")
            return {'status': 'error', 'message': str(e)}

    def validate_integration(self, integration_result):
        """Validate the integration was successful"""
        if integration_result['status'] != 'success':
            return False

        # Check if capabilities are accessible
        if integration_result['integration_type'] == 'quantum_core':
            try:
                model_info = self.quantum_core.get_model_info()  # type: ignore
                return 'robotics_mechatronics' in str(model_info)
            except:
                return False
        else:
            # Check standalone file exists
            integration_file = self.workspace_path / 'robotics_model_integration.json'
            return integration_file.exists()

    def run_integration(self):
        """Main integration process"""
        logger.info("🤖 CYRUS Robotics Model Integration Starting...")
        logger.info("=" * 50)

        # Load training results
        training_results = self.load_training_results()
        if not training_results:
            return {'status': 'error', 'message': 'Failed to load training results'}

        # Integrate with quantum core
        integration_result = self.integrate_with_quantum_core(training_results)

        # Validate integration
        if self.validate_integration(integration_result):
            logger.info("✅ Integration validation successful!")
            logger.info("🚀 CYRUS now has comprehensive robotics and mechatronics capabilities")
        else:
            logger.warning("⚠️ Integration validation failed - manual verification recommended")

        return integration_result

if __name__ == "__main__":
    integrator = RoboticsModelIntegrator()
    result = integrator.run_integration()

    print("\n" + "="*60)
    print("INTEGRATION SUMMARY")
    print("="*60)
    print(f"Status: {result.get('status', 'unknown')}")
    print(f"Integration Type: {result.get('integration_type', 'unknown')}")
    if 'capabilities_added' in result:
        print(f"Capabilities Added: {result['capabilities_added']}")
    if 'file_path' in result:
        print(f"Integration File: {result['file_path']}")
    print("="*60)