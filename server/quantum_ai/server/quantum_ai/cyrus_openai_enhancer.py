#!/usr/bin/env python3
"""
CYRUS OpenAI Knowledge Enhancement System
Super-intelligence upgrade using OpenAI API for comprehensive knowledge acquisition.

This system integrates OpenAI API to:
- Acquire domain-specific knowledge across all fields
- Build comprehensive offline knowledge base
- Enable online knowledge retrieval when needed
- Train CYRUS on enhanced knowledge for super-intelligence
"""

import os
import sys
import json
import time
import logging
import requests
import sqlite3
import threading
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import pickle

# Add parent directories
_this_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_this_dir)
sys.path.insert(0, _this_dir)
sys.path.insert(0, _parent_dir)

logger = logging.getLogger(__name__)

class CYRUSKnowledgeEnhancer:
    """
    OpenAI-powered knowledge enhancement system for CYRUS super-intelligence
    """

    def __init__(self, openai_api_key: Optional[str] = None):
        self.api_key = openai_api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API key required. Set OPENAI_API_KEY environment variable.")

        self.base_url = "https://api.openai.com/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        # Knowledge domains for comprehensive coverage
        self.knowledge_domains = self._define_knowledge_domains()

        # Database setup
        self.db_path = Path(_this_dir) / "cyrus_knowledge_base.db"
        self.cache_dir = Path(_this_dir) / "knowledge_cache"
        self.cache_dir.mkdir(exist_ok=True)

        self._init_database()
        self._init_cache()

        # Rate limiting
        self.request_count = 0
        self.last_request_time = datetime.now()
        self.rate_limit_delay = 1.0  # seconds between requests

    def _define_knowledge_domains(self) -> Dict[str, Dict]:
        """Define comprehensive knowledge domains for CYRUS"""
        return {
            'medicine': {
                'description': 'Advanced medical science, disease analysis, and cure development beyond human capabilities',
                'subdomains': [
                    'bloodborne_pathogens', 'cancer_cell_analysis', 'blood_cell_pathology',
                    'hiv_aids_advanced', 'tuberculosis_combat', 'diabetes_revolution',
                    'immune_system_engineering', 'organ_regeneration', 'pathogen_outsmarting',
                    'advanced_diagnostics', 'quantum_medicine', 'nanomedicine',
                    'genetic_cure_development', 'biochemical_warfare', 'disease_evolution_prediction',
                    'cardiology', 'neurology', 'oncology', 'immunology', 'pharmacology',
                    'emergency_medicine', 'pediatrics', 'surgery', 'radiology', 'pathology'
                ],
                'priority': 'high'
            },
            'technology': {
                'description': 'Computer science, engineering, and emerging technologies',
                'subdomains': [
                    'artificial_intelligence', 'machine_learning', 'quantum_computing',
                    'cybersecurity', 'blockchain', 'iot', 'robotics', 'biotechnology',
                    'nanotechnology', 'renewable_energy'
                ],
                'priority': 'high'
            },
            'science': {
                'description': 'Fundamental sciences and research methodologies',
                'subdomains': [
                    'physics', 'chemistry', 'biology', 'mathematics', 'astronomy',
                    'geology', 'meteorology', 'ecology', 'neuroscience', 'genetics'
                ],
                'priority': 'high'
            },
            'business': {
                'description': 'Business, economics, and organizational knowledge',
                'subdomains': [
                    'finance', 'marketing', 'management', 'economics', 'entrepreneurship',
                    'strategy', 'operations', 'human_resources', 'supply_chain', 'analytics'
                ],
                'priority': 'medium'
            },
            'law': {
                'description': 'Legal systems, regulations, and jurisprudence',
                'subdomains': [
                    'constitutional_law', 'criminal_law', 'corporate_law', 'intellectual_property',
                    'international_law', 'environmental_law', 'human_rights', 'contract_law',
                    'legal_advocacy', 'judicial_procedures', 'courtroom_strategy', 'legal_ethics'
                ],
                'priority': 'medium'
            },
            'arts_humanities': {
                'description': 'Arts, literature, philosophy, and cultural studies',
                'subdomains': [
                    'literature', 'philosophy', 'history', 'art_history', 'music_theory',
                    'linguistics', 'anthropology', 'psychology', 'sociology', 'ethics'
                ],
                'priority': 'medium'
            },
            'engineering': {
                'description': 'Engineering disciplines and technical knowledge',
                'subdomains': [
                    'mechanical_engineering', 'electrical_engineering', 'civil_engineering',
                    'chemical_engineering', 'aerospace_engineering', 'biomedical_engineering',
                    'environmental_engineering', 'materials_science', 'systems_engineering',
                    'aerospace_systems', 'avionics', 'propulsion_systems', 'aerospace_materials'
                ],
                'priority': 'high'
            },
            'social_sciences': {
                'description': 'Social sciences and behavioral studies',
                'subdomains': [
                    'political_science', 'economics', 'sociology', 'anthropology',
                    'psychology', 'geography', 'demography', 'criminology', 'education',
                    'criminal_psychology', 'forensic_psychology', 'victimology', 'penology'
                ],
                'priority': 'medium'
            },
            'health_sciences': {
                'description': 'Public health, nutrition, and wellness',
                'subdomains': [
                    'public_health', 'epidemiology', 'nutrition', 'exercise_physiology',
                    'mental_health', 'occupational_therapy', 'physical_therapy', 'gerontology'
                ],
                'priority': 'high'
            },
            'environmental_sciences': {
                'description': 'Environmental studies and sustainability',
                'subdomains': [
                    'climatology', 'ecology', 'conservation_biology', 'environmental_chemistry',
                    'sustainable_development', 'urban_planning', 'natural_resource_management'
                ],
                'priority': 'high'
            },
            'military_intelligence': {
                'description': 'Military intelligence, strategic analysis, and defense intelligence',
                'subdomains': [
                    'signals_intelligence', 'human_intelligence', 'geospatial_intelligence',
                    'cyber_intelligence', 'counterintelligence', 'strategic_analysis',
                    'threat_assessment', 'intelligence_collection', 'intelligence_analysis'
                ],
                'priority': 'high'
            },
            'combat_tactics': {
                'description': 'Military combat tactics for air, ground, and combined operations',
                'subdomains': [
                    'air_combat_tactics', 'ground_combat_tactics', 'combined_arms_tactics',
                    'urban_warfare', 'guerrilla_warfare', 'counterinsurgency',
                    'amphibious_operations', 'special_operations', 'tactical_command'
                ],
                'priority': 'high'
            },
            'criminal_investigation': {
                'description': 'Criminal investigation techniques and methodologies',
                'subdomains': [
                    'forensic_science', 'crime_scene_investigation', 'digital_forensics',
                    'interview_techniques', 'surveillance_methods', 'evidence_collection',
                    'case_analysis', 'investigative_psychology', 'chain_of_custody'
                ],
                'priority': 'high'
            },
            'corruption_investigation': {
                'description': 'Anti-corruption investigation and prevention strategies',
                'subdomains': [
                    'bribery_investigation', 'money_laundering_detection', 'asset_tracing',
                    'corruption_prevention', 'whistleblower_protection', 'compliance_monitoring',
                    'international_corruption', 'political_corruption', 'corporate_corruption'
                ],
                'priority': 'high'
            },
            'fraud_investigation': {
                'description': 'Financial fraud detection and investigation',
                'subdomains': [
                    'financial_fraud_detection', 'insurance_fraud', 'securities_fraud',
                    'identity_theft_investigation', 'cyber_fraud', 'tax_evasion',
                    'fraud_prevention', 'forensic_accounting', 'fraud_analysis'
                ],
                'priority': 'high'
            },
            'financial_intelligence': {
                'description': 'Financial intelligence and economic analysis',
                'subdomains': [
                    'economic_intelligence', 'financial_crime_analysis', 'market_intelligence',
                    'sanctions_monitoring', 'trade_intelligence', 'investment_analysis',
                    'risk_assessment', 'financial_forecasting', 'economic_indicators'
                ],
                'priority': 'high'
            },
            'legal_advocacy': {
                'description': 'Legal advocacy tactics and judicial system navigation',
                'subdomains': [
                    'courtroom_advocacy', 'legal_strategy', 'judicial_procedures',
                    'evidence_presentation', 'jury_selection', 'legal_ethics',
                    'negotiation_tactics', 'mediation_skills', 'appeals_process'
                ],
                'priority': 'high'
            },
            'living_means_assessment': {
                'description': 'Living means assessment and financial capability evaluation',
                'subdomains': [
                    'income_verification', 'expense_analysis', 'asset_evaluation',
                    'debt_assessment', 'lifestyle_analysis', 'financial_capacity',
                    'maintenance_calculations', 'support_assessments', 'economic_dependence'
                ],
                'priority': 'medium'
            },
            'indemnity_law': {
                'description': 'Indemnity law, compensation, and liability principles',
                'subdomains': [
                    'insurance_liability', 'compensation_claims', 'tort_liability',
                    'professional_indemnity', 'public_liability', 'product_liability',
                    'employer_liability', 'contractual_indemnity', 'statutory_compensation'
                ],
                'priority': 'medium'
            },
            'economic_crime': {
                'description': 'Economic and financial crimes investigation and prevention',
                'subdomains': [
                    'white_collar_crime', 'corporate_fraud', 'market_manipulation',
                    'antitrust_violations', 'insider_trading', 'tax_crimes',
                    'money_laundering', 'terrorism_financing', 'economic_sabotage'
                ],
                'priority': 'high'
            },
            'human_rights': {
                'description': 'Human rights law, advocacy, and protection',
                'subdomains': [
                    'civil_rights', 'political_rights', 'economic_rights', 'social_rights',
                    'cultural_rights', 'indigenous_rights', 'womens_rights', 'childrens_rights',
                    'refugee_rights', 'disability_rights'
                ],
                'priority': 'high'
            },
            'botswana_law': {
                'description': 'Botswana legal system, constitution, and jurisprudence',
                'subdomains': [
                    'botswana_constitution', 'botswana_criminal_law', 'botswana_civil_law',
                    'botswana_administrative_law', 'botswana_commercial_law', 'botswana_labour_law',
                    'botswana_environmental_law', 'botswana_family_law', 'botswana_property_law',
                    'botswana_constitutional_court'
                ],
                'priority': 'medium'
            },
            'international_law': {
                'description': 'International law, treaties, and global legal frameworks',
                'subdomains': [
                    'public_international_law', 'private_international_law', 'humanitarian_law',
                    'international_criminal_law', 'treaty_law', 'diplomatic_law', 'maritime_law',
                    'aviation_law', 'space_law', 'cyber_international_law'
                ],
                'priority': 'high'
            }
        }

    def _init_database(self):
        """Initialize SQLite database for knowledge storage"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS knowledge_entries (
                    id INTEGER PRIMARY KEY,
                    domain TEXT NOT NULL,
                    subdomain TEXT,
                    topic TEXT NOT NULL,
                    content TEXT NOT NULL,
                    source TEXT,
                    confidence REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    access_count INTEGER DEFAULT 0,
                    last_accessed TIMESTAMP,
                    UNIQUE(domain, topic)
                )
            ''')

            conn.execute('''
                CREATE TABLE IF NOT EXISTS knowledge_relationships (
                    id INTEGER PRIMARY KEY,
                    source_entry_id INTEGER,
                    target_entry_id INTEGER,
                    relationship_type TEXT,
                    strength REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (source_entry_id) REFERENCES knowledge_entries(id),
                    FOREIGN KEY (target_entry_id) REFERENCES knowledge_entries(id)
                )
            ''')

            conn.execute('''
                CREATE TABLE IF NOT EXISTS knowledge_queries (
                    id INTEGER PRIMARY KEY,
                    query TEXT NOT NULL,
                    domain TEXT,
                    response TEXT,
                    confidence REAL,
                    response_time REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # Create indexes for performance
            conn.execute('CREATE INDEX IF NOT EXISTS idx_domain ON knowledge_entries(domain)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_topic ON knowledge_entries(topic)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_query ON knowledge_queries(query)')

    def _init_cache(self):
        """Initialize knowledge cache system"""
        self.cache = {}
        self.cache_file = self.cache_dir / "knowledge_cache.pkl"

        if self.cache_file.exists():
            try:
                with open(self.cache_file, 'rb') as f:
                    self.cache = pickle.load(f)
            except Exception as e:
                logger.warning(f"Failed to load cache: {e}")
                self.cache = {}

    def _save_cache(self):
        """Save knowledge cache to disk"""
        try:
            with open(self.cache_file, 'wb') as f:
                pickle.dump(self.cache, f)
        except Exception as e:
            logger.error(f"Failed to save cache: {e}")

    def _rate_limit(self):
        """Implement rate limiting for OpenAI API calls"""
        now = datetime.now()
        time_diff = (now - self.last_request_time).total_seconds()

        if time_diff < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - time_diff)

        self.last_request_time = datetime.now()
        self.request_count += 1

    def _call_openai_api(self, messages: List[Dict], model: str = "gpt-4",
                        temperature: float = 0.7, max_tokens: int = 2000) -> Optional[Dict]:
        """Make API call to OpenAI with error handling and rate limiting"""
        self._rate_limit()

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
                timeout=30
            )

            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            return None

    def acquire_domain_knowledge(self, domain: str, depth: str = "comprehensive") -> Dict[str, Any]:
        """
        Acquire comprehensive knowledge for a specific domain using OpenAI

        Args:
            domain: Knowledge domain to acquire
            depth: Knowledge depth ('basic', 'intermediate', 'comprehensive', 'expert')

        Returns:
            Dictionary containing acquired knowledge
        """
        if domain not in self.knowledge_domains:
            raise ValueError(f"Unknown domain: {domain}")

        domain_info = self.knowledge_domains[domain]
        subdomains = domain_info['subdomains']

        logger.info(f"Acquiring {depth} knowledge for domain: {domain}")

        knowledge_data = {
            'domain': domain,
            'description': domain_info['description'],
            'subdomains': {},
            'acquisition_date': datetime.now().isoformat(),
            'depth': depth
        }

        for subdomain in subdomains:
            logger.info(f"Processing subdomain: {subdomain}")
            subdomain_knowledge = self._acquire_subdomain_knowledge(domain, subdomain, depth)
            knowledge_data['subdomains'][subdomain] = subdomain_knowledge

            # Store in database
            self._store_knowledge_entries(domain, subdomain, subdomain_knowledge)

        return knowledge_data

    def _acquire_subdomain_knowledge(self, domain: str, subdomain: str, depth: str) -> Dict[str, Any]:
        """Acquire knowledge for a specific subdomain"""
        cache_key = f"{domain}_{subdomain}_{depth}"
        if cache_key in self.cache:
            logger.info(f"Using cached knowledge for {subdomain}")
            return self.cache[cache_key]

        # Define knowledge acquisition prompts based on depth
        prompts = {
            'basic': f"Provide a comprehensive overview of {subdomain} in {domain}. Include key concepts, principles, and current applications.",
            'intermediate': f"Provide detailed knowledge of {subdomain} in {domain}. Include theories, methodologies, current research, and practical applications.",
            'comprehensive': f"Provide expert-level knowledge of {subdomain} in {domain}. Include historical context, current state-of-the-art, emerging trends, challenges, and future directions.",
            'expert': f"Provide cutting-edge expert knowledge of {subdomain} in {domain}. Include advanced theories, latest research breakthroughs, technical details, and forward-looking insights."
        }

        prompt = prompts.get(depth, prompts['comprehensive'])

        messages = [
            {
                "role": "system",
                "content": "You are an expert knowledge acquisition system. Provide comprehensive, accurate, and well-structured information. Focus on factual knowledge, current developments, and practical applications."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]

        response = self._call_openai_api(messages, max_tokens=4000)
        if not response:
            return {'error': 'Failed to acquire knowledge'}

        content = response['choices'][0]['message']['content']

        # Structure the knowledge
        knowledge = {
            'content': content,
            'key_concepts': self._extract_key_concepts(content),
            'applications': self._extract_applications(content),
            'challenges': self._extract_challenges(content),
            'future_trends': self._extract_future_trends(content),
            'acquired_at': datetime.now().isoformat()
        }

        # Cache the result
        self.cache[cache_key] = knowledge
        self._save_cache()

        return knowledge

    def _extract_key_concepts(self, content: str) -> List[str]:
        """Extract key concepts from content using OpenAI"""
        messages = [
            {
                "role": "system",
                "content": "Extract the 10-15 most important key concepts or terms from the provided text. Return as a JSON array of strings."
            },
            {
                "role": "user",
                "content": f"Extract key concepts from: {content[:2000]}..."
            }
        ]

        response = self._call_openai_api(messages, max_tokens=500)
        if response:
            try:
                concepts = json.loads(response['choices'][0]['message']['content'])
                return concepts if isinstance(concepts, list) else []
            except:
                pass

        # Fallback: extract based on common patterns
        return []

    def _extract_applications(self, content: str) -> List[str]:
        """Extract practical applications from content"""
        messages = [
            {
                "role": "system",
                "content": "Extract practical applications and use cases from the provided text. Return as a JSON array of strings."
            },
            {
                "role": "user",
                "content": f"Extract applications from: {content[:2000]}..."
            }
        ]

        response = self._call_openai_api(messages, max_tokens=500)
        if response:
            try:
                applications = json.loads(response['choices'][0]['message']['content'])
                return applications if isinstance(applications, list) else []
            except:
                pass

        return []

    def _extract_challenges(self, content: str) -> List[str]:
        """Extract challenges and limitations from content"""
        messages = [
            {
                "role": "system",
                "content": "Extract current challenges, limitations, and unsolved problems from the provided text. Return as a JSON array of strings."
            },
            {
                "role": "user",
                "content": f"Extract challenges from: {content[:2000]}..."
            }
        ]

        response = self._call_openai_api(messages, max_tokens=500)
        if response:
            try:
                challenges = json.loads(response['choices'][0]['message']['content'])
                return challenges if isinstance(challenges, list) else []
            except:
                pass

        return []

    def _extract_future_trends(self, content: str) -> List[str]:
        """Extract future trends and directions from content"""
        messages = [
            {
                "role": "system",
                "content": "Extract future trends, emerging developments, and research directions from the provided text. Return as a JSON array of strings."
            },
            {
                "role": "user",
                "content": f"Extract future trends from: {content[:2000]}..."
            }
        ]

        response = self._call_openai_api(messages, max_tokens=500)
        if response:
            try:
                trends = json.loads(response['choices'][0]['message']['content'])
                return trends if isinstance(trends, list) else []
            except:
                pass

        return []

    def _store_knowledge_entries(self, domain: str, subdomain: str, knowledge: Dict):
        """Store knowledge entries in the database"""
        with sqlite3.connect(self.db_path) as conn:
            # Store main content
            conn.execute('''
                INSERT INTO knowledge_entries (domain, subdomain, topic, content, source, confidence)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                domain,
                subdomain,
                f"{subdomain}_overview",
                knowledge.get('content', ''),
                'openai_api',
                0.95
            ))

            # Store key concepts
            for concept in knowledge.get('key_concepts', []):
                conn.execute('''
                    INSERT OR REPLACE INTO knowledge_entries (domain, subdomain, topic, content, source, confidence)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    domain,
                    subdomain,
                    f"concept_{concept.lower().replace(' ', '_')}",
                    f"Key concept: {concept}",
                    'openai_api',
                    0.90
                ))

            # Store applications
            for application in knowledge.get('applications', []):
                conn.execute('''
                    INSERT OR REPLACE INTO knowledge_entries (domain, subdomain, topic, content, source, confidence)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    domain,
                    subdomain,
                    f"application_{hashlib.md5(application.encode()).hexdigest()[:8]}",
                    f"Application: {application}",
                    'openai_api',
                    0.85
                ))

            conn.commit()

    def query_knowledge(self, query: str, domain: Optional[str] = None,
                        online_fallback: bool = True) -> Dict[str, Any]:
        """
        Query the knowledge base with offline priority and online fallback

        Args:
            query: Knowledge query
            domain: Specific domain to search in
            online_fallback: Whether to use OpenAI if offline knowledge insufficient

        Returns:
            Knowledge response with confidence score
        """
        start_time = time.time()

        # First, try offline knowledge base
        offline_results = self._query_offline_knowledge(query, domain)

        if offline_results['confidence'] > 0.7:
            # Sufficient offline knowledge found
            response_time = time.time() - start_time
            self._log_query(query, domain, offline_results['response'],
                          offline_results['confidence'], response_time)
            return offline_results

        # Insufficient offline knowledge, try online if enabled
        if online_fallback:
            online_results = self._query_online_knowledge(query, domain)
            if online_results['confidence'] > offline_results['confidence']:
                response_time = time.time() - start_time
                self._log_query(query, domain, online_results['response'],
                              online_results['confidence'], response_time)
                # Store online knowledge for future offline use
                self._store_online_knowledge(query, domain, online_results)
                return online_results

        # Return best available result
        response_time = time.time() - start_time
        self._log_query(query, domain, offline_results['response'],
                      offline_results['confidence'], response_time)
        return offline_results

    def _query_offline_knowledge(self, query: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Query the offline knowledge base"""
        with sqlite3.connect(self.db_path) as conn:
            if domain:
                cursor = conn.execute('''
                    SELECT content, confidence, domain, subdomain
                    FROM knowledge_entries
                    WHERE domain = ? AND (topic LIKE ? OR content LIKE ?)
                    ORDER BY confidence DESC, access_count DESC
                    LIMIT 5
                ''', (domain, f'%{query}%', f'%{query}%'))
            else:
                cursor = conn.execute('''
                    SELECT content, confidence, domain, subdomain
                    FROM knowledge_entries
                    WHERE topic LIKE ? OR content LIKE ?
                    ORDER BY confidence DESC, access_count DESC
                    LIMIT 5
                ''', (f'%{query}%', f'%{query}%'))

            results = cursor.fetchall()

            if not results:
                return {
                    'response': 'No relevant knowledge found in offline database.',
                    'confidence': 0.0,
                    'source': 'offline',
                    'domain': domain
                }

            # Update access counts
            for result in results:
                conn.execute('''
                    UPDATE knowledge_entries
                    SET access_count = access_count + 1,
                        last_accessed = CURRENT_TIMESTAMP
                    WHERE content = ?
                ''', (result[0],))

            conn.commit()

            # Combine results
            combined_content = "\n\n".join([result[0] for result in results])
            avg_confidence = sum(result[1] for result in results) / len(results)

            return {
                'response': combined_content,
                'confidence': min(avg_confidence, 0.95),  # Cap at 95%
                'source': 'offline',
                'domain': domain,
                'entries_found': len(results)
            }

    def _query_online_knowledge(self, query: str, domain: Optional[str] = None) -> Dict[str, Any]:
        """Query OpenAI for knowledge not available offline"""
        context_prompt = f" in the domain of {domain}" if domain else ""

        messages = [
            {
                "role": "system",
                "content": f"You are an expert knowledge system providing accurate, comprehensive information{context_prompt}. Focus on factual knowledge, current developments, and practical insights."
            },
            {
                "role": "user",
                "content": f"Provide comprehensive knowledge about: {query}"
            }
        ]

        response = self._call_openai_api(messages, max_tokens=3000)
        if not response:
            return {
                'response': 'Unable to retrieve online knowledge.',
                'confidence': 0.0,
                'source': 'online'
            }

        content = response['choices'][0]['message']['content']

        return {
            'response': content,
            'confidence': 0.85,  # Online responses are generally reliable
            'source': 'online',
            'domain': domain
        }

    def _store_online_knowledge(self, query: str, domain: str, results: Dict):
        """Store online knowledge for future offline use"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO knowledge_entries (domain, subdomain, topic, content, source, confidence)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                domain or 'general',
                'online_query',
                f"query_{hashlib.md5(query.encode()).hexdigest()[:8]}",
                results['response'],
                'openai_online',
                results['confidence']
            ))
            conn.commit()

    def _log_query(self, query: str, domain: Optional[str], response: str,
                   confidence: float, response_time: float):
        """Log knowledge queries for analytics"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO knowledge_queries (query, domain, response, confidence, response_time)
                VALUES (?, ?, ?, ?, ?)
            ''', (query, domain, response[:1000], confidence, response_time))  # Truncate response
            conn.commit()

    def enhance_cyrus_intelligence(self, domains: Optional[List[str]] = None,
                                 depth: str = "comprehensive") -> Dict[str, Any]:
        """
        Comprehensive intelligence enhancement for CYRUS

        Args:
            domains: List of domains to enhance (None for all)
            depth: Knowledge depth level

        Returns:
            Enhancement results and statistics
        """
        target_domains = domains or list(self.knowledge_domains.keys())

        logger.info(f"Starting CYRUS intelligence enhancement for {len(target_domains)} domains")

        enhancement_results = {
            'start_time': datetime.now().isoformat(),
            'domains_processed': [],
            'total_entries_added': 0,
            'knowledge_coverage': {},
            'performance_metrics': {}
        }

        for domain in target_domains:
            if domain not in self.knowledge_domains:
                logger.warning(f"Skipping unknown domain: {domain}")
                continue

            logger.info(f"Enhancing domain: {domain}")
            try:
                domain_knowledge = self.acquire_domain_knowledge(domain, depth)
                enhancement_results['domains_processed'].append(domain)

                # Count entries added
                entries_count = self._count_domain_entries(domain)
                enhancement_results['total_entries_added'] += entries_count
                enhancement_results['knowledge_coverage'][domain] = entries_count

                logger.info(f"Domain {domain}: {entries_count} knowledge entries added")

            except Exception as e:
                logger.error(f"Failed to enhance domain {domain}: {e}")
                enhancement_results['knowledge_coverage'][domain] = 0

        enhancement_results['end_time'] = datetime.now().isoformat()
        enhancement_results['duration_seconds'] = (
            datetime.fromisoformat(enhancement_results['end_time']) -
            datetime.fromisoformat(enhancement_results['start_time'])
        ).total_seconds()

        # Calculate performance metrics
        enhancement_results['performance_metrics'] = {
            'domains_successfully_enhanced': len(enhancement_results['domains_processed']),
            'total_domains_attempted': len(target_domains),
            'success_rate': len(enhancement_results['domains_processed']) / len(target_domains),
            'average_entries_per_domain': (
                enhancement_results['total_entries_added'] /
                len(enhancement_results['domains_processed'])
                if enhancement_results['domains_processed'] else 0
            ),
            'enhancement_duration': enhancement_results['duration_seconds']
        }

        logger.info(f"CYRUS intelligence enhancement completed. "
                   f"Processed {len(enhancement_results['domains_processed'])} domains, "
                   f"added {enhancement_results['total_entries_added']} knowledge entries.")

        return enhancement_results

    def _count_domain_entries(self, domain: str) -> int:
        """Count knowledge entries for a domain"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute('SELECT COUNT(*) FROM knowledge_entries WHERE domain = ?',
                                (domain,))
            return cursor.fetchone()[0]

    def get_knowledge_statistics(self) -> Dict[str, Any]:
        """Get comprehensive knowledge base statistics"""
        with sqlite3.connect(self.db_path) as conn:
            # Domain statistics
            cursor = conn.execute('''
                SELECT domain, COUNT(*) as entries,
                       AVG(confidence) as avg_confidence,
                       MAX(updated_at) as last_updated
                FROM knowledge_entries
                GROUP BY domain
                ORDER BY entries DESC
            ''')
            domain_stats = cursor.fetchall()

            # Total statistics
            cursor = conn.execute('SELECT COUNT(*), AVG(confidence) FROM knowledge_entries')
            total_entries, avg_confidence = cursor.fetchone()

            # Query statistics
            cursor = conn.execute('''
                SELECT COUNT(*), AVG(confidence), AVG(response_time)
                FROM knowledge_queries
            ''')
            query_count, query_avg_confidence, avg_response_time = cursor.fetchone()

            return {
                'total_entries': total_entries or 0,
                'average_confidence': avg_confidence or 0,
                'domains_covered': len(domain_stats),
                'domain_breakdown': [
                    {
                        'domain': row[0],
                        'entries': row[1],
                        'avg_confidence': row[2],
                        'last_updated': row[3]
                    } for row in domain_stats
                ],
                'query_statistics': {
                    'total_queries': query_count or 0,
                    'avg_query_confidence': query_avg_confidence or 0,
                    'avg_response_time': avg_response_time or 0
                }
            }

    def export_knowledge_base(self, export_path: Optional[str] = None) -> str:
        """Export knowledge base to JSON format"""
        if not export_path:
            export_path = f"cyrus_knowledge_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        export_data = {
            'export_date': datetime.now().isoformat(),
            'statistics': self.get_knowledge_statistics(),
            'domains': {}
        }

        with sqlite3.connect(self.db_path) as conn:
            for domain in self.knowledge_domains.keys():
                cursor = conn.execute('''
                    SELECT subdomain, topic, content, confidence, created_at, updated_at
                    FROM knowledge_entries
                    WHERE domain = ?
                    ORDER BY confidence DESC
                ''', (domain,))

                entries = cursor.fetchall()
                export_data['domains'][domain] = [
                    {
                        'subdomain': row[0],
                        'topic': row[1],
                        'content': row[2],
                        'confidence': row[3],
                        'created_at': row[4],
                        'updated_at': row[5]
                    } for row in entries
                ]

        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)

        logger.info(f"Knowledge base exported to {export_path}")
        return export_path