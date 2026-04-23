#!/usr/bin/env python3
"""
CYRUS Advanced Robotics Design & Image Generation Integration System
Complete system for generating designs, images, and technical documentation
Works reliably online and offline with intelligent fallbacks
"""

import json
import os
import sys
import logging
import threading
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configure matplotlib for headless operation
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Import robotics generation systems
from advanced_robotics_design_generator import AdvancedRoboticsDesignGenerator
from advanced_robotics_image_generator import AdvancedRoboticsImageGenerator

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CYRUSRoboticsDesignImageSystem:
    def __init__(self):
        self.workspace_path = Path(__file__).parent

        # Initialize subsystems
        logger.info("Initializing CYRUS Robotics Design & Image Generation System...")
        self.design_generator = AdvancedRoboticsDesignGenerator()
        self.image_generator = AdvancedRoboticsImageGenerator()

        # System configuration
        self.config = self._load_system_config()
        self.cache = self._initialize_cache()

        # Reliability and fallback systems
        self.online_status = self._check_system_connectivity()
        self.fallback_systems = self._initialize_fallback_systems()

        # Performance monitoring
        self.performance_metrics = {
            'total_generations': 0,
            'successful_generations': 0,
            'failed_generations': 0,
            'average_generation_time': 0,
            'cache_hit_rate': 0
        }

        # Thread pool for concurrent generation
        self.executor = ThreadPoolExecutor(max_workers=4)

        logger.info("✅ System initialization complete")

    def _load_system_config(self) -> Dict[str, Any]:
        """Load system configuration"""
        config_file = self.workspace_path / 'robotics_generation_config.json'
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not load config file: {e}")

        # Default configuration
        return {
            'enable_caching': True,
            'max_cache_size': 100,
            'concurrent_generations': 4,
            'timeout_seconds': 300,
            'retry_attempts': 3,
            'quality_presets': {
                'draft': {'dpi': 150, 'detail_level': 'low'},
                'standard': {'dpi': 300, 'detail_level': 'medium'},
                'high': {'dpi': 600, 'detail_level': 'high'}
            },
            'output_formats': ['png', 'svg', 'pdf', 'step', 'stl'],
            'auto_backup': True,
            'performance_monitoring': True
        }

    def _initialize_cache(self) -> Dict[str, Any]:
        """Initialize caching system for generated content"""
        cache_dir = self.workspace_path / 'generation_cache'
        cache_dir.mkdir(exist_ok=True)

        return {
            'cache_dir': cache_dir,
            'index_file': cache_dir / 'cache_index.json',
            'entries': self._load_cache_index(),
            'max_size': self.config.get('max_cache_size', 100)
        }

    def _load_cache_index(self) -> Dict[str, Any]:
        """Load cache index from disk"""
        index_file = self.workspace_path / 'generation_cache' / 'cache_index.json'
        if index_file.exists():
            try:
                with open(index_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not load cache index: {e}")
        return {}

    def _check_system_connectivity(self) -> Dict[str, Any]:
        """Check overall system connectivity and capabilities"""
        status = {
            'internet_access': self._test_internet_connectivity(),
            'design_system_online': self.design_generator.online_mode,
            'image_system_online': self.image_generator.online_mode,
            'local_resources_available': self._check_local_resources(),
            'last_checked': datetime.now().isoformat()
        }

        # Determine overall online status
        status['overall_online'] = (
            status['internet_access'] and
            (status['design_system_online'] or status['image_system_online'])
        )

        return status

    def _test_internet_connectivity(self) -> bool:
        """Test internet connectivity"""
        try:
            import requests
            response = requests.get('https://httpbin.org/status/200', timeout=5)
            return response.status_code == 200
        except:
            return False

    def _check_local_resources(self) -> bool:
        """Check availability of local resources"""
        return (
            self.design_generator.offline_fallbacks['matplotlib_available'] or
            self.design_generator.offline_fallbacks['pillow_available'] or
            self.image_generator.offline_fallbacks['matplotlib_available'] or
            self.image_generator.offline_fallbacks['pillow_available']
        )

    def _initialize_fallback_systems(self) -> Dict[str, Any]:
        """Initialize fallback systems for reliability"""
        return {
            'basic_shapes': self._initialize_basic_shapes_fallback(),
            'text_based_generation': self._initialize_text_fallback(),
            'template_system': self._initialize_template_fallback(),
            'error_recovery': self._initialize_error_recovery()
        }

    def _initialize_basic_shapes_fallback(self) -> Dict[str, Any]:
        """Initialize basic shapes fallback for when advanced libraries fail"""
        return {
            'enabled': True,
            'supported_shapes': ['rectangle', 'circle', 'line', 'text'],
            'colors': ['black', 'white', 'gray', 'red', 'blue', 'green']
        }

    def _initialize_text_fallback(self) -> Dict[str, Any]:
        """Initialize text-based generation fallback"""
        return {
            'enabled': True,
            'ascii_art': True,
            'text_diagrams': True,
            'markdown_output': True
        }

    def _initialize_template_fallback(self) -> Dict[str, Any]:
        """Initialize template-based fallback system"""
        return {
            'enabled': True,
            'templates_available': len(self.design_generator.design_templates),
            'image_templates': len(self.image_generator.image_templates)
        }

    def _initialize_error_recovery(self) -> Dict[str, Any]:
        """Initialize error recovery mechanisms"""
        return {
            'retry_enabled': True,
            'max_retries': self.config.get('retry_attempts', 3),
            'graceful_degradation': True,
            'partial_results': True,
            'recovery_logging': True
        }

    def generate_comprehensive_robotics_package(self, component_type: str,
                                              specifications: Dict[str, Any],
                                              quality: str = 'standard',
                                              include_images: bool = True,
                                              include_designs: bool = True,
                                              include_documentation: bool = True) -> Dict[str, Any]:
        """Generate comprehensive robotics package with designs, images, and documentation"""
        start_time = time.time()
        logger.info(f"Generating comprehensive package for {component_type}")

        package_id = f"{component_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        package = {
            'package_id': package_id,
            'component_type': component_type,
            'specifications': specifications,
            'quality': quality,
            'timestamp': datetime.now().isoformat(),
            'generated_content': {},
            'status': 'generating',
            'performance_metrics': {}
        }

        try:
            # Check cache first
            cached_result = self._check_cache(component_type, specifications, quality)
            if cached_result and self.config.get('enable_caching', True):
                logger.info("Using cached result")
                package.update(cached_result)
                package['status'] = 'completed_from_cache'
                return package

            # Generate content concurrently
            futures = []

            if include_designs:
                futures.append(self.executor.submit(
                    self._generate_designs_with_fallback,
                    component_type, specifications, quality
                ))

            if include_images:
                futures.append(self.executor.submit(
                    self._generate_images_with_fallback,
                    component_type, specifications, quality
                ))

            if include_documentation:
                futures.append(self.executor.submit(
                    self._generate_documentation_with_fallback,
                    component_type, specifications
                ))

            # Collect results
            for future in as_completed(futures):
                try:
                    result = future.result(timeout=self.config.get('timeout_seconds', 300))
                    package['generated_content'].update(result)
                except Exception as e:
                    logger.error(f"Generation task failed: {e}")
                    package['generated_content']['errors'] = package['generated_content'].get('errors', [])
                    package['generated_content']['errors'].append(str(e))

            # Validate and finalize package
            self._validate_package(package)
            package['status'] = 'completed'

            # Cache the result
            if self.config.get('enable_caching', True):
                self._cache_result(package)

            # Update performance metrics
            generation_time = time.time() - start_time
            self._update_performance_metrics(generation_time, package['status'] == 'completed')

            package['performance_metrics'] = {
                'generation_time_seconds': generation_time,
                'total_files_generated': self._count_generated_files(package),
                'cache_used': cached_result is not None
            }

        except Exception as e:
            logger.error(f"Comprehensive package generation failed: {e}")
            package['status'] = 'failed'
            package['error'] = str(e)

            # Attempt error recovery
            recovery_result = self._attempt_error_recovery(component_type, specifications, quality)
            if recovery_result:
                package['recovered_content'] = recovery_result
                package['status'] = 'partially_recovered'

        return package

    def _generate_designs_with_fallback(self, component_type: str, specifications: Dict[str, Any],
                                      quality: str) -> Dict[str, Any]:
        """Generate designs with fallback mechanisms"""
        try:
            # Primary generation
            design_package = self.design_generator.generate_comprehensive_design_package(
                component_type, specifications
            )

            if design_package.get('status') == 'completed':
                return {'designs': design_package}

        except Exception as e:
            logger.warning(f"Primary design generation failed: {e}")

        # Fallback generation
        logger.info("Attempting fallback design generation")
        try:
            fallback_design = self._generate_fallback_design(component_type, specifications, quality)
            return {'designs': fallback_design, 'fallback_used': True}
        except Exception as e2:
            logger.error(f"Fallback design generation also failed: {e2}")
            return {'designs': {'error': f'Both primary and fallback design generation failed: {e2}'}}

    def _generate_images_with_fallback(self, component_type: str, specifications: Dict[str, Any],
                                     quality: str) -> Dict[str, Any]:
        """Generate images with fallback mechanisms"""
        images = {}

        try:
            # Generate technical diagram
            diagram = self.image_generator.generate_technical_diagram(
                component_type, specifications, 'technical'
            )
            if diagram.get('generated_images'):
                images['technical_diagram'] = diagram

        except Exception as e:
            logger.warning(f"Technical diagram generation failed: {e}")

        try:
            # Generate system architecture
            architecture = self.image_generator.generate_system_architecture_diagram(
                f'{component_type}_system',
                ['Controller', 'Sensors', 'Actuators', 'Power', 'Communication'],
                [('Controller', 'Sensors'), ('Controller', 'Actuators'), ('Power', 'Controller')]
            )
            if architecture.get('generated_images'):
                images['system_architecture'] = architecture

        except Exception as e:
            logger.warning(f"Architecture diagram generation failed: {e}")

        # Fallback if no images generated
        if not images:
            logger.info("Attempting fallback image generation")
            try:
                fallback_images = self._generate_fallback_images(component_type, specifications, quality)
                images['fallback_images'] = fallback_images
            except Exception as e2:
                logger.error(f"Fallback image generation failed: {e2}")
                images['error'] = f'Both primary and fallback image generation failed: {e2}'

        return {'images': images}

    def _generate_documentation_with_fallback(self, component_type: str, specifications: Dict[str, Any]) -> Dict[str, Any]:
        """Generate documentation with fallback mechanisms"""
        try:
            # Primary documentation generation
            documentation = self.design_generator.generate_technical_documentation(
                component_type, specifications
            )
            return {'documentation': documentation}

        except Exception as e:
            logger.warning(f"Primary documentation generation failed: {e}")

        # Fallback documentation
        logger.info("Attempting fallback documentation generation")
        try:
            fallback_docs = self._generate_fallback_documentation(component_type, specifications)
            return {'documentation': fallback_docs, 'fallback_used': True}
        except Exception as e2:
            logger.error(f"Fallback documentation generation failed: {e2}")
            return {'documentation': {'error': f'Both primary and fallback documentation generation failed: {e2}'}}

    def _generate_fallback_design(self, component_type: str, specifications: Dict[str, Any],
                                quality: str) -> Dict[str, Any]:
        """Generate basic fallback design when advanced generation fails"""
        fallback_design = {
            'component_type': component_type,
            'specifications': specifications,
            'quality': quality,
            'timestamp': datetime.now().isoformat(),
            'fallback_method': 'basic_template',
            'design_files': []
        }

        # Generate basic text-based design specification
        design_spec = f"""
# {component_type.replace('_', ' ').title()} Design Specification

## Component Overview
- Type: {component_type}
- Quality Level: {quality}

## Specifications
{chr(10).join(f"- {key}: {value}" for key, value in specifications.items())}

## Basic Design Template
This is a fallback design specification generated when advanced CAD tools are unavailable.

## Implementation Notes
- Use standard robotics components
- Follow safety guidelines
- Test thoroughly before deployment

Generated by CYRUS Fallback System
"""

        # Save as text file
        filename = f'{component_type}_fallback_design_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt'
        filepath = self.design_generator.designs_path / filename

        with open(filepath, 'w') as f:
            f.write(design_spec)

        fallback_design['design_files'].append({
            'type': 'text_specification',
            'filename': filename,
            'filepath': str(filepath),
            'description': f'Fallback design specification for {component_type}',
            'generated': True,
            'method': 'fallback_text'
        })

        return fallback_design

    def _generate_fallback_images(self, component_type: str, specifications: Dict[str, Any],
                                quality: str) -> List[Dict[str, Any]]:
        """Generate basic fallback images when advanced generation fails"""
        images = []

        # Generate ASCII art diagram
        ascii_diagram = self._generate_ascii_diagram(component_type, specifications)
        if ascii_diagram:
            images.append(ascii_diagram)

        # Generate simple block diagram as text
        block_diagram = self._generate_text_block_diagram(component_type, specifications)
        if block_diagram:
            images.append(block_diagram)

        return images

    def _generate_ascii_diagram(self, component_type: str, specifications: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Generate ASCII art diagram as fallback"""
        try:
            if component_type == 'robotic_arm':
                ascii_art = """
                Robotic Arm ASCII Diagram
                =========================

                      [Gripper]
                         |
                      [Wrist]
                         |
                      [Forearm]
                         |
                      [Elbow]
                         |
                      [Upper Arm]
                         |
                      [Shoulder]
                         |
                      [Base Platform]
                """
            elif component_type == 'mobile_robot':
                ascii_art = """
                Mobile Robot ASCII Diagram
                ==========================

                [Sensor Array]
                +-----------+
                |           |
                |  Chassis  |
                |           |
                +-----------+
                [Left]   [Right]
                Wheel     Wheel
                """
            else:
                ascii_art = f"""
                {component_type.replace('_', ' ').title()} ASCII Diagram
                {'=' * (len(component_type) + 15)}

                [Component Block]
                +---------------+
                | {component_type.replace('_', ' ')[:10]:^10} |
                +---------------+
                """

            filename = f'{component_type}_ascii_diagram_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt'
            filepath = self.image_generator.images_path / filename

            with open(filepath, 'w') as f:
                f.write(ascii_art)

            return {
                'type': 'ascii_diagram',
                'filename': filename,
                'filepath': str(filepath),
                'description': f'ASCII art diagram for {component_type}',
                'generated': True,
                'method': 'fallback_ascii'
            }

        except Exception as e:
            logger.error(f"ASCII diagram generation failed: {e}")
            return None

    def _generate_text_block_diagram(self, component_type: str, specifications: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Generate text-based block diagram"""
        try:
            block_diagram = f"""
# {component_type.replace('_', ' ').title()} Block Diagram

## Main Components
- Input/Control Block
- Processing Unit
- Output/Actuation Block
- Power Supply
- Safety Systems

## Data Flow
Input → Processing → Output
      ↓
   Safety Monitoring

## Specifications Summary
{chr(10).join(f"- {key}: {value}" for key, value in specifications.items())}

Generated by CYRUS Fallback System
"""

            filename = f'{component_type}_block_diagram_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt'
            filepath = self.image_generator.images_path / filename

            with open(filepath, 'w') as f:
                f.write(block_diagram)

            return {
                'type': 'text_block_diagram',
                'filename': filename,
                'filepath': str(filepath),
                'description': f'Text block diagram for {component_type}',
                'generated': True,
                'method': 'fallback_text'
            }

        except Exception as e:
            logger.error(f"Text block diagram generation failed: {e}")
            return None

    def _generate_fallback_documentation(self, component_type: str, specifications: Dict[str, Any]) -> Dict[str, Any]:
        """Generate basic fallback documentation"""
        documentation = {
            'component_type': component_type,
            'specifications': specifications,
            'timestamp': datetime.now().isoformat(),
            'fallback_method': 'basic_documentation',
            'sections': {
                'overview': f'Basic documentation for {component_type}',
                'specifications': specifications,
                'implementation_notes': [
                    'Follow standard robotics practices',
                    'Ensure proper safety measures',
                    'Test all functionality thoroughly',
                    'Document any modifications'
                ],
                'safety_considerations': [
                    'Follow ISO 10218 safety standards',
                    'Implement emergency stop functionality',
                    'Use appropriate guarding',
                    'Train operators properly'
                ]
            }
        }

        # Save documentation
        filename = f'{component_type}_fallback_documentation_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        filepath = self.design_generator.designs_path / filename

        with open(filepath, 'w') as f:
            json.dump(documentation, f, indent=2)

        documentation['documentation_file'] = str(filepath)
        return documentation

    def _check_cache(self, component_type: str, specifications: Dict[str, Any], quality: str) -> Optional[Dict[str, Any]]:
        """Check if result exists in cache"""
        if not self.config.get('enable_caching', True):
            return None

        cache_key = self._generate_cache_key(component_type, specifications, quality)

        if cache_key in self.cache['entries']:
            cache_entry = self.cache['entries'][cache_key]
            cache_file = self.cache['cache_dir'] / cache_entry['filename']

            if cache_file.exists():
                try:
                    with open(cache_file, 'r') as f:
                        return json.load(f)
                except Exception as e:
                    logger.warning(f"Could not load cached result: {e}")

        return None

    def _generate_cache_key(self, component_type: str, specifications: Dict[str, Any], quality: str) -> str:
        """Generate cache key for given parameters"""
        spec_str = json.dumps(specifications, sort_keys=True)
        return f"{component_type}_{quality}_{hash(spec_str)}"

    def _cache_result(self, package: Dict[str, Any]):
        """Cache generation result"""
        if not self.config.get('enable_caching', True):
            return

        cache_key = self._generate_cache_key(
            package['component_type'],
            package['specifications'],
            package['quality']
        )

        # Save package to cache directory
        cache_filename = f"cache_{package['package_id']}.json"
        cache_file = self.cache['cache_dir'] / cache_filename

        try:
            with open(cache_file, 'w') as f:
                json.dump(package, f, indent=2)

            # Update cache index
            self.cache['entries'][cache_key] = {
                'filename': cache_filename,
                'timestamp': package['timestamp'],
                'component_type': package['component_type']
            }

            # Clean up old cache entries if over limit
            self._cleanup_cache()

            # Save cache index
            with open(self.cache['index_file'], 'w') as f:
                json.dump(self.cache['entries'], f, indent=2)

        except Exception as e:
            logger.error(f"Failed to cache result: {e}")

    def _cleanup_cache(self):
        """Clean up old cache entries"""
        if len(self.cache['entries']) <= self.cache['max_size']:
            return

        # Remove oldest entries
        entries_by_time = sorted(
            self.cache['entries'].items(),
            key=lambda x: x[1]['timestamp']
        )

        entries_to_remove = entries_by_time[:len(entries_by_time) - self.cache['max_size']]

        for cache_key, entry in entries_to_remove:
            cache_file = self.cache['cache_dir'] / entry['filename']
            try:
                if cache_file.exists():
                    cache_file.unlink()
                del self.cache['entries'][cache_key]
            except Exception as e:
                logger.warning(f"Failed to remove cache entry: {e}")

    def _validate_package(self, package: Dict[str, Any]):
        """Validate generated package"""
        validation_results = {
            'has_designs': bool(package.get('generated_content', {}).get('designs')),
            'has_images': bool(package.get('generated_content', {}).get('images')),
            'has_documentation': bool(package.get('generated_content', {}).get('documentation')),
            'total_files': self._count_generated_files(package),
            'validation_passed': True
        }

        # Check for errors
        if 'errors' in package.get('generated_content', {}):
            validation_results['has_errors'] = True
            validation_results['validation_passed'] = False

        package['validation'] = validation_results

    def _count_generated_files(self, package: Dict[str, Any]) -> int:
        """Count total generated files in package"""
        count = 0

        generated_content = package.get('generated_content', {})

        # Count design files
        designs = generated_content.get('designs', {})
        if isinstance(designs, dict) and 'design_files' in designs:
            count += len(designs['design_files'])
        elif isinstance(designs, dict) and 'generated_files' in designs:
            count += len(designs['generated_files'])

        # Count image files
        images = generated_content.get('images', {})
        for image_set in images.values():
            if isinstance(image_set, dict) and 'generated_images' in image_set:
                count += len(image_set['generated_images'])

        return count

    def _attempt_error_recovery(self, component_type: str, specifications: Dict[str, Any],
                              quality: str) -> Optional[Dict[str, Any]]:
        """Attempt error recovery for failed generations"""
        logger.info("Attempting error recovery...")

        try:
            # Generate minimal fallback content
            recovery_package = {
                'component_type': component_type,
                'specifications': specifications,
                'quality': quality,
                'timestamp': datetime.now().isoformat(),
                'recovery_method': 'minimal_fallback',
                'content': {
                    'basic_specification': self._generate_basic_specification(component_type, specifications),
                    'safety_notes': self._generate_basic_safety_notes(component_type),
                    'implementation_checklist': self._generate_implementation_checklist(component_type)
                }
            }

            return recovery_package

        except Exception as e:
            logger.error(f"Error recovery failed: {e}")
            return None

    def _generate_basic_specification(self, component_type: str, specifications: Dict[str, Any]) -> str:
        """Generate basic specification text"""
        return f"""
Basic Specification for {component_type}

Component Type: {component_type}
Generated: {datetime.now().isoformat()}

Specifications:
{chr(10).join(f"- {k}: {v}" for k, v in specifications.items())}

This is a minimal specification generated during error recovery.
Please regenerate with full system when available.
"""

    def _generate_basic_safety_notes(self, component_type: str) -> List[str]:
        """Generate basic safety notes"""
        return [
            "Follow all applicable safety standards",
            "Implement emergency stop functionality",
            "Use appropriate personal protective equipment",
            "Test safety systems regularly",
            "Document all safety procedures"
        ]

    def _generate_implementation_checklist(self, component_type: str) -> List[str]:
        """Generate implementation checklist"""
        return [
            "Verify all specifications are met",
            "Test basic functionality",
            "Check safety systems",
            "Document implementation",
            "Plan maintenance procedures"
        ]

    def _update_performance_metrics(self, generation_time: float, success: bool):
        """Update performance metrics"""
        self.performance_metrics['total_generations'] += 1

        if success:
            self.performance_metrics['successful_generations'] += 1
        else:
            self.performance_metrics['failed_generations'] += 1

        # Update average generation time
        current_avg = self.performance_metrics['average_generation_time']
        total_generations = self.performance_metrics['total_generations']
        self.performance_metrics['average_generation_time'] = (
            (current_avg * (total_generations - 1)) + generation_time
        ) / total_generations

    def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        return {
            'online_status': self.online_status,
            'design_system': self.design_generator.get_system_status(),
            'image_system': self.image_generator.get_system_status(),
            'cache_status': {
                'enabled': self.config.get('enable_caching', True),
                'entries': len(self.cache['entries']),
                'max_size': self.cache['max_size']
            },
            'performance_metrics': self.performance_metrics,
            'fallback_systems': {
                'basic_shapes': self.fallback_systems['basic_shapes']['enabled'],
                'text_generation': self.fallback_systems['text_based_generation']['enabled'],
                'template_system': self.fallback_systems['template_system']['enabled'],
                'error_recovery': self.fallback_systems['error_recovery']['retry_enabled']
            },
            'overall_health': self._assess_system_health()
        }

    def _assess_system_health(self) -> str:
        """Assess overall system health"""
        health_score = 0
        max_score = 5

        # Online connectivity (1 point)
        if self.online_status['overall_online']:
            health_score += 1

        # Local resources (1 point)
        if self.online_status['local_resources_available']:
            health_score += 1

        # Cache system (1 point)
        if self.config.get('enable_caching', True) and len(self.cache['entries']) > 0:
            health_score += 1

        # Performance (1 point)
        success_rate = (
            self.performance_metrics['successful_generations'] /
            max(1, self.performance_metrics['total_generations'])
        )
        if success_rate > 0.8:
            health_score += 1

        # Fallback systems (1 point)
        fallback_enabled = all(
            system['enabled'] for system in self.fallback_systems.values()
            if 'enabled' in system
        )
        if fallback_enabled:
            health_score += 1

        # Determine health status
        if health_score >= 4:
            return 'excellent'
        elif health_score >= 3:
            return 'good'
        elif health_score >= 2:
            return 'fair'
        else:
            return 'needs_attention'

    def cleanup_resources(self):
        """Clean up system resources"""
        logger.info("Cleaning up system resources...")

        # Shutdown thread pool
        self.executor.shutdown(wait=True)

        # Save final cache index
        try:
            with open(self.cache['index_file'], 'w') as f:
                json.dump(self.cache['entries'], f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save final cache index: {e}")

        logger.info("✅ Resource cleanup complete")

if __name__ == "__main__":
    # Example usage
    system = CYRUSRoboticsDesignImageSystem()

    print("🤖 CYRUS Advanced Robotics Design & Image Generation System")
    print("=" * 70)
    print("System Status:")
    status = system.get_system_status()
    for key, value in status.items():
        if isinstance(value, dict):
            print(f"  {key}:")
            for sub_key, sub_value in value.items():
                print(f"    {sub_key}: {sub_value}")
        else:
            print(f"  {key}: {value}")

    print("\n🚀 Generating comprehensive robotic arm package...")
    package = system.generate_comprehensive_robotics_package(
        'robotic_arm',
        {
            'payload_capacity': '10kg',
            'reach_radius': '1500mm',
            'accuracy': '±0.2mm',
            'degrees_of_freedom': 6
        },
        quality='standard',
        include_images=True,
        include_designs=True,
        include_documentation=True
    )

    print(f"✅ Package generated: {package.get('status', 'unknown')}")
    print(f"📁 Total files generated: {package.get('performance_metrics', {}).get('total_files_generated', 0)}")
    print(f"⏱️ Generation time: {package.get('performance_metrics', {}).get('generation_time_seconds', 0):.2f} seconds")
    if 'generated_content' in package:
        content = package['generated_content']
        if 'designs' in content:
            print(f"   • Designs: {len(content['designs'].get('generated_files', []))} files")
        if 'images' in content:
            image_count = sum(len(img_set.get('generated_images', []))
                            for img_set in content['images'].values())
            print(f"   • Images: {image_count} files")
        if 'documentation' in content:
            print("   • Documentation: Generated")
    print("\n🎊 CYRUS Robotics Generation System Ready!")
    print("Reliable design and image generation for all robotics domains")
    print("Works seamlessly online and offline with intelligent fallbacks")

    # Cleanup
    system.cleanup_resources()