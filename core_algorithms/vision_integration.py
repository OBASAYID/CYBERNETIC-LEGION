"""
Vision Integration for CYRUS Brain
Integrates advanced vision capabilities with the main brain system
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Callable, Union
import numpy as np
import cv2
from pathlib import Path
import base64
import io
from PIL import Image

from .advanced_vision_module import AdvancedVisionProcessor

logger = logging.getLogger(__name__)

class VisionIntegration:
    """
    Vision Integration System for CYRUS
    Provides unified interface for vision processing within the brain
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or self._get_default_config()
        self.vision_processor = None
        self.is_initialized = False

        # Initialize vision processor
        self._initialize_vision()

    def _get_default_config(self) -> Dict[str, Any]:
        return {
            'mission_mode': 'standard',
            'enable_live_processing': True,
            'anomaly_detection': True,
            'threat_assessment': True,
            'behavioral_analysis': True,
            'cache_results': True,
            'max_cache_size': 100
        }

    def _initialize_vision(self):
        """Initialize the vision processor"""
        try:
            logger.info("Initializing Advanced Vision Processor...")
            self.vision_processor = AdvancedVisionProcessor(self.config)
            self.is_initialized = True
            logger.info("✅ Vision processor initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize vision processor: {e}")
            self.vision_processor = None
            self.is_initialized = False

    async def process_image(self, image: Union[np.ndarray, Image.Image, str, bytes],
                          analysis_type: str = 'comprehensive') -> Dict[str, Any]:
        """
        Process an image with comprehensive analysis

        Args:
            image: Input image (numpy array, PIL Image, file path, or base64 bytes)
            analysis_type: Type of analysis ('basic', 'comprehensive', 'mission_critical')

        Returns:
            Analysis results
        """
        if not self.is_initialized or not self.vision_processor:
            return {
                'error': 'Vision processor not available',
                'timestamp': str(asyncio.get_event_loop().time())
            }

        try:
            # Convert input to appropriate format
            processed_image = self._prepare_image(image)

            logger.info(f"Processing image with {analysis_type} analysis")
            result = await self.vision_processor.process_image(processed_image, analysis_type)

            # Add metadata
            result['processed_by'] = 'cyrus_vision_integration'
            result['integration_timestamp'] = str(asyncio.get_event_loop().time())

            return result

        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            return {
                'error': str(e),
                'timestamp': str(asyncio.get_event_loop().time())
            }

    async def process_live_feed(self, video_source: Union[str, int],
                               duration: Optional[float] = None,
                               callback: Optional[Callable] = None) -> Dict[str, Any]:
        """
        Process live video feed

        Args:
            video_source: Video source (file path or camera index)
            duration: Processing duration in seconds
            callback: Callback function for real-time results

        Returns:
            Processing summary
        """
        if not self.is_initialized or not self.vision_processor:
            return {'error': 'Vision processor not available'}

        try:
            logger.info("Starting live feed processing")
            result = await self.vision_processor.process_live_feed(video_source, duration, callback)

            # Add integration metadata
            result['processed_by'] = 'cyrus_vision_integration'
            result['integration_timestamp'] = str(asyncio.get_event_loop().time())

            return result

        except Exception as e:
            logger.error(f"Live feed processing failed: {e}")
            return {'error': str(e)}

    async def analyze_scene(self, image: Union[np.ndarray, Image.Image, str, bytes]) -> Dict[str, Any]:
        """Analyze scene characteristics"""
        return await self.process_image(image, 'comprehensive')

    async def detect_threats(self, image: Union[np.ndarray, Image.Image, str, bytes]) -> Dict[str, Any]:
        """Detect potential threats in the scene"""
        result = await self.process_image(image, 'mission_critical')
        return result.get('mission_analysis', {}).get('threat_assessment', {'threats': [], 'overall_threat_level': 0})

    async def assess_situational_awareness(self, image: Union[np.ndarray, Image.Image, str, bytes]) -> Dict[str, Any]:
        """Assess situational awareness"""
        result = await self.process_image(image, 'mission_critical')
        return result.get('mission_analysis', {}).get('situational_awareness', {})

    async def extract_features(self, image: Union[np.ndarray, Image.Image, str, bytes]) -> np.ndarray:
        """Extract deep features from image"""
        if not self.is_initialized or not self.vision_processor:
            raise ValueError('Vision processor not available')

        processed_image = self._prepare_image(image)
        return await self.vision_processor._extract_features(processed_image)

    def _prepare_image(self, image: Union[np.ndarray, Image.Image, str, bytes]) -> np.ndarray:
        """Prepare image for processing"""
        if isinstance(image, str):
            # File path
            return cv2.imread(image)
        elif isinstance(image, bytes):
            # Base64 or raw bytes
            try:
                # Try base64 first
                image_data = base64.b64decode(image)
                nparr = np.frombuffer(image_data, np.uint8)
                return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            except:
                # Try raw bytes
                nparr = np.frombuffer(image, np.uint8)
                return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        elif isinstance(image, Image.Image):
            # PIL Image
            return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        elif isinstance(image, np.ndarray):
            # Already numpy array
            return image
        else:
            raise ValueError(f"Unsupported image type: {type(image)}")

    def get_status(self) -> Dict[str, Any]:
        """Get vision integration status"""
        if not self.is_initialized:
            return {
                'initialized': False,
                'error': 'Vision processor not initialized'
            }

        if not self.vision_processor:
            return {
                'initialized': False,
                'error': 'Vision processor failed to initialize'
            }

        return {
            'initialized': True,
            'vision_processor_available': True,
            'processing_stats': self.vision_processor.get_processing_stats(),
            'config': self.config
        }

    def stop_processing(self):
        """Stop any ongoing vision processing"""
        if self.vision_processor:
            self.vision_processor.stop_processing()

    def __del__(self):
        """Cleanup on destruction"""
        self.stop_processing()

# Global vision integration instance
vision_integration = VisionIntegration()