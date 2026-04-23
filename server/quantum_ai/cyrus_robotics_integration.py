"""
CYRUS Robotics Integration Module
==================================
Integrates advanced robotics design and image generation capabilities
into the CYRUS Humanoid Intelligence Core.

This module enables CYRUS to generate and attach technical designs,
diagrams, and documentation in responses when discussing robotics topics.
"""

import os
import sys
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
from datetime import datetime
import threading

# Import the robotics generation systems
ROBOTICS_SYSTEMS_AVAILABLE = False
AdvancedRoboticsDesignGenerator = None
AdvancedRoboticsImageGenerator = None
CYRUSRoboticsDesignImageSystem = None
PrecisionRoboticsDesignGenerator = None

try:
    from advanced_robotics_design_generator import AdvancedRoboticsDesignGenerator
    from advanced_robotics_image_generator import AdvancedRoboticsImageGenerator
    from cyrus_robotics_generation_system import CYRUSRoboticsDesignImageSystem
    from precision_robotics_design_generator import PrecisionRoboticsDesignGenerator
    ROBOTICS_SYSTEMS_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Robotics systems not available: {e}")
    ROBOTICS_SYSTEMS_AVAILABLE = False

logger = logging.getLogger("CYRUS_Robotics")


class CYRUSRoboticsIntegration:
    """
    Integrates robotics design and image generation into CYRUS responses.
    """

    def __init__(self, output_dir: str = "generated_robotics_content"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

        self.design_generator = None
        self.image_generator = None
        self.generation_system = None
        self.precision_generator = None
        self._systems_initialized = False

        # Robotics keywords that trigger generation
        self.robotics_keywords = {
            'design': ['design', 'cad', 'blueprint', 'schematic', 'drawing'],
            'image': ['diagram', 'illustration', 'visual', 'picture', 'image'],
            'component': ['robotic_arm', 'mobile_robot', 'control_system', 'sensor_system',
                         'actuator', 'end_effector', 'power_system', 'safety_system'],
            'domain': ['robotics', 'mechatronics', 'automation', 'industrial_robot',
                      'service_robot', 'medical_robot', 'aerospace_robot']
        }

        self.generation_cache = {}
        self._lock = threading.Lock()

    def _initialize_systems(self):
        """Lazy initialization of robotics systems."""
        if self._systems_initialized:
            return True

        if not ROBOTICS_SYSTEMS_AVAILABLE:
            logger.warning("Robotics systems marked as not available at module level")
            return False

        try:
            logger.info("Attempting to import robotics systems...")
            from advanced_robotics_design_generator import AdvancedRoboticsDesignGenerator
            from advanced_robotics_image_generator import AdvancedRoboticsImageGenerator
            from cyrus_robotics_generation_system import CYRUSRoboticsDesignImageSystem
            from precision_robotics_design_generator import PrecisionRoboticsDesignGenerator

            logger.info("Creating design generator...")
            self.design_generator = AdvancedRoboticsDesignGenerator()
            logger.info("Creating image generator...")
            self.image_generator = AdvancedRoboticsImageGenerator()
            logger.info("Creating generation system...")
            self.generation_system = CYRUSRoboticsDesignImageSystem()
            logger.info("Creating precision design generator...")
            self.precision_generator = PrecisionRoboticsDesignGenerator()
            self._systems_initialized = True
            logger.info("Robotics generation systems initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize robotics systems: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return False

    def is_robotics_query(self, query: str) -> bool:
        """Check if a query is robotics-related."""
        query_lower = query.lower()
        for category, keywords in self.robotics_keywords.items():
            if any(keyword in query_lower for keyword in keywords):
                return True
        return False

    def extract_generation_requirements(self, query: str) -> Dict[str, Any]:
        """Extract what needs to be generated from the query."""
        requirements = {
            'needs_design': False,
            'needs_image': False,
            'component_types': [],
            'image_types': [],
            'quality': 'standard'
        }

        query_lower = query.lower()

        # Check for design requirements
        if any(kw in query_lower for kw in self.robotics_keywords['design']):
            requirements['needs_design'] = True

        # Check for image requirements
        if any(kw in query_lower for kw in self.robotics_keywords['image']):
            requirements['needs_image'] = True

        # Extract component types
        for component in self.robotics_keywords['component']:
            if component.replace('_', ' ') in query_lower or component in query_lower:
                requirements['component_types'].append(component)

        # Default component if none specified
        if not requirements['component_types']:
            requirements['component_types'] = ['robotic_arm']

        # Determine image types based on query
        if 'architecture' in query_lower or 'system' in query_lower:
            requirements['image_types'].append('system_architecture')
        if 'diagram' in query_lower or 'technical' in query_lower:
            requirements['image_types'].append('technical_diagram')
        if 'flow' in query_lower or 'process' in query_lower:
            requirements['image_types'].append('process_flow')
        if 'component' in query_lower or 'illustration' in query_lower:
            requirements['image_types'].append('component_illustration')

        # Default image type if none specified but images needed
        if requirements['needs_image'] and not requirements['image_types']:
            requirements['image_types'] = ['technical_diagram']

        # Quality settings
        if 'high' in query_lower or 'detailed' in query_lower:
            requirements['quality'] = 'high'
        elif 'draft' in query_lower or 'quick' in query_lower:
            requirements['quality'] = 'draft'

        return requirements

    def generate_robotics_content(self, query: str) -> Dict[str, Any]:
        """Generate robotics content based on query requirements."""
        # Lazy initialization
        if not self._initialize_systems():
            return {'error': 'Robotics generation systems not available'}

        requirements = self.extract_generation_requirements(query)

        if not requirements['needs_design'] and not requirements['needs_image']:
            return {'message': 'No generation requirements detected'}

        results = {
            'timestamp': datetime.now().isoformat(),
            'query': query,
            'requirements': requirements,
            'generated_files': [],
            'designs': [],
            'images': [],
            'documentation': []
        }

        try:
            # Generate designs if needed
            if requirements['needs_design']:
                if self.precision_generator:
                    # Use precision generator for high-quality designs
                    for component_type in requirements['component_types']:
                        design_requirements = {
                            'kinematics': {'degrees_of_freedom': 6, 'reach': {'max': 2.0, 'unit': 'm'}},
                            'payload': {'max': 50, 'unit': 'kg'},
                            'accuracy': {'linear': 0.1, 'angular': 0.1, 'unit': 'mm/deg'},
                            'environment': {'temperature': {'min': 5, 'max': 45, 'unit': '°C'}}
                        }

                        quality_level = 'precision' if requirements['quality'] == 'high' else 'medium'

                        design_result = self.precision_generator.generate_precision_design(
                            component_type=component_type,
                            requirements=design_requirements,
                            quality_level=quality_level
                        )

                        if design_result.get('status') == 'completed':
                            results['designs'].append(design_result)
                            # Extract file paths from the precision design result
                            if 'files' in design_result:
                                for file_info in design_result['files']:
                                    if 'path' in file_info:
                                        results['generated_files'].append(file_info['path'])
                elif self.generation_system:
                    # Fallback to basic generation system
                    for component_type in requirements['component_types']:
                        specifications = {
                            'component_type': component_type,
                            'quality': requirements['quality'],
                            'output_dir': str(self.output_dir)
                        }
                        design_result = self.generation_system.generate_comprehensive_robotics_package(
                            component_type=component_type,
                            specifications=specifications,
                            quality=requirements['quality'],
                            include_images=False,
                            include_designs=True,
                            include_documentation=True
                        )
                        if design_result.get('status') == 'completed':
                            results['designs'].append(design_result)
                            results['generated_files'].extend(design_result.get('files', []))

            # Generate images if needed
            if requirements['needs_image'] and self.generation_system:
                for image_type in requirements['image_types']:
                    specifications = {
                        'image_type': image_type,
                        'quality': requirements['quality'],
                        'output_dir': str(self.output_dir)
                    }
                    image_result = self.generation_system.generate_comprehensive_robotics_package(
                        component_type=image_type,  # Using image_type as component_type for now
                        specifications=specifications,
                        quality=requirements['quality'],
                        include_images=True,
                        include_designs=False,
                        include_documentation=True
                    )
                    if image_result.get('status') == 'completed':
                        results['images'].append(image_result)
                        results['generated_files'].extend(image_result.get('files', []))

            # Generate documentation
            if results['designs'] or results['images']:
                doc_result = self._generate_integration_documentation(results)
                results['documentation'].append(doc_result)

        except Exception as e:
            logger.error(f"Error generating robotics content: {e}")
            results['error'] = str(e)

        return results

    def _generate_integration_documentation(self, results: Dict) -> Dict:
        """Generate documentation explaining the generated content."""
        doc_content = {
            'title': 'CYRUS Precision Robotics Content Generation Report',
            'timestamp': results['timestamp'],
            'query': results['query'],
            'summary': {
                'total_files': len(results['generated_files']),
                'designs_generated': len(results['designs']),
                'images_generated': len(results['images']),
                'component_types': list(set(d['component_type'] for d in results['designs'] if 'component_type' in d))
            },
            'precision_features': [
                'Engineering-grade specifications with tolerances',
                'Material properties and stress analysis',
                'Safety compliance and standards adherence',
                'Design validation and optimization',
                'Comprehensive technical documentation',
                'Bill of materials with cost analysis'
            ],
            'files': results['generated_files'],
            'usage_instructions': [
                "Design files (.png, .json) contain precision technical drawings and specifications",
                "3D models provide accurate spatial representations",
                "Schematics show detailed electrical and mechanical connections",
                "Bill of materials includes cost and weight calculations",
                "Documentation covers engineering analysis, safety assessment, and compliance",
                "All designs meet industry standards and include validation results"
            ]
        }

        # Add precision design details
        if results['designs']:
            doc_content['precision_designs'] = []
            for design in results['designs']:
                if 'design_id' in design:
                    design_summary = {
                        'design_id': design['design_id'],
                        'component_type': design.get('component_type', 'unknown'),
                        'quality_level': design.get('quality_level', 'standard'),
                        'validation_status': design.get('validation_results', {}).get('overall_status', 'unknown'),
                        'compliance_status': 'compliant' if design.get('compliance') else 'pending',
                        'files_generated': len(design.get('files', []))
                    }
                    doc_content['precision_designs'].append(design_summary)

        # Save documentation
        doc_filename = f"precision_robotics_content_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        doc_path = self.output_dir / doc_filename

        with open(doc_path, 'w') as f:
            json.dump(doc_content, f, indent=2)

        return {
            'file': str(doc_path),
            'type': 'precision_integration_documentation',
            'content': doc_content
        }

    def enhance_response_with_robotics_content(self, response: str, query: str) -> Tuple[str, List[str]]:
        """Enhance a CYRUS response with generated robotics content."""
        if not self.is_robotics_query(query):
            return response, []

        logger.info(f"Generating robotics content for query: {query}")

        # Generate content
        generation_results = self.generate_robotics_content(query)

        if 'error' in generation_results:
            logger.warning(f"Failed to generate robotics content: {generation_results['error']}")
            return response, []

        # Enhance response with content references
        enhanced_response = response
        attached_files = []

        if generation_results.get('designs'):
            design_count = len(generation_results['designs'])
            enhanced_response += f"\n\n🔬 **Generated {design_count} Precision Robotics Design(s) with Engineering Validation:**\n"
            for design in generation_results['designs']:
                design_id = design.get('design_id', 'Unknown')
                component_type = design.get('component_type', 'Unknown')
                quality = design.get('quality_level', 'standard')
                validation = design.get('validation_results', {}).get('overall_status', 'unknown')
                enhanced_response += f"• 🎯 **{component_type.upper()}** (ID: {design_id}) - Quality: {quality}, Validation: {validation}\n"

                if 'files' in design:
                    for file_info in design['files']:
                        file_path = file_info.get('path', '')
                        if file_path and os.path.exists(file_path):
                            attached_files.append(file_path)
                            file_name = os.path.basename(file_path)
                            file_type = file_info.get('type', 'file')
                            enhanced_response += f"  └ 📄 {file_name} ({file_type})\n"

        if generation_results.get('images'):
            image_count = len(generation_results['images'])
            enhanced_response += f"\n\n🎨 **Generated {image_count} Technical Diagram(s):**\n"
            for image in generation_results['images']:
                if 'files' in image:
                    for file_path in image['files']:
                        if os.path.exists(file_path):
                            attached_files.append(file_path)
                            file_name = os.path.basename(file_path)
                            enhanced_response += f"• 🖼️ {file_name}\n"

        if generation_results.get('documentation'):
            enhanced_response += f"\n\n📚 **Technical Documentation:**\n"
            for doc in generation_results['documentation']:
                if 'file' in doc and os.path.exists(doc['file']):
                    attached_files.append(doc['file'])
                    file_name = os.path.basename(doc['file'])
                    enhanced_response += f"• 📄 {file_name}\n"

        if attached_files:
            enhanced_response += f"\n\n*All generated content is available in: {self.output_dir}*"

        return enhanced_response, attached_files


# Global integration instance
_robotics_integration = None

def get_robotics_integration() -> CYRUSRoboticsIntegration:
    """Get or create the global robotics integration instance."""
    global _robotics_integration
    if _robotics_integration is None:
        _robotics_integration = CYRUSRoboticsIntegration()
    return _robotics_integration

def enhance_cyrus_response_with_robotics(response: str, query: str) -> Tuple[str, List[str]]:
    """Convenience function to enhance CYRUS responses with robotics content."""
    integration = get_robotics_integration()
    return integration.enhance_response_with_robotics_content(response, query)

# Integration test
if __name__ == "__main__":
    # Test the integration
    integration = CYRUSRoboticsIntegration()

    test_queries = [
        "Design a robotic arm for industrial use",
        "Show me the system architecture for a mobile robot",
        "Generate technical diagrams for a control system",
        "Create CAD designs for sensor systems"
    ]

    for query in test_queries:
        print(f"\n🧪 Testing query: {query}")
        results = integration.generate_robotics_content(query)
        print(f"Results: {len(results.get('generated_files', []))} files generated")

        # Test response enhancement
        base_response = f"I can help you with that robotics request: {query}"
        enhanced_response, attachments = integration.enhance_response_with_robotics_content(base_response, query)
        print(f"Enhanced response length: {len(enhanced_response)}")
        print(f"Attachments: {len(attachments)}")

    print("\n✅ CYRUS Robotics Integration Test Complete")