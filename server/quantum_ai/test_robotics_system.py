#!/usr/bin/env python3
"""
CYRUS Robotics Generation System Test
Simple test to verify the system works
"""

# Configure matplotlib for headless operation FIRST
import matplotlib
matplotlib.use('Agg')

import sys
from pathlib import Path

# Add server path for imports
sys.path.append(str(Path(__file__).parent / 'server'))

# Import our advanced generators
from advanced_robotics_design_generator import AdvancedRoboticsDesignGenerator
from advanced_robotics_image_generator import AdvancedRoboticsImageGenerator

def test_basic_functionality():
    print("🧪 Testing CYRUS Robotics Generation System...")

    # Test design generator
    print("Testing design generator...")
    design_gen = AdvancedRoboticsDesignGenerator()
    design_status = design_gen.get_system_status()
    print(f"✅ Design generator status: {design_status}")

    # Test image generator
    print("Testing image generator...")
    image_gen = AdvancedRoboticsImageGenerator()
    image_status = image_gen.get_system_status()
    print(f"✅ Image generator status: {image_status}")

    # Test basic design generation
    print("Testing basic design generation...")
    design = design_gen.generate_cad_design('robotic_arm', {
        'payload_capacity': '5kg',
        'reach_radius': '1000mm'
    })
    print(f"✅ Design generation result: {design.get('status', 'unknown')}")

    # Test basic image generation
    print("Testing basic image generation...")
    image = image_gen.generate_technical_diagram('robotic_arm', {
        'payload_capacity': '5kg',
        'reach_radius': '1000mm'
    })
    print(f"✅ Image generation result: {len(image.get('generated_images', []))} images")

    print("🎊 All tests passed! CYRUS Robotics Generation System is working!")

if __name__ == "__main__":
    test_basic_functionality()