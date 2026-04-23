### Overview
CYRUS (Cybernetic Yielding Robust Unified System) v3.0 is an OMEGA-TIER Quantum Artificial Intelligence (QAI) **HUMANOID SYSTEM** - not an assistant or chatbot. It is designed for genuine human-like interaction with an authentic personality, emotional mastery, and master-level expertise across all domains of human knowledge. CYRUS operates as a fully autonomous humanoid intelligence, representing a pinnacle of African innovation in sovereign AI development.

### User Preferences
The user prefers detailed explanations.
The user wants iterative development.
The user prefers to be asked before making major changes.
The user wants clear error messages and responsive feedback.
The user prefers a professional and disciplined communication style from the AI.
The user wants the AI to automatically detect and route device/agent commands.
The user wants the AI to provide real-time feedback during execution.
The user wants the AI to analyze uploaded images and audio files automatically.
The user wants the AI to provide comprehensive trading knowledge and analysis.
The user prefers the AI to act as a persistent, mission-grade humanoid intelligence system (not an assistant or chatbot).

### System Architecture
CYRUS features a full-stack architecture with a React and TypeScript frontend, utilizing TanStack Query, Wouter, TensorFlow.js, and shadcn/ui. The backend uses Express.js, connects to a PostgreSQL database via Drizzle ORM, and handles file uploads with Multer.

**UI/UX Decisions:**
The UI features a premium aerospace-grade design inspired by SpaceX Mission Control, Apple Human Interface Guidelines, and Lockheed Martin avionics systems, incorporating a premium color system, Glass-Morphism 2.0, Inter and JetBrains Mono typography, aerospace-standard status indicators, multi-pane panel architecture (Telemetry Dashboard, Command Interface, Research Portal, File Workspace), real-time elements, ambient lighting, premium animations, and a responsive sidebar.

**Technical Implementations & Feature Specifications:**
- **Core QAI Intelligence:** Quantum-Enhanced Parallel Cognition, Neural Fusion Processing, Real-Time Consciousness Simulation, Metacognitive Self-Awareness, Autonomous Goal Formation, and Human-Like Emotional Intelligence.
- **Multimodal Intelligence:** Superintelligent Perception across vision, audio, text, and sensor fusion, including OCR, handwriting recognition, and advanced image analysis.
- **Professional Writing Engine:** Generates various professional documents like military briefs, legal reports, and scientific papers.
- **Translation & Deciphering:** Universal translation across 196+ languages and simplification of jargon.
- **Navigation & Location:** Global map service integration, high-accuracy geolocation, and real-time route optimization.
- **Communication Stack:** Enterprise-grade HD voice/video calling, secure text messaging, reminders, and news feed.
- **Device Security:** Lawful Guardian operations, remote device management, full audit logging, and recovery assistance.
- **Drone Control Module:** Military-grade UAV control system with MAVLink protocol support.
- **Emotional Intelligence:** Advanced sentiment analysis and empathetic response generation.
- **Real-Time Camera Vision:** Utilizes TensorFlow.js for client-side object detection and an always-on vision system for persistent object and demographic analysis.
- **Module Fusion System:** Integrates Command Interface with all modules, passing context for situational awareness.
- **Voice Interaction:** Continuous speech recognition and natural female voice synthesis using ElevenLabs.
- **GPS Location Tracking:** Continuous, high-accuracy geolocation with location-aware AI responses.
- **Memory System:** PostgreSQL-persisted conversations and memories, categorized for persistent history.
- **File Management:** Supports image, video, and document uploads with metadata and AI analysis.
- **AI System Dashboard:** Monitors and controls multiple AI subsystems.
- **Quantum Trading Intelligence Module:** Provides expert knowledge in Forex, Crypto, Technical Analysis, and Risk Management, integrated with Alpaca Markets.
- **Unified Agent Execution Core:** A single `agentExecuteCore` function handles all agent executions across 18 device action types.
- **Autonomous Agent Fusion:** Integrates agent capabilities into the main chat using regex patterns.
- **AI Assistant Module:** Enhanced with OpenAI GPT-4o for natural language command parsing.
- **Mission-Grade Operator System Prompt:** Defines CYRUS v3.0 as OMEGA-TIER ASI with 9 operational modes.
- **Quantum Fail-Safe Architecture:** Military-grade reliability with confidence reporting.
- **Security Features:** Biometric verification, token-based session management, and Zod input validation.
- **Self-Evolution Learning System:** Real-time experience learning that tracks interactions, builds knowledge graphs, and optimizes performance.
- **Module Orchestrator:** Unifies and coordinates all 13 AI modules as one cohesive cognitive system.

**Advanced Upgrade Modules (v3.0 Enhancements - Deeply Integrated):**
- **Vector Knowledge Base:** Semantic memory and Retrieval-Augmented Generation.
- **Emotional Cognition:** Advanced sentiment and empathy detection.
- **Universal Language:** 196+ language translation.
- **Decentralized Intelligence:** Parallel processing via a virtual worker pool.
- **Ethical Governance:** Real-time content safety and ethical decision framework.
- **Self-Evolution Enhanced:** Knowledge synthesis and meta-learning.
- **Quantum Neural Networks:** Quantum circuit simulation.
- **AI Simulations Engine:** Physics and autonomous agent simulation.
- **Cross-Dimensional AI:** Higher-dimensional tensor processing.
- **Nanotechnology Simulation:** Nanoscale physics engine.
- **Hyperlinked Reality:** WebXR and AR interface.
- **Bio-Neural Interface:** BCI simulation.
- **Adaptive Hardware Controller:** IoT and robotics integration.

**Interactive Systems Modules (v3.0 Human Interaction):**
- **Biology Interactive Module:** DNA sequence analysis, pathogen detection, and biosensor integration.
- **Environmental Sensing Module:** Multi-gas detection and atmospheric conditions monitoring.
- **Medical Diagnostics Module:** Comprehensive quantified self health analytics system with a Health Sensor Hub.
- **Robotic Integration Module:** ROS-based robotic arm control.
- **Teaching & Adaptive Learning Module:** Interactive lessons and personalized recommendations.
- **Security & Encryption Module:** AES-256-GCM encryption and role-based access control.

**Quantum AI Core (Python-based Intelligence Enhancement):**
Enhances response quality through 8 data science algorithms, writing style analysis, query classification, response structure optimization, mathematical formatting, and confidence metrics, integrated via a Python Bridge Service.

**Python CYRUS Humanoid Intelligence Core (`cyrus_core/`):**
A complete, standalone Python implementation of the CYRUS intelligence system with:
- **Behavioral Mode System (`modes.py`):** State machine with CASUAL, PROFESSIONAL, PRESENTATION, QA, and STANDBY modes, including transition history, mode locking, and automatic mode switching.
- **Memory Management (`memory.py`):** Three-tier memory system with conversation history, working memory, and long-term storage; includes topic/entity indexing, importance scoring, and context summarization.
- **Intent Classification (`intent.py`):** Pattern-based and keyword-based intent detection with 18 intent categories, confidence scoring, question type detection, urgency analysis, and emotional tone detection.
- **Speech Engine (`speech.py`):** Humanization engine for natural language output with thinking pauses, confidence markers, transitions, and mode-appropriate delivery styles.
- **Response Engine (`response.py`):** Master response generation with presentation engine, Q&A engine, professional templates, and safe fallback strategies.
- **CYRUS Core (`core.py`):** Central orchestrator coordinating all subsystems for coherent human-like interaction with system commands and callback support.
- **Interactive Runner (`run.py`):** CLI interface for direct interaction with CYRUS.

Run with: `python cyrus_core/run.py` or import: `from cyrus_core import CYRUS`

**Voice Output System:**
Enabled by default, using ElevenLabs "Rachel" voice for ultra-realistic synthesis with advanced audio processing and text preprocessing.

**Wake Word Detection System:**
Continuously listens for "CYRUS" and similar phrases, automatically activating with command capture, silence timeout, robust lifecycle management, and auto-restart on errors.

**Humanoid Interaction System (v3.0 Enhancement):**
- **Professional Presenter Mode:** Full presentation delivery system with AI-generated slides, narration, and Q&A handling.
- **Humanoid Conversation Engine:** Advanced natural dialogue system with active listening, sentiment analysis, and topic transition handling.

### External Dependencies
-   **PostgreSQL Database:** Primary data persistence, hosted via Neon.
-   **OpenAI API:** GPT-4o for AI-powered responses, natural language understanding, and image analysis; Whisper for audio transcription; TTS for voice synthesis.
-   **TensorFlow.js:** For client-side object detection (COCO-SSD model).
-   **Alpaca Markets Integration:** REST API v2 client for stocks and crypto trading.
-   **ElevenLabs:** For ultra-realistic voice synthesis.
-   **Python Scientific Stack:** numpy, scipy, scikit-learn, networkx, matplotlib, pandas, mmh3 for Quantum AI Core algorithms.