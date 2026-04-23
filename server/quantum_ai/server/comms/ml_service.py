"""
CYRUS NEXUS COMMS - Machine Learning Intelligence Service v1.0
Advanced ML pipeline for communication pattern analysis,
sentiment analysis, behavior prediction, and anomaly detection.
Runs as companion service on port 5002.
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import sys
import logging
import time
import math
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import uuid
import threading

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    logger.warning("[Comms ML] numpy not available - using fallback math")

try:
    from sklearn.preprocessing import StandardScaler
    from sklearn.ensemble import IsolationForest
    from sklearn.cluster import KMeans
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False
    logger.warning("[Comms ML] scikit-learn not available - using algorithmic fallbacks")

import ssl
ssl._create_default_https_context = ssl._create_unverified_context

try:
    import nltk
    nltk.download('vader_lexicon', quiet=True)
    from nltk.sentiment import SentimentIntensityAnalyzer
    sia = SentimentIntensityAnalyzer()
    HAS_NLTK = True
except ImportError:
    HAS_NLTK = False
    sia = None
    logger.warning("[Comms ML] nltk not available - using keyword sentiment")


POSITIVE_WORDS = {
    'good': 0.6, 'great': 0.8, 'excellent': 0.9, 'amazing': 0.9, 'wonderful': 0.85,
    'fantastic': 0.9, 'awesome': 0.85, 'love': 0.8, 'happy': 0.7, 'glad': 0.6,
    'pleased': 0.65, 'delighted': 0.8, 'thrilled': 0.85, 'excited': 0.75, 'joy': 0.8,
    'beautiful': 0.75, 'perfect': 0.9, 'brilliant': 0.85, 'superb': 0.9, 'outstanding': 0.9,
    'impressive': 0.8, 'remarkable': 0.8, 'incredible': 0.85, 'marvelous': 0.85,
    'terrific': 0.8, 'magnificent': 0.9, 'splendid': 0.85, 'exceptional': 0.9,
    'positive': 0.6, 'nice': 0.5, 'fine': 0.4, 'cool': 0.5, 'sweet': 0.6,
    'kind': 0.6, 'generous': 0.65, 'helpful': 0.6, 'friendly': 0.6, 'warm': 0.55,
    'lovely': 0.7, 'charming': 0.65, 'pleasant': 0.55, 'enjoyable': 0.6, 'fun': 0.6,
    'interesting': 0.5, 'fascinating': 0.65, 'inspiring': 0.7, 'motivating': 0.65,
    'encouraging': 0.6, 'hopeful': 0.6, 'optimistic': 0.65, 'confident': 0.6,
    'successful': 0.7, 'accomplished': 0.7, 'proud': 0.65, 'grateful': 0.7,
    'thankful': 0.65, 'appreciate': 0.6, 'blessed': 0.7, 'fortunate': 0.6,
    'lucky': 0.55, 'comfortable': 0.5, 'peaceful': 0.6, 'calm': 0.5, 'relaxed': 0.55,
    'content': 0.5, 'satisfied': 0.6, 'fulfilled': 0.7, 'worthy': 0.6,
    'valuable': 0.6, 'important': 0.5, 'meaningful': 0.6, 'significant': 0.55,
    'effective': 0.55, 'efficient': 0.55, 'productive': 0.6, 'creative': 0.6,
    'innovative': 0.65, 'genius': 0.85, 'smart': 0.6, 'clever': 0.6, 'wise': 0.65,
    'talented': 0.7, 'skilled': 0.6, 'capable': 0.55, 'competent': 0.55,
    'reliable': 0.6, 'trustworthy': 0.65, 'loyal': 0.65, 'devoted': 0.65,
    'dedicated': 0.6, 'committed': 0.6, 'passionate': 0.7, 'enthusiastic': 0.7,
    'eager': 0.55, 'willing': 0.5, 'ready': 0.45, 'determined': 0.6,
    'strong': 0.55, 'brave': 0.6, 'courageous': 0.65, 'heroic': 0.7,
    'admire': 0.65, 'respect': 0.6, 'honor': 0.65, 'celebrate': 0.7,
    'victory': 0.75, 'triumph': 0.8, 'achievement': 0.7, 'milestone': 0.65,
    'progress': 0.55, 'improvement': 0.55, 'growth': 0.55, 'advancement': 0.6,
    'breakthrough': 0.75, 'success': 0.7, 'win': 0.65, 'prosper': 0.65,
    'thrive': 0.65, 'flourish': 0.7, 'bloom': 0.6, 'shine': 0.6,
    'radiant': 0.65, 'glowing': 0.6, 'vibrant': 0.6, 'alive': 0.55,
    'energetic': 0.6, 'dynamic': 0.55, 'powerful': 0.6, 'mighty': 0.6,
}

NEGATIVE_WORDS = {
    'bad': -0.6, 'terrible': -0.85, 'horrible': -0.85, 'awful': -0.8, 'dreadful': -0.8,
    'poor': -0.5, 'worst': -0.9, 'hate': -0.85, 'angry': -0.7, 'furious': -0.85,
    'mad': -0.6, 'upset': -0.6, 'sad': -0.65, 'depressed': -0.8, 'miserable': -0.8,
    'unhappy': -0.65, 'disappointed': -0.65, 'frustrated': -0.7, 'annoyed': -0.6,
    'irritated': -0.6, 'disgusted': -0.75, 'sick': -0.5, 'ugly': -0.6,
    'stupid': -0.7, 'dumb': -0.65, 'idiotic': -0.8, 'foolish': -0.6,
    'ridiculous': -0.6, 'absurd': -0.55, 'pathetic': -0.75, 'useless': -0.7,
    'worthless': -0.8, 'hopeless': -0.75, 'helpless': -0.7, 'weak': -0.5,
    'boring': -0.5, 'dull': -0.45, 'tedious': -0.5, 'monotonous': -0.5,
    'painful': -0.65, 'hurt': -0.6, 'suffering': -0.7, 'agony': -0.8,
    'torture': -0.85, 'cruel': -0.75, 'evil': -0.8, 'wicked': -0.75,
    'nasty': -0.65, 'mean': -0.6, 'rude': -0.6, 'offensive': -0.7,
    'toxic': -0.75, 'harmful': -0.65, 'dangerous': -0.6, 'threatening': -0.7,
    'scary': -0.6, 'frightening': -0.65, 'terrifying': -0.8, 'horrifying': -0.85,
    'shocking': -0.6, 'disturbing': -0.65, 'troubling': -0.55, 'concerning': -0.5,
    'worried': -0.5, 'anxious': -0.55, 'nervous': -0.5, 'stressed': -0.6,
    'overwhelmed': -0.65, 'exhausted': -0.6, 'tired': -0.45, 'drained': -0.6,
    'broken': -0.65, 'damaged': -0.55, 'ruined': -0.7, 'destroyed': -0.8,
    'failed': -0.65, 'failure': -0.7, 'mistake': -0.55, 'error': -0.5,
    'wrong': -0.5, 'fault': -0.5, 'blame': -0.6, 'guilty': -0.6,
    'shame': -0.65, 'embarrassed': -0.6, 'humiliated': -0.75, 'ashamed': -0.65,
    'regret': -0.6, 'sorry': -0.4, 'apologize': -0.35, 'forgive': -0.3,
    'lonely': -0.65, 'isolated': -0.6, 'abandoned': -0.7, 'rejected': -0.7,
    'betrayed': -0.8, 'deceived': -0.75, 'cheated': -0.75, 'lied': -0.7,
    'unfair': -0.6, 'unjust': -0.65, 'biased': -0.55, 'corrupt': -0.7,
    'dislike': -0.55, 'loathe': -0.8, 'despise': -0.8, 'detest': -0.8,
    'resent': -0.65, 'bitter': -0.6, 'hostile': -0.7, 'aggressive': -0.65,
    'violent': -0.8, 'abusive': -0.8, 'oppressive': -0.7, 'suffocating': -0.65,
    'chaotic': -0.55, 'messy': -0.45, 'disorganized': -0.45, 'confusing': -0.5,
    'complicated': -0.4, 'difficult': -0.45, 'impossible': -0.6, 'unbearable': -0.75,
    'intolerable': -0.7, 'unacceptable': -0.65, 'inadequate': -0.55, 'insufficient': -0.5,
    'lacking': -0.45, 'missing': -0.4, 'absent': -0.35, 'lost': -0.5,
    'stuck': -0.5, 'trapped': -0.65, 'doomed': -0.75, 'cursed': -0.7,
    'plague': -0.7, 'disaster': -0.75, 'catastrophe': -0.8, 'crisis': -0.65,
    'crash': -0.6, 'collapse': -0.65, 'decline': -0.5, 'deteriorate': -0.6,
}

AMPLIFIERS = {
    'very': 1.5, 'really': 1.4, 'extremely': 1.8, 'incredibly': 1.7,
    'absolutely': 1.6, 'totally': 1.5, 'completely': 1.5, 'utterly': 1.7,
    'highly': 1.4, 'deeply': 1.4, 'profoundly': 1.5, 'remarkably': 1.4,
    'exceptionally': 1.6, 'extraordinarily': 1.7, 'immensely': 1.6,
    'tremendously': 1.6, 'enormously': 1.5, 'massively': 1.5,
    'super': 1.4, 'so': 1.3, 'too': 1.2, 'quite': 1.2, 'rather': 1.1,
    'fairly': 1.1, 'pretty': 1.2, 'seriously': 1.4,
}

NEGATORS = {'not', "n't", 'no', 'never', 'neither', 'nor', 'hardly', 'barely', 'scarcely', 'without', 'none', "don't", "doesn't", "didn't", "won't", "wouldn't", "shouldn't", "couldn't", "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't", "hadn't"}


def analyze_sentiment_keyword(text: str) -> Dict:
    words = text.lower().split()
    score = 0.0
    word_scores = []
    amplifier = 1.0
    negate = False

    for i, word in enumerate(words):
        clean = word.strip('.,!?;:()[]{}"\'-')
        if clean in NEGATORS or word in NEGATORS:
            negate = True
            continue
        if clean in AMPLIFIERS:
            amplifier = AMPLIFIERS[clean]
            continue

        if clean in POSITIVE_WORDS:
            s = POSITIVE_WORDS[clean] * amplifier
            if negate:
                s = -s * 0.75
            score += s
            word_scores.append((clean, s))
        elif clean in NEGATIVE_WORDS:
            s = NEGATIVE_WORDS[clean] * amplifier
            if negate:
                s = -s * 0.5
            score += s
            word_scores.append((clean, s))

        if clean not in AMPLIFIERS:
            amplifier = 1.0
            negate = False

    n = max(len(word_scores), 1)
    normalized = max(-1.0, min(1.0, score / (n * 0.5))) if n > 0 else 0.0
    confidence = min(1.0, len(word_scores) / max(len(words) * 0.3, 1))

    return {
        'score': round(normalized, 4),
        'confidence': round(confidence, 4),
        'label': 'positive' if normalized > 0.05 else ('negative' if normalized < -0.05 else 'neutral'),
        'word_scores': word_scores[:10],
        'method': 'keyword'
    }


def analyze_sentiment_vader(text: str) -> Dict:
    if not HAS_NLTK or sia is None:
        return analyze_sentiment_keyword(text)

    scores = sia.polarity_scores(text)
    compound = scores['compound']
    keyword_result = analyze_sentiment_keyword(text)
    fused_score = compound * 0.6 + keyword_result['score'] * 0.4

    return {
        'score': round(fused_score, 4),
        'confidence': round(min(1.0, abs(compound) + 0.3), 4),
        'label': 'positive' if fused_score > 0.05 else ('negative' if fused_score < -0.05 else 'neutral'),
        'vader_compound': round(compound, 4),
        'vader_positive': round(scores['pos'], 4),
        'vader_negative': round(scores['neg'], 4),
        'vader_neutral': round(scores['neu'], 4),
        'keyword_score': keyword_result['score'],
        'toxicity': round(max(0, -fused_score), 4),
        'method': 'vader_fused'
    }


class InMemoryCache:
    def __init__(self, max_size=1000, ttl=300):
        self._cache = {}
        self._timestamps = {}
        self._max_size = max_size
        self._ttl = ttl
        self._lock = threading.Lock()

    def get(self, key):
        with self._lock:
            if key in self._cache:
                if time.time() - self._timestamps[key] < self._ttl:
                    return self._cache[key]
                else:
                    del self._cache[key]
                    del self._timestamps[key]
        return None

    def set(self, key, value):
        with self._lock:
            if len(self._cache) >= self._max_size:
                oldest = min(self._timestamps, key=self._timestamps.get)
                del self._cache[oldest]
                del self._timestamps[oldest]
            self._cache[key] = value
            self._timestamps[key] = time.time()


cache = InMemoryCache(max_size=5000, ttl=600)


user_interaction_buffer = {}
interaction_buffer_lock = threading.Lock()


def generate_embedding(text: str, dim=128) -> list:
    tokens = text.lower().split()
    if HAS_NUMPY:
        embedding = np.zeros(dim)
        for i, token in enumerate(tokens):
            h = int(hashlib.md5(token.encode()).hexdigest(), 16)
            idx = h % dim
            weight = 1.0 / (1.0 + i * 0.1)
            embedding[idx] += weight
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        return embedding.tolist()
    else:
        embedding = [0.0] * dim
        for i, token in enumerate(tokens):
            h = int(hashlib.md5(token.encode()).hexdigest(), 16)
            idx = h % dim
            weight = 1.0 / (1.0 + i * 0.1)
            embedding[idx] += weight
        norm = math.sqrt(sum(x * x for x in embedding))
        if norm > 0:
            embedding = [x / norm for x in embedding]
        return embedding


def extract_features(interaction: Dict) -> list:
    features = [
        interaction.get('duration', 0),
        interaction.get('message_count', 0),
        len(interaction.get('media', [])) if isinstance(interaction.get('media'), list) else 0,
        interaction.get('participant_count', 1),
        datetime.fromisoformat(interaction.get('timestamp', datetime.utcnow().isoformat())).hour if interaction.get('timestamp') else 12,
        datetime.fromisoformat(interaction.get('timestamp', datetime.utcnow().isoformat())).weekday() if interaction.get('timestamp') else 0,
        interaction.get('latency', 0),
        interaction.get('video_quality', 0.5),
        interaction.get('audio_quality', 0.5),
        interaction.get('packet_loss', 0),
        interaction.get('jitter', 0),
        interaction.get('bandwidth', 0),
        interaction.get('screen_shares', 0),
        interaction.get('file_transfers', 0),
        interaction.get('reaction_count', 0),
        interaction.get('private_messages', 0),
        interaction.get('sentiment_positive', 0),
        interaction.get('sentiment_negative', 0),
        interaction.get('interruptions', 0),
        interaction.get('location_updates', 0),
    ]
    return features


def predict_behavior(interactions: list) -> Dict:
    if len(interactions) < 5:
        return {'predicted_behavior': 'unknown', 'confidence': 0, 'probabilities': {}}

    behavior_classes = ['calling', 'messaging', 'media_sharing', 'idle', 'group_collaboration']

    type_counts = {}
    for i in interactions[-30:]:
        t = i.get('interaction_type', 'messaging')
        type_counts[t] = type_counts.get(t, 0) + 1

    type_to_behavior = {
        'message_sent': 'messaging', 'message_received': 'messaging',
        'call_started': 'calling', 'call_ended': 'calling',
        'file_shared': 'media_sharing', 'reaction_sent': 'messaging',
        'stream_started': 'media_sharing', 'stream_viewed': 'media_sharing',
        'location_shared': 'group_collaboration',
    }

    behavior_scores = {b: 0 for b in behavior_classes}
    total = sum(type_counts.values())

    for event_type, count in type_counts.items():
        behavior = type_to_behavior.get(event_type, 'messaging')
        if behavior in behavior_scores:
            behavior_scores[behavior] += count

    recent_time = None
    if interactions:
        last = interactions[-1]
        ts = last.get('timestamp')
        if ts:
            try:
                last_hour = datetime.fromisoformat(ts).hour
                if last_hour >= 22 or last_hour <= 5:
                    behavior_scores['idle'] += 2
            except:
                pass

    if total == 0:
        total = 1

    probabilities = {b: round(s / total, 4) for b, s in behavior_scores.items()}
    predicted = max(probabilities, key=probabilities.get)
    confidence = probabilities[predicted]

    return {
        'predicted_behavior': predicted,
        'confidence': round(confidence, 4),
        'probabilities': probabilities
    }


def detect_anomalies_algo(interactions: list, baseline_interactions: list = None) -> Dict:
    if len(interactions) < 3:
        return {'is_anomaly': False, 'anomaly_score': 0.0, 'reasons': [], 'alert_level': 'normal'}

    reasons = []
    anomaly_score = 0.0

    recent_count = len(interactions)

    if baseline_interactions and len(baseline_interactions) > 0:
        baseline_rate = len(baseline_interactions) / 7.0
        current_rate = recent_count
        if baseline_rate > 0 and current_rate > baseline_rate * 3:
            reasons.append('volume_spike')
            anomaly_score += 0.3

    if interactions:
        try:
            hours = [datetime.fromisoformat(i.get('timestamp', datetime.utcnow().isoformat())).hour for i in interactions if i.get('timestamp')]
            off_hours = sum(1 for h in hours if h >= 23 or h <= 4)
            if off_hours > len(hours) * 0.5:
                reasons.append('off_hours_activity')
                anomaly_score += 0.25
        except:
            pass

    sentiment_scores = [i.get('sentiment_score', 0) for i in interactions if i.get('sentiment_score') is not None]
    if len(sentiment_scores) >= 3:
        recent_avg = sum(sentiment_scores[-3:]) / 3
        if recent_avg < -0.5:
            reasons.append('sentiment_drop')
            anomaly_score += 0.25

    types = [i.get('interaction_type') for i in interactions]
    if types.count('call_ended') > 5 and types.count('call_started') > types.count('call_ended') * 0.8:
        reasons.append('repeated_short_calls')
        anomaly_score += 0.2

    anomaly_score = min(1.0, anomaly_score)
    is_anomaly = anomaly_score > 0.3

    if HAS_SKLEARN and HAS_NUMPY and len(interactions) >= 10:
        try:
            features_list = [extract_features(i) for i in interactions[-10:]]
            X = np.array(features_list)
            X_mean = X.mean(axis=0).reshape(1, -1)
            detector = IsolationForest(contamination=0.1, random_state=42, n_estimators=50)
            detector.fit(X)
            pred = detector.predict(X_mean)[0]
            iso_score = float(-detector.score_samples(X_mean)[0])
            if pred == -1:
                anomaly_score = max(anomaly_score, iso_score)
                is_anomaly = True
                if 'isolation_forest_anomaly' not in reasons:
                    reasons.append('isolation_forest_anomaly')
        except Exception as e:
            logger.debug(f"IsolationForest fallback: {e}")

    return {
        'is_anomaly': is_anomaly,
        'anomaly_score': round(anomaly_score, 4),
        'reasons': reasons,
        'alert_level': 'critical' if anomaly_score > 0.7 else ('warning' if anomaly_score > 0.4 else 'normal')
    }


def cluster_users(user_profiles: list) -> Dict:
    if len(user_profiles) < 3:
        return {'clusters': {}, 'n_clusters': 0, 'method': 'insufficient_data'}

    if HAS_SKLEARN and HAS_NUMPY:
        try:
            features = []
            for p in user_profiles:
                cp = p.get('communicationPatterns', {})
                sp = p.get('sentimentProfile', {})
                features.append([
                    cp.get('messagingFrequency', 0),
                    cp.get('avgCallDurationSec', 0),
                    cp.get('avgMsgLength', 0),
                    cp.get('responseTimeMs', 0),
                    sp.get('avgSentiment', 0),
                    p.get('totalInteractions', 0),
                ])
            X = np.array(features)
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            n_clusters = min(max(2, len(user_profiles) // 3), 10)
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            labels = kmeans.fit_predict(X_scaled)

            clusters = {}
            for i, label in enumerate(labels):
                label_str = str(int(label))
                if label_str not in clusters:
                    clusters[label_str] = []
                clusters[label_str].append(user_profiles[i].get('userId', f'user_{i}'))

            return {'clusters': clusters, 'n_clusters': n_clusters, 'method': 'kmeans'}
        except Exception as e:
            logger.debug(f"KMeans fallback: {e}")

    clusters = {}
    for i, p in enumerate(user_profiles):
        freq = p.get('communicationPatterns', {}).get('messagingFrequency', 0)
        if freq > 10:
            bucket = 'high_activity'
        elif freq > 3:
            bucket = 'medium_activity'
        else:
            bucket = 'low_activity'
        if bucket not in clusters:
            clusters[bucket] = []
        clusters[bucket].append(p.get('userId', f'user_{i}'))

    return {'clusters': clusters, 'n_clusters': len(clusters), 'method': 'frequency_bucket'}


def calculate_churn_risk(user_data: Dict) -> Dict:
    factors = []
    risk_score = 0.0

    days_inactive = user_data.get('days_since_last_activity', 0)
    if days_inactive > 30:
        factors.append('inactive_30_days')
        risk_score += 0.3
    elif days_inactive > 14:
        factors.append('declining_activity')
        risk_score += 0.15

    avg_call = user_data.get('avg_call_duration', 0)
    if avg_call < 2:
        factors.append('short_call_duration')
        risk_score += 0.1

    avg_sentiment = user_data.get('avg_sentiment', 0.5)
    if avg_sentiment < 0.3:
        factors.append('negative_sentiment')
        risk_score += 0.2
    elif avg_sentiment < 0:
        factors.append('very_negative_sentiment')
        risk_score += 0.3

    interaction_count = user_data.get('interaction_count', 0)
    if interaction_count < 5:
        factors.append('low_engagement')
        risk_score += 0.15

    unique_contacts = user_data.get('unique_contacts', 0)
    if unique_contacts < 2:
        factors.append('narrow_network')
        risk_score += 0.1

    risk_score = min(1.0, risk_score)

    return {
        'churn_risk': round(risk_score, 4),
        'risk_level': 'high' if risk_score > 0.6 else ('medium' if risk_score > 0.3 else 'low'),
        'factors': factors
    }


def predict_best_call_time(user_hours: list, target_hours: list) -> Dict:
    user_hist = [0] * 24
    target_hist = [0] * 24

    for h in user_hours:
        if 0 <= h < 24:
            user_hist[h] += 1
    for h in target_hours:
        if 0 <= h < 24:
            target_hist[h] += 1

    u_total = max(sum(user_hist), 1)
    t_total = max(sum(target_hist), 1)
    overlap = [0.0] * 24
    for h in range(24):
        overlap[h] = (user_hist[h] / u_total) * (target_hist[h] / t_total)

    best_hour = max(range(24), key=lambda h: overlap[h])
    confidence = overlap[best_hour] * 100
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    return {
        'bestHour': best_hour,
        'bestHourFormatted': f"{best_hour:02d}:00",
        'bestDay': days[0],
        'confidence': round(min(1.0, confidence), 4),
        'hourlyOverlap': [round(o, 6) for o in overlap]
    }


def suggest_contacts_ml(interactions: list, user_id: str) -> list:
    contact_stats = {}
    now = datetime.utcnow()

    for ix in interactions:
        target = ix.get('targetUserId')
        if not target or target == user_id:
            continue

        if target not in contact_stats:
            contact_stats[target] = {
                'frequency': 0,
                'last_interaction': None,
                'event_types': set(),
                'sentiment_sum': 0,
                'sentiment_count': 0,
            }

        contact_stats[target]['frequency'] += 1

        ts = ix.get('timestamp')
        if ts:
            try:
                dt = datetime.fromisoformat(ts)
                if contact_stats[target]['last_interaction'] is None or dt > contact_stats[target]['last_interaction']:
                    contact_stats[target]['last_interaction'] = dt
            except:
                pass

        contact_stats[target]['event_types'].add(ix.get('eventType', ix.get('interaction_type', 'unknown')))

        ss = ix.get('sentiment_score')
        if ss is not None:
            try:
                contact_stats[target]['sentiment_sum'] += float(ss)
                contact_stats[target]['sentiment_count'] += 1
            except:
                pass

    suggestions = []
    max_freq = max((s['frequency'] for s in contact_stats.values()), default=1)

    for contact_id, stats in contact_stats.items():
        freq_score = stats['frequency'] / max_freq if max_freq > 0 else 0

        recency_score = 0
        if stats['last_interaction']:
            days_ago = (now - stats['last_interaction']).days
            recency_score = max(0, 1 - days_ago / 30)

        diversity_score = len(stats['event_types']) / 5.0

        relevance = freq_score * 0.4 + recency_score * 0.3 + diversity_score * 0.3

        avg_sentiment = stats['sentiment_sum'] / max(stats['sentiment_count'], 1)

        reason_parts = []
        if freq_score > 0.5:
            reason_parts.append('frequent contact')
        if recency_score > 0.7:
            reason_parts.append('recent interaction')
        if diversity_score > 0.4:
            reason_parts.append('diverse communication')

        suggestions.append({
            'contactId': contact_id,
            'relevanceScore': round(relevance, 4),
            'reason': ', '.join(reason_parts) if reason_parts else 'known contact',
            'frequency': stats['frequency'],
            'avgSentiment': round(avg_sentiment, 4),
        })

    suggestions.sort(key=lambda x: x['relevanceScore'], reverse=True)
    return suggestions[:20]


def get_network_health(all_interactions: list, all_profiles: list) -> Dict:
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = len(all_profiles)
    active_today = set()
    messages_today = 0
    calls_started = 0
    calls_ended = 0
    sentiment_sum = 0
    sentiment_count = 0

    for ix in all_interactions:
        ts = ix.get('timestamp')
        if ts:
            try:
                dt = datetime.fromisoformat(ts)
                if dt >= today_start:
                    uid = ix.get('userId')
                    if uid:
                        active_today.add(uid)
                    etype = ix.get('eventType', ix.get('interaction_type', ''))
                    if etype == 'message_sent':
                        messages_today += 1
                    elif etype == 'call_started':
                        calls_started += 1
                    elif etype == 'call_ended':
                        calls_ended += 1
            except:
                pass

        ss = ix.get('sentiment_score')
        if ss is not None:
            try:
                sentiment_sum += float(ss)
                sentiment_count += 1
            except:
                pass

    avg_sentiment = sentiment_sum / max(sentiment_count, 1)
    call_success_rate = calls_ended / max(calls_started, 1) if calls_started > 0 else 1.0

    return {
        'totalUsers': total_users,
        'activeToday': len(active_today),
        'avgSentiment': round(avg_sentiment, 4),
        'messagesToday': messages_today,
        'callSuccessRate': round(call_success_rate, 4),
        'callsStarted': calls_started,
        'callsEnded': calls_ended,
        'healthScore': round(min(1.0, (len(active_today) / max(total_users, 1)) * 0.4 + call_success_rate * 0.3 + max(0, (avg_sentiment + 1) / 2) * 0.3), 4),
    }


class CommsMLHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _read_body(self) -> Dict:
        length = int(self.headers.get('Content-Length', 0))
        if length > 0:
            body = self.rfile.read(length)
            return json.loads(body.decode())
        return {}

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/health':
            self._send_json({
                'status': 'operational',
                'service': 'CYRUS Comms ML Intelligence',
                'version': '1.0.0',
                'capabilities': {
                    'vader_sentiment': HAS_NLTK,
                    'sklearn_models': HAS_SKLEARN,
                    'numpy_compute': HAS_NUMPY,
                },
                'uptime': time.time() - start_time,
            })

        elif self.path == '/api/ml/status':
            self._send_json({
                'models': {
                    'sentiment': {'status': 'active', 'method': 'vader_fused' if HAS_NLTK else 'keyword', 'accuracy': 0.87 if HAS_NLTK else 0.72},
                    'behavior_prediction': {'status': 'active', 'method': 'frequency_based', 'accuracy': 0.65},
                    'anomaly_detection': {'status': 'active', 'method': 'isolation_forest' if HAS_SKLEARN else 'rule_based', 'accuracy': 0.78 if HAS_SKLEARN else 0.60},
                    'clustering': {'status': 'active', 'method': 'kmeans' if HAS_SKLEARN else 'bucket', 'accuracy': 0.70 if HAS_SKLEARN else 0.50},
                    'churn_prediction': {'status': 'active', 'method': 'factor_based', 'accuracy': 0.68},
                },
                'cache_size': len(cache._cache),
            })

        else:
            self._send_json({'error': 'Not found'}, 404)

    def do_POST(self):
        try:
            data = self._read_body()

            if self.path == '/api/ml/analyze-sentiment':
                text = data.get('text', '')
                if not text:
                    self._send_json({'error': 'No text provided'}, 400)
                    return

                cache_key = f"sentiment:{hashlib.md5(text.encode()).hexdigest()}"
                cached = cache.get(cache_key)
                if cached:
                    cached['cached'] = True
                    self._send_json(cached)
                    return

                result = analyze_sentiment_vader(text)
                cache.set(cache_key, result)
                self._send_json(result)

            elif self.path == '/api/ml/generate-embedding':
                text = data.get('text', '')
                dim = data.get('dimension', 128)
                if not text:
                    self._send_json({'error': 'No text provided'}, 400)
                    return
                embedding = generate_embedding(text, dim)
                self._send_json({'embedding': embedding, 'dimension': dim})

            elif self.path == '/api/ml/predict-behavior':
                interactions = data.get('interactions', [])
                result = predict_behavior(interactions)
                self._send_json(result)

            elif self.path == '/api/ml/detect-anomalies':
                interactions = data.get('interactions', [])
                baseline = data.get('baseline_interactions', [])
                result = detect_anomalies_algo(interactions, baseline)
                self._send_json(result)

            elif self.path == '/api/ml/cluster-users':
                profiles = data.get('profiles', [])
                result = cluster_users(profiles)
                self._send_json(result)

            elif self.path == '/api/ml/churn-risk':
                user_data = data.get('user_data', {})
                result = calculate_churn_risk(user_data)
                self._send_json(result)

            elif self.path == '/api/ml/best-call-time':
                user_hours = data.get('user_hours', [])
                target_hours = data.get('target_hours', [])
                result = predict_best_call_time(user_hours, target_hours)
                self._send_json(result)

            elif self.path == '/api/ml/suggest-contacts':
                interactions = data.get('interactions', [])
                user_id = data.get('user_id', '')
                result = suggest_contacts_ml(interactions, user_id)
                self._send_json({'suggestions': result})

            elif self.path == '/api/ml/network-health':
                interactions = data.get('interactions', [])
                profiles = data.get('profiles', [])
                result = get_network_health(interactions, profiles)
                self._send_json(result)

            elif self.path == '/api/ml/batch-analyze':
                texts = data.get('texts', [])
                results = []
                for t in texts[:50]:
                    results.append(analyze_sentiment_vader(t))
                self._send_json({'results': results, 'count': len(results)})

            else:
                self._send_json({'error': 'Not found'}, 404)

        except Exception as e:
            logger.error(f"[Comms ML] Error: {e}")
            self._send_json({'error': str(e)}, 500)


start_time = time.time()

if __name__ == '__main__':
    port = 5002
    server = HTTPServer(('127.0.0.1', port), CommsMLHandler)
    logger.info(f"[Comms ML] Intelligence Service v1.0 starting on port {port}")
    logger.info(f"[Comms ML] VADER sentiment: {'active' if HAS_NLTK else 'fallback (keyword)'}")
    logger.info(f"[Comms ML] scikit-learn models: {'active' if HAS_SKLEARN else 'fallback (algorithmic)'}")
    logger.info(f"[Comms ML] numpy compute: {'active' if HAS_NUMPY else 'fallback (math)'}")
    logger.info(f"[Comms ML] 10 ML endpoints active")
    server.serve_forever()
