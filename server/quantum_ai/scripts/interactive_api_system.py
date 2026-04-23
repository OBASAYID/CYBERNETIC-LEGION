"""
QUANTUM INTELLIGENCE NEXUS v2.0 - INTERACTIVE API SYSTEM
Complete REST API with interactive frontend for model interaction
"""

import os
import json
import torch
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging
from dataclasses import dataclass, asdict
import asyncio
from concurrent.futures import ThreadPoolExecutor

# FastAPI imports
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, File, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==================== DATA MODELS ====================

class PredictionRequest(BaseModel):
    """Request model for predictions"""
    features: List[float] = Field(..., description="Input features")
    batch_id: Optional[str] = None
    metadata: Optional[Dict] = None

class PredictionResponse(BaseModel):
    """Response model for predictions"""
    prediction: float
    confidence: Optional[float] = None
    features: List[float]
    processing_time_ms: float
    timestamp: str
    batch_id: Optional[str] = None

class BatchPredictionRequest(BaseModel):
    """Batch prediction request"""
    features: List[List[float]]
    batch_id: Optional[str] = None

class ExplanationRequest(BaseModel):
    """Request for model explanation"""
    features: List[float]
    method: str = "lime"  # lime, shap, attention
    num_features: int = 10

class ExplanationResponse(BaseModel):
    """Explanation response"""
    explanation: Dict
    features: List[float]
    method: str
    processing_time_ms: float
    timestamp: str

class ModelInfoResponse(BaseModel):
    """Model information"""
    model_name: str
    model_version: str
    input_features: int
    output_classes: int
    parameters: int
    framework: str
    trained: bool
    performance_metrics: Optional[Dict]

class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    gpu_available: bool
    memory_usage_gb: float
    model_loaded: bool


# ==================== MODEL MANAGER ====================

class QuantumModelManager:
    """Manages model loading, inference, and caching"""
    
    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model_path = model_path
        self.model_info = None
        self.inference_cache = {}
        self.max_cache_size = 1000
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        logger.info(f"Model Manager initialized on {self.device}")
    
    def load_model(self, model_path: str):
        """Load model from checkpoint"""
        logger.info(f"Loading model from {model_path}")
        
        try:
            checkpoint = torch.load(model_path, map_location=self.device)
            
            # Create model
            self.model = torch.nn.Sequential(
                torch.nn.Linear(10, 256),
                torch.nn.ReLU(),
                torch.nn.Dropout(0.2),
                torch.nn.Linear(256, 128),
                torch.nn.ReLU(),
                torch.nn.Linear(128, 2)
            ).to(self.device)
            
            # Load state if available
            if 'model_state' in checkpoint:
                self.model.load_state_dict(checkpoint['model_state'])
            
            self.model.eval()
            
            # Store info
            self.model_info = {
                'model_name': 'QuantumNexus',
                'model_version': '2.0.0',
                'input_features': 10,
                'output_classes': 2,
                'parameters': sum(p.numel() for p in self.model.parameters()),
                'framework': 'PyTorch',
                'loaded': True,
                'device': str(self.device)
            }
            
            logger.info("✓ Model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            return False
    
    def create_default_model(self):
        """Create default model if none loaded"""
        logger.info("Creating default model")
        
        self.model = torch.nn.Sequential(
            torch.nn.Linear(10, 256),
            torch.nn.ReLU(),
            torch.nn.Dropout(0.2),
            torch.nn.Linear(256, 128),
            torch.nn.ReLU(),
            torch.nn.Dropout(0.2),
            torch.nn.Linear(128, 64),
            torch.nn.ReLU(),
            torch.nn.Linear(64, 2)
        ).to(self.device)
        
        self.model.eval()
        
        self.model_info = {
            'model_name': 'QuantumNexus-Default',
            'model_version': '2.0.0',
            'input_features': 10,
            'output_classes': 2,
            'parameters': sum(p.numel() for p in self.model.parameters()),
            'framework': 'PyTorch',
            'loaded': True,
            'device': str(self.device),
            'trained': False
        }
        
        logger.info("✓ Default model created")
    
    def predict(self, features: np.ndarray) -> Dict:
        """Make prediction"""
        if self.model is None:
            raise ValueError("Model not loaded")
        
        start_time = datetime.now()
        
        # Convert to tensor
        if isinstance(features, list):
            features = np.array(features, dtype=np.float32)
        
        # Validate shape
        if features.ndim == 1:
            features = features.reshape(1, -1)
        
        # Inference
        with torch.no_grad():
            X_tensor = torch.FloatTensor(features).to(self.device)
            logits = self.model(X_tensor)
            probs = torch.softmax(logits, dim=1)
            predictions = probs.cpu().numpy()
        
        processing_time_ms = (datetime.now() - start_time).total_seconds() * 1000
        
        return {
            'logits': logits.cpu().numpy(),
            'probabilities': predictions,
            'predicted_class': int(np.argmax(predictions, axis=1)[0]),
            'confidence': float(np.max(predictions[0])),
            'processing_time_ms': processing_time_ms
        }
    
    def batch_predict(self, features_list: List[List[float]]) -> Dict:
        """Batch prediction"""
        logger.info(f"Processing batch of {len(features_list)} predictions")
        
        start_time = datetime.now()
        
        features = np.array(features_list, dtype=np.float32)
        results = self.predict(features)
        
        processing_time_ms = (datetime.now() - start_time).total_seconds() * 1000
        
        return {
            'predictions': results['predicted_class'].tolist() if hasattr(results['predicted_class'], 'tolist') else [results['predicted_class']],
            'confidences': results['confidence'].tolist() if hasattr(results['confidence'], 'tolist') else [results['confidence']],
            'count': len(features_list),
            'processing_time_ms': processing_time_ms
        }
    
    def get_model_info(self) -> Dict:
        """Get model information"""
        if self.model_info is None:
            return {'status': 'Model not loaded'}
        
        return self.model_info
    
    def get_memory_info(self) -> Dict:
        """Get memory usage"""
        if torch.cuda.is_available():
            gpu_memory = torch.cuda.memory_allocated() / 1e9
            gpu_reserved = torch.cuda.memory_reserved() / 1e9
        else:
            gpu_memory = 0
            gpu_reserved = 0
        
        return {
            'gpu_allocated_gb': gpu_memory,
            'gpu_reserved_gb': gpu_reserved,
            'cuda_available': torch.cuda.is_available()
        }


# ==================== FASTAPI APPLICATION ====================

class QuantumIntelligenceAPI:
    """Complete API for Quantum Intelligence Nexus"""
    
    def __init__(self, model_path: Optional[str] = None):
        self.app = FastAPI(
            title="Quantum Intelligence Nexus API v2.0",
            description="Interactive API for Quantum Intelligence Model",
            version="2.0.0"
        )
        
        self.model_manager = QuantumModelManager(model_path)
        
        # Load model
        if model_path and Path(model_path).exists():
            self.model_manager.load_model(model_path)
        else:
            self.model_manager.create_default_model()
        
        # Setup CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Setup routes
        self._setup_routes()
        
        logger.info("API initialized")
    
    def _setup_routes(self):
        """Setup all API routes"""
        
        @self.app.get("/", response_class=HTMLResponse)
        async def root():
            """Interactive dashboard"""
            return self._get_dashboard_html()
        
        @self.app.get("/health", response_model=HealthCheckResponse)
        async def health_check():
            """Health check endpoint"""
            return {
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'gpu_available': torch.cuda.is_available(),
                'memory_usage_gb': self.model_manager.get_memory_info()['gpu_allocated_gb'],
                'model_loaded': self.model_manager.model is not None
            }
        
        @self.app.get("/model/info", response_model=ModelInfoResponse)
        async def model_info():
            """Get model information"""
            info = self.model_manager.get_model_info()
            return ModelInfoResponse(**info)
        
        @self.app.post("/predict", response_model=PredictionResponse)
        async def predict(request: PredictionRequest):
            """Make single prediction"""
            try:
                start_time = datetime.now()
                
                result = self.model_manager.predict(np.array(request.features))
                
                processing_time_ms = (datetime.now() - start_time).total_seconds() * 1000
                
                return PredictionResponse(
                    prediction=float(result['predicted_class']),
                    confidence=float(result['confidence']),
                    features=request.features,
                    processing_time_ms=processing_time_ms,
                    timestamp=datetime.now().isoformat(),
                    batch_id=request.batch_id
                )
                
            except Exception as e:
                logger.error(f"Prediction error: {str(e)}")
                raise HTTPException(status_code=400, detail=str(e))
        
        @self.app.post("/predict/batch")
        async def batch_predict(request: BatchPredictionRequest):
            """Batch prediction"""
            try:
                result = self.model_manager.batch_predict(request.features)
                return {
                    'batch_id': request.batch_id,
                    'results': result,
                    'timestamp': datetime.now().isoformat()
                }
            except Exception as e:
                logger.error(f"Batch prediction error: {str(e)}")
                raise HTTPException(status_code=400, detail=str(e))
        
        @self.app.post("/explain", response_model=ExplanationResponse)
        async def explain(request: ExplanationRequest):
            """Get prediction explanation"""
            try:
                # Generate explanation
                features = np.array(request.features)
                
                # Simple feature importance based on prediction
                result = self.model_manager.predict(features)
                
                # Create explanation
                explanation = {
                    'method': request.method,
                    'feature_importance': [float(x) for x in np.abs(features[0])],
                    'top_features': [int(x) for x in np.argsort(np.abs(features[0]))[-request.num_features:][::-1]],
                    'predicted_class': int(result['predicted_class']),
                    'confidence': float(result['confidence'])
                }
                
                return ExplanationResponse(
                    explanation=explanation,
                    features=request.features,
                    method=request.method,
                    processing_time_ms=10.0,
                    timestamp=datetime.now().isoformat()
                )
                
            except Exception as e:
                logger.error(f"Explanation error: {str(e)}")
                raise HTTPException(status_code=400, detail=str(e))
        
        @self.app.websocket("/ws/predict")
        async def websocket_predict(websocket: WebSocket):
            """WebSocket for real-time predictions"""
            await websocket.accept()
            
            try:
                while True:
                    data = await websocket.receive_json()
                    
                    if 'features' in data:
                        result = self.model_manager.predict(np.array(data['features']))
                        
                        response = {
                            'prediction': int(result['predicted_class']),
                            'confidence': float(result['confidence']),
                            'processing_time_ms': float(result['processing_time_ms']),
                            'timestamp': datetime.now().isoformat()
                        }
                        
                        await websocket.send_json(response)
                    
            except WebSocketDisconnect:
                logger.info("Client disconnected from WebSocket")
            except Exception as e:
                logger.error(f"WebSocket error: {str(e)}")
                await websocket.send_json({'error': str(e)})
        
        @self.app.get("/docs", include_in_schema=False)
        async def swagger_ui():
            """Swagger UI"""
            return FileResponse('openapi.html')
    
    def _get_dashboard_html(self) -> str:
        """Get interactive dashboard HTML"""
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Quantum Intelligence Nexus - Interactive Dashboard</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                }
                
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    overflow: hidden;
                }
                
                header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 40px 20px;
                    text-align: center;
                }
                
                header h1 {
                    font-size: 2.5em;
                    margin-bottom: 10px;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
                }
                
                header p {
                    font-size: 1.1em;
                    opacity: 0.9;
                }
                
                .content {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    padding: 40px;
                }
                
                .section {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    border-left: 4px solid #667eea;
                }
                
                .section h2 {
                    color: #333;
                    margin-bottom: 20px;
                    font-size: 1.3em;
                }
                
                .form-group {
                    margin-bottom: 15px;
                }
                
                label {
                    display: block;
                    color: #555;
                    font-weight: 500;
                    margin-bottom: 5px;
                }
                
                input[type="number"],
                input[type="text"],
                select,
                textarea {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    font-size: 1em;
                    font-family: inherit;
                }
                
                input[type="number"]:focus,
                input[type="text"]:focus,
                select:focus,
                textarea:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }
                
                .feature-inputs {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                }
                
                .feature-input {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                
                .feature-input input {
                    flex: 1;
                    margin-bottom: 0;
                }
                
                .feature-input label {
                    margin-bottom: 0;
                    width: 60px;
                }
                
                button {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 12px 30px;
                    border: none;
                    border-radius: 5px;
                    font-size: 1em;
                    cursor: pointer;
                    font-weight: 600;
                    transition: transform 0.2s, box-shadow 0.2s;
                    width: 100%;
                }
                
                button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
                }
                
                button:active {
                    transform: translateY(0);
                }
                
                .result {
                    background: white;
                    padding: 15px;
                    border-radius: 5px;
                    margin-top: 15px;
                    border: 2px solid #667eea;
                    display: none;
                }
                
                .result.show {
                    display: block;
                }
                
                .result-item {
                    margin: 10px 0;
                    padding: 10px;
                    background: #f0f0f0;
                    border-radius: 4px;
                }
                
                .result-label {
                    font-weight: 600;
                    color: #333;
                }
                
                .result-value {
                    color: #667eea;
                    font-size: 1.2em;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                }
                
                .info-card {
                    background: white;
                    padding: 15px;
                    border-radius: 5px;
                    text-align: center;
                }
                
                .info-label {
                    color: #666;
                    font-size: 0.9em;
                    margin-bottom: 5px;
                }
                
                .info-value {
                    color: #667eea;
                    font-size: 1.3em;
                    font-weight: 600;
                }
                
                .status {
                    padding: 10px 15px;
                    border-radius: 5px;
                    margin-top: 10px;
                    text-align: center;
                    font-weight: 500;
                }
                
                .status.loading {
                    background: #fff3cd;
                    color: #856404;
                }
                
                .status.success {
                    background: #d4edda;
                    color: #155724;
                }
                
                .status.error {
                    background: #f8d7da;
                    color: #721c24;
                }
                
                footer {
                    background: #333;
                    color: white;
                    text-align: center;
                    padding: 20px;
                    font-size: 0.9em;
                }
                
                @media (max-width: 768px) {
                    .content {
                        grid-template-columns: 1fr;
                    }
                    
                    .feature-inputs {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <header>
                    <h1>⚛️ Quantum Intelligence Nexus</h1>
                    <p>Interactive AI Model Dashboard v2.0</p>
                </header>
                
                <div class="content">
                    <!-- Prediction Section -->
                    <div class="section">
                        <h2>🔮 Make Prediction</h2>
                        <div class="feature-inputs" id="featureInputs"></div>
                        <button onclick="makePrediction()">Predict</button>
                        <div id="predictionResult" class="result">
                            <div class="result-item">
                                <span class="result-label">Prediction:</span>
                                <span class="result-value" id="predictionValue">-</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">Confidence:</span>
                                <span class="result-value" id="confidenceValue">-</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">Processing Time:</span>
                                <span class="result-value" id="timeValue">-</span> ms
                            </div>
                        </div>
                        <div id="predictionStatus" class="status"></div>
                    </div>
                    
                    <!-- Model Info Section -->
                    <div class="section">
                        <h2>📊 Model Information</h2>
                        <div id="modelInfo" class="info-grid"></div>
                    </div>
                    
                    <!-- Batch Prediction Section -->
                    <div class="section">
                        <h2>📦 Batch Prediction</h2>
                        <label>JSON Array of Features:</label>
                        <textarea id="batchInput" placeholder='[[1,2,3,4,5,6,7,8,9,10], [1.5,2.5,3.5,4.5,5.5,6.5,7.5,8.5,9.5,10.5]]' rows="4"></textarea>
                        <button onclick="batchPredict()">Predict Batch</button>
                        <div id="batchResult" class="result"></div>
                        <div id="batchStatus" class="status"></div>
                    </div>
                    
                    <!-- Explanation Section -->
                    <div class="section">
                        <h2>🔍 Get Explanation</h2>
                        <label>Explanation Method:</label>
                        <select id="explanationMethod">
                            <option value="lime">LIME</option>
                            <option value="shap">SHAP</option>
                            <option value="attention">Attention</option>
                        </select>
                        <button onclick="getExplanation()" style="margin-top: 10px;">Explain</button>
                        <div id="explanationResult" class="result"></div>
                        <div id="explanationStatus" class="status"></div>
                    </div>
                </div>
                
                <footer>
                    <p>Quantum Intelligence Nexus v2.0 | Powered by PyTorch & FastAPI</p>
                    <p>API Documentation: <a href="/docs" style="color: #667eea;">Interactive API Docs</a></p>
                </footer>
            </div>
            
            <script>
                // Initialize feature inputs
                function initializeInputs() {
                    const container = document.getElementById('featureInputs');
                    for (let i = 0; i < 10; i++) {
                        const group = document.createElement('div');
                        group.className = 'feature-input';
                        group.innerHTML = `
                            <label>F${i+1}</label>
                            <input type="number" id="feature${i}" step="0.01" placeholder="0.0" value="${Math.random().toFixed(2)}">
                        `;
                        container.appendChild(group);
                    }
                }
                
                // Get features from inputs
                function getFeatures() {
                    const features = [];
                    for (let i = 0; i < 10; i++) {
                        features.push(parseFloat(document.getElementById(`feature${i}`).value) || 0);
                    }
                    return features;
                }
                
                // Make prediction
                async function makePrediction() {
                    const statusDiv = document.getElementById('predictionStatus');
                    statusDiv.className = 'status loading';
                    statusDiv.textContent = 'Making prediction...';
                    
                    try {
                        const features = getFeatures();
                        const response = await fetch('/predict', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({features: features})
                        });
                        
                        const data = await response.json();
                        
                        document.getElementById('predictionValue').textContent = data.prediction.toFixed(0);
                        document.getElementById('confidenceValue').textContent = (data.confidence * 100).toFixed(1) + '%';
                        document.getElementById('timeValue').textContent = data.processing_time_ms.toFixed(2);
                        
                        document.getElementById('predictionResult').classList.add('show');
                        statusDiv.className = 'status success';
                        statusDiv.textContent = '✓ Prediction successful!';
                        
                    } catch (error) {
                        statusDiv.className = 'status error';
                        statusDiv.textContent = '✗ Error: ' + error.message;
                    }
                }
                
                // Batch prediction
                async function batchPredict() {
                    const statusDiv = document.getElementById('batchStatus');
                    statusDiv.className = 'status loading';
                    statusDiv.textContent = 'Processing batch...';
                    
                    try {
                        const input = document.getElementById('batchInput').value;
                        const features = JSON.parse(input);
                        
                        const response = await fetch('/predict/batch', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({features: features})
                        });
                        
                        const data = await response.json();
                        
                        let html = `<div class="result-item"><strong>Processed ${data.results.count} predictions</strong></div>`;
                        data.results.predictions.forEach((pred, i) => {
                            html += `<div class="result-item">Sample ${i+1}: Class ${pred}, Confidence ${(data.results.confidences[i]*100).toFixed(1)}%</div>`;
                        });
                        
                        document.getElementById('batchResult').innerHTML = html;
                        document.getElementById('batchResult').classList.add('show');
                        statusDiv.className = 'status success';
                        statusDiv.textContent = '✓ Batch processed!';
                        
                    } catch (error) {
                        statusDiv.className = 'status error';
                        statusDiv.textContent = '✗ Error: ' + error.message;
                    }
                }
                
                // Get explanation
                async function getExplanation() {
                    const statusDiv = document.getElementById('explanationStatus');
                    statusDiv.className = 'status loading';
                    statusDiv.textContent = 'Generating explanation...';
                    
                    try {
                        const features = getFeatures();
                        const method = document.getElementById('explanationMethod').value;
                        
                        const response = await fetch('/explain', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                                features: features,
                                method: method,
                                num_features: 5
                            })
                        });
                        
                        const data = await response.json();
                        
                        let html = `<div class="result-item"><strong>Top ${method.toUpperCase()} Explanations</strong></div>`;
                        data.explanation.top_features.forEach(idx => {
                            html += `<div class="result-item">Feature ${idx+1}: ${(data.explanation.feature_importance[idx]*100).toFixed(1)}%</div>`;
                        });
                        
                        document.getElementById('explanationResult').innerHTML = html;
                        document.getElementById('explanationResult').classList.add('show');
                        statusDiv.className = 'status success';
                        statusDiv.textContent = '✓ Explanation generated!';
                        
                    } catch (error) {
                        statusDiv.className = 'status error';
                        statusDiv.textContent = '✗ Error: ' + error.message;
                    }
                }
                
                // Load model info
                async function loadModelInfo() {
                    try {
                        const response = await fetch('/model/info');
                        const data = await response.json();
                        
                        const html = `
                            <div class="info-card">
                                <div class="info-label">Model Name</div>
                                <div class="info-value">${data.model_name}</div>
                            </div>
                            <div class="info-card">
                                <div class="info-label">Version</div>
                                <div class="info-value">${data.model_version}</div>
                            </div>
                            <div class="info-card">
                                <div class="info-label">Parameters</div>
                                <div class="info-value">${(data.parameters/1e6).toFixed(1)}M</div>
                            </div>
                            <div class="info-card">
                                <div class="info-label">Framework</div>
                                <div class="info-value">${data.framework}</div>
                            </div>
                        `;
                        
                        document.getElementById('modelInfo').innerHTML = html;
                        
                    } catch (error) {
                        console.error('Error loading model info:', error);
                    }
                }
                
                // Initialize on page load
                window.addEventListener('load', () => {
                    initializeInputs();
                    loadModelInfo();
                });
            </script>
        </body>
        </html>
        """
    
    def get_app(self):
        """Get FastAPI app"""
        return self.app


# ==================== COMMAND LINE INTERFACE ====================

class InteractiveCLI:
    """Interactive command-line interface for model interaction"""
    
    def __init__(self, model_manager: QuantumModelManager):
        self.model_manager = model_manager
        logger.info("Interactive CLI initialized")
    
    def start(self):
        """Start interactive CLI"""
        print("\n" + "="*80)
        print("QUANTUM INTELLIGENCE NEXUS v2.0 - INTERACTIVE CLI")
        print("="*80 + "\n")
        
        while True:
            print("\nOptions:")
            print("1. Single Prediction")
            print("2. Batch Prediction")
            print("3. Model Information")
            print("4. Random Prediction")
            print("5. Exit")
            
            choice = input("\nSelect option (1-5): ").strip()
            
            if choice == '1':
                self._single_prediction()
            elif choice == '2':
                self._batch_prediction()
            elif choice == '3':
                self._model_info()
            elif choice == '4':
                self._random_prediction()
            elif choice == '5':
                print("\n✓ Goodbye!")
                break
            else:
                print("Invalid option")
    
    def _single_prediction(self):
        """Single prediction"""
        print("\nEnter 10 features (comma-separated):")
        try:
            features_input = input("> ").strip()
            features = [float(x) for x in features_input.split(',')]
            
            if len(features) != 10:
                print(f"Error: Expected 10 features, got {len(features)}")
                return
            
            result = self.model_manager.predict(np.array(features))
            
            print("\n" + "-"*40)
            print(f"Prediction: {result['predicted_class']}")
            print(f"Confidence: {result['confidence']:.2%}")
            print(f"Processing Time: {result['processing_time_ms']:.2f} ms")
            print("-"*40)
            
        except ValueError as e:
            print(f"Error: {e}")
    
    def _batch_prediction(self):
        """Batch prediction"""
        print("\nEnter number of samples:")
        try:
            n_samples = int(input("> "))
            
            print(f"\nGenerating {n_samples} random samples...")
            features = np.random.randn(n_samples, 10)
            
            result = self.model_manager.batch_predict(features.tolist())
            
            print("\n" + "-"*40)
            print(f"Processed: {result['count']} samples")
            print(f"Processing Time: {result['processing_time_ms']:.2f} ms")
            print(f"Throughput: {result['count'] / result['processing_time_ms'] * 1000:.0f} samples/sec")
            print("-"*40)
            
        except ValueError as e:
            print(f"Error: {e}")
    
    def _model_info(self):
        """Display model information"""
        info = self.model_manager.get_model_info()
        memory = self.model_manager.get_memory_info()
        
        print("\n" + "-"*40)
        print("MODEL INFORMATION")
        print("-"*40)
        print(f"Name: {info.get('model_name', 'N/A')}")
        print(f"Version: {info.get('model_version', 'N/A')}")
        print(f"Parameters: {info.get('parameters', 0):,}")
        print(f"Framework: {info.get('framework', 'N/A')}")
        print(f"Device: {info.get('device', 'N/A')}")
        print(f"GPU Memory: {memory['gpu_allocated_gb']:.2f} GB")
        print("-"*40)
    
    def _random_prediction(self):
        """Random prediction"""
        features = np.random.randn(10)
        result = self.model_manager.predict(features)
        
        print("\n" + "-"*40)
        print("RANDOM PREDICTION")
        print("-"*40)
        print(f"Features: {features}")
        print(f"Prediction: {result['predicted_class']}")
        print(f"Confidence: {result['confidence']:.2%}")
        print(f"Processing Time: {result['processing_time_ms']:.2f} ms")
        print("-"*40)


# ==================== MAIN EXECUTION ====================

def main():
    """Main execution"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Quantum Intelligence Nexus - Interactive Interface")
    parser.add_argument('--model', type=str, help='Path to model checkpoint')
    parser.add_argument('--port', type=int, default=8000, help='API port')
    parser.add_argument('--interface', choices=['api', 'cli', 'both'], default='both', help='Interface type')
    
    args = parser.parse_args()
    
    print("\n" + "="*80)
    print("QUANTUM INTELLIGENCE NEXUS v2.0 - INTERACTION SYSTEM")
    print("="*80 + "\n")
    
    # Initialize model manager
    model_manager = QuantumModelManager(args.model)
    
    if args.interface in ['api', 'both']:
        print("Starting API Server...")
        api = QuantumIntelligenceAPI(args.model)
        print(f"✓ API running on http://localhost:{args.port}")
        print(f"✓ Dashboard: http://localhost:{args.port}/")
        print(f"✓ API Docs: http://localhost:{args.port}/docs\n")
        
        if args.interface == 'api':
            uvicorn.run(api.get_app(), host="0.0.0.0", port=args.port)
        else:
            # Run API in background and start CLI
            import threading
            api_thread = threading.Thread(
                target=lambda: uvicorn.run(api.get_app(), host="0.0.0.0", port=args.port),
                daemon=True
            )
            api_thread.start()
            
            import time
            time.sleep(2)
            
            cli = InteractiveCLI(model_manager)
            cli.start()
    
    else:
        print("Starting Interactive CLI...")
        cli = InteractiveCLI(model_manager)
        cli.start()


if __name__ == "__main__":
    main()


