"""
Writing Style Analyzer and Generator
Based on "Developing Writing" by Patricia Wilcox Peterson

Analyzes and generates text in different styles:
- Professional: Formal, academic, technical
- Business: Clear, concise, professional but accessible
- Casual: Informal, conversational, friendly
"""

from typing import Dict, List, Tuple, Optional
import re
from collections import Counter
import numpy as np


class WritingStyleAnalyzer:
    """
    Analyzes writing style and generates text in different styles.
    """
    
    def __init__(self):
        """Initialize writing style analyzer."""
        self.processing_pathway = []
        
        # Style markers based on writing principles
        self.style_markers = {
            'professional': {
                'formality_indicators': [
                    'furthermore', 'moreover', 'consequently', 'therefore',
                    'nevertheless', 'accordingly', 'subsequently', 'hence',
                    'thus', 'indeed', 'specifically', 'particularly'
                ],
                'sentence_structure': 'complex',  # Prefers complex sentences
                'pronoun_usage': 'third_person',  # Avoids first person
                'contraction_usage': 'avoid',  # No contractions
                'vocabulary_level': 'advanced',
                'punctuation': 'formal'
            },
            'business': {
                'formality_indicators': [
                    'please', 'thank you', 'regarding', 'pertaining to',
                    'in order to', 'as per', 'according to', 'with respect to'
                ],
                'sentence_structure': 'clear',  # Clear, direct sentences
                'pronoun_usage': 'mixed',  # Can use first person professionally
                'contraction_usage': 'minimal',  # Few contractions
                'vocabulary_level': 'professional',
                'punctuation': 'standard'
            },
            'casual': {
                'formality_indicators': [
                    'hey', 'yeah', 'okay', 'sure', 'cool', 'awesome',
                    'gonna', 'wanna', 'gotta', 'kinda', 'sorta'
                ],
                'sentence_structure': 'simple',  # Simple, short sentences
                'pronoun_usage': 'first_person',  # Uses I, we, you
                'contraction_usage': 'frequent',  # Many contractions
                'vocabulary_level': 'everyday',
                'punctuation': 'informal'
            }
        }
    
    def analyze_writing_style(self, text: str) -> Dict:
        """
        Analyze the writing style of given text.
        
        Args:
            text: Input text to analyze
            
        Returns:
            Style analysis with scores for each style category
        """
        self._log_step(f"Analyzing writing style: {len(text)} characters")
        
        # Calculate style scores
        professional_score = self._calculate_style_score(text, 'professional')
        business_score = self._calculate_style_score(text, 'business')
        casual_score = self._calculate_style_score(text, 'casual')
        
        # Determine dominant style
        scores = {
            'professional': professional_score,
            'business': business_score,
            'casual': casual_score
        }
        dominant_style = max(scores, key=scores.get)
        
        # Analyze writing mechanics
        mechanics = self._analyze_mechanics(text)
        
        # Analyze grammar patterns
        grammar = self._analyze_grammar_patterns(text)
        
        # Analyze sentence structure
        sentence_structure = self._analyze_sentence_structure(text)
        
        results = {
            'style_scores': scores,
            'dominant_style': dominant_style,
            'confidence': max(scores.values()) / sum(scores.values()) if sum(scores.values()) > 0 else 0,
            'mechanics': mechanics,
            'grammar_patterns': grammar,
            'sentence_structure': sentence_structure,
            'text_length': len(text),
            'word_count': len(text.split())
        }
        
        self._log_step(f"Style analysis complete: dominant={dominant_style}, confidence={results['confidence']:.2%}")
        return results
    
    def _calculate_style_score(self, text: str, style: str) -> float:
        """Calculate score for a specific style."""
        markers = self.style_markers[style]
        score = 0.0
        total_checks = 0
        
        text_lower = text.lower()
        
        # Check formality indicators
        indicator_count = sum(1 for marker in markers['formality_indicators'] 
                             if marker in text_lower)
        score += (indicator_count / max(len(markers['formality_indicators']), 1)) * 0.3
        total_checks += 1
        
        # Check contraction usage
        contractions = len(re.findall(r"\b(n't|'re|'ve|'ll|'d|'m|'s)\b", text_lower))
        contraction_ratio = contractions / max(len(text.split()), 1)
        
        if markers['contraction_usage'] == 'avoid':
            score += (1 - min(contraction_ratio * 10, 1)) * 0.2
        elif markers['contraction_usage'] == 'minimal':
            score += (1 - min(contraction_ratio * 5, 1)) * 0.2
        elif markers['contraction_usage'] == 'frequent':
            score += min(contraction_ratio * 10, 1) * 0.2
        total_checks += 1
        
        # Check sentence complexity
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        avg_sentence_length = np.mean([len(s.split()) for s in sentences]) if sentences else 0
        
        if markers['sentence_structure'] == 'complex':
            score += min(avg_sentence_length / 25, 1) * 0.2
        elif markers['sentence_structure'] == 'clear':
            score += (1 - abs(avg_sentence_length - 15) / 15) * 0.2
        elif markers['sentence_structure'] == 'simple':
            score += (1 - min(avg_sentence_length / 10, 1)) * 0.2
        total_checks += 1
        
        # Check pronoun usage
        first_person = len(re.findall(r'\b(I|we|my|our|me|us)\b', text, re.IGNORECASE))
        third_person = len(re.findall(r'\b(he|she|it|they|his|her|its|their|him|her|them)\b', 
                                     text, re.IGNORECASE))
        total_pronouns = first_person + third_person
        first_person_ratio = first_person / max(total_pronouns, 1)
        
        if markers['pronoun_usage'] == 'third_person':
            score += (1 - first_person_ratio) * 0.15
        elif markers['pronoun_usage'] == 'first_person':
            score += first_person_ratio * 0.15
        elif markers['pronoun_usage'] == 'mixed':
            score += (1 - abs(first_person_ratio - 0.5)) * 0.15
        total_checks += 1
        
        # Check vocabulary level (simplified)
        complex_words = len([w for w in text.split() if len(w) > 8])
        complex_ratio = complex_words / max(len(text.split()), 1)
        
        if markers['vocabulary_level'] == 'advanced':
            score += min(complex_ratio * 5, 1) * 0.15
        elif markers['vocabulary_level'] == 'professional':
            score += (1 - abs(complex_ratio - 0.15) / 0.15) * 0.15
        elif markers['vocabulary_level'] == 'everyday':
            score += (1 - min(complex_ratio * 3, 1)) * 0.15
        
        return score / total_checks if total_checks > 0 else 0
    
    def _analyze_mechanics(self, text: str) -> Dict:
        """Analyze writing mechanics (capitalization, punctuation)."""
        # Capitalization at sentence start
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        proper_caps = sum(1 for s in sentences if s and s[0].isupper())
        cap_ratio = proper_caps / max(len(sentences), 1)
        
        # Punctuation usage
        has_periods = '.' in text
        has_commas = ',' in text
        has_question_marks = '?' in text
        has_exclamation = '!' in text
        
        # Proper punctuation at sentence end
        proper_punct = sum(1 for s in sentences if s and s[-1] in '.!?')
        punct_ratio = proper_punct / max(len(sentences), 1)
        
        return {
            'capitalization_ratio': cap_ratio,
            'punctuation_ratio': punct_ratio,
            'has_periods': has_periods,
            'has_commas': has_commas,
            'has_question_marks': has_question_marks,
            'has_exclamation': has_exclamation,
            'mechanics_score': (cap_ratio + punct_ratio) / 2
        }
    
    def _analyze_grammar_patterns(self, text: str) -> Dict:
        """Analyze grammar patterns."""
        # Subject-verb agreement indicators
        third_person_s = len(re.findall(r'\b\w+s\b', text))
        
        # Be verb usage
        be_verbs = len(re.findall(r'\b(am|is|are|was|were|be|been|being)\b', 
                                  text, re.IGNORECASE))
        
        # Question patterns
        questions = len(re.findall(r'\?', text))
        wh_questions = len(re.findall(r'\b(what|when|where|who|why|how)\b', 
                                      text, re.IGNORECASE))
        
        # Negative patterns
        negatives = len(re.findall(r'\b(not|n\'t|no|never|neither|nor)\b', 
                                   text, re.IGNORECASE))
        
        return {
            'third_person_forms': third_person_s,
            'be_verb_count': be_verbs,
            'question_count': questions,
            'wh_question_count': wh_questions,
            'negative_count': negatives
        }
    
    def _analyze_sentence_structure(self, text: str) -> Dict:
        """Analyze sentence structure."""
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return {'avg_length': 0, 'complexity': 'unknown'}
        
        lengths = [len(s.split()) for s in sentences]
        avg_length = np.mean(lengths)
        
        # Check for complex structures
        has_coordinating = any(re.search(r'\b(and|or|but|so)\b', s, re.IGNORECASE) 
                              for s in sentences)
        has_subordinating = any(re.search(r'\b(because|although|while|if|when|since)\b', 
                                         s, re.IGNORECASE) for s in sentences)
        
        if has_subordinating:
            complexity = 'complex'
        elif has_coordinating:
            complexity = 'moderate'
        else:
            complexity = 'simple'
        
        return {
            'avg_length': avg_length,
            'sentence_count': len(sentences),
            'complexity': complexity,
            'has_coordinating': has_coordinating,
            'has_subordinating': has_subordinating
        }
    
    def generate_style_appropriate_response(self, content: Dict, 
                                            target_style: str) -> str:
        """
        Generate response in target style (professional, business, or casual).
        
        Args:
            content: Content dictionary with results/analysis
            target_style: 'professional', 'business', or 'casual'
            
        Returns:
            Formatted response in target style
        """
        self._log_step(f"Generating {target_style} style response")
        
        if target_style not in ['professional', 'business', 'casual']:
            target_style = 'business'  # Default
        
        # Generate style-appropriate text
        if target_style == 'professional':
            return self._generate_professional_response(content)
        elif target_style == 'business':
            return self._generate_business_response(content)
        else:  # casual
            return self._generate_casual_response(content)
    
    def _generate_professional_response(self, content: Dict) -> str:
        """Generate professional/academic style response."""
        response = []
        
        # Professional introduction
        response.append("Analysis Summary")
        response.append("=" * 80)
        response.append("")
        response.append("The following analysis presents the results of comprehensive data processing")
        response.append("utilizing advanced algorithmic methodologies. The findings are derived from")
        response.append("rigorous mathematical and computational analysis.")
        response.append("")
        
        # Professional body
        if 'results' in content:
            response.append("Results")
            response.append("-" * 80)
            response.append("The analysis yielded the following key findings:")
            response.append("")
            # Add results in professional format
            for key, value in content.get('results', {}).items():
                if isinstance(value, (int, float)):
                    response.append(f"• {key.replace('_', ' ').title()}: {value:.6f}")
                elif isinstance(value, dict):
                    response.append(f"• {key.replace('_', ' ').title()}:")
                    for sub_key, sub_value in value.items():
                        if isinstance(sub_value, (int, float)):
                            response.append(f"  - {sub_key}: {sub_value:.6f}")
            response.append("")
        
        # Professional conclusion
        response.append("Conclusion")
        response.append("-" * 80)
        response.append("The aforementioned results demonstrate the efficacy of the applied")
        response.append("methodologies. Further analysis may be warranted to validate these")
        response.append("findings across additional datasets.")
        
        return "\n".join(response)
    
    def _generate_business_response(self, content: Dict) -> str:
        """Generate business/professional style response."""
        response = []
        
        # Business introduction
        response.append("Analysis Results")
        response.append("=" * 80)
        response.append("")
        response.append("Thank you for your request. We've completed the analysis using")
        response.append("our data processing systems. Here are the key findings:")
        response.append("")
        
        # Business body
        if 'results' in content:
            response.append("Key Results")
            response.append("-" * 80)
            for key, value in content.get('results', {}).items():
                if isinstance(value, (int, float)):
                    response.append(f"• {key.replace('_', ' ').title()}: {value:.4f}")
                elif isinstance(value, dict):
                    response.append(f"• {key.replace('_', ' ').title()}:")
                    for sub_key, sub_value in value.items():
                        if isinstance(sub_value, (int, float)):
                            response.append(f"  - {sub_key}: {sub_value:.4f}")
            response.append("")
        
        # Business conclusion
        response.append("Next Steps")
        response.append("-" * 80)
        response.append("Please review these results. If you need additional analysis or")
        response.append("have questions, please let us know.")
        
        return "\n".join(response)
    
    def _generate_casual_response(self, content: Dict) -> str:
        """Generate casual/conversational style response."""
        response = []
        
        # Casual introduction
        response.append("Hey! Here's what I found:")
        response.append("=" * 80)
        response.append("")
        response.append("So I ran the analysis and got some interesting results.")
        response.append("Check it out:")
        response.append("")
        
        # Casual body
        if 'results' in content:
            response.append("Results:")
            response.append("-" * 80)
            for key, value in content.get('results', {}).items():
                if isinstance(value, (int, float)):
                    response.append(f"• {key.replace('_', ' ').title()}: {value:.2f}")
                elif isinstance(value, dict):
                    response.append(f"• {key.replace('_', ' ').title()}:")
                    for sub_key, sub_value in value.items():
                        if isinstance(sub_value, (int, float)):
                            response.append(f"  - {sub_key}: {sub_value:.2f}")
            response.append("")
        
        # Casual conclusion
        response.append("That's about it!")
        response.append("-" * 80)
        response.append("Hope this helps! Let me know if you want me to dig deeper")
        response.append("into anything specific.")
        
        return "\n".join(response)
    
    def adapt_text_to_style(self, text: str, target_style: str) -> str:
        """
        Adapt existing text to target style.
        
        Args:
            text: Original text
            target_style: Target style ('professional', 'business', 'casual')
            
        Returns:
            Adapted text in target style
        """
        self._log_step(f"Adapting text to {target_style} style")
        
        # Analyze current style
        current_analysis = self.analyze_writing_style(text)
        current_style = current_analysis['dominant_style']
        
        if current_style == target_style:
            return text  # Already in target style
        
        adapted = text
        
        # Adapt contractions
        if target_style == 'professional':
            # Remove contractions
            adapted = re.sub(r"n't\b", " not", adapted)
            adapted = re.sub(r"'re\b", " are", adapted)
            adapted = re.sub(r"'ve\b", " have", adapted)
            adapted = re.sub(r"'ll\b", " will", adapted)
            adapted = re.sub(r"'d\b", " would", adapted)
            adapted = re.sub(r"'m\b", " am", adapted)
        elif target_style == 'casual':
            # Add contractions where appropriate
            adapted = re.sub(r"\bdo not\b", "don't", adapted, flags=re.IGNORECASE)
            adapted = re.sub(r"\bdoes not\b", "doesn't", adapted, flags=re.IGNORECASE)
            adapted = re.sub(r"\bis not\b", "isn't", adapted, flags=re.IGNORECASE)
            adapted = re.sub(r"\bare not\b", "aren't", adapted, flags=re.IGNORECASE)
        
        # Adapt vocabulary
        if target_style == 'professional':
            # More formal vocabulary
            adapted = adapted.replace('get', 'obtain')
            adapted = adapted.replace('show', 'demonstrate')
            adapted = adapted.replace('use', 'utilize')
            adapted = adapted.replace('help', 'assist')
        elif target_style == 'casual':
            # More casual vocabulary
            adapted = adapted.replace('obtain', 'get')
            adapted = adapted.replace('demonstrate', 'show')
            adapted = adapted.replace('utilize', 'use')
            adapted = adapted.replace('assist', 'help')
        
        return adapted
    
    def _log_step(self, message: str):
        """Log processing step."""
        self.processing_pathway.append({
            'module': 'WritingStyleAnalyzer',
            'step': message,
            'timestamp': None
        })
    
    def get_processing_pathway(self) -> List[Dict]:
        """Get the processing pathway for this analysis."""
        return self.processing_pathway.copy()
    
    def reset_pathway(self):
        """Reset the processing pathway."""
        self.processing_pathway = []

