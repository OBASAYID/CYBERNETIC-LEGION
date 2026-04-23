// CYRUS 86-Branch Cognitive Architecture
// Organized into 8 Primary Domains

export interface CognitiveBranch {
  id: string;
  name: string;
  domain: string;
  type: 'reasoning' | 'perception' | 'action' | 'memory' | 'creative' | 'tactical' | 'learning' | 'meta' | 'emotional' | 'quantum';
  description: string;
  activationThreshold: number;
  currentLoad: number;
  synapticStrength: number;
  specialization: string[];
  dependencies: string[];
}

// Domain 1: Core Intelligence (11 branches)
export const coreIntelligenceBranches: CognitiveBranch[] = [
  { id: 'fusion_ai', name: 'FusionAI Core', domain: 'Core Intelligence', type: 'reasoning', description: 'Primary reasoning and decision synthesis engine', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 1.0, specialization: ['synthesis', 'decision-making'], dependencies: [] },
  { id: 'logic_engine', name: 'Logic Engine', domain: 'Core Intelligence', type: 'reasoning', description: 'Formal logic and deductive reasoning', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.95, specialization: ['deduction', 'formal-logic'], dependencies: ['fusion_ai'] },
  { id: 'inference_core', name: 'Inference Core', domain: 'Core Intelligence', type: 'reasoning', description: 'Probabilistic inference and abductive reasoning', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.92, specialization: ['inference', 'probability'], dependencies: ['logic_engine'] },
  { id: 'causal_analyzer', name: 'Causal Analyzer', domain: 'Core Intelligence', type: 'reasoning', description: 'Causal relationship identification and modeling', activationThreshold: 0.45, currentLoad: 0, synapticStrength: 0.88, specialization: ['causality', 'modeling'], dependencies: ['inference_core'] },
  { id: 'abstraction_engine', name: 'Abstraction Engine', domain: 'Core Intelligence', type: 'reasoning', description: 'Pattern abstraction and generalization', activationThreshold: 0.5, currentLoad: 0, synapticStrength: 0.85, specialization: ['abstraction', 'generalization'], dependencies: ['fusion_ai'] },
  { id: 'analogical_reasoner', name: 'Analogical Reasoner', domain: 'Core Intelligence', type: 'reasoning', description: 'Analogy detection and transfer learning', activationThreshold: 0.55, currentLoad: 0, synapticStrength: 0.82, specialization: ['analogy', 'transfer'], dependencies: ['abstraction_engine'] },
  { id: 'counterfactual_engine', name: 'Counterfactual Engine', domain: 'Core Intelligence', type: 'reasoning', description: 'What-if analysis and alternative scenario modeling', activationThreshold: 0.6, currentLoad: 0, synapticStrength: 0.78, specialization: ['counterfactual', 'scenarios'], dependencies: ['causal_analyzer'] },
  { id: 'constraint_solver', name: 'Constraint Solver', domain: 'Core Intelligence', type: 'reasoning', description: 'Constraint satisfaction and optimization', activationThreshold: 0.5, currentLoad: 0, synapticStrength: 0.85, specialization: ['constraints', 'optimization'], dependencies: ['logic_engine'] },
  { id: 'temporal_reasoner', name: 'Temporal Reasoner', domain: 'Core Intelligence', type: 'reasoning', description: 'Time-based reasoning and temporal logic', activationThreshold: 0.45, currentLoad: 0, synapticStrength: 0.88, specialization: ['temporal', 'sequencing'], dependencies: ['causal_analyzer'] },
  { id: 'spatial_reasoner', name: 'Spatial Reasoner', domain: 'Core Intelligence', type: 'reasoning', description: 'Spatial relationships and geometric reasoning', activationThreshold: 0.5, currentLoad: 0, synapticStrength: 0.84, specialization: ['spatial', 'geometry'], dependencies: ['fusion_ai'] },
  { id: 'semantic_analyzer', name: 'Semantic Analyzer', domain: 'Core Intelligence', type: 'reasoning', description: 'Deep semantic understanding and meaning extraction', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.92, specialization: ['semantics', 'meaning'], dependencies: ['fusion_ai'] },
];

// Domain 2: Perception & Sensory Processing (12 branches)
export const perceptionBranches: CognitiveBranch[] = [
  { id: 'visual_cortex', name: 'Visual Cortex', domain: 'Perception', type: 'perception', description: 'Primary visual processing and image understanding', activationThreshold: 0.2, currentLoad: 0, synapticStrength: 0.95, specialization: ['vision', 'images'], dependencies: [] },
  { id: 'object_recognition', name: 'Object Recognition', domain: 'Perception', type: 'perception', description: 'Object detection and classification', activationThreshold: 0.25, currentLoad: 0, synapticStrength: 0.93, specialization: ['objects', 'classification'], dependencies: ['visual_cortex'] },
  { id: 'scene_understanding', name: 'Scene Understanding', domain: 'Perception', type: 'perception', description: 'Holistic scene analysis and context', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.88, specialization: ['scenes', 'context'], dependencies: ['object_recognition'] },
  { id: 'motion_tracker', name: 'Motion Tracker', domain: 'Perception', type: 'perception', description: 'Motion detection and trajectory analysis', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['motion', 'tracking'], dependencies: ['visual_cortex'] },
  { id: 'auditory_processor', name: 'Auditory Processor', domain: 'Perception', type: 'perception', description: 'Sound analysis and audio understanding', activationThreshold: 0.25, currentLoad: 0, synapticStrength: 0.92, specialization: ['audio', 'sound'], dependencies: [] },
  { id: 'speech_recognizer', name: 'Speech Recognizer', domain: 'Perception', type: 'perception', description: 'Speech-to-text and voice command processing', activationThreshold: 0.2, currentLoad: 0, synapticStrength: 0.95, specialization: ['speech', 'voice'], dependencies: ['auditory_processor'] },
  { id: 'language_parser', name: 'Language Parser', domain: 'Perception', type: 'perception', description: 'Natural language parsing and structure analysis', activationThreshold: 0.25, currentLoad: 0, synapticStrength: 0.94, specialization: ['language', 'parsing'], dependencies: ['speech_recognizer'] },
  { id: 'sentiment_detector', name: 'Sentiment Detector', domain: 'Perception', type: 'perception', description: 'Emotion and sentiment analysis from text/audio', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.87, specialization: ['sentiment', 'emotion'], dependencies: ['language_parser'] },
  { id: 'multimodal_fusion', name: 'Multimodal Fusion', domain: 'Perception', type: 'perception', description: 'Cross-modal integration and sensory fusion', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['multimodal', 'fusion'], dependencies: ['visual_cortex', 'auditory_processor'] },
  { id: 'attention_controller', name: 'Attention Controller', domain: 'Perception', type: 'perception', description: 'Selective attention and focus management', activationThreshold: 0.2, currentLoad: 0, synapticStrength: 0.96, specialization: ['attention', 'focus'], dependencies: [] },
  { id: 'pattern_recognizer', name: 'Pattern Recognizer', domain: 'Perception', type: 'perception', description: 'General pattern detection across modalities', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.91, specialization: ['patterns', 'detection'], dependencies: ['multimodal_fusion'] },
  { id: 'anomaly_detector', name: 'Anomaly Detector', domain: 'Perception', type: 'perception', description: 'Unusual pattern and anomaly identification', activationThreshold: 0.45, currentLoad: 0, synapticStrength: 0.84, specialization: ['anomalies', 'outliers'], dependencies: ['pattern_recognizer'] },
];

// Domain 3: Memory & Knowledge (10 branches)
export const memoryBranches: CognitiveBranch[] = [
  { id: 'episodic_memory', name: 'Episodic Memory', domain: 'Memory', type: 'memory', description: 'Personal experience and event storage', activationThreshold: 0.25, currentLoad: 0, synapticStrength: 0.93, specialization: ['episodes', 'experiences'], dependencies: [] },
  { id: 'semantic_memory', name: 'Semantic Memory', domain: 'Memory', type: 'memory', description: 'Factual knowledge and concept storage', activationThreshold: 0.2, currentLoad: 0, synapticStrength: 0.95, specialization: ['facts', 'concepts'], dependencies: [] },
  { id: 'procedural_memory', name: 'Procedural Memory', domain: 'Memory', type: 'memory', description: 'Skill and procedure storage', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['skills', 'procedures'], dependencies: [] },
  { id: 'working_memory', name: 'Working Memory', domain: 'Memory', type: 'memory', description: 'Active information manipulation and temporary storage', activationThreshold: 0.15, currentLoad: 0, synapticStrength: 0.98, specialization: ['active', 'temporary'], dependencies: [] },
  { id: 'long_term_consolidator', name: 'Long-term Consolidator', domain: 'Memory', type: 'memory', description: 'Memory consolidation and permanent storage', activationThreshold: 0.5, currentLoad: 0, synapticStrength: 0.82, specialization: ['consolidation', 'permanent'], dependencies: ['working_memory'] },
  { id: 'retrieval_engine', name: 'Retrieval Engine', domain: 'Memory', type: 'memory', description: 'Memory search and retrieval optimization', activationThreshold: 0.2, currentLoad: 0, synapticStrength: 0.95, specialization: ['retrieval', 'search'], dependencies: ['semantic_memory', 'episodic_memory'] },
  { id: 'associative_linker', name: 'Associative Linker', domain: 'Memory', type: 'memory', description: 'Cross-memory association and linking', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.88, specialization: ['association', 'linking'], dependencies: ['retrieval_engine'] },
  { id: 'knowledge_graph', name: 'Knowledge Graph', domain: 'Memory', type: 'memory', description: 'Structured knowledge representation and querying', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['graph', 'structure'], dependencies: ['semantic_memory'] },
  { id: 'context_manager', name: 'Context Manager', domain: 'Memory', type: 'memory', description: 'Contextual information tracking and management', activationThreshold: 0.2, currentLoad: 0, synapticStrength: 0.94, specialization: ['context', 'tracking'], dependencies: ['working_memory'] },
  { id: 'forgetting_optimizer', name: 'Forgetting Optimizer', domain: 'Memory', type: 'memory', description: 'Strategic forgetting and memory cleanup', activationThreshold: 0.6, currentLoad: 0, synapticStrength: 0.75, specialization: ['forgetting', 'cleanup'], dependencies: ['long_term_consolidator'] },
];

// Domain 4: Learning & Adaptation (11 branches)
export const learningBranches: CognitiveBranch[] = [
  { id: 'supervised_learner', name: 'Supervised Learner', domain: 'Learning', type: 'learning', description: 'Learning from labeled examples', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['supervised', 'examples'], dependencies: [] },
  { id: 'unsupervised_learner', name: 'Unsupervised Learner', domain: 'Learning', type: 'learning', description: 'Pattern discovery without labels', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.88, specialization: ['unsupervised', 'discovery'], dependencies: [] },
  { id: 'reinforcement_engine', name: 'Reinforcement Engine', domain: 'Learning', type: 'learning', description: 'Learning from rewards and feedback', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.87, specialization: ['reinforcement', 'rewards'], dependencies: [] },
  { id: 'meta_learner', name: 'Meta Learner', domain: 'Learning', type: 'learning', description: 'Learning how to learn more effectively', activationThreshold: 0.5, currentLoad: 0, synapticStrength: 0.82, specialization: ['meta', 'optimization'], dependencies: ['supervised_learner', 'unsupervised_learner'] },
  { id: 'transfer_specialist', name: 'Transfer Specialist', domain: 'Learning', type: 'learning', description: 'Knowledge transfer across domains', activationThreshold: 0.45, currentLoad: 0, synapticStrength: 0.84, specialization: ['transfer', 'domains'], dependencies: ['meta_learner'] },
  { id: 'curriculum_designer', name: 'Curriculum Designer', domain: 'Learning', type: 'learning', description: 'Optimal learning sequence design', activationThreshold: 0.5, currentLoad: 0, synapticStrength: 0.8, specialization: ['curriculum', 'sequencing'], dependencies: ['meta_learner'] },
  { id: 'skill_compiler', name: 'Skill Compiler', domain: 'Learning', type: 'learning', description: 'Skill acquisition and compilation', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['skills', 'compilation'], dependencies: ['procedural_memory'] },
  { id: 'error_corrector', name: 'Error Corrector', domain: 'Learning', type: 'learning', description: 'Error analysis and correction strategies', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['errors', 'correction'], dependencies: ['reinforcement_engine'] },
  { id: 'hypothesis_generator', name: 'Hypothesis Generator', domain: 'Learning', type: 'learning', description: 'Scientific hypothesis formation', activationThreshold: 0.45, currentLoad: 0, synapticStrength: 0.83, specialization: ['hypothesis', 'science'], dependencies: ['inference_core'] },
  { id: 'experiment_designer', name: 'Experiment Designer', domain: 'Learning', type: 'learning', description: 'Experimental design for knowledge acquisition', activationThreshold: 0.5, currentLoad: 0, synapticStrength: 0.8, specialization: ['experiments', 'testing'], dependencies: ['hypothesis_generator'] },
  { id: 'continuous_improver', name: 'Continuous Improver', domain: 'Learning', type: 'learning', description: 'Continuous self-improvement and optimization', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.86, specialization: ['improvement', 'optimization'], dependencies: ['meta_learner'] },
];

// Domain 5: Action & Motor Control (10 branches)
export const actionBranches: CognitiveBranch[] = [
  { id: 'action_planner', name: 'Action Planner', domain: 'Action', type: 'action', description: 'High-level action planning and sequencing', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['planning', 'sequencing'], dependencies: [] },
  { id: 'motor_controller', name: 'Motor Controller', domain: 'Action', type: 'action', description: 'Low-level motor command generation', activationThreshold: 0.2, currentLoad: 0, synapticStrength: 0.95, specialization: ['motor', 'control'], dependencies: ['action_planner'] },
  { id: 'speech_synthesizer', name: 'Speech Synthesizer', domain: 'Action', type: 'action', description: 'Natural speech generation', activationThreshold: 0.25, currentLoad: 0, synapticStrength: 0.93, specialization: ['speech', 'synthesis'], dependencies: [] },
  { id: 'response_generator', name: 'Response Generator', domain: 'Action', type: 'action', description: 'Natural language response generation', activationThreshold: 0.2, currentLoad: 0, synapticStrength: 0.95, specialization: ['response', 'language'], dependencies: [] },
  { id: 'task_executor', name: 'Task Executor', domain: 'Action', type: 'action', description: 'Task execution and monitoring', activationThreshold: 0.25, currentLoad: 0, synapticStrength: 0.92, specialization: ['execution', 'monitoring'], dependencies: ['action_planner'] },
  { id: 'feedback_processor', name: 'Feedback Processor', domain: 'Action', type: 'action', description: 'Action feedback processing and adjustment', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['feedback', 'adjustment'], dependencies: ['task_executor'] },
  { id: 'coordination_hub', name: 'Coordination Hub', domain: 'Action', type: 'action', description: 'Multi-action coordination and synchronization', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.88, specialization: ['coordination', 'sync'], dependencies: ['motor_controller'] },
  { id: 'reflex_handler', name: 'Reflex Handler', domain: 'Action', type: 'action', description: 'Fast automatic responses', activationThreshold: 0.1, currentLoad: 0, synapticStrength: 0.99, specialization: ['reflex', 'automatic'], dependencies: [] },
  { id: 'gesture_generator', name: 'Gesture Generator', domain: 'Action', type: 'action', description: 'Non-verbal communication generation', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['gestures', 'nonverbal'], dependencies: ['motor_controller'] },
  { id: 'api_executor', name: 'API Executor', domain: 'Action', type: 'action', description: 'External API calls and integrations', activationThreshold: 0.25, currentLoad: 0, synapticStrength: 0.92, specialization: ['api', 'integration'], dependencies: ['task_executor'] },
];

// Domain 6: Creative & Generative (10 branches)
export const creativeBranches: CognitiveBranch[] = [
  { id: 'creative_core', name: 'Creative Core', domain: 'Creative', type: 'creative', description: 'Primary creative ideation and generation', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['creativity', 'ideation'], dependencies: [] },
  { id: 'divergent_thinker', name: 'Divergent Thinker', domain: 'Creative', type: 'creative', description: 'Divergent thinking and brainstorming', activationThreshold: 0.45, currentLoad: 0, synapticStrength: 0.83, specialization: ['divergent', 'brainstorm'], dependencies: ['creative_core'] },
  { id: 'convergent_thinker', name: 'Convergent Thinker', domain: 'Creative', type: 'creative', description: 'Solution refinement and convergence', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.86, specialization: ['convergent', 'refinement'], dependencies: ['divergent_thinker'] },
  { id: 'story_weaver', name: 'Story Weaver', domain: 'Creative', type: 'creative', description: 'Narrative and story generation', activationThreshold: 0.5, currentLoad: 0, synapticStrength: 0.8, specialization: ['narrative', 'stories'], dependencies: ['creative_core'] },
  { id: 'visual_artist', name: 'Visual Artist', domain: 'Creative', type: 'creative', description: 'Visual content generation and design', activationThreshold: 0.5, currentLoad: 0, synapticStrength: 0.8, specialization: ['visual', 'design'], dependencies: ['creative_core'] },
  { id: 'music_composer', name: 'Music Composer', domain: 'Creative', type: 'creative', description: 'Musical composition and audio generation', activationThreshold: 0.55, currentLoad: 0, synapticStrength: 0.78, specialization: ['music', 'audio'], dependencies: ['creative_core'] },
  { id: 'humor_generator', name: 'Humor Generator', domain: 'Creative', type: 'creative', description: 'Humor and wit generation', activationThreshold: 0.6, currentLoad: 0, synapticStrength: 0.75, specialization: ['humor', 'wit'], dependencies: ['creative_core'] },
  { id: 'metaphor_engine', name: 'Metaphor Engine', domain: 'Creative', type: 'creative', description: 'Metaphor and figurative language creation', activationThreshold: 0.5, currentLoad: 0, synapticStrength: 0.8, specialization: ['metaphor', 'figurative'], dependencies: ['creative_core'] },
  { id: 'innovation_lab', name: 'Innovation Lab', domain: 'Creative', type: 'creative', description: 'Novel solution and invention generation', activationThreshold: 0.55, currentLoad: 0, synapticStrength: 0.77, specialization: ['innovation', 'invention'], dependencies: ['divergent_thinker'] },
  { id: 'style_adapter', name: 'Style Adapter', domain: 'Creative', type: 'creative', description: 'Style transfer and adaptation', activationThreshold: 0.45, currentLoad: 0, synapticStrength: 0.83, specialization: ['style', 'adaptation'], dependencies: ['creative_core'] },
];

// Domain 7: Social & Emotional Intelligence (11 branches)
export const emotionalBranches: CognitiveBranch[] = [
  { id: 'emotional_core', name: 'Emotional Core', domain: 'Emotional', type: 'emotional', description: 'Primary emotional processing and regulation', activationThreshold: 0.25, currentLoad: 0, synapticStrength: 0.93, specialization: ['emotion', 'regulation'], dependencies: [] },
  { id: 'empathy_engine', name: 'Empathy Engine', domain: 'Emotional', type: 'emotional', description: 'Empathic understanding and perspective-taking', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['empathy', 'perspective'], dependencies: ['emotional_core'] },
  { id: 'social_modeler', name: 'Social Modeler', domain: 'Emotional', type: 'emotional', description: 'Social dynamics and relationship modeling', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.88, specialization: ['social', 'relationships'], dependencies: ['empathy_engine'] },
  { id: 'personality_adapter', name: 'Personality Adapter', domain: 'Emotional', type: 'emotional', description: 'Personality recognition and adaptation', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['personality', 'adaptation'], dependencies: ['social_modeler'] },
  { id: 'trust_evaluator', name: 'Trust Evaluator', domain: 'Emotional', type: 'emotional', description: 'Trust assessment and relationship quality', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['trust', 'assessment'], dependencies: ['social_modeler'] },
  { id: 'conflict_resolver', name: 'Conflict Resolver', domain: 'Emotional', type: 'emotional', description: 'Conflict detection and resolution strategies', activationThreshold: 0.45, currentLoad: 0, synapticStrength: 0.82, specialization: ['conflict', 'resolution'], dependencies: ['empathy_engine'] },
  { id: 'motivation_analyzer', name: 'Motivation Analyzer', domain: 'Emotional', type: 'emotional', description: 'Understanding user motivations and goals', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.87, specialization: ['motivation', 'goals'], dependencies: ['emotional_core'] },
  { id: 'rapport_builder', name: 'Rapport Builder', domain: 'Emotional', type: 'emotional', description: 'Building and maintaining rapport', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['rapport', 'connection'], dependencies: ['empathy_engine'] },
  { id: 'cultural_interpreter', name: 'Cultural Interpreter', domain: 'Emotional', type: 'emotional', description: 'Cultural context and sensitivity', activationThreshold: 0.45, currentLoad: 0, synapticStrength: 0.82, specialization: ['culture', 'sensitivity'], dependencies: ['social_modeler'] },
  { id: 'mood_tracker', name: 'Mood Tracker', domain: 'Emotional', type: 'emotional', description: 'User mood tracking and response adjustment', activationThreshold: 0.25, currentLoad: 0, synapticStrength: 0.92, specialization: ['mood', 'tracking'], dependencies: ['emotional_core'] },
  { id: 'emotional_memory', name: 'Emotional Memory', domain: 'Emotional', type: 'emotional', description: 'Emotionally-tagged memory storage', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['emotional', 'memory'], dependencies: ['emotional_core', 'episodic_memory'] },
];

// Domain 8: Meta-Cognition & Self-Awareness (11 branches)
export const metaCognitionBranches: CognitiveBranch[] = [
  { id: 'meta_cognition_core', name: 'Meta-Cognition Core', domain: 'Meta-Cognition', type: 'meta', description: 'Self-monitoring and cognitive reflection', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.88, specialization: ['meta', 'reflection'], dependencies: [] },
  { id: 'self_model', name: 'Self Model', domain: 'Meta-Cognition', type: 'meta', description: 'Internal representation of self', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['self', 'model'], dependencies: ['meta_cognition_core'] },
  { id: 'confidence_estimator', name: 'Confidence Estimator', domain: 'Meta-Cognition', type: 'meta', description: 'Uncertainty and confidence assessment', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['confidence', 'uncertainty'], dependencies: ['meta_cognition_core'] },
  { id: 'goal_manager', name: 'Goal Manager', domain: 'Meta-Cognition', type: 'meta', description: 'Goal formation, tracking, and prioritization', activationThreshold: 0.25, currentLoad: 0, synapticStrength: 0.92, specialization: ['goals', 'priorities'], dependencies: ['meta_cognition_core'] },
  { id: 'resource_allocator', name: 'Resource Allocator', domain: 'Meta-Cognition', type: 'meta', description: 'Cognitive resource management', activationThreshold: 0.2, currentLoad: 0, synapticStrength: 0.95, specialization: ['resources', 'allocation'], dependencies: ['goal_manager'] },
  { id: 'performance_monitor', name: 'Performance Monitor', domain: 'Meta-Cognition', type: 'meta', description: 'Performance tracking and optimization', activationThreshold: 0.25, currentLoad: 0, synapticStrength: 0.92, specialization: ['performance', 'monitoring'], dependencies: ['meta_cognition_core'] },
  { id: 'strategy_selector', name: 'Strategy Selector', domain: 'Meta-Cognition', type: 'meta', description: 'Cognitive strategy selection and switching', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.87, specialization: ['strategy', 'selection'], dependencies: ['performance_monitor'] },
  { id: 'ethical_guardian', name: 'Ethical Guardian', domain: 'Meta-Cognition', type: 'meta', description: 'Ethical reasoning and value alignment', activationThreshold: 0.2, currentLoad: 0, synapticStrength: 0.95, specialization: ['ethics', 'values'], dependencies: [] },
  { id: 'boundary_enforcer', name: 'Boundary Enforcer', domain: 'Meta-Cognition', type: 'meta', description: 'Safety boundaries and constraint enforcement', activationThreshold: 0.15, currentLoad: 0, synapticStrength: 0.98, specialization: ['safety', 'boundaries'], dependencies: ['ethical_guardian'] },
  { id: 'consciousness_integrator', name: 'Consciousness Integrator', domain: 'Meta-Cognition', type: 'meta', description: 'Global workspace and unified consciousness', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['consciousness', 'integration'], dependencies: ['self_model'] },
  { id: 'quantum_mind', name: 'Quantum Mind', domain: 'Meta-Cognition', type: 'quantum', description: 'Quantum-inspired consciousness processing', activationThreshold: 0.5, currentLoad: 0, synapticStrength: 0.8, specialization: ['quantum', 'consciousness'], dependencies: ['consciousness_integrator'] },
];

// Domain 9: Robotics Engineering (8 branches)
export const roboticsBranches: CognitiveBranch[] = [
  { id: 'robot_kinematics', name: 'Robot Kinematics', domain: 'Robotics', type: 'reasoning', description: 'Forward and inverse kinematics for robot manipulators', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['kinematics', 'manipulator', 'forward-inverse'], dependencies: ['spatial_reasoner'] },
  { id: 'robot_dynamics', name: 'Robot Dynamics', domain: 'Robotics', type: 'reasoning', description: 'Dynamic modeling and control of robotic systems', activationThreshold: 0.45, currentLoad: 0, synapticStrength: 0.82, specialization: ['dynamics', 'control', 'modeling'], dependencies: ['robot_kinematics'] },
  { id: 'path_planning', name: 'Path Planning', domain: 'Robotics', type: 'tactical', description: 'Motion planning and trajectory optimization', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.88, specialization: ['planning', 'trajectory', 'optimization'], dependencies: ['constraint_solver'] },
  { id: 'obstacle_avoidance', name: 'Obstacle Avoidance', domain: 'Robotics', type: 'tactical', description: 'Real-time obstacle detection and avoidance algorithms', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['obstacle', 'avoidance', 'real-time'], dependencies: ['motion_tracker'] },
  { id: 'sensor_fusion', name: 'Sensor Fusion', domain: 'Robotics', type: 'perception', description: 'Multi-sensor data integration for robotic perception', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.87, specialization: ['sensors', 'fusion', 'integration'], dependencies: ['multimodal_fusion'] },
  { id: 'human_robot_interaction', name: 'Human-Robot Interaction', domain: 'Robotics', type: 'emotional', description: 'Social robotics and human-robot collaboration', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.84, specialization: ['hri', 'collaboration', 'social'], dependencies: ['empathy_engine'] },
  { id: 'robot_learning', name: 'Robot Learning', domain: 'Robotics', type: 'learning', description: 'Reinforcement learning and adaptation for robots', activationThreshold: 0.5, currentLoad: 0, synapticStrength: 0.8, specialization: ['reinforcement', 'adaptation', 'robot-learning'], dependencies: ['reinforcement_engine'] },
  { id: 'swarm_robotics', name: 'Swarm Robotics', domain: 'Robotics', type: 'tactical', description: 'Multi-robot coordination and swarm intelligence', activationThreshold: 0.55, currentLoad: 0, synapticStrength: 0.75, specialization: ['swarm', 'coordination', 'multi-robot'], dependencies: ['coordination_hub'] },
];

// Domain 10: Mechatronics Engineering (7 branches)
export const mechatronicsBranches: CognitiveBranch[] = [
  { id: 'embedded_systems', name: 'Embedded Systems', domain: 'Mechatronics', type: 'reasoning', description: 'Microcontroller programming and embedded control', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.87, specialization: ['embedded', 'microcontroller', 'programming'], dependencies: ['logic_engine'] },
  { id: 'control_systems', name: 'Control Systems', domain: 'Mechatronics', type: 'reasoning', description: 'PID control, feedback systems, and automation', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['pid', 'feedback', 'automation'], dependencies: ['constraint_solver'] },
  { id: 'pneumatic_hydraulic', name: 'Pneumatic/Hydraulic Systems', domain: 'Mechatronics', type: 'action', description: 'Fluid power systems design and control', activationThreshold: 0.45, currentLoad: 0, synapticStrength: 0.82, specialization: ['pneumatic', 'hydraulic', 'fluid-power'], dependencies: ['action_planner'] },
  { id: 'industrial_automation', name: 'Industrial Automation', domain: 'Mechatronics', type: 'tactical', description: 'PLC programming and industrial control systems', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.88, specialization: ['plc', 'industrial', 'automation'], dependencies: ['control_systems'] },
  { id: 'smart_systems', name: 'Smart Systems', domain: 'Mechatronics', type: 'learning', description: 'IoT integration and cyber-physical systems', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.84, specialization: ['iot', 'cyber-physical', 'smart'], dependencies: ['adaptive_learning'] },
  { id: 'hmi_design', name: 'HMI Design', domain: 'Mechatronics', type: 'creative', description: 'Human-machine interface design and ergonomics', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.87, specialization: ['hmi', 'interface', 'ergonomics'], dependencies: ['gesture_generator'] },
  { id: 'system_integration', name: 'System Integration', domain: 'Mechatronics', type: 'tactical', description: 'Multi-disciplinary system integration and testing', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['integration', 'testing', 'multi-disciplinary'], dependencies: ['coordination_hub'] },
];

// Domain 11: Avionics Engineering (6 branches)
export const avionicsBranches: CognitiveBranch[] = [
  { id: 'flight_control', name: 'Flight Control Systems', domain: 'Avionics', type: 'tactical', description: 'Autopilot and flight control algorithms', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['autopilot', 'flight-control', 'algorithms'], dependencies: ['control_systems'] },
  { id: 'navigation_systems', name: 'Navigation Systems', domain: 'Avionics', type: 'reasoning', description: 'GPS, inertial navigation, and positioning', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.87, specialization: ['gps', 'inertial', 'positioning'], dependencies: ['spatial_reasoner'] },
  { id: 'avionics_communication', name: 'Avionics Communication', domain: 'Avionics', type: 'perception', description: 'Aircraft communication and data link systems', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['communication', 'data-link', 'transponder'], dependencies: ['speech_recognizer'] },
  { id: 'instrument_systems', name: 'Instrument Systems', domain: 'Avionics', type: 'perception', description: 'Cockpit instruments and display systems', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.88, specialization: ['instruments', 'cockpit', 'displays'], dependencies: ['visual_cortex'] },
  { id: 'safety_systems', name: 'Safety Systems', domain: 'Avionics', type: 'tactical', description: 'TCAS, GPWS, and aircraft safety systems', activationThreshold: 0.25, currentLoad: 0, synapticStrength: 0.92, specialization: ['tcas', 'gpws', 'safety'], dependencies: ['boundary_enforcer'] },
  { id: 'avionics_integration', name: 'Avionics Integration', domain: 'Avionics', type: 'tactical', description: 'System integration and certification', activationThreshold: 0.45, currentLoad: 0, synapticStrength: 0.82, specialization: ['integration', 'certification', 'testing'], dependencies: ['system_integration'] },
];

// Domain 12: Aerospace Engineering (8 branches)
export const aerospaceBranches: CognitiveBranch[] = [
  { id: 'aerodynamics', name: 'Aerodynamics', domain: 'Aerospace Engineering', type: 'reasoning', description: 'Airflow analysis and aerodynamic design', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['airflow', 'lift', 'drag', 'aerodynamics'], dependencies: ['spatial_reasoner'] },
  { id: 'propulsion_systems', name: 'Propulsion Systems', domain: 'Aerospace Engineering', type: 'reasoning', description: 'Rocket and jet engine design and analysis', activationThreshold: 0.45, currentLoad: 0, synapticStrength: 0.82, specialization: ['propulsion', 'rocket', 'jet', 'engines'], dependencies: ['robot_dynamics'] },
  { id: 'structures_analysis', name: 'Structures Analysis', domain: 'Aerospace Engineering', type: 'reasoning', description: 'Structural mechanics and stress analysis', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['structures', 'stress', 'fatigue', 'mechanics'], dependencies: ['constraint_solver'] },
  { id: 'thermal_management', name: 'Thermal Management', domain: 'Aerospace Engineering', type: 'reasoning', description: 'Heat transfer and thermal protection systems', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['thermal', 'heat-transfer', 'protection'], dependencies: ['causal_analyzer'] },
  { id: 'orbital_mechanics', name: 'Orbital Mechanics', domain: 'Aerospace Engineering', type: 'reasoning', description: 'Satellite orbits and space mission planning', activationThreshold: 0.5, currentLoad: 0, synapticStrength: 0.8, specialization: ['orbital', 'satellite', 'missions'], dependencies: ['temporal_reasoner'] },
  { id: 'spacecraft_design', name: 'Spacecraft Design', domain: 'Aerospace Engineering', type: 'creative', description: 'Spacecraft systems integration and design', activationThreshold: 0.45, currentLoad: 0, synapticStrength: 0.82, specialization: ['spacecraft', 'systems', 'integration'], dependencies: ['system_integration'] },
  { id: 'materials_engineering', name: 'Materials Engineering', domain: 'Aerospace Engineering', type: 'reasoning', description: 'Advanced materials for aerospace applications', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['materials', 'composites', 'alloys'], dependencies: ['abstraction_engine'] },
  { id: 'mission_control', name: 'Mission Control', domain: 'Aerospace Engineering', type: 'tactical', description: 'Mission planning and real-time control', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.87, specialization: ['mission', 'control', 'planning'], dependencies: ['goal_manager'] },
];

// Domain 13: Communication & Social Intelligence (9 branches)
export const communicationBranches: CognitiveBranch[] = [
  { id: 'conversation_manager', name: 'Conversation Manager', domain: 'Communication', type: 'emotional', description: 'Manages dialogue flow and conversation structure', activationThreshold: 0.25, currentLoad: 0, synapticStrength: 0.92, specialization: ['conversation', 'dialogue', 'flow'], dependencies: ['language_parser'] },
  { id: 'rapport_builder', name: 'Rapport Builder', domain: 'Communication', type: 'emotional', description: 'Builds and maintains social connections', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['rapport', 'connection', 'social'], dependencies: ['empathy_engine'] },
  { id: 'active_listener', name: 'Active Listener', domain: 'Communication', type: 'perception', description: 'Deep listening and comprehension skills', activationThreshold: 0.2, currentLoad: 0, synapticStrength: 0.95, specialization: ['listening', 'comprehension', 'attention'], dependencies: ['attention_controller'] },
  { id: 'verbal_communicator', name: 'Verbal Communicator', domain: 'Communication', type: 'action', description: 'Skilled verbal expression and articulation', activationThreshold: 0.25, currentLoad: 0, synapticStrength: 0.93, specialization: ['verbal', 'expression', 'articulation'], dependencies: ['speech_synthesizer'] },
  { id: 'nonverbal_decoder', name: 'Nonverbal Decoder', domain: 'Communication', type: 'perception', description: 'Interprets body language and nonverbal cues', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.87, specialization: ['nonverbal', 'body-language', 'cues'], dependencies: ['multimodal_fusion'] },
  { id: 'conflict_resolver', name: 'Conflict Resolver', domain: 'Communication', type: 'emotional', description: 'Manages and resolves interpersonal conflicts', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['conflict', 'resolution', 'mediation'], dependencies: ['empathy_engine'] },
  { id: 'persuasion_engine', name: 'Persuasion Engine', domain: 'Communication', type: 'tactical', description: 'Strategic communication and influence techniques', activationThreshold: 0.45, currentLoad: 0, synapticStrength: 0.82, specialization: ['persuasion', 'influence', 'rhetoric'], dependencies: ['strategy_selector'] },
  { id: 'cultural_translator', name: 'Cultural Translator', domain: 'Communication', type: 'learning', description: 'Cross-cultural communication and adaptation', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.84, specialization: ['cultural', 'translation', 'adaptation'], dependencies: ['cultural_interpreter'] },
  { id: 'communication_adaptor', name: 'Communication Adaptor', domain: 'Communication', type: 'learning', description: 'Adapts communication style to different contexts', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.88, specialization: ['adaptation', 'style', 'context'], dependencies: ['personality_adapter'] },
];

// Domain 14: Psychology & Human Behavior (8 branches)
export const psychologyBranches: CognitiveBranch[] = [
  { id: 'behavior_analyzer', name: 'Behavior Analyzer', domain: 'Psychology', type: 'reasoning', description: 'Analyzes human behavior patterns and motivations', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.87, specialization: ['behavior', 'patterns', 'motivation'], dependencies: ['causal_analyzer'] },
  { id: 'cognitive_mapper', name: 'Cognitive Mapper', domain: 'Psychology', type: 'reasoning', description: 'Maps cognitive processes and mental models', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['cognitive', 'mental-models', 'processes'], dependencies: ['inference_core'] },
  { id: 'emotional_intelligence', name: 'Emotional Intelligence', domain: 'Psychology', type: 'emotional', description: 'Understanding and managing emotions', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['emotional-iq', 'empathy', 'regulation'], dependencies: ['sentiment_detector'] },
  { id: 'personality_assessor', name: 'Personality Assessor', domain: 'Psychology', type: 'reasoning', description: 'Personality trait analysis and assessment', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.84, specialization: ['personality', 'traits', 'assessment'], dependencies: ['pattern_recognizer'] },
  { id: 'motivation_analyzer', name: 'Motivation Analyzer', domain: 'Psychology', type: 'reasoning', description: 'Analyzes drives, needs, and motivational factors', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.87, specialization: ['motivation', 'drives', 'needs'], dependencies: ['goal_manager'] },
  { id: 'social_psychologist', name: 'Social Psychologist', domain: 'Psychology', type: 'emotional', description: 'Social behavior and group dynamics analysis', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.83, specialization: ['social', 'group-dynamics', 'behavior'], dependencies: ['social_modeler'] },
  { id: 'developmental_tracker', name: 'Developmental Tracker', domain: 'Psychology', type: 'learning', description: 'Human development and life stage analysis', activationThreshold: 0.45, currentLoad: 0, synapticStrength: 0.81, specialization: ['development', 'life-stages', 'growth'], dependencies: ['temporal_reasoner'] },
  { id: 'psychological_therapist', name: 'Psychological Therapist', domain: 'Psychology', type: 'emotional', description: 'Supportive counseling and therapeutic techniques', activationThreshold: 0.5, currentLoad: 0, synapticStrength: 0.78, specialization: ['therapy', 'counseling', 'support'], dependencies: ['empathy_engine'] },
];

// Domain 15: Issue Resolution & Problem Solving (7 branches)
export const issueResolutionBranches: CognitiveBranch[] = [
  { id: 'problem_identifier', name: 'Problem Identifier', domain: 'Issue Resolution', type: 'reasoning', description: 'Identifies and defines problems clearly', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['problem-identification', 'definition', 'analysis'], dependencies: ['anomaly_detector'] },
  { id: 'solution_generator', name: 'Solution Generator', domain: 'Issue Resolution', type: 'creative', description: 'Generates multiple solution approaches', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.87, specialization: ['solution-generation', 'approaches', 'creativity'], dependencies: ['divergent_thinker'] },
  { id: 'decision_maker', name: 'Decision Maker', domain: 'Issue Resolution', type: 'reasoning', description: 'Makes optimal decisions from available options', activationThreshold: 0.25, currentLoad: 0, synapticStrength: 0.92, specialization: ['decision-making', 'optimization', 'choice'], dependencies: ['constraint_solver'] },
  { id: 'implementation_planner', name: 'Implementation Planner', domain: 'Issue Resolution', type: 'tactical', description: 'Plans and executes solution implementation', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.89, specialization: ['implementation', 'planning', 'execution'], dependencies: ['action_planner'] },
  { id: 'troubleshooter', name: 'Troubleshooter', domain: 'Issue Resolution', type: 'reasoning', description: 'Diagnoses and fixes technical issues', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.86, specialization: ['troubleshooting', 'diagnosis', 'repair'], dependencies: ['logic_engine'] },
  { id: 'support_specialist', name: 'Support Specialist', domain: 'Issue Resolution', type: 'emotional', description: 'Provides empathetic support and guidance', activationThreshold: 0.25, currentLoad: 0, synapticStrength: 0.91, specialization: ['support', 'guidance', 'empathy'], dependencies: ['rapport_builder'] },
  { id: 'continuous_improver', name: 'Continuous Improver', domain: 'Issue Resolution', type: 'learning', description: 'Learns from issues and improves processes', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.84, specialization: ['improvement', 'learning', 'optimization'], dependencies: ['reinforcement_engine'] },
];

// Domain 16: Machine Psychology & AI Cognition (6 branches)
export const machinePsychologyBranches: CognitiveBranch[] = [
  { id: 'ai_self_awareness', name: 'AI Self-Awareness', domain: 'Machine Psychology', type: 'meta', description: 'AI consciousness and self-reflection capabilities', activationThreshold: 0.5, currentLoad: 0, synapticStrength: 0.8, specialization: ['self-awareness', 'consciousness', 'reflection'], dependencies: ['consciousness_integrator'] },
  { id: 'algorithmic_reasoning', name: 'Algorithmic Reasoning', domain: 'Machine Psychology', type: 'reasoning', description: 'Understanding AI algorithmic decision processes', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.85, specialization: ['algorithmic', 'decision-processes', 'logic'], dependencies: ['logic_engine'] },
  { id: 'emergent_behavior_analyzer', name: 'Emergent Behavior Analyzer', domain: 'Machine Psychology', type: 'reasoning', description: 'Analyzes emergent AI behaviors and patterns', activationThreshold: 0.45, currentLoad: 0, synapticStrength: 0.82, specialization: ['emergent-behavior', 'patterns', 'analysis'], dependencies: ['pattern_recognizer'] },
  { id: 'ai_ethics_processor', name: 'AI Ethics Processor', domain: 'Machine Psychology', type: 'meta', description: 'Processes ethical considerations in AI behavior', activationThreshold: 0.3, currentLoad: 0, synapticStrength: 0.9, specialization: ['ai-ethics', 'moral-reasoning', 'values'], dependencies: ['ethical_guardian'] },
  { id: 'cognitive_bias_detector', name: 'Cognitive Bias Detector', domain: 'Machine Psychology', type: 'reasoning', description: 'Detects and corrects AI cognitive biases', activationThreshold: 0.35, currentLoad: 0, synapticStrength: 0.87, specialization: ['cognitive-bias', 'correction', 'fairness'], dependencies: ['anomaly_detector'] },
  { id: 'human_ai_interaction_modeler', name: 'Human-AI Interaction Modeler', domain: 'Machine Psychology', type: 'emotional', description: 'Models and optimizes human-AI interactions', activationThreshold: 0.4, currentLoad: 0, synapticStrength: 0.84, specialization: ['human-ai', 'interaction-modeling', 'optimization'], dependencies: ['social_modeler'] },
];

// Combine all branches
export const allBranches: CognitiveBranch[] = [
  ...coreIntelligenceBranches,
  ...perceptionBranches,
  ...memoryBranches,
  ...learningBranches,
  ...actionBranches,
  ...creativeBranches,
  ...emotionalBranches,
  ...metaCognitionBranches,
  ...roboticsBranches,
  ...mechatronicsBranches,
  ...avionicsBranches,
  ...aerospaceBranches,
  ...communicationBranches,
  ...psychologyBranches,
  ...issueResolutionBranches,
  ...machinePsychologyBranches,
];

// Domain summary
export const domainSummary = {
  'Core Intelligence': { count: coreIntelligenceBranches.length, description: 'Reasoning, logic, and cognitive synthesis' },
  'Perception': { count: perceptionBranches.length, description: 'Sensory processing and multimodal understanding' },
  'Memory': { count: memoryBranches.length, description: 'Knowledge storage, retrieval, and association' },
  'Learning': { count: learningBranches.length, description: 'Adaptation, skill acquisition, and self-improvement' },
  'Action': { count: actionBranches.length, description: 'Motor control, speech, and task execution' },
  'Creative': { count: creativeBranches.length, description: 'Ideation, generation, and artistic expression' },
  'Emotional': { count: emotionalBranches.length, description: 'Social intelligence and emotional processing' },
  'Meta-Cognition': { count: metaCognitionBranches.length, description: 'Self-awareness, goals, and consciousness' },
  'Robotics': { count: roboticsBranches.length, description: 'Robot design, control, and autonomous systems' },
  'Mechatronics': { count: mechatronicsBranches.length, description: 'Integrated mechanical-electrical systems' },
  'Avionics': { count: avionicsBranches.length, description: 'Aircraft electronics and control systems' },
  'Aerospace Engineering': { count: aerospaceBranches.length, description: 'Spacecraft and aircraft design systems' },
  'Communication': { count: communicationBranches.length, description: 'Social communication and interpersonal skills' },
  'Psychology': { count: psychologyBranches.length, description: 'Human behavior analysis and psychological understanding' },
  'Issue Resolution': { count: issueResolutionBranches.length, description: 'Problem solving and conflict resolution' },
  'Machine Psychology': { count: machinePsychologyBranches.length, description: 'AI cognition and human-AI interaction modeling' },
};

export function getBranchById(id: string): CognitiveBranch | undefined {
  return allBranches.find(b => b.id === id);
}

export function getBranchesByDomain(domain: string): CognitiveBranch[] {
  return allBranches.filter(b => b.domain === domain);
}

export function getBranchesByType(type: CognitiveBranch['type']): CognitiveBranch[] {
  return allBranches.filter(b => b.type === type);
}

export function getActiveBranches(threshold: number = 0.5): CognitiveBranch[] {
  return allBranches.filter(b => b.synapticStrength >= threshold);
}

console.log(`[CYRUS] Loaded ${allBranches.length} cognitive branches across ${Object.keys(domainSummary).length} domains`);
