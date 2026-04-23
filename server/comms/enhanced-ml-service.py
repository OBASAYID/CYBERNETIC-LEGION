#!/usr/bin/env python3
"""
Enhanced ML Service v2.0
Advanced machine learning service for communication intelligence
with international calling and cross-network analysis capabilities
"""

import time
import threading
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, TypedDict
from collections import defaultdict, deque
import numpy as np
import sys
import os

# Type definitions
class UserPattern(TypedDict):
    message_count: int
    last_activity: datetime
    sentiment_history: List[float]
    topics: Dict[str, int]  # Changed from set to dict for update() method
    network_patterns: Dict[str, List[Dict[str, Any]]]
    international_communication: List[Dict[str, Any]]
    communication_times: List[datetime]
    network_performance: List[float]
    communication_style: Dict[str, Any]

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    import nltk
    from nltk.sentiment import SentimentIntensityAnalyzer
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    import joblib
    from textblob import TextBlob
except ImportError as e:
    print(f"Missing required packages: {e}")
    print("Installing required packages...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install",
                          "flask", "flask-cors", "nltk", "scikit-learn",
                          "joblib", "textblob"])
    # Retry imports
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    import nltk
    from nltk.sentiment import SentimentIntensityAnalyzer
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    import joblib
    from textblob import TextBlob

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class EnhancedMLService:
    def __init__(self):
        self.app = Flask(__name__)
        CORS(self.app)

        # Initialize NLTK
        try:
            nltk.data.find('vader_lexicon')
        except LookupError:
            nltk.download('vader_lexicon', quiet=True)
        try:
            nltk.data.find('punkt')
        except LookupError:
            nltk.download('punkt', quiet=True)

        # Initialize ML components
        self.sentiment_analyzer = SentimentIntensityAnalyzer()
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.scaler = StandardScaler()

        # Load or initialize ML models
        self.models_loaded = False
        self.load_or_initialize_models()

        # Data storage for analysis
        self.message_history = deque(maxlen=10000)
        self.user_patterns: Dict[str, UserPattern] = defaultdict(lambda: UserPattern(
            message_count=0,
            last_activity=datetime.now(),
            sentiment_history=[],
            topics={},
            network_patterns={},
            international_communication=[],
            communication_times=[],
            network_performance=[],
            communication_style={}
        ))

        self.network_analysis = defaultdict(lambda: {
            'quality_metrics': [],
            'latency_patterns': [],
            'bandwidth_usage': [],
            'international_routes': [],
            'error_rates': []
        })

        # International communication patterns
        self.country_patterns = defaultdict(lambda: {
            'message_volume': 0,
            'sentiment_avg': 0,
            'common_topics': set(),
            'communication_times': [],
            'network_performance': []
        })

        # Real-time monitoring
        self.monitoring_active = False
        self.monitoring_thread = None

        self.setup_routes()
        self.setup_training_routes()
        logger.info("Enhanced ML Service v2.0 initialized")
    def _get_training_pipeline(self):
        try:
            from server.quantum_ai.training_pipeline import training_pipeline as tp
            return tp, None
        except Exception as e1:
            try:
                import os, sys
                base = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
                if base not in sys.path:
                    sys.path.insert(0, base)
                from quantum_ai.training_pipeline import training_pipeline as tp
                return tp, None
            except Exception as e2:
                return None, f"{e1}; {e2}"

    def setup_training_routes(self):
        @self.app.route('/api/training/start', methods=['POST'])
        def training_start():
            tp, err = self._get_training_pipeline()
            if tp is None:
                return jsonify({'error': 'training pipeline unavailable', 'details': err}), 503
            config = request.get_json(silent=True) or {}
            return jsonify(tp.start_training(config))

        @self.app.route('/api/training/status', methods=['GET'])
        def training_status():
            tp, err = self._get_training_pipeline()
            if tp is None:
                return jsonify({'error': 'training pipeline unavailable', 'details': err}), 503
            return jsonify(tp.get_status())

        @self.app.route('/api/training/models', methods=['GET'])
        def training_models():
            tp, err = self._get_training_pipeline()
            if tp is None:
                return jsonify({'error': 'training pipeline unavailable', 'details': err}), 503
            return jsonify(tp.get_model_info())

        @self.app.route('/api/training/classify', methods=['POST'])
        def training_classify():
            tp, err = self._get_training_pipeline()
            if tp is None:
                return jsonify({'error': 'training pipeline unavailable', 'details': err}), 503
            body = request.get_json(silent=True) or {}
            query = body.get('query', '')
            if not query:
                return jsonify({'error': 'query required'}), 400
            return jsonify(tp.classify_query(query))

        @self.app.route('/api/training/stop', methods=['POST'])
        def training_stop():
            tp, err = self._get_training_pipeline()
            if tp is None:
                return jsonify({'error': 'training pipeline unavailable', 'details': err}), 503
            return jsonify(tp.stop_training())


    def load_or_initialize_models(self):
        """Load pre-trained models or initialize new ones"""
        try:
            # Try to load existing models
            self.vectorizer = joblib.load('models/vectorizer.pkl')
            self.kmeans_model = joblib.load('models/kmeans.pkl')
            self.models_loaded = True
            logger.info("Pre-trained models loaded successfully")
        except:
            # Initialize new models
            logger.info("Initializing new ML models...")
            self.kmeans_model = KMeans(n_clusters=5, random_state=42, n_init=10)
            self.models_loaded = False



    def setup_routes(self):
        """Setup Flask routes for the ML service"""

        @self.app.route('/health', methods=['GET'])
        def health_check():
            return jsonify({
                'status': 'healthy',
                'version': '2.0',
                'features': [
                    'sentiment_analysis',
                    'topic_clustering',
                    'anomaly_detection',
                    'international_analysis',
                    'network_optimization',
                    'communication_intelligence'
                ],
                'models_loaded': self.models_loaded,
                'message_history_size': len(self.message_history),
                'active_users': len(self.user_patterns)
            })

        @self.app.route('/analyze/sentiment', methods=['POST'])
        def analyze_sentiment():
            try:
                data = request.get_json()
                text = data.get('text', '')
                context = data.get('context', {})
                international = data.get('international', False)

                if not text:
                    return jsonify({'error': 'Text is required'}), 400

                # Enhanced sentiment analysis
                sentiment = self.analyze_sentiment_enhanced(text, context, international)

                return jsonify({
                    'sentiment': sentiment,
                    'confidence': sentiment.get('confidence', 0.8),
                    'international_context': international
                })

            except Exception as e:
                logger.error(f"Sentiment analysis error: {e}")
                return jsonify({'error': str(e)}), 500

        @self.app.route('/analyze/communication', methods=['POST'])
        def analyze_communication():
            try:
                data = request.get_json()
                messages = data.get('messages', [])
                user_id = data.get('user_id', '')
                network_info = data.get('network_info', {})

                if not messages:
                    return jsonify({'error': 'Messages are required'}), 400

                # Enhanced communication analysis
                analysis = self.analyze_communication_patterns(messages, user_id, network_info)

                return jsonify(analysis)

            except Exception as e:
                logger.error(f"Communication analysis error: {e}")
                return jsonify({'error': str(e)}), 500

        @self.app.route('/analyze/network', methods=['POST'])
        def analyze_network():
            try:
                data = request.get_json()
                network_data = data.get('network_data', {})
                user_id = data.get('user_id', '')

                # Network quality and optimization analysis
                analysis = self.analyze_network_performance(network_data, user_id)

                return jsonify(analysis)

            except Exception as e:
                logger.error(f"Network analysis error: {e}")
                return jsonify({'error': str(e)}), 500

        @self.app.route('/analyze/international', methods=['POST'])
        def analyze_international():
            try:
                data = request.get_json()
                communication_data = data.get('communication_data', {})
                countries = data.get('countries', [])

                # International communication analysis
                analysis = self.analyze_international_patterns(communication_data, countries)

                return jsonify(analysis)

            except Exception as e:
                logger.error(f"International analysis error: {e}")
                return jsonify({'error': str(e)}), 500

        @self.app.route('/detect/anomalies', methods=['POST'])
        def detect_anomalies():
            try:
                data = request.get_json()
                user_id = data.get('user_id', '')
                recent_activity = data.get('recent_activity', [])

                # Anomaly detection in communication patterns
                anomalies = self.detect_communication_anomalies(user_id, recent_activity)

                return jsonify({
                    'anomalies': anomalies,
                    'risk_level': self.calculate_risk_level(anomalies)
                })

            except Exception as e:
                logger.error(f"Anomaly detection error: {e}")
                return jsonify({'error': str(e)}), 500

        @self.app.route('/optimize/quality', methods=['POST'])
        def optimize_quality():
            try:
                data = request.get_json()
                network_info = data.get('network_info', {})
                call_type = data.get('call_type', 'voice')
                international = data.get('international', False)

                # Quality optimization recommendations
                optimizations = self.optimize_communication_quality(network_info, call_type, international)

                return jsonify({
                    'optimizations': optimizations,
                    'expected_improvement': self.calculate_expected_improvement(optimizations)
                })

            except Exception as e:
                logger.error(f"Quality optimization error: {e}")
                return jsonify({'error': str(e)}), 500

        @self.app.route('/intelligence/user/<user_id>', methods=['GET'])
        def get_user_intelligence(user_id):
            try:
                intelligence = self.get_user_communication_intelligence(user_id)

                return jsonify(intelligence)

            except Exception as e:
                logger.error(f"User intelligence error: {e}")
                return jsonify({'error': str(e)}), 500

        @self.app.route('/intelligence/global', methods=['GET'])
        def get_global_intelligence():
            try:
                intelligence = self.get_global_communication_intelligence()

                return jsonify(intelligence)

            except Exception as e:
                logger.error(f"Global intelligence error: {e}")
                return jsonify({'error': str(e)}), 500


    def analyze_sentiment_enhanced(self, text: str, context: Optional[Dict] = None, international: bool = False) -> Dict[str, Any]:
        """Enhanced sentiment analysis with context and international support"""
        try:
            # Basic VADER sentiment
            vader_scores = self.sentiment_analyzer.polarity_scores(text)

            # TextBlob for additional analysis
            blob = TextBlob(text)
            textblob_polarity = blob.sentiment.polarity
            textblob_subjectivity = blob.sentiment.subjectivity

            # Enhanced scoring with context
            context_multiplier = 1.0
            if context:
                if context.get('urgent', False):
                    context_multiplier *= 1.2
                if context.get('emotional', False):
                    context_multiplier *= 1.1
                if international:
                    # Adjust for cultural differences in international communication
                    context_multiplier *= 0.95

            # Combine scores
            compound_score = vader_scores['compound'] * context_multiplier
            polarity_score = (vader_scores['pos'] - vader_scores['neg']) * context_multiplier

            # Determine sentiment category
            if compound_score >= 0.05:
                sentiment = 'positive'
            elif compound_score <= -0.05:
                sentiment = 'negative'
            else:
                sentiment = 'neutral'

            # Confidence calculation
            confidence = min(abs(compound_score) * 2, 1.0)

            # Enhanced features
            features = {
                'length': len(text),
                'has_emojis': bool('😀' <= text <= '🙏' or '❤️' in text),
                'has_capitals': any(c.isupper() for c in text),
                'question_mark': text.endswith('?'),
                'exclamation_mark': '!' in text,
                'international_indicators': international
            }

            return {
                'sentiment': sentiment,
                'compound_score': round(compound_score, 3),
                'polarity_score': round(polarity_score, 3),
                'pos_score': round(vader_scores['pos'], 3),
                'neg_score': round(vader_scores['neg'], 3),
                'neu_score': round(vader_scores['neu'], 3),
                'textblob_polarity': round(textblob_polarity, 3),
                'textblob_subjectivity': round(textblob_subjectivity, 3),
                'confidence': round(confidence, 3),
                'features': features,
                'international_adjusted': international
            }

        except Exception as e:
            logger.error(f"Enhanced sentiment analysis error: {e}")
            return {
                'sentiment': 'neutral',
                'error': str(e),
                'confidence': 0.0
            }

    def analyze_communication_patterns(self, messages: List[Dict], user_id: str, network_info: Optional[Dict] = None) -> Dict[str, Any]:
        """Analyze communication patterns for a user"""
        try:
            if not messages:
                return {'error': 'No messages to analyze'}

            # Update user patterns
            user_pattern = self.user_patterns[user_id]
            user_pattern['message_count'] += len(messages)
            user_pattern['last_activity'] = datetime.now()

            # Extract features
            sentiments = []
            topics: Dict[str, int] = {}
            message_lengths = []
            timestamps = []

            for msg in messages:
                text = msg.get('content', '')
                timestamp = msg.get('timestamp', datetime.now())

                # Sentiment analysis
                sentiment = self.analyze_sentiment_enhanced(text)
                sentiments.append(sentiment['compound_score'])

                # Topic extraction (simplified)
                words = text.lower().split()
                for word in words[:5]:  # First 5 words as topics
                    topics[word] = topics.get(word, 0) + 1

                message_lengths.append(len(text))
                timestamps.append(timestamp)

                # Store message
                self.message_history.append({
                    'user_id': user_id,
                    'content': text,
                    'sentiment': sentiment,
                    'timestamp': timestamp,
                    'network_info': network_info
                })

            # Calculate patterns
            avg_sentiment = np.mean(sentiments) if sentiments else 0
            sentiment_volatility = np.std(sentiments) if len(sentiments) > 1 else 0

            # Communication style analysis
            avg_length = np.mean(message_lengths)
            communication_frequency = len(messages) / max(1, (max(timestamps) - min(timestamps)).total_seconds() / 3600)  # messages per hour

            # Update user pattern
            user_pattern['sentiment_history'].extend(sentiments)
            for topic, count in topics.items():
                user_pattern['topics'][topic] = user_pattern['topics'].get(topic, 0) + count

            # Network pattern analysis
            if network_info:
                network_type = network_info.get('type', 'unknown')
                if network_type not in user_pattern['network_patterns']:
                    user_pattern['network_patterns'][network_type] = []
                user_pattern['network_patterns'][network_type].append({
                    'quality': network_info.get('quality', 0),
                    'timestamp': datetime.now()
                })

            return {
                'user_id': user_id,
                'message_count': len(messages),
                'avg_sentiment': round(avg_sentiment, 3),
                'sentiment_volatility': round(sentiment_volatility, 3),
                'avg_message_length': round(avg_length, 1),
                'communication_frequency': round(communication_frequency, 2),
                'dominant_topics': list(topics)[:10],
                'communication_style': {
                    'formal': avg_length > 100,
                    'concise': avg_length < 20,
                    'emotional': sentiment_volatility > 0.3,
                    'consistent': sentiment_volatility < 0.1
                },
                'network_patterns': dict(user_pattern['network_patterns']),
                'analysis_timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Communication pattern analysis error: {e}")
            return {'error': str(e)}

    def analyze_network_performance(self, network_data: Dict, user_id: str) -> Dict[str, Any]:
        """Analyze network performance and provide optimization recommendations"""
        try:
            network_type = network_data.get('type', 'unknown')
            quality = network_data.get('quality', 0)
            latency = network_data.get('latency', 0)
            bandwidth = network_data.get('bandwidth', 0)
            international = network_data.get('international', False)

            # Update network analysis
            network_analysis = self.network_analysis[network_type]
            network_analysis['quality_metrics'].append(quality)
            network_analysis['latency_patterns'].append(latency)
            network_analysis['bandwidth_usage'].append(bandwidth)

            # Keep only recent data (last 100 measurements)
            for key in network_analysis:
                if len(network_analysis[key]) > 100:
                    network_analysis[key] = network_analysis[key][-100:]

            # Calculate network health metrics
            avg_quality = np.mean(network_analysis['quality_metrics'])
            avg_latency = np.mean(network_analysis['latency_patterns'])
            avg_bandwidth = np.mean(network_analysis['bandwidth_usage'])

            quality_stability = np.std(network_analysis['quality_metrics'])

            # Network health assessment
            health_score = self.calculate_network_health(float(avg_quality), float(avg_latency), float(quality_stability))

            # Optimization recommendations
            recommendations = []

            if avg_quality < 70:
                recommendations.append({
                    'type': 'quality',
                    'priority': 'high',
                    'action': 'Switch to better network or optimize codec settings',
                    'expected_improvement': '20-30%'
                })

            if avg_latency > 100:
                recommendations.append({
                    'type': 'latency',
                    'priority': 'high',
                    'action': 'Use regional servers or implement jitter buffer',
                    'expected_improvement': '15-25%'
                })

            if international and avg_quality < 80:
                recommendations.append({
                    'type': 'international',
                    'priority': 'medium',
                    'action': 'Use international routing optimization',
                    'expected_improvement': '10-20%'
                })

            return {
                'network_type': network_type,
                'current_metrics': {
                    'quality': round(avg_quality, 1),
                    'latency': round(avg_latency, 1),
                    'bandwidth': round(avg_bandwidth, 1),
                    'stability': round(quality_stability, 2)
                },
                'health_score': round(health_score, 2),
                'health_status': 'good' if health_score > 80 else 'fair' if health_score > 60 else 'poor',
                'recommendations': recommendations,
                'international_optimized': international,
                'analysis_timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Network performance analysis error: {e}")
            return {'error': str(e)}

    def analyze_international_patterns(self, communication_data: Dict, countries: List[str]) -> Dict[str, Any]:
        """Analyze international communication patterns"""
        try:
            patterns = {}

            for country in countries:
                country_data = self.country_patterns[country]

                # Analyze communication patterns for this country
                message_volume = country_data['message_volume']
                sentiment_avg = country_data['sentiment_avg']
                common_topics = list(country_data['common_topics'])[:10]

                # Time-based analysis
                communication_times = country_data['communication_times']
                if communication_times:
                    peak_hours = self.analyze_peak_hours(communication_times)
                else:
                    peak_hours = []

                patterns[country] = {
                    'message_volume': message_volume,
                    'avg_sentiment': round(sentiment_avg, 3),
                    'common_topics': common_topics,
                    'peak_communication_hours': peak_hours,
                    'network_performance_avg': round(float(np.mean(country_data['network_performance'])), 1) if country_data['network_performance'] else 0
                }

            # Cross-country analysis
            cross_country_insights = self.analyze_cross_country_patterns(patterns)

            return {
                'country_patterns': patterns,
                'cross_country_insights': cross_country_insights,
                'total_countries_analyzed': len(countries),
                'analysis_timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"International pattern analysis error: {e}")
            return {'error': str(e)}

    def detect_communication_anomalies(self, user_id: str, recent_activity: List[Dict]) -> List[Dict]:
        """Detect anomalies in communication patterns"""
        try:
            anomalies = []
            user_pattern = self.user_patterns[user_id]

            if not recent_activity:
                return anomalies

            # Analyze sentiment anomalies
            recent_sentiments = [msg.get('sentiment', {}).get('compound_score', 0) for msg in recent_activity]
            if user_pattern['sentiment_history']:
                historical_avg = np.mean(user_pattern['sentiment_history'])
                historical_std = np.std(user_pattern['sentiment_history'])

                for i, sentiment in enumerate(recent_sentiments):
                    if abs(sentiment - historical_avg) > 2 * historical_std:
                        anomalies.append({
                            'type': 'sentiment_anomaly',
                            'severity': 'high' if abs(sentiment - historical_avg) > 3 * historical_std else 'medium',
                            'description': f'Unusual sentiment detected: {sentiment:.2f} (normal range: {historical_avg:.2f} ± {2*historical_std:.2f})',
                            'timestamp': recent_activity[i].get('timestamp'),
                            'value': sentiment
                        })

            # Analyze frequency anomalies
            recent_timestamps = [msg.get('timestamp') for msg in recent_activity]
            if len(recent_timestamps) > 1:
                time_diffs = [(recent_timestamps[i] - recent_timestamps[i-1]).total_seconds() / 60 for i in range(1, len(recent_timestamps))]  # minutes
                avg_time_diff = np.mean(time_diffs)

                # Check for unusually frequent messages
                if avg_time_diff < 1:  # Less than 1 minute between messages
                    anomalies.append({
                        'type': 'frequency_anomaly',
                        'severity': 'medium',
                        'description': f'Unusually frequent messaging detected (avg {avg_time_diff:.1f} minutes between messages)',
                        'value': avg_time_diff
                    })

            # Analyze content anomalies
            recent_texts = [msg.get('content', '') for msg in recent_activity]
            avg_length = np.mean([len(text) for text in recent_texts])

            for i, text in enumerate(recent_texts):
                if len(text) > avg_length * 3:  # Much longer than average
                    anomalies.append({
                        'type': 'content_anomaly',
                        'severity': 'low',
                        'description': f'Unusually long message detected ({len(text)} characters vs avg {avg_length:.0f})',
                        'value': len(text)
                    })

            return anomalies

        except Exception as e:
            logger.error(f"Anomaly detection error: {e}")
            return [{'type': 'error', 'description': f'Analysis failed: {str(e)}'}]

    def optimize_communication_quality(self, network_info: Dict, call_type: str, international: bool) -> Dict[str, Any]:
        """Provide quality optimization recommendations"""
        try:
            optimizations = {
                'video_codec': 'H264',
                'audio_codec': 'OPUS',
                'video_quality': '720p',
                'audio_bitrate': 128,
                'enable_fec': False,
                'enable_plc': False,
                'jitter_buffer': 50,
                'adaptive_bitrate': True
            }

            quality = network_info.get('quality', 85)
            latency = network_info.get('latency', 25)
            bandwidth = network_info.get('bandwidth', 50000)

            # Adjust based on network conditions
            if quality < 70:
                optimizations['video_quality'] = '480p'
                optimizations['audio_bitrate'] = 64
                optimizations['enable_fec'] = True

            if latency > 100:
                optimizations['jitter_buffer'] = 100
                optimizations['enable_plc'] = True

            if bandwidth < 1000:
                optimizations['video_codec'] = 'VP8'
                optimizations['video_quality'] = '360p'

            if international:
                optimizations['enable_fec'] = True
                optimizations['jitter_buffer'] = max(optimizations['jitter_buffer'], 80)
                optimizations['international_routing'] = True

            # Call type specific optimizations
            if call_type == 'conference':
                optimizations['video_quality'] = '480p'  # Lower quality for multiple participants
            elif call_type == 'screen_share':
                optimizations['video_codec'] = 'H264'
                optimizations['video_quality'] = '1080p'

            return optimizations

        except Exception as e:
            logger.error(f"Quality optimization error: {e}")
            return {'error': str(e)}

    def get_user_communication_intelligence(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive communication intelligence for a user"""
        try:
            user_pattern = self.user_patterns[user_id]

            # Calculate intelligence metrics
            intelligence = {
                'user_id': user_id,
                'communication_profile': {
                    'total_messages': user_pattern['message_count'],
                    'avg_sentiment': round(np.mean(user_pattern['sentiment_history']), 3) if user_pattern['sentiment_history'] else 0,
                    'communication_style': user_pattern['communication_style'],
                    'preferred_networks': list(user_pattern['network_patterns'].keys()),
                    'active_hours': self.analyze_active_hours(user_pattern),
                    'topic_interests': list(user_pattern['topics'].keys())[:20]
                },
                'behavioral_patterns': {
                    'consistency_score': self.calculate_consistency_score(user_pattern),
                    'adaptability_score': self.calculate_adaptability_score(user_pattern),
                    'engagement_level': self.calculate_engagement_level(user_pattern)
                },
                'network_intelligence': {
                    'preferred_network_types': self.analyze_network_preferences(user_pattern),
                    'quality_tolerance': self.calculate_quality_tolerance(user_pattern),
                    'international_readiness': len(user_pattern['international_communication']) > 0
                },
                'last_updated': user_pattern['last_activity'].isoformat() if user_pattern['last_activity'] else None
            }

            return intelligence

        except Exception as e:
            logger.error(f"User intelligence error: {e}")
            return {'error': str(e)}

    def get_global_communication_intelligence(self) -> Dict[str, Any]:
        """Get global communication intelligence across all users"""
        try:
            total_users = len(self.user_patterns)
            total_messages = sum(p['message_count'] for p in self.user_patterns.values())

            # Aggregate global patterns
            global_sentiments = []
            network_types = set()
            international_communications = 0

            for pattern in self.user_patterns.values():
                global_sentiments.extend(pattern['sentiment_history'])
                network_types.update(pattern['network_patterns'].keys())
                international_communications += len(pattern['international_communication'])

            global_intelligence = {
                'total_users': total_users,
                'total_messages': total_messages,
                'avg_sentiment_global': round(np.mean(global_sentiments), 3) if global_sentiments else 0,
                'network_types_used': list(network_types),
                'international_communications': international_communications,
                'peak_usage_hours': self.analyze_global_peak_hours(),
                'system_health': {
                    'message_processing_rate': len(self.message_history) / max(1, (datetime.now() - datetime.now().replace(hour=0, minute=0, second=0)).total_seconds() / 3600),
                    'active_users_today': sum(1 for p in self.user_patterns.values() if p['last_activity'] and (datetime.now() - p['last_activity']).days < 1)
                },
                'generated_at': datetime.now().isoformat()
            }

            return global_intelligence

        except Exception as e:
            logger.error(f"Global intelligence error: {e}")
            return {'error': str(e)}

    # Helper methods
    def calculate_network_health(self, quality: float, latency: float, stability: float) -> float:
        """Calculate network health score (0-100)"""
        quality_score = min(quality, 100)
        latency_score = max(0, 100 - (latency / 2))  # Lower latency = higher score
        stability_score = max(0, 100 - (stability * 10))  # Lower variance = higher score

        return (quality_score * 0.5) + (latency_score * 0.3) + (stability_score * 0.2)

    def calculate_expected_improvement(self, optimizations: Dict) -> str:
        """Calculate expected improvement from optimizations"""
        improvement_factors = []

        if optimizations.get('enable_fec'):
            improvement_factors.append('FEC: +15%')
        if optimizations.get('jitter_buffer', 0) > 50:
            improvement_factors.append('Jitter Buffer: +10%')
        if optimizations.get('video_quality') in ['360p', '480p']:
            improvement_factors.append('Quality Adaptation: +20%')

        return ', '.join(improvement_factors) if improvement_factors else 'Minimal'

    def calculate_risk_level(self, anomalies: List[Dict]) -> str:
        """Calculate overall risk level from anomalies"""
        if not anomalies:
            return 'low'

        high_severity = sum(1 for a in anomalies if a.get('severity') == 'high')
        medium_severity = sum(1 for a in anomalies if a.get('severity') == 'medium')

        if high_severity > 0:
            return 'high'
        elif medium_severity > 2:
            return 'medium'
        else:
            return 'low'

    def analyze_peak_hours(self, timestamps: List[datetime]) -> List[int]:
        """Analyze peak communication hours"""
        if not timestamps:
            return []

        hours = [ts.hour for ts in timestamps]
        hour_counts = defaultdict(int)

        for hour in hours:
            hour_counts[hour] += 1

        # Return top 3 peak hours
        return sorted(hour_counts.keys(), key=lambda h: hour_counts[h], reverse=True)[:3]

    def analyze_cross_country_patterns(self, patterns: Dict) -> List[str]:
        """Analyze patterns across countries"""
        insights = []

        if len(patterns) < 2:
            return insights

        # Compare sentiment patterns
        sentiments = {country: data['avg_sentiment'] for country, data in patterns.items()}
        avg_sentiment = np.mean(list(sentiments.values()))

        for country, sentiment in sentiments.items():
            if sentiment > avg_sentiment + 0.1:
                insights.append(f"{country} shows more positive communication than average")
            elif sentiment < avg_sentiment - 0.1:
                insights.append(f"{country} shows more negative communication than average")

        return insights

    def analyze_active_hours(self, user_pattern: UserPattern) -> List[int]:
        """Analyze user's active communication hours"""
        # Simplified implementation
        return [9, 14, 19]  # Default active hours

    def calculate_consistency_score(self, user_pattern: UserPattern) -> float:
        """Calculate communication consistency score"""
        if not user_pattern['sentiment_history']:
            return 0.0

        sentiment_std = np.std(user_pattern['sentiment_history'])
        return float(max(0, 1.0 - sentiment_std))  # Lower variance = higher consistency

    def calculate_adaptability_score(self, user_pattern: UserPattern) -> float:
        """Calculate communication adaptability score"""
        network_types = len(user_pattern['network_patterns'])
        return min(1.0, network_types / 5.0)  # More networks = higher adaptability

    def calculate_engagement_level(self, user_pattern: UserPattern) -> str:
        """Calculate user engagement level"""
        message_count = user_pattern['message_count']

        if message_count > 1000:
            return 'very_high'
        elif message_count > 500:
            return 'high'
        elif message_count > 100:
            return 'medium'
        else:
            return 'low'

    def analyze_network_preferences(self, user_pattern: UserPattern) -> List[str]:
        """Analyze user's network preferences"""
        network_usage = {}
        for network_type, data in user_pattern['network_patterns'].items():
            network_usage[network_type] = len(data)

        return sorted(network_usage.keys(), key=lambda n: network_usage[n], reverse=True)

    def calculate_quality_tolerance(self, user_pattern: UserPattern) -> str:
        """Calculate user's quality tolerance"""
        # Simplified implementation
        return 'medium'

    def analyze_global_peak_hours(self) -> List[int]:
        """Analyze global peak usage hours"""
        # Simplified implementation
        return [12, 18, 21]  # Common peak hours

    def start_monitoring(self):
        """Start real-time monitoring thread"""
        if self.monitoring_active:
            return

        self.monitoring_active = True
        self.monitoring_thread = threading.Thread(target=self._monitoring_loop)
        self.monitoring_thread.daemon = True
        self.monitoring_thread.start()
        logger.info("Real-time monitoring started")

    def stop_monitoring(self):
        """Stop real-time monitoring"""
        self.monitoring_active = False
        if self.monitoring_thread:
            self.monitoring_thread.join()
        logger.info("Real-time monitoring stopped")

    def _monitoring_loop(self):
        """Real-time monitoring loop"""
        while self.monitoring_active:
            try:
                # Perform periodic analysis
                self._perform_periodic_analysis()
                time.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                time.sleep(30)

    def _perform_periodic_analysis(self):
        """Perform periodic analysis tasks"""
        # Clean old data
        cutoff_time = datetime.now() - timedelta(hours=24)
        self.message_history = deque(
            [msg for msg in self.message_history if msg['timestamp'] > cutoff_time],
            maxlen=10000
        )

        # Update user patterns
        for user_id, pattern in self.user_patterns.items():
            if pattern['last_activity'] and (datetime.now() - pattern['last_activity']).days > 7:
                # Mark inactive users
                pattern['communication_style']['inactive'] = True

    def run(self, host: str = '0.0.0.0', port: int = 5002, debug: bool = False):
        """Run the ML service"""
        logger.info(f"Starting Enhanced ML Service v2.0 on {host}:{port}")

        self.start_monitoring()

        try:
            self.app.run(host=host, port=port, debug=debug, threaded=True)
        except KeyboardInterrupt:
            logger.info("Shutting down Enhanced ML Service...")
        finally:
            self.stop_monitoring()


if __name__ == '__main__':
    service = EnhancedMLService()
    service.run()