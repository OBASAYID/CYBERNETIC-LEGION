#!/usr/bin/env python3
"""
Test script for Precision Robotics Design Generator
"""

from precision_robotics_design_generator import PrecisionRoboticsDesignGenerator
import json

def test_precision_generator():
    print("🧪 Testing Precision Robotics Design Generator...")

    # Create precision generator
    try:
        generator = PrecisionRoboticsDesignGenerator()
        print("✅ Generator created successfully")
    except Exception as e:
        print(f"❌ Failed to create generator: {e}")
        return

    # Test design generation
    requirements = {
        'kinematics': {'degrees_of_freedom': 6, 'reach': {'max': 2.0, 'unit': 'm'}},
        'payload': {'max': 50, 'unit': 'kg'},
        'accuracy': {'linear': 0.1, 'angular': 0.1, 'unit': 'mm/deg'},
        'environment': {'temperature': {'min': 5, 'max': 45, 'unit': '°C'}}
    }

    print("🎯 Generating precision robotic arm design...")
    try:
        design = generator.generate_precision_design(
            component_type='robotic_arm',
            requirements=requirements,
            quality_level='precision'
        )

        print(f"📊 Design Status: {design.get('status')}")
        print(f"🆔 Design ID: {design.get('design_id')}")
        print(f"📁 Files Generated: {len(design.get('files', []))}")

        # Print validation results
        validation = design.get('validation_results', {})
        print(f"✅ Overall Validation: {validation.get('overall_status', 'unknown')}")

        # Print some key specifications
        specs = design.get('specifications', {})
        kinematics = specs.get('kinematics', {})
        print(f"🔧 DOF: {kinematics.get('degrees_of_freedom')}")
        print(f"⚖️ Payload: {specs.get('dynamics', {}).get('payload_capacity', {}).get('max')} kg")

        # Save test results
        with open('precision_test_results.json', 'w') as f:
            json.dump(design, f, indent=2, default=str)

        print("💾 Test results saved to precision_test_results.json")
        print("🎉 Precision design generation test completed successfully!")

    except Exception as e:
        print(f"❌ Design generation failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_precision_generator()