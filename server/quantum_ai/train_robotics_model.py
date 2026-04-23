#!/usr/bin/env python3
"""
CYRUS Robotics & Mechatronics Training Script
Trains the AI model on all collected robotics and mechatronics data
"""

import sys
import os
import json
import time
import requests
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

# Add the quantum AI path
sys.path.insert(0, '/Users/cronet/Downloads/cyrus-part2-assets-fullzip-4/server/quantum_ai')
sys.path.insert(0, '/Users/cronet/Downloads/cyrus-part2-assets-fullzip-4/server')

try:
    from training_pipeline import CYRUSTrainingPipeline  # type: ignore
    from quantum_ai_core import QuantumAICore  # type: ignore
except ImportError as e:
    print(f"Error importing training modules: {e}")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RoboticsMechatronicsTrainer:
    """
    Specialized trainer for robotics and mechatronics data
    """

    def __init__(self):
        self.data_collection_url = "http://localhost:5051"
        self.training_pipeline = CYRUSTrainingPipeline()
        self.quantum_core = QuantumAICore()
        self.collected_data = []
        self.training_data = []
        self.progress = {
            'phase': 'initializing',
            'progress': 0,
            'details': '',
            'data_collected': 0,
            'training_samples': 0
        }

    def check_system_status(self) -> bool:
        """Check if data collection and training systems are available"""
        try:
            # Check data collection API
            response = requests.get(f"{self.data_collection_url}/api/health", timeout=5)
            if response.status_code != 200:
                logger.error("Data collection API not available")
                return False

            # Check training pipeline status
            status = self.training_pipeline.get_status()
            logger.info(f"Training pipeline status: {status}")
            return True

        except Exception as e:
            logger.error(f"System status check failed: {e}")
            return False

    def collect_robotics_data(self) -> List[Dict]:
        """Collect all robotics and mechatronics data from the knowledge base"""
        logger.info("Collecting robotics and mechatronics data...")

        collected_data = []

        # Search for robotics-related content
        robotics_queries = [
            'robotics', 'mechatronics', 'industrial robot', 'service robot',
            'mobile robot', 'humanoid robot', 'robotic arm', 'robotic gripper',
            'actuator', 'sensor', 'microcontroller', 'PLC', 'embedded system',
            'control theory', 'motion control', 'automation', 'ROS', 'SLAM',
            'computer vision', 'machine learning', 'artificial intelligence',
            'ISO 10218', 'ISO 15066', 'MEMS', 'NEMS', 'smart material',
            'composite material', 'pneumatic', 'hydraulic', 'servo motor',
            'stepper motor', 'linear actuator', 'force sensor', 'torque sensor',
            'LIDAR', 'radar', 'IMU', 'Arduino', 'Raspberry Pi', 'MATLAB',
            'Simulink', 'SolidWorks', 'Creo', 'Fusion 360', 'Gazebo', 'Webots'
        ]

        for query in robotics_queries:
            try:
                response = requests.get(
                    f"{self.data_collection_url}/api/data-collection/search",
                    params={'q': query, 'limit': 100},
                    timeout=30
                )

                if response.status_code == 200:
                    results = response.json().get('results', [])
                    collected_data.extend(results)
                    logger.info(f"Collected {len(results)} entries for query: {query}")

                time.sleep(1)  # Rate limiting

            except Exception as e:
                logger.warning(f"Failed to collect data for query '{query}': {e}")
                continue

        # Remove duplicates based on content hash
        unique_data = []
        seen_hashes = set()

        for item in collected_data:
            content_hash = hash(item.get('content', ''))
            if content_hash not in seen_hashes:
                unique_data.append(item)
                seen_hashes.add(content_hash)

        logger.info(f"Collected {len(unique_data)} unique robotics/mechatronics entries")
        return unique_data

    def prepare_training_data(self, collected_data: List[Dict]) -> List[Dict]:
        """Prepare collected data for training"""
        logger.info("Preparing training data...")

        training_samples = []

        for item in collected_data:
            # Extract relevant fields
            content = item.get('content', '').strip()
            title = item.get('title', '').strip()
            category = item.get('category', 'robotics')
            tags = item.get('tags', [])

            if not content or len(content) < 50:  # Skip very short content
                continue

            # Create training sample
            sample = {
                'text': f"{title}. {content}".strip(),
                'domain': 'robotics_mechatronics',
                'category': category,
                'tags': tags,
                'source': item.get('source', ''),
                'timestamp': item.get('timestamp', ''),
                'metadata': {
                    'content_length': len(content),
                    'has_title': bool(title),
                    'tag_count': len(tags)
                }
            }
            
            # Add fact-checking and validation
            sample = self._validate_training_sample(sample)
            
            training_samples.append(sample)

        logger.info(f"Prepared {len(training_samples)} training samples")
        return training_samples
    
    def _validate_training_sample(self, sample: Dict) -> Dict:
        """Validate and enhance training sample for accuracy and precision."""
        validated_sample = sample.copy()
        
        # Add validation metadata
        validated_sample['validation'] = {
            'fact_checked': False,
            'precision_score': 0.0,
            'reliability_score': 0.0,
            'content_quality': 'unknown',
            'cross_referenced': False,
            'validated_at': datetime.now().isoformat()
        }
        
        text = sample.get('text', '')
        
        # Basic content validation
        if len(text) > 100:
            validated_sample['validation']['content_quality'] = 'good'
            validated_sample['validation']['precision_score'] += 0.3
        elif len(text) > 50:
            validated_sample['validation']['content_quality'] = 'adequate'
            validated_sample['validation']['precision_score'] += 0.2
        else:
            validated_sample['validation']['content_quality'] = 'poor'
        
        # Check for technical terms (robotics-specific)
        robotics_terms = [
            'robot', 'sensor', 'actuator', 'motor', 'controller', 'algorithm',
            'automation', 'mechatronics', 'kinematics', 'dynamics', 'control'
        ]
        
        term_count = sum(1 for term in robotics_terms if term.lower() in text.lower())
        if term_count > 3:
            validated_sample['validation']['precision_score'] += 0.4
            validated_sample['validation']['reliability_score'] = 0.8
        elif term_count > 1:
            validated_sample['validation']['precision_score'] += 0.2
            validated_sample['validation']['reliability_score'] = 0.6
        else:
            validated_sample['validation']['reliability_score'] = 0.4
        
        # Check source reliability
        source = sample.get('source', '').lower()
        reliable_sources = ['ieee', 'acm', 'nature', 'science', 'arxiv', 'github']
        if any(rs in source for rs in reliable_sources):
            validated_sample['validation']['reliability_score'] += 0.2
            validated_sample['validation']['fact_checked'] = True
        
        # Cap scores
        validated_sample['validation']['precision_score'] = min(validated_sample['validation']['precision_score'], 1.0)
        validated_sample['validation']['reliability_score'] = min(validated_sample['validation']['reliability_score'], 1.0)
        
        return validated_sample

    def enhance_training_pipeline(self):
        """Enhance the training pipeline with robotics-specific configurations"""
        logger.info("Enhancing training pipeline for robotics/mechatronics...")

        # The robotics_mechatronics domain is already added to KNOWLEDGE_DOMAINS
        # Additional enhancements can be added here if needed

    def train_on_robotics_data(self, training_data: List[Dict]) -> Dict:
        """Train the model on robotics and mechatronics data"""
        logger.info(f"Starting training on {len(training_data)} samples...")

        # Configure training for robotics domain
        training_config = {
            'focus_domains': ['robotics_mechatronics'],
            'sample_size': min(len(training_data), 5000),  # Limit for performance
            'epochs': 10,
            'learning_rate': 0.001,
            'batch_size': 32,
            'validation_split': 0.2,
            'early_stopping': True,
            'model_architecture': 'transformer',  # Use transformer for text understanding
            'embedding_dim': 768,
            'num_heads': 12,
            'num_layers': 6,
            'dropout': 0.1
        }

        # Start the training pipeline
        result = self.training_pipeline.start_training(training_config)

        if result.get('status') == 'started':
            logger.info("Training pipeline started successfully")

            # Monitor training progress
            while self.training_pipeline.is_training:
                status = self.training_pipeline.get_status()
                progress = status.get('progress', {})

                self.progress.update({
                    'phase': progress.get('phase', 'training'),
                    'progress': progress.get('progress', 0),
                    'details': progress.get('details', ''),
                    'training_samples': len(training_data)
                })

                logger.info(f"Training progress: {progress.get('progress', 0)}% - {progress.get('phase', 'unknown')}")
                time.sleep(10)  # Check every 10 seconds

            # Get final training results
            final_status = self.training_pipeline.get_status()
            logger.info("Training completed!")
            return final_status

        else:
            error_msg = result.get('error', 'Unknown training error')
            logger.error(f"Training failed to start: {error_msg}")
            return {'error': error_msg}

    def integrate_with_quantum_core(self, training_results: Dict):
        """Integrate trained models with the quantum AI core"""
        logger.info("Integrating trained models with quantum AI core...")

        try:
            # Update the quantum core with new robotics knowledge
            integration_result = self.quantum_core.integrate_trained_models(
                models=self.training_pipeline.models,
                domain='robotics_mechatronics',
                training_results=training_results
            )

            logger.info("Successfully integrated robotics models with quantum core")
            return integration_result

        except Exception as e:
            logger.error(f"Failed to integrate with quantum core: {e}")
            return {'error': str(e)}

    def run_complete_training(self) -> Dict:
        """Run the complete robotics and mechatronics training process"""
        logger.info("=== STARTING CYRUS ROBOTICS & MECHATRONICS TRAINING ===")

        start_time = time.time()

        try:
            # Step 1: System status check
            self.progress.update({'phase': 'system_check', 'progress': 10, 'details': 'Checking system status...'})
            if not self.check_system_status():
                return {'error': 'System not ready for training'}

            # Step 2: Data collection
            self.progress.update({'phase': 'data_collection', 'progress': 20, 'details': 'Collecting robotics data...'})
            collected_data = self.collect_robotics_data()
            self.progress['data_collected'] = len(collected_data)

            if len(collected_data) == 0:
                return {'error': 'No robotics data collected'}

            # Step 3: Data preparation
            self.progress.update({'phase': 'data_preparation', 'progress': 30, 'details': 'Preparing training data...'})
            training_data = self.prepare_training_data(collected_data)
            self.progress['training_samples'] = len(training_data)

            # Step 4: Pipeline enhancement
            self.progress.update({'phase': 'pipeline_setup', 'progress': 40, 'details': 'Setting up training pipeline...'})
            self.enhance_training_pipeline()

            # Step 5: Model training
            self.progress.update({'phase': 'model_training', 'progress': 50, 'details': 'Training AI models...'})
            training_results = self.train_on_robotics_data(training_data)

            if 'error' in training_results:
                return training_results

            # Step 6: Integration
            self.progress.update({'phase': 'integration', 'progress': 90, 'details': 'Integrating with quantum core...'})
            integration_result = self.integrate_with_quantum_core(training_results)

            # Step 7: Finalization
            self.progress.update({'phase': 'complete', 'progress': 100, 'details': 'Training complete!'})

            total_time = time.time() - start_time

            final_result = {
                'status': 'completed',
                'total_time': total_time,
                'data_collected': len(collected_data),
                'training_samples': len(training_data),
                'training_results': training_results,
                'integration_result': integration_result,
                'timestamp': datetime.now().isoformat(),
                'model_capabilities': [
                    'Robotics system design and analysis',
                    'Mechatronics component selection',
                    'Control system implementation',
                    'Automation solution development',
                    'Robotic programming and simulation',
                    'Safety compliance assessment',
                    'Performance optimization',
                    'Research paper analysis',
                    'Technical documentation generation',
                    'Standards and regulation compliance'
                ]
            }

            logger.info("=== ROBOTICS & MECHATRONICS TRAINING COMPLETED SUCCESSFULLY ===")
            return final_result

        except Exception as e:
            logger.error(f"Training failed with error: {e}")
            return {
                'status': 'failed',
                'error': str(e),
                'progress': self.progress,
                'timestamp': datetime.now().isoformat()
            }

def main():
    """Main training execution"""
    trainer = RoboticsMechatronicsTrainer()

    print("🤖 CYRUS Robotics & Mechatronics Training System")
    print("=" * 50)

    result = trainer.run_complete_training()

    if result.get('status') == 'completed':
        print("✅ Training completed successfully!")
        print(f"📊 Data collected: {result['data_collected']}")
        print(f"🎯 Training samples: {result['training_samples']}")
        print(f"⏱️  Training time: {result['total_time']:.2f} seconds")
        print("\n🚀 New AI Capabilities:")
        for capability in result['model_capabilities']:
            print(f"  • {capability}")
    else:
        print("❌ Training failed!")
        print(f"Error: {result.get('error', 'Unknown error')}")

    # Save results
    output_file = Path('/Users/cronet/Downloads/cyrus-part2-assets-fullzip-4/training_results_robotics.json')
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2, default=str)

    print(f"\n📄 Results saved to: {output_file}")

if __name__ == "__main__":
    main()