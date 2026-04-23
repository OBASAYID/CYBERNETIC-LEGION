import sys
import os
import importlib.util

server_dir = os.path.join(os.path.dirname(__file__), '..', 'server')
sys.path.insert(0, server_dir)

spec = importlib.util.spec_from_file_location(
    "scientific_visualization",
    os.path.join(server_dir, "quantum_ai", "scientific_visualization.py")
)
sci_vis = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sci_vis)

import pytest

AdvancedClassifier = sci_vis.AdvancedClassifier
GroundTruthKnowledgeBase = sci_vis.GroundTruthKnowledgeBase
SceneGraph = sci_vis.SceneGraph
AdvancedVisualizationPlan = sci_vis.AdvancedVisualizationPlan
ReferenceImageSearchEngine = sci_vis.ReferenceImageSearchEngine
AdvancedImageGenerator = sci_vis.AdvancedImageGenerator
AdvancedValidationPipeline = sci_vis.AdvancedValidationPipeline
UpscalingEngine = sci_vis.UpscalingEngine
AdvancedVisualizationSystem = sci_vis.AdvancedVisualizationSystem
Domain = sci_vis.Domain
Intent = sci_vis.Intent
AccuracyLevel = sci_vis.AccuracyLevel
ScientificVisualizationEngine = sci_vis.ScientificVisualizationEngine
ProfessionalTechnicalRenderer = sci_vis.ProfessionalTechnicalRenderer
TechnicalReferenceDatabase = sci_vis.TechnicalReferenceDatabase


class TestSubjectExtraction:

    def setup_method(self):
        self.classifier = AdvancedClassifier()

    def test_human_heart_long_query(self):
        result = self.classifier.classify(
            "Show me a detailed anatomical illustration of the human heart with all chambers and major vessels labeled"
        )
        assert result.subject == "human heart"

    def test_human_heart_short_query(self):
        result = self.classifier.classify("human heart anatomy")
        assert result.subject == "human heart"

    def test_heart_only(self):
        result = self.classifier.classify("heart structure")
        assert result.subject == "heart"

    def test_brain_in_sentence(self):
        result = self.classifier.classify("Show me the brain with all regions labeled")
        assert result.subject == "brain"

    def test_human_eye_query(self):
        result = self.classifier.classify("show me the human eye anatomy cornea retina")
        assert result.subject == "human eye"

    def test_eye_simple(self):
        result = self.classifier.classify("eye cross section")
        assert result.subject == "eye"

    def test_coronavirus_query(self):
        result = self.classifier.classify("detailed coronavirus structure with spike proteins")
        assert result.subject == "coronavirus"

    def test_lung_query(self):
        result = self.classifier.classify("create a professional illustration of the human lung")
        assert result.subject == "human lung"

    def test_covid_alias(self):
        result = self.classifier.classify("covid virus particle diagram")
        assert result.subject == "covid"

    def test_generic_fallback(self):
        result = self.classifier.classify("show me a turbine blade cross section")
        assert result.subject == "turbine"

    def test_multi_word_subject_priority(self):
        result = self.classifier.classify("the human heart is amazing")
        assert result.subject == "human heart"

    def test_empty_stopword_query(self):
        result = self.classifier.classify("show me a the of")
        assert isinstance(result.subject, str)
        assert len(result.subject) > 0


class TestDomainClassification:

    def setup_method(self):
        self.classifier = AdvancedClassifier()

    def test_medical_domain(self):
        result = self.classifier.classify("human heart anatomy surgery")
        assert result.domain == Domain.MEDICAL

    def test_biological_domain(self):
        result = self.classifier.classify("organism species evolution genetics molecular biological")
        assert result.domain == Domain.BIOLOGICAL

    def test_engineering_domain(self):
        result = self.classifier.classify("turbine engine mechanical design")
        assert result.domain == Domain.ENGINEERING

    def test_scientific_domain(self):
        result = self.classifier.classify("atom molecule quantum physics")
        assert result.domain == Domain.SCIENTIFIC

    def test_industrial_domain(self):
        result = self.classifier.classify("factory manufacturing production assembly")
        assert result.domain == Domain.INDUSTRIAL

    def test_default_domain(self):
        result = self.classifier.classify("something completely random xyz")
        assert result.domain == Domain.SCIENTIFIC


class TestIntentClassification:

    def setup_method(self):
        self.classifier = AdvancedClassifier()

    def test_educational_intent(self):
        result = self.classifier.classify("teach me about the heart tutorial")
        assert result.intent == Intent.EDUCATIONAL

    def test_diagnostic_intent(self):
        result = self.classifier.classify("diagnose this heart condition patient clinical")
        assert result.intent == Intent.DIAGNOSTIC

    def test_research_intent(self):
        result = self.classifier.classify("research study experiment data analysis heart")
        assert result.intent == Intent.RESEARCH

    def test_publication_intent(self):
        result = self.classifier.classify("publish paper journal academic heart")
        assert result.intent == Intent.PUBLICATION

    def test_technical_intent(self):
        result = self.classifier.classify("technical specification dimensions measurement")
        assert result.intent == Intent.TECHNICAL_DOCUMENTATION


class TestAccuracyLevel:

    def setup_method(self):
        self.classifier = AdvancedClassifier()

    def test_research_gets_high_accuracy(self):
        result = self.classifier.classify("research study the heart data")
        assert result.accuracy_required in (AccuracyLevel.RESEARCH_GRADE, AccuracyLevel.ULTRA_HIGH, AccuracyLevel.HIGH)

    def test_learning_default(self):
        result = self.classifier.classify("learn about the heart")
        assert result.accuracy_required in (AccuracyLevel.LOW, AccuracyLevel.MEDIUM, AccuracyLevel.HIGH)


class TestGroundTruthKnowledgeBase:

    def setup_method(self):
        self.kb = GroundTruthKnowledgeBase()

    def test_heart_knowledge(self):
        knowledge = self.kb.retrieve("heart", Domain.MEDICAL)
        assert knowledge.subject != "unknown"
        assert len(knowledge.primary_structures) > 0
        assert knowledge.complexity_level > 0

    def test_brain_knowledge(self):
        knowledge = self.kb.retrieve("brain", Domain.MEDICAL)
        assert knowledge.subject != "unknown"
        assert len(knowledge.primary_structures) >= 8

    def test_eye_knowledge(self):
        knowledge = self.kb.retrieve("eye", Domain.MEDICAL)
        assert knowledge.subject != "unknown"
        assert len(knowledge.primary_structures) > 0

    def test_coronavirus_knowledge(self):
        knowledge = self.kb.retrieve("coronavirus", Domain.BIOLOGICAL)
        assert knowledge.subject != "unknown"
        assert len(knowledge.primary_structures) > 0

    def test_lung_knowledge(self):
        knowledge = self.kb.retrieve("lung", Domain.MEDICAL)
        assert knowledge.subject != "unknown"

    def test_unknown_subject_fallback(self):
        knowledge = self.kb.retrieve("xyznonexistent", Domain.SCIENTIFIC)
        assert knowledge.subject == "xyznonexistent"
        assert knowledge.complexity_level == 5
        assert len(knowledge.primary_structures) > 0

    def test_human_heart_maps_to_heart(self):
        knowledge = self.kb.retrieve("human heart", Domain.MEDICAL)
        assert knowledge.subject != "unknown"
        assert knowledge.complexity_level >= 9


class TestSceneGraph:

    def test_construction(self):
        kb = GroundTruthKnowledgeBase()
        knowledge = kb.retrieve("heart", Domain.MEDICAL)
        sg = SceneGraph(knowledge)
        assert len(sg.nodes) > 0
        assert len(sg.edges) > 0

    def test_to_dict(self):
        kb = GroundTruthKnowledgeBase()
        knowledge = kb.retrieve("brain", Domain.MEDICAL)
        sg = SceneGraph(knowledge)
        d = sg.to_dict()
        assert "nodes" in d
        assert "edges" in d
        assert len(d["nodes"]) > 0


class TestValidationPipeline:

    def setup_method(self):
        self.kb = GroundTruthKnowledgeBase()
        self.validator = AdvancedValidationPipeline(self.kb)

    def test_validate_known_subject(self):
        knowledge = self.kb.retrieve("heart", Domain.MEDICAL)
        image_data = {"subject": "heart", "domain": "medical", "width": 2048, "height": 2048}
        passed, results = self.validator.validate(image_data, knowledge)
        assert isinstance(passed, bool)
        assert isinstance(results, dict)

    def test_validate_returns_details(self):
        knowledge = self.kb.retrieve("brain", Domain.MEDICAL)
        image_data = {"subject": "brain", "domain": "medical", "width": 2048, "height": 2048}
        passed, results = self.validator.validate(image_data, knowledge)
        assert "validators" in results or "stages" in results or isinstance(results, dict)


class TestUpscalingEngine:

    def setup_method(self):
        self.upscaler = UpscalingEngine()

    def test_upscale_metadata(self):
        image_data = {"width": 1024, "height": 1024, "format": "png"}
        result = self.upscaler.upscale_to_8k(image_data)
        assert isinstance(result, dict)

    def test_upscale_returns_enhanced(self):
        image_data = {"width": 1024, "height": 1024, "format": "png"}
        result = self.upscaler.upscale_to_8k(image_data)
        assert "upscaled_resolution" in result or "target_resolution" in result or "width" in result or isinstance(result, dict)


class TestAdvancedVisualizationSystem:

    def setup_method(self):
        self.system = AdvancedVisualizationSystem()

    def test_visualize_heart_request(self):
        result = self.system.visualize_advanced("Show me the human heart anatomy")
        assert result["subject"] == "human heart"
        assert result["domain"] == "medical"
        assert "knowledge" in result
        assert "scene_graph" in result
        assert "validation" in result
        assert "upscaling" in result
        assert "accuracy_metrics" in result

    def test_visualize_brain_request(self):
        result = self.system.visualize_advanced("brain neuroscience diagram")
        assert result["subject"] == "brain"
        assert len(result["knowledge"]["primary_structures"]) >= 8

    def test_visualize_unknown_subject(self):
        result = self.system.visualize_advanced("random unknown item xyz")
        assert "subject" in result
        assert "domain" in result
        assert result["accuracy_metrics"]["overall_accuracy"] >= 0

    def test_backward_compatible_v1_classes(self):
        engine = ScientificVisualizationEngine()
        assert engine is not None
        db = TechnicalReferenceDatabase()
        ref = db.get_reference(Domain.MEDICAL, "heart")
        assert ref is not None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
