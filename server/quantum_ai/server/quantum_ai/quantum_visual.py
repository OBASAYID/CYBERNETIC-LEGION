"""
Quantum Visual Engine v4.0 - Ultra-Realistic Scientific Visualization
Advanced PIL-based multi-modal visual system with:
- High-detail anatomical/biological illustrations
- Gradient rendering and multi-layer compositing
- Professional scientific color schemes
- Image enhancement pipeline
- 30+ visual topic categories
- Context-aware prompt engineering
"""

import os
import io
import base64
import math
import random
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageFont

logger = logging.getLogger(__name__)


def _radial_gradient(draw: ImageDraw.Draw, center: Tuple[int, int],
                     radius: int, inner_color: Tuple[int, int, int],
                     outer_color: Tuple[int, int, int], steps: int = 60):
    for i in range(steps, 0, -1):
        r = int(radius * i / steps)
        t = i / steps
        color = tuple(int(outer_color[c] + (inner_color[c] - outer_color[c]) * (1 - t)) for c in range(3))
        x0, y0 = center[0] - r, center[1] - r
        x1, y1 = center[0] + r, center[1] + r
        draw.ellipse([x0, y0, x1, y1], fill=color)


def _draw_glow(draw: ImageDraw.Draw, center: Tuple[int, int],
               radius: int, color: Tuple[int, int, int], intensity: int = 40):
    for i in range(intensity, 0, -2):
        r = radius + i
        alpha_color = tuple(max(0, c - (intensity - i) * 3) for c in color)
        draw.ellipse([center[0] - r, center[1] - r, center[0] + r, center[1] + r],
                     outline=alpha_color, width=1)


def _draw_label_line(draw: ImageDraw.Draw, start: Tuple[int, int],
                     end: Tuple[int, int], label: str, color: str,
                     font=None, align: str = 'right'):
    draw.line([start, end], fill=color, width=1)
    dot_r = 3
    draw.ellipse([start[0] - dot_r, start[1] - dot_r, start[0] + dot_r, start[1] + dot_r], fill=color)
    tx = end[0] + 5 if align == 'right' else end[0] - len(label) * 7
    draw.text((tx, end[1] - 7), label, fill=color, font=font)


def _draw_dashed_line(draw: ImageDraw.Draw, start: Tuple[int, int],
                      end: Tuple[int, int], color: str, width: int = 1, dash_len: int = 6):
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length = math.sqrt(dx * dx + dy * dy)
    if length == 0:
        return
    ux, uy = dx / length, dy / length
    pos = 0
    drawing = True
    while pos < length:
        seg = min(dash_len, length - pos)
        x0, y0 = start[0] + ux * pos, start[1] + uy * pos
        x1, y1 = start[0] + ux * (pos + seg), start[1] + uy * (pos + seg)
        if drawing:
            draw.line([(int(x0), int(y0)), (int(x1), int(y1))], fill=color, width=width)
        drawing = not drawing
        pos += dash_len


class EnhancedMedicalKnowledgeBase:
    def __init__(self):
        self.topics = self._load_comprehensive_knowledge()
        self.visual_topics = list(self.topics.keys())

    def _load_comprehensive_knowledge(self) -> Dict:
        return {
            'virus': {
                'category': 'microbiology',
                'visual': True,
                'title': 'Virus Particle Structure',
                'description': 'Viruses are obligate intracellular parasites consisting of nucleic acid (DNA or RNA) surrounded by a protein capsid, sometimes with a lipid envelope.',
                'structures': ['Capsid', 'Envelope', 'Spike proteins', 'RNA/DNA core', 'Lipid bilayer', 'Matrix proteins'],
                'key_facts': ['Size: 20-300 nm', 'Not living organisms', 'Require host cells to replicate', 'Can infect all life forms']
            },
            'bacteria': {
                'category': 'microbiology',
                'visual': True,
                'title': 'Bacterial Cell Anatomy',
                'description': 'Bacteria are prokaryotic single-celled organisms with complex cell wall structures.',
                'structures': ['Cell wall (peptidoglycan)', 'Cell membrane', 'Nucleoid (DNA)', 'Ribosomes', 'Flagella', 'Pili', 'Capsule'],
                'key_facts': ['Size: 0.5-5 micrometers', 'Prokaryotic (no nucleus)', 'Binary fission reproduction', 'Gram-positive/negative classification']
            },
            'covid-19': {
                'category': 'virology',
                'visual': True,
                'title': 'SARS-CoV-2 Virus Particle',
                'description': 'SARS-CoV-2 is a betacoronavirus causing COVID-19 with distinctive crown-like spike glycoproteins.',
                'structures': ['Spike (S) glycoprotein', 'Envelope (E) protein', 'Membrane (M) protein', 'Nucleocapsid (N) protein', 'RNA genome (~30 kb)', 'Lipid envelope'],
                'key_facts': ['Size: 100-140 nm', 'ssRNA genome', 'ACE2 receptor binding', 'Variants: Alpha through Omicron']
            },
            'dna': {
                'category': 'molecular_biology',
                'visual': True,
                'title': 'DNA Double Helix Structure',
                'description': 'DNA is a double-stranded nucleic acid polymer encoding genetic information.',
                'structures': ['Sugar-phosphate backbone', 'Nitrogenous bases (A, T, G, C)', 'Hydrogen bonds', 'Major groove', 'Minor groove', 'Antiparallel strands'],
                'key_facts': ['Diameter: 2 nm', 'Pitch: 3.4 nm (10 bp/turn)', 'Human genome: 3.2 billion bp', 'B-form dominant in vivo']
            },
            'cell': {
                'category': 'cell_biology',
                'visual': True,
                'title': 'Eukaryotic Cell Cross-Section',
                'description': 'The eukaryotic cell is the fundamental unit of complex life with membrane-bound organelles.',
                'structures': ['Nucleus', 'Mitochondria', 'Rough ER', 'Smooth ER', 'Golgi apparatus', 'Lysosomes', 'Ribosomes', 'Cell membrane', 'Cytoskeleton'],
                'key_facts': ['Size: 10-100 micrometers', 'Contains membrane-bound organelles', 'DNA in nucleus', 'Mitochondria produce ATP']
            },
            'heart': {
                'category': 'anatomy',
                'visual': True,
                'title': 'Human Heart Anatomy',
                'description': 'The heart is a four-chambered muscular organ that pumps blood through the circulatory system.',
                'structures': ['Right atrium', 'Right ventricle', 'Left atrium', 'Left ventricle', 'Aorta', 'Pulmonary artery', 'Superior/Inferior vena cava', 'Coronary arteries', 'Cardiac valves'],
                'key_facts': ['Weight: 250-350g', 'Rate: 60-100 bpm', 'Output: 5 L/min', 'Size: ~fist-sized']
            },
            'brain': {
                'category': 'neuroscience',
                'visual': True,
                'title': 'Human Brain Anatomy',
                'description': 'The brain is the central organ of the nervous system controlling cognition, movement, and bodily functions.',
                'structures': ['Cerebrum (frontal, parietal, temporal, occipital lobes)', 'Cerebellum', 'Brainstem', 'Thalamus', 'Hypothalamus', 'Hippocampus', 'Amygdala', 'Corpus callosum'],
                'key_facts': ['Weight: 1.4 kg', '86 billion neurons', '85 billion glial cells', 'Uses 20% of body energy']
            },
            'lung': {
                'category': 'anatomy',
                'visual': True,
                'title': 'Respiratory System - Lungs',
                'description': 'Lungs are paired organs for gas exchange - oxygen intake and carbon dioxide removal.',
                'structures': ['Trachea', 'Bronchi', 'Bronchioles', 'Alveoli', 'Pleural membrane', 'Diaphragm', 'Pulmonary arteries/veins'],
                'key_facts': ['Surface area: 70 m2', '300 million alveoli', 'Capacity: 6 liters', '12-20 breaths/min']
            },
            'cancer': {
                'category': 'oncology',
                'visual': True,
                'title': 'Cancer Cell Biology',
                'description': 'Cancer results from uncontrolled cell division caused by accumulated DNA mutations.',
                'structures': ['Mutated nucleus', 'Abnormal mitosis', 'Angiogenesis', 'Invasion front', 'Metastatic cells', 'Tumor microenvironment'],
                'key_facts': ['6 hallmarks of cancer', 'Gene mutations drive growth', 'Can metastasize', 'Types: carcinoma, sarcoma, leukemia, lymphoma']
            },
            'immune_system': {
                'category': 'immunology',
                'visual': True,
                'title': 'Immune System Overview',
                'description': 'The immune system defends against pathogens via innate and adaptive immunity.',
                'structures': ['Macrophages', 'Neutrophils', 'NK cells', 'B cells', 'T cells (helper, cytotoxic)', 'Antibodies', 'Complement system', 'Memory cells'],
                'key_facts': ['Innate: fast, non-specific', 'Adaptive: targeted, memory', 'Antibodies: IgG, IgA, IgM, IgE', 'Organs: thymus, spleen, lymph nodes']
            },
            'muscle': {
                'category': 'anatomy',
                'visual': True,
                'title': 'Muscle Tissue Architecture',
                'description': 'Muscle tissue generates force and movement through contraction of specialized fibers.',
                'structures': ['Muscle fibers', 'Myofibrils', 'Sarcomeres', 'Actin filaments', 'Myosin filaments', 'Z-lines', 'Motor end plates'],
                'key_facts': ['3 types: skeletal, cardiac, smooth', 'Sliding filament mechanism', 'ATP-dependent contraction', '40% of body weight']
            },
            'nervous_system': {
                'category': 'neuroscience',
                'visual': True,
                'title': 'Nervous System Architecture',
                'description': 'The nervous system coordinates body functions via electrical and chemical signals.',
                'structures': ['Neurons (soma, axon, dendrites)', 'Myelin sheath', 'Synapses', 'Neurotransmitters', 'Spinal cord', 'Ganglia', 'Nodes of Ranvier'],
                'key_facts': ['CNS: brain + spinal cord', 'PNS: cranial + spinal nerves', 'Signal speed: up to 120 m/s', 'Chemical and electrical signaling']
            },
            'pathogen': {
                'category': 'microbiology',
                'visual': True,
                'title': 'Pathogen Classification',
                'description': 'Pathogens are organisms that cause disease including viruses, bacteria, fungi, and parasites.',
                'structures': ['Viral particles', 'Bacterial cells', 'Fungal hyphae', 'Parasitic organisms'],
                'key_facts': ['Types: virus, bacteria, fungus, parasite, prion', 'Transmission: airborne, waterborne, contact', 'Defense: immune system, vaccines, antibiotics']
            },
            'hiv': {
                'category': 'virology',
                'visual': True,
                'title': 'HIV Retrovirus Structure',
                'description': 'HIV is a complex retrovirus targeting CD4+ T cells, causing progressive immunodeficiency.',
                'structures': ['gp120 surface protein', 'gp41 transmembrane protein', 'Capsid (p24)', 'Matrix (p17)', 'Reverse transcriptase', 'Integrase', 'RNA genome (2 copies)'],
                'key_facts': ['Size: 100-120 nm', 'Retrovirus (RNA to DNA)', 'Targets CD4+ T cells', 'Causes AIDS']
            },
            'neuron': {
                'category': 'neuroscience',
                'visual': True,
                'title': 'Neuron (Nerve Cell) Structure',
                'description': 'Neurons are specialized cells that transmit electrical and chemical signals throughout the nervous system.',
                'structures': ['Cell body (soma)', 'Dendrites', 'Axon', 'Myelin sheath', 'Nodes of Ranvier', 'Axon terminal', 'Synaptic vesicles', 'Nucleus'],
                'key_facts': ['86 billion in human brain', 'Signal speed: 0.5-120 m/s', '10,000+ synapses each', 'Action potential: -70 to +40 mV']
            },
            'red_blood_cell': {
                'category': 'hematology',
                'visual': True,
                'title': 'Red Blood Cell (Erythrocyte)',
                'description': 'Red blood cells are biconcave disc-shaped cells carrying oxygen via hemoglobin.',
                'structures': ['Biconcave disc shape', 'Hemoglobin molecules', 'Spectrin cytoskeleton', 'Cell membrane'],
                'key_facts': ['Diameter: 7-8 um', '270 million hemoglobin/cell', 'No nucleus (mature)', '120-day lifespan']
            },
            'kidney': {
                'category': 'anatomy',
                'visual': True,
                'title': 'Kidney Anatomy',
                'description': 'Kidneys filter blood, remove waste, and regulate fluid/electrolyte balance.',
                'structures': ['Cortex', 'Medulla', 'Nephrons', 'Glomerulus', 'Bowman capsule', 'Renal pelvis', 'Ureter', 'Renal artery/vein'],
                'key_facts': ['Filters 180 L/day', '1 million nephrons each', 'Produces 1-2 L urine/day', 'Regulates blood pressure']
            },
            'liver': {
                'category': 'anatomy',
                'visual': True,
                'title': 'Liver Anatomy',
                'description': 'The liver is the largest internal organ performing 500+ metabolic functions.',
                'structures': ['Right lobe', 'Left lobe', 'Hepatocytes', 'Portal vein', 'Hepatic artery', 'Bile ducts', 'Central vein', 'Sinusoids'],
                'key_facts': ['Weight: 1.5 kg', '500+ functions', 'Dual blood supply', 'Regenerative capacity']
            },
            'eye': {
                'category': 'anatomy',
                'visual': True,
                'title': 'Human Eye Anatomy',
                'description': 'The eye is a sensory organ converting light into neural signals for vision.',
                'structures': ['Cornea', 'Iris', 'Pupil', 'Lens', 'Retina', 'Optic nerve', 'Vitreous humor', 'Sclera', 'Rods and cones'],
                'key_facts': ['126 million photoreceptors', '6 million cones (color)', '120 million rods (light)', 'Focal length: ~17 mm']
            },
            'influenza': {
                'category': 'virology',
                'visual': True,
                'title': 'Influenza Virus Structure',
                'description': 'Influenza viruses are segmented negative-sense RNA viruses causing respiratory infections.',
                'structures': ['Hemagglutinin (HA)', 'Neuraminidase (NA)', 'M2 ion channel', 'Matrix protein (M1)', '8 RNA segments', 'Lipid envelope'],
                'key_facts': ['Size: 80-120 nm', '8 RNA segments', 'Antigenic drift/shift', 'Types: A, B, C, D']
            },
            'tuberculosis': {
                'category': 'microbiology',
                'visual': True,
                'title': 'Mycobacterium tuberculosis',
                'description': 'TB is caused by an acid-fast bacillus with a unique waxy mycolic acid cell wall.',
                'structures': ['Mycolic acid cell wall', 'Arabinogalactan layer', 'Peptidoglycan', 'Plasma membrane', 'DNA', 'Cord factor'],
                'key_facts': ['Size: 2-4 x 0.2-0.5 um', 'Acid-fast staining', '15-20 hr doubling time', 'Survives in macrophages']
            },
            'malaria': {
                'category': 'parasitology',
                'visual': True,
                'title': 'Plasmodium Malaria Parasite',
                'description': 'Malaria is caused by Plasmodium parasites transmitted by Anopheles mosquitoes.',
                'structures': ['Merozoite', 'Trophozoite', 'Schizont', 'Gametocyte', 'Infected red blood cell'],
                'key_facts': ['5 Plasmodium species', 'P. falciparum most deadly', 'Complex lifecycle', '~250 million cases/year']
            },
            'stomach': {
                'category': 'anatomy',
                'visual': True,
                'title': 'Stomach Anatomy',
                'description': 'The stomach is a muscular organ that digests food using acid and enzymes.',
                'structures': ['Fundus', 'Body', 'Antrum', 'Pylorus', 'Gastric glands', 'Mucosa', 'Muscularis', 'Rugae'],
                'key_facts': ['Capacity: 1 liter', 'pH 1.5-3.5', 'Pepsin + HCl digestion', '3 muscle layers']
            },
            'spine': {
                'category': 'anatomy',
                'visual': True,
                'title': 'Spinal Column Structure',
                'description': 'The spine protects the spinal cord and provides structural support.',
                'structures': ['Cervical (7)', 'Thoracic (12)', 'Lumbar (5)', 'Sacrum', 'Coccyx', 'Intervertebral discs', 'Spinal cord'],
                'key_facts': ['33 vertebrae total', 'S-shaped curve', 'Protects spinal cord', 'Supports body weight']
            },
        }

    def get_topic_info(self, topic: str) -> Optional[Dict]:
        topic_lower = topic.lower().replace(' ', '_')
        if topic_lower in self.topics:
            return self.topics[topic_lower]
        for key, data in self.topics.items():
            if key in topic_lower or topic_lower in key:
                return data
        return None

    def needs_visual(self, topic: str) -> bool:
        info = self.get_topic_info(topic)
        return info is not None and info.get('visual', False)


class UltraRealisticImageGenerator:
    def __init__(self):
        self.cache_dir = Path("generated_images")
        self.cache_dir.mkdir(exist_ok=True)
        self.W = 1200
        self.H = 900

    def generate_image(self, topic: str, category: str = 'general') -> Dict:
        try:
            result = self._dispatch_visualization(topic, category)
            enhanced = self._enhance_image(result['image'])
            img_base64 = self._image_to_base64(enhanced)
            filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{topic.replace(' ', '_')}.png"
            filepath = self.cache_dir / filename
            enhanced.save(filepath, quality=95)
            return {
                'success': True,
                'method': 'ultra_realistic_v4',
                'topic': topic,
                'category': category,
                'base64': img_base64,
                'resolution': f"{enhanced.width}x{enhanced.height}",
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Image generation error: {e}")
            return self._generate_fallback(topic)

    def _dispatch_visualization(self, topic: str, category: str) -> Dict:
        topic_lower = topic.lower()
        dispatch = {
            'virus': self._draw_virus,
            'bacteria': self._draw_bacteria,
            'dna': self._draw_dna,
            'covid': self._draw_covid,
            'coronavirus': self._draw_covid,
            'sars': self._draw_covid,
            'cell': self._draw_cell,
            'heart': self._draw_heart,
            'brain': self._draw_brain,
            'lung': self._draw_lung,
            'cancer': self._draw_cancer,
            'immune': self._draw_immune,
            'muscle': self._draw_muscle,
            'pathogen': self._draw_pathogen,
            'nervous': self._draw_neuron,
            'neuron': self._draw_neuron,
            'nerve': self._draw_neuron,
            'hiv': self._draw_hiv,
            'influenza': self._draw_influenza,
            'flu': self._draw_influenza,
            'red_blood': self._draw_rbc,
            'erythrocyte': self._draw_rbc,
            'blood': self._draw_rbc,
            'kidney': self._draw_kidney,
            'liver': self._draw_liver,
            'eye': self._draw_eye,
            'tuberculosis': self._draw_tuberculosis,
            'malaria': self._draw_malaria,
            'stomach': self._draw_stomach,
            'spine': self._draw_spine,
            'spinal': self._draw_spine,
        }
        creator = None
        for key, func in dispatch.items():
            if key in topic_lower:
                creator = func
                break
        image = creator() if creator else self._draw_generic(topic)
        return {'image': image}

    def _new_canvas(self) -> Tuple[Image.Image, ImageDraw.Draw]:
        img = Image.new('RGB', (self.W, self.H), (6, 8, 18))
        base = ImageDraw.Draw(img)
        for y in range(self.H):
            t = y / self.H
            r = int(6 + t * 10)
            g = int(8 + t * 12)
            b = int(18 + t * 20)
            base.line([(0, y), (self.W, y)], fill=(r, g, b))
        draw = ImageDraw.Draw(img)
        return img, draw

    def _draw_title(self, draw: ImageDraw.Draw, title: str, subtitle: str = ""):
        draw.text((self.W // 2 - len(title) * 6, 18), title, fill=(0, 212, 255))
        if subtitle:
            draw.text((self.W // 2 - len(subtitle) * 4, 42), subtitle, fill=(100, 116, 139))
        draw.line([(50, 65), (self.W - 50, 65)], fill=(0, 212, 255, 40), width=1)

    def _draw_legend_box(self, draw: ImageDraw.Draw, items: List[Tuple[str, str]], x: int, y: int):
        box_h = len(items) * 22 + 16
        box_w = max(len(label) * 7 + 30 for label, _ in items) + 20
        for dy in range(box_h):
            alpha = min(40, 20 + dy // 3)
            draw.line([(x, y + dy), (x + box_w, y + dy)], fill=(15, 20, 35))
        draw.rectangle([x, y, x + box_w, y + box_h], outline=(0, 212, 255, 60), width=1)
        for i, (label, color) in enumerate(items):
            iy = y + 10 + i * 22
            draw.rectangle([x + 10, iy, x + 22, iy + 12], fill=color)
            draw.text((x + 30, iy - 1), label, fill=(180, 190, 200))

    def _draw_virus(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "VIRUS PARTICLE ULTRASTRUCTURE", "Electron Microscopy Visualization | Magnification: 150,000x")
        cx, cy = self.W // 2, self.H // 2 + 20

        _radial_gradient(draw, (cx, cy), 200, (25, 40, 80), (6, 8, 18))

        for r in range(130, 90, -1):
            t = (r - 90) / 40
            c = int(40 + t * 30)
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(c, c + 20, c + 60), width=1)
        draw.ellipse([cx - 95, cy - 95, cx + 95, cy + 95], outline=(60, 130, 220), width=3)

        draw.ellipse([cx - 50, cy - 50, cx + 50, cy + 50], outline=(200, 60, 60), width=2)
        for i in range(8):
            angle = i * math.pi / 4
            x1 = cx + 20 * math.cos(angle)
            y1 = cy + 20 * math.sin(angle)
            x2 = cx + 45 * math.cos(angle)
            y2 = cy + 45 * math.sin(angle)
            draw.line([(int(x1), int(y1)), (int(x2), int(y2))], fill=(220, 80, 80), width=2)
        draw.text((cx - 18, cy - 8), "RNA", fill=(255, 180, 180))
        draw.text((cx - 22, cy + 6), "Core", fill=(255, 150, 150))

        num_spikes = 24
        for i in range(num_spikes):
            angle = 2 * math.pi * i / num_spikes
            base_x = cx + 95 * math.cos(angle)
            base_y = cy + 95 * math.sin(angle)
            tip_x = cx + 165 * math.cos(angle)
            tip_y = cy + 165 * math.sin(angle)
            mid_x = cx + 130 * math.cos(angle)
            mid_y = cy + 130 * math.sin(angle)

            draw.line([(int(base_x), int(base_y)), (int(mid_x), int(mid_y))], fill=(40, 180, 100), width=3)
            draw.line([(int(mid_x), int(mid_y)), (int(tip_x), int(tip_y))], fill=(50, 200, 120), width=2)

            head_r = 10
            draw.ellipse([int(tip_x) - head_r, int(tip_y) - head_r,
                          int(tip_x) + head_r, int(tip_y) + head_r], fill=(30, 160, 90))
            draw.ellipse([int(tip_x) - head_r + 2, int(tip_y) - head_r + 2,
                          int(tip_x) + head_r - 2, int(tip_y) + head_r - 2], fill=(40, 180, 100))

            perp = angle + math.pi / 2
            for side in [-1, 1]:
                fork_x = int(tip_x + side * 6 * math.cos(perp))
                fork_y = int(tip_y + side * 6 * math.sin(perp))
                draw.ellipse([fork_x - 4, fork_y - 4, fork_x + 4, fork_y + 4], fill=(60, 200, 130))

        for i in range(12):
            angle = 2 * math.pi * i / 12 + math.pi / 24
            mx = cx + 85 * math.cos(angle)
            my = cy + 85 * math.sin(angle)
            draw.ellipse([int(mx) - 5, int(my) - 5, int(mx) + 5, int(my) + 5], fill=(180, 140, 60))

        _draw_label_line(draw, (cx + 95, cy - 30), (cx + 220, cy - 80), "Protein Capsid", '#3b82f6')
        _draw_label_line(draw, (cx + 130, cy + 50), (cx + 240, cy + 100), "Spike Glycoprotein", '#22c55e')
        _draw_label_line(draw, (cx + 40, cy - 40), (cx + 220, cy - 130), "Genetic Material (RNA/DNA)", '#ef4444')
        _draw_label_line(draw, (cx + 80, cy + 10), (cx + 250, cy + 30), "Membrane Proteins", '#eab308')

        self._draw_legend_box(draw, [
            ("Spike Proteins (Cell Entry)", '#22c55e'),
            ("Capsid Shell (Protection)", '#3b82f6'),
            ("RNA/DNA Core (Genome)", '#ef4444'),
            ("Membrane Proteins", '#eab308'),
        ], 40, self.H - 130)

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))

        return img

    def _draw_bacteria(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "BACTERIAL CELL ULTRASTRUCTURE", "Scanning Electron Microscopy | Gram-negative Rod")
        cx, cy = self.W // 2, self.H // 2 + 20

        _radial_gradient(draw, (cx, cy), 220, (20, 30, 50), (6, 8, 18))

        for r_off in range(8):
            t = r_off / 8
            c = int(100 + t * 60)
            draw.ellipse([cx - 170 + r_off, cy - 100 + r_off, cx + 170 - r_off, cy + 100 - r_off],
                         outline=(c, 80, 200), width=1)
        draw.ellipse([cx - 162, cy - 92, cx + 162, cy + 92], outline=(100, 130, 220), width=2)
        draw.ellipse([cx - 155, cy - 85, cx + 155, cy + 85], fill=(15, 18, 35))

        draw.ellipse([cx - 50, cy - 35, cx + 50, cy + 35], outline=(250, 160, 50), width=2)
        for i in range(6):
            angle = i * math.pi / 3
            x1 = cx + 15 * math.cos(angle)
            y1 = cy + 10 * math.sin(angle)
            x2 = cx + 40 * math.cos(angle)
            y2 = cy + 28 * math.sin(angle)
            draw.line([(int(x1), int(y1)), (int(x2), int(y2))], fill=(250, 180, 80), width=1)
        draw.text((cx - 30, cy - 8), "Nucleoid", fill=(250, 180, 80))

        for i in range(20):
            x = cx - 130 + random.randint(0, 260)
            y = cy + random.randint(-60, 60)
            dist = math.sqrt((x - cx) ** 2 / (150 ** 2) + (y - cy) ** 2 / (80 ** 2))
            if 0.3 < dist < 0.9 and abs(x - cx) > 60:
                draw.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(220, 60, 60))

        points = [(cx + 162, cy)]
        x, y = cx + 162, cy
        for i in range(40):
            x += random.randint(3, 8)
            y += random.randint(-12, 12)
            points.append((x, y))
        for i in range(len(points) - 1):
            draw.line([points[i], points[i + 1]], fill=(50, 200, 100), width=3)

        for i in range(8):
            px = cx - 120 + i * 30
            py = cy - 92
            draw.line([(px, py), (px + random.randint(-5, 5), py - 30)], fill=(230, 200, 50), width=2)

        _draw_label_line(draw, (cx - 165, cy), (30, cy - 100), "Cell Wall (Peptidoglycan)", '#a855f7')
        _draw_label_line(draw, (cx - 155, cy + 20), (30, cy + 50), "Plasma Membrane", '#3b82f6')
        _draw_label_line(draw, (cx + 40, cy), (cx + 280, cy - 60), "Nucleoid (DNA)", '#f97316')
        _draw_label_line(draw, (cx + 100, cy + 50), (cx + 280, cy + 80), "Ribosomes", '#ef4444')
        _draw_label_line(draw, (cx + 200, cy + 20), (cx + 300, cy + 30), "Flagellum", '#22c55e')
        _draw_label_line(draw, (cx - 60, cy - 95), (cx - 60, cy - 150), "Pili / Fimbriae", '#eab308')

        self._draw_legend_box(draw, [
            ("Cell Wall", '#a855f7'),
            ("Plasma Membrane", '#3b82f6'),
            ("Nucleoid DNA", '#f97316'),
            ("Ribosomes", '#ef4444'),
            ("Flagellum", '#22c55e'),
            ("Pili", '#eab308'),
        ], 40, self.H - 170)

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_dna(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "DNA DOUBLE HELIX MOLECULAR STRUCTURE", "Molecular Visualization | B-form DNA | 3.4 nm Pitch")
        cx = self.W // 2
        y_start, y_end = 90, self.H - 120
        helix_w = 140
        steps = 200

        base_pairs = ['A-T', 'G-C', 'T-A', 'C-G', 'A-T', 'G-C', 'G-C', 'T-A']
        bp_colors = {'A-T': (220, 60, 60), 'T-A': (220, 60, 60), 'G-C': (50, 200, 100), 'C-G': (50, 200, 100)}

        strand1_pts = []
        strand2_pts = []
        for i in range(steps):
            t = i / steps
            y = y_start + t * (y_end - y_start)
            x1 = cx + helix_w * math.sin(t * 6 * math.pi)
            x2 = cx - helix_w * math.sin(t * 6 * math.pi)
            strand1_pts.append((int(x1), int(y)))
            strand2_pts.append((int(x2), int(y)))

        bp_interval = steps // 30
        for i in range(0, steps, bp_interval):
            if i < len(strand1_pts) and i < len(strand2_pts):
                p1 = strand1_pts[i]
                p2 = strand2_pts[i]
                bp = base_pairs[(i // bp_interval) % len(base_pairs)]
                color = bp_colors[bp]
                _draw_dashed_line(draw, p1, p2, color, width=2, dash_len=4)
                mid_x = (p1[0] + p2[0]) // 2
                mid_y = (p1[1] + p2[1]) // 2
                draw.text((mid_x - 10, mid_y - 6), bp, fill=color)

        for i in range(len(strand1_pts) - 1):
            draw.line([strand1_pts[i], strand1_pts[i + 1]], fill=(60, 130, 220), width=4)
        for i in range(len(strand2_pts) - 1):
            draw.line([strand2_pts[i], strand2_pts[i + 1]], fill=(200, 80, 80), width=4)

        for i in range(0, len(strand1_pts), 4):
            p = strand1_pts[i]
            draw.ellipse([p[0] - 5, p[1] - 5, p[0] + 5, p[1] + 5], fill=(80, 150, 240))
        for i in range(0, len(strand2_pts), 4):
            p = strand2_pts[i]
            draw.ellipse([p[0] - 5, p[1] - 5, p[0] + 5, p[1] + 5], fill=(230, 100, 100))

        draw.text((40, 200), "5'", fill=(60, 130, 220))
        draw.text((40, self.H - 160), "3'", fill=(60, 130, 220))
        draw.text((self.W - 60, 200), "3'", fill=(200, 80, 80))
        draw.text((self.W - 60, self.H - 160), "5'", fill=(200, 80, 80))

        info_x = 40
        draw.text((info_x, self.H - 110), "Diameter: 2 nm | Pitch: 3.4 nm | 10 bp per turn", fill=(100, 116, 139))
        draw.text((info_x, self.H - 85), "A-T: 2 hydrogen bonds | G-C: 3 hydrogen bonds", fill=(100, 116, 139))

        self._draw_legend_box(draw, [
            ("Strand 1 (5' to 3')", '#3b82f6'),
            ("Strand 2 (3' to 5')", '#ef4444'),
            ("A-T Base Pairs", '#dc2626'),
            ("G-C Base Pairs", '#22c55e'),
        ], self.W - 280, 90)

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_covid(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "SARS-CoV-2 VIRUS PARTICLE", "Cryo-EM Reconstruction | COVID-19 Causative Agent | ~120 nm")
        cx, cy = self.W // 2, self.H // 2 + 15

        _radial_gradient(draw, (cx, cy), 240, (30, 20, 50), (6, 8, 18))

        for r in range(110, 85, -1):
            t = (r - 85) / 25
            draw.ellipse([cx - r, cy - r, cx + r, cy + r],
                         outline=(int(30 + t * 20), int(60 + t * 40), int(140 + t * 40)), width=1)
        draw.ellipse([cx - 88, cy - 88, cx + 88, cy + 88], fill=(15, 30, 60))

        for i in range(12):
            angle = i * math.pi / 6
            r = 30 + (i % 3) * 8
            x = cx + r * math.cos(angle)
            y = cy + r * math.sin(angle)
            draw.line([(cx, cy), (int(x), int(y))], fill=(250, 160, 50), width=1)
        draw.ellipse([cx - 35, cy - 35, cx + 35, cy + 35], outline=(250, 160, 50), width=2)
        draw.text((cx - 15, cy - 8), "ssRNA", fill=(250, 200, 100))
        draw.text((cx - 18, cy + 6), "~30kb", fill=(250, 180, 80))

        for i in range(6):
            angle = i * math.pi / 3 + 0.3
            x = cx + 70 * math.cos(angle)
            y = cy + 70 * math.sin(angle)
            draw.ellipse([int(x) - 5, int(y) - 5, int(x) + 5, int(y) + 5], fill=(100, 60, 160))

        for i in range(8):
            angle = i * math.pi / 4 + 0.15
            x = cx + 80 * math.cos(angle)
            y = cy + 80 * math.sin(angle)
            draw.ellipse([int(x) - 4, int(y) - 4, int(x) + 4, int(y) + 4], fill=(60, 120, 60))

        num_spikes = 22
        for i in range(num_spikes):
            angle = 2 * math.pi * i / num_spikes
            bx = cx + 88 * math.cos(angle)
            by = cy + 88 * math.sin(angle)
            tx = cx + 160 * math.cos(angle)
            ty = cy + 160 * math.sin(angle)

            draw.line([(int(bx), int(by)), (int(tx), int(ty))], fill=(180, 40, 40), width=4)

            head_r = 14
            draw.ellipse([int(tx) - head_r, int(ty) - head_r, int(tx) + head_r, int(ty) + head_r],
                         fill=(160, 30, 30))
            draw.ellipse([int(tx) - head_r + 3, int(ty) - head_r + 3,
                          int(tx) + head_r - 3, int(ty) + head_r - 3], fill=(200, 50, 50))

            for offset in [-0.15, 0.15]:
                lx = int(tx + 10 * math.cos(angle + offset))
                ly = int(ty + 10 * math.sin(angle + offset))
                draw.ellipse([lx - 5, ly - 5, lx + 5, ly + 5], fill=(220, 70, 70))

        _draw_label_line(draw, (cx + 130, cy - 80), (cx + 260, cy - 140), "S Protein (ACE2 binding)", '#dc2626')
        _draw_label_line(draw, (cx + 80, cy + 60), (cx + 260, cy + 100), "Lipid Envelope", '#3b82f6')
        _draw_label_line(draw, (cx + 30, cy - 30), (cx + 260, cy - 50), "RNA Genome (ssRNA)", '#f97316')
        _draw_label_line(draw, (cx + 70, cy - 10), (cx + 270, cy + 20), "E Protein", '#a855f7')
        _draw_label_line(draw, (cx + 75, cy + 25), (cx + 270, cy + 55), "M Protein", '#22c55e')

        self._draw_legend_box(draw, [
            ("Spike (S) Glycoprotein", '#dc2626'),
            ("Lipid Bilayer Envelope", '#3b82f6'),
            ("ssRNA Genome (~30 kb)", '#f97316'),
            ("E Protein (Viroporin)", '#a855f7'),
            ("M Protein (Scaffold)", '#22c55e'),
        ], 40, self.H - 155)

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_cell(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "EUKARYOTIC CELL CROSS-SECTION", "Transmission Electron Microscopy | Animal Cell")
        cx, cy = self.W // 2, self.H // 2 + 20

        _radial_gradient(draw, (cx, cy), 280, (20, 25, 45), (6, 8, 18))

        draw.ellipse([cx - 220, cy - 170, cx + 220, cy + 170], outline=(100, 100, 240), width=4)
        draw.ellipse([cx - 215, cy - 165, cx + 215, cy + 165], outline=(80, 80, 200), width=1)

        _radial_gradient(draw, (cx - 20, cy - 10), 70, (50, 40, 100), (20, 25, 45))
        draw.ellipse([cx - 90, cy - 70, cx + 50, cy + 50], outline=(250, 150, 50), width=3)
        draw.ellipse([cx - 40, cy - 30, cx + 10, cy + 10], fill=(220, 60, 60))
        draw.text((cx - 65, cy + 55), "NUCLEUS", fill=(250, 150, 50))
        draw.text((cx - 30, cy + 15), "Nucleolus", fill=(220, 100, 100))

        mito_positions = [(-150, -80), (140, -60), (-130, 80), (150, 70), (-60, 120)]
        for dx, dy in mito_positions:
            mx, my = cx + dx, cy + dy
            draw.ellipse([mx - 30, my - 16, mx + 30, my + 16], fill=(15, 60, 30), outline=(40, 160, 80), width=2)
            for j in range(5):
                lx = mx - 20 + j * 10
                draw.line([(lx, my - 10), (lx, my + 10)], fill=(30, 120, 60), width=1)

        for i in range(15):
            angle = i * 0.4 + 0.5
            r = 90 + i * 3
            x = cx + r * math.cos(angle)
            y = cy + r * math.sin(angle) * 0.7
            draw.line([(int(x), int(y)), (int(x + 25), int(y + 5))], fill=(160, 100, 200), width=2)
            if i % 3 == 0:
                draw.ellipse([int(x + 25) - 3, int(y + 5) - 3, int(x + 25) + 3, int(y + 5) + 3], fill=(180, 120, 220))

        gx, gy = cx + 80, cy + 20
        for i in range(5):
            draw.arc([gx - 25 + i * 3, gy - 20 + i * 5, gx + 25 - i * 3, gy + 20 - i * 5], 0, 360,
                     fill=(230, 200, 50), width=2)

        for i in range(25):
            x = cx - 180 + random.randint(0, 360)
            y = cy - 130 + random.randint(0, 260)
            dist = math.sqrt((x - cx) ** 2 / (200 ** 2) + (y - cy) ** 2 / (150 ** 2))
            if 0.4 < dist < 0.95:
                draw.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(170, 100, 240))

        lx, ly = cx - 160, cy + 30
        draw.ellipse([lx - 18, ly - 18, lx + 18, ly + 18], fill=(60, 60, 20), outline=(180, 180, 50), width=2)

        _draw_label_line(draw, (cx + 215, cy), (cx + 310, cy - 40), "Cell Membrane", '#6366f1')
        _draw_label_line(draw, (cx + 50, cy - 60), (cx + 300, cy - 120), "Nucleus", '#f97316')
        _draw_label_line(draw, (cx + 145, cy - 55), (cx + 310, cy - 80), "Mitochondria", '#22c55e')
        _draw_label_line(draw, (cx + 120, cy + 60), (cx + 310, cy + 60), "Rough ER", '#a855f7')
        _draw_label_line(draw, (gx + 25, gy), (cx + 310, cy + 20), "Golgi Apparatus", '#eab308')
        _draw_label_line(draw, (lx, ly), (40, ly + 60), "Lysosome", '#84cc16')

        self._draw_legend_box(draw, [
            ("Cell Membrane", '#6366f1'),
            ("Nucleus + Nucleolus", '#f97316'),
            ("Mitochondria (ATP)", '#22c55e'),
            ("Rough ER (Protein)", '#a855f7'),
            ("Golgi (Processing)", '#eab308'),
            ("Lysosomes (Digest)", '#84cc16'),
            ("Ribosomes", '#c084fc'),
        ], 40, self.H - 195)

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_heart(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "HUMAN HEART - ANTERIOR VIEW", "Anatomical Cross-Section | Cardiac Chambers & Vasculature")
        cx, cy = self.W // 2, self.H // 2 + 30

        draw.ellipse([cx - 80, cy - 140, cx - 10, cy - 60], fill=(20, 40, 100), outline=(60, 100, 220), width=2)
        draw.text((cx - 55, cy - 110), "LA", fill=(180, 200, 255))

        draw.ellipse([cx + 10, cy - 140, cx + 80, cy - 60], fill=(20, 30, 80), outline=(50, 80, 180), width=2)
        draw.text((cx + 35, cy - 110), "RA", fill=(150, 180, 230))

        pts_lv = [(cx - 80, cy - 60), (cx - 10, cy - 60), (cx - 30, cy + 130), (cx - 100, cy + 130)]
        draw.polygon(pts_lv, fill=(120, 20, 20), outline=(200, 50, 50))
        draw.text((cx - 65, cy + 20), "LV", fill=(255, 200, 200))
        for i in range(5):
            y = cy - 40 + i * 30
            draw.line([(cx - 90, y), (cx - 20, y)], fill=(150, 30, 30), width=1)

        pts_rv = [(cx + 10, cy - 60), (cx + 80, cy - 60), (cx + 100, cy + 130), (cx + 30, cy + 130)]
        draw.polygon(pts_rv, fill=(100, 15, 15), outline=(180, 40, 40))
        draw.text((cx + 45, cy + 20), "RV", fill=(255, 180, 180))

        draw.line([(cx - 10, cy - 60), (cx - 10, cy + 130)], fill=(200, 200, 60), width=3)
        draw.text((cx - 8, cy + 135), "Septum", fill=(200, 200, 60))

        draw.line([(cx - 60, cy - 140), (cx - 80, cy - 200)], fill=(200, 50, 50), width=6)
        draw.line([(cx - 80, cy - 200), (cx - 120, cy - 180)], fill=(200, 50, 50), width=5)
        draw.text((cx - 180, cy - 210), "Aorta", fill=(200, 80, 80))

        draw.line([(cx + 50, cy - 140), (cx + 60, cy - 200)], fill=(40, 60, 150), width=5)
        draw.text((cx + 70, cy - 210), "Pulmonary\nArtery", fill=(80, 120, 200))

        draw.line([(cx - 80, cy - 120), (cx - 150, cy - 150)], fill=(60, 100, 200), width=4)
        draw.text((cx - 260, cy - 160), "Pulmonary Veins\n(Oxygenated)", fill=(80, 140, 220))

        draw.line([(cx + 80, cy - 100), (cx + 150, cy - 130)], fill=(40, 50, 120), width=5)
        draw.line([(cx + 80, cy - 80), (cx + 140, cy - 50)], fill=(40, 50, 120), width=4)
        draw.text((cx + 160, cy - 140), "SVC", fill=(80, 100, 160))
        draw.text((cx + 150, cy - 55), "IVC", fill=(80, 100, 160))

        draw.ellipse([cx - 15, cy - 65, cx + 15, cy - 55], fill=(200, 200, 60), outline=(240, 240, 80), width=1)
        draw.ellipse([cx - 15, cy - 145, cx + 15, cy - 135], fill=(200, 200, 60), outline=(240, 240, 80), width=1)

        self._draw_legend_box(draw, [
            ("Left Atrium (Oxy blood in)", '#3b82f6'),
            ("Right Atrium (Deoxy in)", '#1e40af'),
            ("Left Ventricle (Systemic)", '#dc2626'),
            ("Right Ventricle (Pulmonary)", '#991b1b'),
            ("Aorta (Oxygenated out)", '#ef4444'),
            ("Cardiac Valves", '#eab308'),
        ], 40, self.H - 175)

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_brain(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "HUMAN BRAIN - SAGITTAL SECTION", "Neuroanatomy | Major Regions & Functional Areas")
        cx, cy = self.W // 2, self.H // 2 + 20

        draw.ellipse([cx - 180, cy - 140, cx + 150, cy + 80], fill=(180, 160, 170))
        draw.ellipse([cx - 175, cy - 135, cx + 145, cy + 75], fill=(200, 180, 185))

        for i in range(20):
            x = cx - 160 + random.randint(0, 280)
            y = cy - 120 + random.randint(0, 170)
            dist = math.sqrt((x - cx) ** 2 / (160 ** 2) + (y - cy) ** 2 / (120 ** 2))
            if dist < 0.85:
                length = random.randint(20, 60)
                angle = random.uniform(0, math.pi * 2)
                ex = int(x + length * math.cos(angle))
                ey = int(y + length * math.sin(angle))
                draw.line([(x, y), (ex, ey)], fill=(170, 150, 160), width=2)

        draw.line([(cx - 30, cy - 100), (cx - 30, cy + 60)], fill=(140, 120, 130), width=2)
        draw.line([(cx - 160, cy - 20), (cx + 120, cy - 20)], fill=(140, 120, 130), width=2)

        draw.text((cx - 140, cy - 90), "FRONTAL", fill=(220, 60, 60))
        draw.text((cx + 30, cy - 100), "PARIETAL", fill=(50, 180, 100))
        draw.text((cx - 140, cy + 10), "TEMPORAL", fill=(60, 130, 220))
        draw.text((cx + 50, cy + 10), "OCCIPITAL", fill=(240, 160, 40))

        draw.ellipse([cx - 30, cy + 70, cx + 100, cy + 140], fill=(160, 140, 150), outline=(140, 120, 130), width=2)
        for i in range(8):
            x = cx + 5 + i * 12
            draw.line([(x, cy + 85), (x, cy + 125)], fill=(150, 130, 140), width=1)
        draw.text((cx, cy + 145), "Cerebellum", fill=(200, 200, 220))

        draw.rectangle([cx + 100, cy + 50, cx + 120, cy + 150], fill=(140, 120, 100), outline=(120, 100, 80), width=2)
        draw.text((cx + 125, cy + 85), "Brainstem", fill=(200, 180, 160))

        draw.ellipse([cx - 40, cy - 20, cx + 10, cy + 20], fill=(240, 200, 80), outline=(220, 180, 60), width=2)
        draw.text((cx - 60, cy + 25), "Thalamus", fill=(240, 200, 80))

        draw.ellipse([cx - 80, cy + 20, cx - 50, cy + 45], fill=(100, 200, 100), outline=(80, 180, 80), width=2)
        draw.text((cx - 120, cy + 50), "Hippocampus", fill=(100, 200, 100))

        draw.text((cx - 30, cy - 130), "Corpus Callosum", fill=(160, 160, 180))
        draw.line([(cx - 100, cy - 110), (cx + 80, cy - 110)], fill=(160, 160, 180), width=3)

        self._draw_legend_box(draw, [
            ("Frontal Lobe (Decision/Motor)", '#ef4444'),
            ("Parietal Lobe (Sensation)", '#22c55e'),
            ("Temporal Lobe (Hearing/Memory)", '#3b82f6'),
            ("Occipital Lobe (Vision)", '#f59e0b'),
            ("Cerebellum (Coordination)", '#c4b5fd'),
            ("Thalamus (Relay Center)", '#eab308'),
            ("Hippocampus (Memory)", '#4ade80'),
        ], 40, self.H - 200)

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_lung(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "RESPIRATORY SYSTEM - LUNG ANATOMY", "Anatomical Illustration | Gas Exchange System")
        cx, cy = self.W // 2, self.H // 2 + 20

        draw.rectangle([cx - 8, cy - 200, cx + 8, cy - 100], fill=(80, 90, 100), outline=(120, 130, 140), width=2)
        draw.text((cx + 15, cy - 170), "Trachea", fill=(120, 130, 140))

        draw.line([(cx, cy - 100), (cx - 100, cy - 40)], fill=(80, 90, 100), width=5)
        draw.line([(cx, cy - 100), (cx + 100, cy - 40)], fill=(80, 90, 100), width=5)

        for side, sx in [(-1, cx - 100), (1, cx + 100)]:
            for i in range(4):
                bx = sx + side * (i * 20 + 10)
                by = cy - 30 + i * 25
                draw.line([(sx, cy - 40), (bx, by)], fill=(80, 90, 100), width=2)
                for j in range(3):
                    ax = bx + side * (j * 12 + 8)
                    ay = by + 10
                    draw.ellipse([ax - 6, ay - 6, ax + 6, ay + 6], fill=(200, 140, 140), outline=(220, 160, 160), width=1)

        draw.ellipse([cx - 230, cy - 80, cx - 30, cy + 150], fill=(30, 40, 55), outline=(180, 80, 80), width=3)
        draw.text((cx - 165, cy + 30), "Left", fill=(200, 150, 150))
        draw.text((cx - 165, cy + 50), "Lung", fill=(200, 150, 150))

        draw.ellipse([cx + 30, cy - 80, cx + 230, cy + 150], fill=(30, 40, 55), outline=(200, 80, 80), width=3)
        draw.line([(cx + 130, cy - 20), (cx + 130, cy + 100)], fill=(180, 70, 70), width=1)
        draw.text((cx + 70, cy + 30), "Right", fill=(200, 150, 150))
        draw.text((cx + 70, cy + 50), "Lung", fill=(200, 150, 150))
        draw.text((cx + 140, cy + 30), "(3 lobes)", fill=(160, 130, 130))

        draw.arc([cx - 250, cy + 130, cx + 250, cy + 210], 0, 180, fill=(240, 160, 50), width=4)
        draw.text((cx - 45, cy + 215), "Diaphragm", fill=(240, 160, 50))

        draw.ellipse([cx - 25, cy - 30, cx + 25, cy + 30], fill=(100, 20, 20), outline=(180, 40, 40), width=2)
        draw.text((cx - 15, cy - 8), "Heart", fill=(220, 180, 180))

        ax, ay = self.W - 280, 100
        draw.text((ax, ay), "Alveolar Detail:", fill=(0, 212, 255))
        for i in range(7):
            for j in range(5):
                ex = ax + 20 + i * 25
                ey = ay + 25 + j * 22
                draw.ellipse([ex - 8, ey - 8, ex + 8, ey + 8], fill=(200, 130, 130), outline=(220, 150, 150), width=1)
        draw.text((ax, ay + 140), "300 million alveoli", fill=(160, 130, 130))
        draw.text((ax, ay + 160), "Surface: 70 m2", fill=(160, 130, 130))

        self._draw_legend_box(draw, [
            ("Trachea / Bronchi", '#94a3b8'),
            ("Lung Tissue", '#ef4444'),
            ("Alveoli (Gas Exchange)", '#e58080'),
            ("Heart", '#dc2626'),
            ("Diaphragm", '#f59e0b'),
        ], 40, self.H - 155)

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_cancer(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "CANCER CELL BIOLOGY & HALLMARKS", "Oncology | Tumor Microenvironment & Metastasis")
        cx, cy = self.W // 2 - 80, self.H // 2 + 20

        _radial_gradient(draw, (cx, cy), 120, (60, 15, 15), (6, 8, 18))
        draw.ellipse([cx - 100, cy - 100, cx + 100, cy + 100], outline=(220, 50, 50), width=3)

        draw.ellipse([cx - 50, cy - 55, cx + 40, cy + 35], fill=(50, 30, 80), outline=(200, 100, 50), width=2)
        for i in range(8):
            x = cx - 40 + random.randint(0, 70)
            y = cy - 45 + random.randint(0, 70)
            draw.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(250, 150, 50))
        draw.text((cx - 35, cy + 40), "Mutated Nucleus", fill=(200, 100, 50))

        for i in range(8):
            angle = i * math.pi / 4 + random.uniform(-0.2, 0.2)
            r = 100 + random.randint(10, 60)
            x = cx + r * math.cos(angle)
            y = cy + r * math.sin(angle)
            size = random.randint(15, 35)
            draw.ellipse([int(x) - size, int(y) - size, int(x) + size, int(y) + size],
                         fill=(80, 15, 15), outline=(180, 40, 40), width=1)
            if random.random() > 0.5:
                draw.ellipse([int(x) - 8, int(y) - 8, int(x) + 8, int(y) + 8], fill=(100, 30, 60))

        for i in range(6):
            x1 = cx + random.randint(-80, 80)
            y1 = cy + random.randint(-80, 80)
            x2 = x1 + random.randint(-60, 60)
            y2 = y1 + random.randint(-60, 60)
            draw.line([(x1, y1), (x2, y2)], fill=(200, 50, 50), width=1)

        hx = self.W - 350
        hallmarks = [
            ("1. Unlimited Replication", '#ef4444'),
            ("2. Growth Signal Autonomy", '#f97316'),
            ("3. Evasion of Suppressors", '#eab308'),
            ("4. Apoptosis Resistance", '#22c55e'),
            ("5. Angiogenesis Induction", '#3b82f6'),
            ("6. Tissue Invasion/Metastasis", '#a855f7'),
        ]
        draw.text((hx, 90), "HALLMARKS OF CANCER", fill=(0, 212, 255))
        for i, (text, color) in enumerate(hallmarks):
            y = 120 + i * 30
            draw.rectangle([hx, y, hx + 10, y + 18], fill=color)
            draw.text((hx + 18, y), text, fill=(180, 190, 200))

        draw.text((hx, 320), "TUMOR PROGRESSION:", fill=(0, 212, 255))
        stages = ["Normal Cell", "Mutation", "Dysplasia", "In Situ", "Invasion", "Metastasis"]
        for i, stage in enumerate(stages):
            x = hx + i * 50
            y = 350
            draw.ellipse([x, y, x + 30, y + 30], fill=(80 + i * 25, 20, 20), outline=(180, 50, 50), width=1)
            draw.text((x - 5, y + 35), stage[:6], fill=(160, 140, 140))
            if i < len(stages) - 1:
                draw.line([(x + 32, y + 15), (x + 48, y + 15)], fill=(200, 100, 100), width=2)

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_immune(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "IMMUNE SYSTEM - DEFENSE MECHANISMS", "Immunology | Innate & Adaptive Immunity")

        innate_x = 100
        adaptive_x = self.W // 2 + 80
        y_start = 100

        draw.text((innate_x + 40, y_start), "INNATE IMMUNITY", fill=(250, 160, 50))
        draw.text((innate_x + 20, y_start + 22), "First Line - Fast, Non-specific", fill=(100, 116, 139))
        draw.line([(innate_x, y_start + 45), (innate_x + 280, y_start + 45)], fill=(250, 160, 50), width=2)

        innate_cells = [
            ("Macrophage", (250, 160, 50), 35),
            ("Neutrophil", (220, 120, 40), 28),
            ("NK Cell", (200, 100, 30), 25),
            ("Dendritic Cell", (240, 180, 80), 30),
        ]
        for i, (name, color, size) in enumerate(innate_cells):
            x = innate_x + 50 + (i % 2) * 140
            y = y_start + 80 + (i // 2) * 100
            draw.ellipse([x - size, y - size, x + size, y + size], fill=color, outline=(255, 200, 100), width=2)
            if i == 0:
                for j in range(6):
                    a = j * math.pi / 3
                    px = int(x + (size + 8) * math.cos(a))
                    py = int(y + (size + 8) * math.sin(a))
                    draw.ellipse([px - 4, py - 4, px + 4, py + 4], fill=color)
            draw.text((x - len(name) * 3, y + size + 5), name, fill=(255, 200, 100))

        draw.text((adaptive_x + 30, y_start), "ADAPTIVE IMMUNITY", fill=(50, 200, 100))
        draw.text((adaptive_x + 10, y_start + 22), "Second Line - Targeted, Memory", fill=(100, 116, 139))
        draw.line([(adaptive_x, y_start + 45), (adaptive_x + 300, y_start + 45)], fill=(50, 200, 100), width=2)

        adaptive_cells = [
            ("B Cell", (50, 180, 100), 30),
            ("T Helper", (40, 160, 80), 28),
            ("Cytotoxic T", (30, 140, 60), 26),
            ("Memory Cell", (60, 200, 120), 32),
        ]
        for i, (name, color, size) in enumerate(adaptive_cells):
            x = adaptive_x + 60 + (i % 2) * 150
            y = y_start + 80 + (i // 2) * 100
            draw.ellipse([x - size, y - size, x + size, y + size], fill=color, outline=(100, 240, 150), width=2)
            if i == 3:
                draw.text((x - 5, y - 5), "M", fill=(255, 255, 255))
            draw.text((x - len(name) * 3, y + size + 5), name, fill=(100, 240, 150))

        ab_x, ab_y = adaptive_x + 80, y_start + 310
        draw.text((ab_x - 20, ab_y - 20), "Antibody (IgG)", fill=(100, 200, 240))
        draw.line([(ab_x, ab_y), (ab_x, ab_y + 40)], fill=(100, 200, 240), width=3)
        draw.line([(ab_x - 30, ab_y), (ab_x, ab_y + 15)], fill=(100, 200, 240), width=3)
        draw.line([(ab_x + 30, ab_y), (ab_x, ab_y + 15)], fill=(100, 200, 240), width=3)

        draw.line([(self.W // 2, y_start + 50), (self.W // 2, self.H - 160)], fill=(60, 70, 90), width=2)
        draw.text((self.W // 2 - 5, self.H // 2), ">", fill=(0, 212, 255))

        self._draw_legend_box(draw, [
            ("Innate: Fast, Non-specific", '#f59e0b'),
            ("Adaptive: Targeted, Memory", '#22c55e'),
            ("Antibodies: IgG/IgA/IgM/IgE", '#38bdf8'),
        ], 40, self.H - 100)

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_muscle(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "MUSCLE TISSUE ARCHITECTURE", "Histology | Skeletal Muscle Fiber Detail & Sarcomere")
        cx, cy = self.W // 2, self.H // 2

        sections = [
            ("SKELETAL", "Voluntary, Striated", (220, 60, 60), (180, 40, 40)),
            ("CARDIAC", "Involuntary, Branched", (240, 160, 40), (200, 130, 30)),
            ("SMOOTH", "Involuntary, Spindle", (50, 180, 100), (30, 140, 70)),
        ]
        for i, (name, desc, color, dark) in enumerate(sections):
            x = 60 + i * 380
            y = 90
            draw.rectangle([x, y, x + 340, y + 200], outline=color, width=2, fill=(15, 18, 30))
            draw.text((x + 10, y + 10), name, fill=color)
            draw.text((x + 10, y + 28), desc, fill=(140, 150, 160))

            for j in range(12):
                fy = y + 55 + j * 12
                draw.line([(x + 20, fy), (x + 320, fy)], fill=dark, width=3)
                if i == 0:
                    for k in range(0, 300, 20):
                        draw.line([(x + 20 + k, fy - 4), (x + 20 + k, fy + 4)], fill=color, width=1)
                elif i == 1:
                    if j % 3 == 0:
                        draw.line([(x + 20, fy), (x + 80, fy + 20)], fill=color, width=2)

        sar_y = 340
        draw.text((60, sar_y), "SARCOMERE DETAIL (Skeletal Muscle):", fill=(0, 212, 255))
        sar_y += 25
        draw.line([(80, sar_y), (80, sar_y + 120)], fill=(200, 200, 60), width=3)
        draw.line([(380, sar_y), (380, sar_y + 120)], fill=(200, 200, 60), width=3)
        draw.text((70, sar_y + 125), "Z", fill=(200, 200, 60))
        draw.text((370, sar_y + 125), "Z", fill=(200, 200, 60))

        for i in range(8):
            y = sar_y + 10 + i * 14
            draw.line([(80, y), (280, y)], fill=(60, 130, 220), width=3)
            draw.line([(180, y), (380, y)], fill=(220, 60, 60), width=3)

        draw.text((100, sar_y + 140), "Actin (thin)", fill=(60, 130, 220))
        draw.text((250, sar_y + 140), "Myosin (thick)", fill=(220, 60, 60))
        draw.text((150, sar_y + 160), "Sliding Filament Mechanism", fill=(140, 150, 160))

        self._draw_legend_box(draw, [
            ("Skeletal (Voluntary)", '#ef4444'),
            ("Cardiac (Heart)", '#f59e0b'),
            ("Smooth (Organs)", '#22c55e'),
            ("Actin Filaments", '#3b82f6'),
            ("Myosin Filaments", '#dc2626'),
            ("Z-Lines (Sarcomere)", '#eab308'),
        ], self.W - 280, sar_y)

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_neuron(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "NEURON (NERVE CELL) STRUCTURE", "Neuroscience | Signal Transmission & Synaptic Architecture")
        cx, cy = 250, self.H // 2 + 10

        _radial_gradient(draw, (cx, cy), 55, (80, 60, 120), (6, 8, 18))
        draw.ellipse([cx - 50, cy - 50, cx + 50, cy + 50], outline=(160, 120, 200), width=3)
        draw.ellipse([cx - 20, cy - 20, cx + 20, cy + 20], fill=(200, 100, 50), outline=(240, 140, 80), width=2)
        draw.text((cx - 20, cy - 8), "Soma", fill=(220, 200, 240))
        draw.text((cx - 28, cy + 55), "Cell Body", fill=(160, 120, 200))

        for i in range(6):
            angle = math.pi + (i - 2.5) * 0.5
            length = random.randint(60, 110)
            points = [(cx, cy)]
            x, y = cx, cy
            for j in range(8):
                x += int(length / 8 * math.cos(angle + random.uniform(-0.3, 0.3)))
                y += int(length / 8 * math.sin(angle + random.uniform(-0.3, 0.3)))
                points.append((x, y))
            for j in range(len(points) - 1):
                w = max(1, 4 - j // 2)
                draw.line([points[j], points[j + 1]], fill=(100, 180, 100), width=w)
        draw.text((cx - 120, cy - 80), "Dendrites", fill=(100, 180, 100))

        axon_end = self.W - 200
        draw.line([(cx + 50, cy), (axon_end, cy)], fill=(60, 130, 220), width=4)

        myelin_positions = list(range(cx + 80, axon_end - 30, 70))
        for mx in myelin_positions:
            draw.ellipse([mx, cy - 18, mx + 50, cy + 18], fill=(240, 220, 160), outline=(220, 200, 140), width=2)

        for i in range(len(myelin_positions) - 1):
            node_x = myelin_positions[i] + 50
            draw.line([(node_x, cy - 6), (node_x + 20, cy - 6)], fill=(60, 130, 220), width=3)
        draw.text((cx + 120, cy - 40), "Myelin Sheath", fill=(240, 220, 160))
        draw.text((cx + 200, cy + 25), "Nodes of Ranvier", fill=(80, 150, 240))

        draw.text((cx + self.W // 4, cy - 60), "Axon", fill=(60, 130, 220))

        tx = axon_end
        for i in range(5):
            ty = cy - 40 + i * 20
            draw.line([(tx, cy), (tx + 30, ty)], fill=(220, 100, 50), width=3)
            draw.ellipse([tx + 28, ty - 6, tx + 42, ty + 6], fill=(250, 130, 60))
        draw.text((tx + 50, cy - 10), "Axon\nTerminals", fill=(250, 130, 60))
        draw.text((tx + 50, cy + 25), "(Synaptic\n Boutons)", fill=(200, 100, 50))

        sy = self.H - 200
        draw.text((60, sy), "SIGNAL DIRECTION:", fill=(0, 212, 255))
        draw.line([(60, sy + 25), (400, sy + 25)], fill=(0, 180, 220), width=2)
        for x in range(80, 380, 30):
            draw.polygon([(x + 15, sy + 25), (x + 5, sy + 20), (x + 5, sy + 30)], fill=(0, 200, 240))
        draw.text((60, sy + 35), "Dendrite > Soma > Axon > Synapse", fill=(140, 150, 160))

        self._draw_legend_box(draw, [
            ("Cell Body (Soma)", '#a855f7'),
            ("Dendrites (Input)", '#22c55e'),
            ("Axon (Signal)", '#3b82f6'),
            ("Myelin Sheath", '#f5deb3'),
            ("Axon Terminals", '#f97316'),
        ], self.W - 280, 90)

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_hiv(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "HIV RETROVIRUS STRUCTURE", "Virology | Human Immunodeficiency Virus | ~120 nm")
        cx, cy = self.W // 2, self.H // 2 + 15

        _radial_gradient(draw, (cx, cy), 200, (30, 25, 50), (6, 8, 18))

        draw.ellipse([cx - 110, cy - 110, cx + 110, cy + 110], outline=(100, 60, 160), width=4)

        pts = []
        for i in range(60):
            angle = 2 * math.pi * i / 60
            r = 60 + 10 * math.sin(angle * 3)
            x = cx + r * math.cos(angle)
            y = cy + r * math.sin(angle)
            pts.append((int(x), int(y)))
        for i in range(len(pts)):
            draw.line([pts[i], pts[(i + 1) % len(pts)]], fill=(200, 160, 60), width=2)

        for i in range(10):
            angle = 2 * math.pi * i / 10
            x = cx + 40 * math.cos(angle)
            y = cy + 40 * math.sin(angle)
            draw.line([(cx, cy), (int(x), int(y))], fill=(220, 80, 80), width=1)
        draw.text((cx - 15, cy - 8), "RNA", fill=(220, 120, 120))
        draw.text((cx - 22, cy + 6), "(2 copies)", fill=(200, 100, 100))

        for i in range(15):
            angle = 2 * math.pi * i / 15
            bx = cx + 110 * math.cos(angle)
            by = cy + 110 * math.sin(angle)
            tx = cx + 155 * math.cos(angle)
            ty = cy + 155 * math.sin(angle)
            draw.line([(int(bx), int(by)), (int(tx), int(ty))], fill=(50, 180, 100), width=3)
            draw.ellipse([int(tx) - 8, int(ty) - 8, int(tx) + 8, int(ty) + 8], fill=(40, 160, 80))
            mushroom_x = int(tx + 12 * math.cos(angle))
            mushroom_y = int(ty + 12 * math.sin(angle))
            draw.ellipse([mushroom_x - 12, mushroom_y - 6, mushroom_x + 12, mushroom_y + 6], fill=(60, 200, 120))

        _draw_label_line(draw, (cx + 130, cy - 60), (cx + 250, cy - 120), "gp120/gp41 Envelope", '#22c55e')
        _draw_label_line(draw, (cx + 100, cy), (cx + 250, cy - 30), "Lipid Envelope", '#a855f7')
        _draw_label_line(draw, (cx + 55, cy + 30), (cx + 250, cy + 30), "Capsid (p24)", '#eab308')
        _draw_label_line(draw, (cx + 30, cy - 20), (cx + 250, cy + 80), "RNA Genome", '#ef4444')

        info_x = 40
        draw.text((info_x, self.H - 130), "Key Enzymes:", fill=(0, 212, 255))
        draw.text((info_x, self.H - 108), "Reverse Transcriptase - RNA to DNA conversion", fill=(140, 150, 160))
        draw.text((info_x, self.H - 88), "Integrase - Viral DNA insertion into host genome", fill=(140, 150, 160))
        draw.text((info_x, self.H - 68), "Protease - Viral protein processing", fill=(140, 150, 160))

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_influenza(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "INFLUENZA VIRUS STRUCTURE", "Virology | Orthomyxovirus | Segmented RNA Genome")
        cx, cy = self.W // 2, self.H // 2 + 15

        _radial_gradient(draw, (cx, cy), 200, (25, 35, 55), (6, 8, 18))
        draw.ellipse([cx - 100, cy - 100, cx + 100, cy + 100], outline=(80, 120, 200), width=3)

        for i in range(8):
            angle = i * math.pi / 4
            x = cx + 35 * math.cos(angle)
            y = cy + 35 * math.sin(angle)
            draw.line([(cx, cy), (int(x), int(y))], fill=(220, 100, 50), width=2)
            draw.ellipse([int(x) - 8, int(y) - 8, int(x) + 8, int(y) + 8], fill=(240, 130, 60))
        draw.text((cx - 28, cy - 8), "8 RNA", fill=(250, 180, 100))
        draw.text((cx - 35, cy + 8), "Segments", fill=(250, 160, 80))

        for i in range(20):
            angle = 2 * math.pi * i / 20
            bx = cx + 100 * math.cos(angle)
            by = cy + 100 * math.sin(angle)
            if i % 2 == 0:
                tx = cx + 150 * math.cos(angle)
                ty = cy + 150 * math.sin(angle)
                draw.line([(int(bx), int(by)), (int(tx), int(ty))], fill=(220, 60, 60), width=3)
                draw.polygon([(int(tx), int(ty) - 8), (int(tx) - 6, int(ty) + 6), (int(tx) + 6, int(ty) + 6)],
                             fill=(240, 80, 80))
            else:
                tx = cx + 140 * math.cos(angle)
                ty = cy + 140 * math.sin(angle)
                draw.line([(int(bx), int(by)), (int(tx), int(ty))], fill=(50, 180, 220), width=2)
                draw.ellipse([int(tx) - 6, int(ty) - 6, int(tx) + 6, int(ty) + 6], fill=(60, 200, 240))

        _draw_label_line(draw, (cx + 120, cy - 50), (cx + 250, cy - 100), "Hemagglutinin (HA)", '#ef4444')
        _draw_label_line(draw, (cx + 110, cy + 40), (cx + 250, cy + 60), "Neuraminidase (NA)", '#38bdf8')
        _draw_label_line(draw, (cx + 30, cy - 20), (cx + 250, cy - 40), "8 RNA Segments", '#f97316')
        _draw_label_line(draw, (cx + 95, cy + 10), (cx + 250, cy + 20), "Lipid Envelope", '#3b82f6')

        self._draw_legend_box(draw, [
            ("Hemagglutinin HA (Entry)", '#ef4444'),
            ("Neuraminidase NA (Release)", '#38bdf8'),
            ("8 RNA Gene Segments", '#f97316'),
            ("Lipid Bilayer Envelope", '#3b82f6'),
        ], 40, self.H - 130)

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_rbc(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "RED BLOOD CELL (ERYTHROCYTE)", "Hematology | Biconcave Disc | Oxygen Transport")
        cx, cy = self.W // 2, self.H // 2 + 10

        _radial_gradient(draw, (cx, cy), 200, (60, 20, 20), (6, 8, 18))

        draw.ellipse([cx - 130, cy - 80, cx + 130, cy + 80], fill=(180, 50, 50), outline=(200, 70, 70), width=3)
        draw.ellipse([cx - 50, cy - 30, cx + 50, cy + 30], fill=(120, 30, 30), outline=(160, 45, 45), width=2)

        for r in range(40, 120, 8):
            opacity = max(100, 200 - r)
            draw.ellipse([cx - r, cy - int(r * 0.6), cx + r, cy + int(r * 0.6)],
                         outline=(opacity, 30, 30), width=1)

        draw.text((cx - 30, cy - 8), "Hb", fill=(255, 200, 200))

        cross_x = self.W - 350
        draw.text((cross_x, 100), "CROSS-SECTION VIEW:", fill=(0, 212, 255))
        draw.line([(cross_x, 140), (cross_x + 200, 140)], fill=(200, 70, 70), width=3)
        draw.arc([cross_x + 30, 150, cross_x + 170, 250], 0, 180, fill=(200, 70, 70), width=3)
        draw.arc([cross_x + 60, 160, cross_x + 140, 240], 180, 360, fill=(200, 70, 70), width=3)
        draw.text((cross_x + 50, 260), "Biconcave Shape", fill=(200, 130, 130))

        draw.text((40, self.H - 130), "Key Features:", fill=(0, 212, 255))
        draw.text((40, self.H - 108), "Diameter: 7-8 um | Thickness: 2.5 um", fill=(140, 150, 160))
        draw.text((40, self.H - 88), "270 million hemoglobin molecules per cell", fill=(140, 150, 160))
        draw.text((40, self.H - 68), "No nucleus (mature) | 120-day lifespan", fill=(140, 150, 160))
        draw.text((40, self.H - 48), "2 million new RBCs produced per second", fill=(140, 150, 160))

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_pathogen(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "PATHOGEN CLASSIFICATION", "Microbiology | Disease-Causing Organisms")

        categories = [
            ("VIRUS", (220, 60, 60), "20-300 nm", [(0, 0), 60]),
            ("BACTERIA", (50, 180, 100), "0.5-5 um", [(0, 0), 50]),
            ("FUNGUS", (160, 100, 200), "2-10 um", [(0, 0), 45]),
            ("PARASITE", (60, 130, 220), "1-100+ um", [(0, 0), 40]),
        ]
        for i, (name, color, size_txt, _) in enumerate(categories):
            x = 80 + i * 280
            y = 120
            draw.rectangle([x, y, x + 240, y + 300], outline=color, width=2, fill=(12, 15, 25))
            draw.text((x + 70, y + 10), name, fill=color)
            draw.text((x + 60, y + 30), f"Size: {size_txt}", fill=(120, 130, 140))

            cx_p, cy_p = x + 120, y + 160
            if i == 0:
                draw.ellipse([cx_p - 35, cy_p - 35, cx_p + 35, cy_p + 35], outline=color, width=2)
                for j in range(8):
                    a = j * math.pi / 4
                    draw.line([(int(cx_p + 35 * math.cos(a)), int(cy_p + 35 * math.sin(a))),
                               (int(cx_p + 55 * math.cos(a)), int(cy_p + 55 * math.sin(a)))], fill=color, width=2)
            elif i == 1:
                draw.ellipse([cx_p - 45, cy_p - 25, cx_p + 45, cy_p + 25], outline=color, width=2)
                draw.ellipse([cx_p - 15, cy_p - 10, cx_p + 15, cy_p + 10], fill=color)
            elif i == 2:
                for j in range(5):
                    a = j * 0.3 + 0.5
                    draw.line([(cx_p, cy_p), (int(cx_p + 50 * math.cos(a)), int(cy_p + 50 * math.sin(a)))],
                              fill=color, width=2)
                draw.ellipse([cx_p - 20, cy_p - 20, cx_p + 20, cy_p + 20], fill=color)
            else:
                draw.ellipse([cx_p - 40, cy_p - 30, cx_p + 40, cy_p + 30], outline=color, width=2)
                draw.ellipse([cx_p - 15, cy_p - 15, cx_p + 15, cy_p + 15], fill=color)
                draw.ellipse([cx_p + 5, cy_p - 8, cx_p + 20, cy_p + 5], fill=(40, 100, 180))

            examples = {
                0: ["COVID-19", "HIV", "Influenza"],
                1: ["E. coli", "TB", "Strep"],
                2: ["Candida", "Aspergillus"],
                3: ["Plasmodium", "Giardia"],
            }
            for j, ex in enumerate(examples.get(i, [])):
                draw.text((x + 20, y + 230 + j * 18), f"- {ex}", fill=(160, 170, 180))

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_kidney(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "KIDNEY ANATOMY - CROSS SECTION", "Nephrology | Renal Structure & Filtration System")
        cx, cy = self.W // 2 - 50, self.H // 2 + 20

        draw.ellipse([cx - 140, cy - 170, cx + 100, cy + 170], fill=(140, 60, 60), outline=(180, 80, 80), width=3)
        draw.ellipse([cx - 120, cy - 150, cx + 80, cy + 150], fill=(160, 80, 80))

        draw.ellipse([cx - 80, cy - 100, cx + 40, cy + 100], fill=(180, 100, 100))

        draw.ellipse([cx - 40, cy - 50, cx + 10, cy + 50], fill=(200, 160, 100), outline=(220, 180, 120), width=2)
        draw.text((cx - 35, cy - 8), "Pelvis", fill=(255, 220, 180))

        draw.text((cx - 110, cy - 130), "Cortex", fill=(255, 200, 200))
        draw.text((cx - 80, cy - 80), "Medulla", fill=(255, 180, 180))

        draw.line([(cx + 10, cy), (cx + 80, cy)], fill=(200, 160, 100), width=5)
        draw.text((cx + 90, cy - 8), "Ureter", fill=(200, 160, 100))

        draw.line([(cx - 20, cy - 170), (cx - 20, cy - 130)], fill=(200, 50, 50), width=4)
        draw.text((cx - 70, cy - 195), "Renal Artery", fill=(200, 70, 70))
        draw.line([(cx + 20, cy - 170), (cx + 20, cy - 130)], fill=(50, 50, 200), width=4)
        draw.text((cx + 30, cy - 195), "Renal Vein", fill=(80, 80, 220))

        nx = self.W - 350
        draw.text((nx, 100), "NEPHRON (Functional Unit):", fill=(0, 212, 255))
        ny = 130
        draw.ellipse([nx + 20, ny, nx + 60, ny + 40], outline=(60, 130, 220), width=2)
        draw.text((nx + 70, ny + 10), "Glomerulus", fill=(80, 150, 240))
        draw.arc([nx + 10, ny + 30, nx + 70, ny + 80], 180, 360, outline=(200, 160, 100), width=2)
        draw.text((nx + 80, ny + 50), "Bowman's Capsule", fill=(200, 160, 100))
        draw.line([(nx + 40, ny + 80), (nx + 40, ny + 200)], fill=(240, 200, 60), width=2)
        for i in range(4):
            draw.line([(nx + 40, ny + 90 + i * 25), (nx + 100, ny + 100 + i * 25)], fill=(240, 200, 60), width=1)
        draw.text((nx + 10, ny + 210), "Loop of Henle", fill=(240, 200, 60))

        draw.text((40, self.H - 80), "Filters 180 L blood/day | 1 million nephrons per kidney", fill=(140, 150, 160))
        draw.text((40, self.H - 55), "Produces 1-2 L urine/day | Regulates blood pressure", fill=(140, 150, 160))

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_liver(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "LIVER ANATOMY", "Hepatology | Largest Internal Organ | 500+ Functions")
        cx, cy = self.W // 2, self.H // 2 + 20

        pts = [(cx - 200, cy - 50), (cx + 180, cy - 80), (cx + 200, cy + 20),
               (cx + 100, cy + 100), (cx - 50, cy + 80), (cx - 200, cy)]
        draw.polygon(pts, fill=(120, 40, 40), outline=(160, 60, 60))

        draw.line([(cx, cy - 70), (cx, cy + 60)], fill=(200, 180, 60), width=2)
        draw.text((cx - 70, cy - 30), "Right Lobe", fill=(200, 150, 150))
        draw.text((cx + 20, cy - 20), "Left Lobe", fill=(200, 150, 150))

        draw.line([(cx, cy + 60), (cx, cy + 120)], fill=(200, 50, 50), width=4)
        draw.text((cx + 10, cy + 100), "Portal Vein", fill=(200, 70, 70))
        draw.line([(cx - 40, cy + 50), (cx - 40, cy + 120)], fill=(50, 50, 200), width=3)
        draw.text((cx - 120, cy + 100), "Hepatic Artery", fill=(80, 80, 220))
        draw.line([(cx + 40, cy + 50), (cx + 40, cy + 120)], fill=(100, 180, 60), width=3)
        draw.text((cx + 50, cy + 100), "Bile Duct", fill=(100, 180, 60))

        hx = self.W - 320
        draw.text((hx, 100), "HEPATIC LOBULE:", fill=(0, 212, 255))
        lx, ly = hx + 80, 200
        for i in range(6):
            angle = i * math.pi / 3
            x = lx + 60 * math.cos(angle)
            y = ly + 60 * math.sin(angle)
            draw.line([(lx, ly), (int(x), int(y))], fill=(160, 60, 60), width=1)
        draw.ellipse([lx - 8, ly - 8, lx + 8, ly + 8], fill=(50, 50, 180))
        draw.text((lx - 35, ly + 15), "Central Vein", fill=(80, 80, 220))

        draw.text((40, self.H - 80), "Weight: 1.5 kg | 500+ metabolic functions", fill=(140, 150, 160))
        draw.text((40, self.H - 55), "Dual blood supply | Remarkable regeneration", fill=(140, 150, 160))

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_eye(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "HUMAN EYE - CROSS SECTION", "Ophthalmology | Visual System Anatomy")
        cx, cy = self.W // 2, self.H // 2 + 20

        draw.ellipse([cx - 160, cy - 140, cx + 160, cy + 140], fill=(240, 240, 240), outline=(180, 180, 180), width=3)
        draw.text((cx + 100, cy - 120), "Sclera", fill=(160, 160, 160))

        draw.ellipse([cx - 150, cy - 130, cx + 150, cy + 130], fill=(200, 200, 210))

        draw.arc([cx - 160, cy - 140, cx - 80, cy + 140], 90, 270, fill=(180, 220, 240), width=8)
        draw.text((cx - 200, cy - 60), "Cornea", fill=(120, 180, 220))

        draw.ellipse([cx - 110, cy - 40, cx - 70, cy + 40], fill=(80, 140, 60), outline=(60, 120, 40), width=3)
        draw.text((cx - 140, cy + 50), "Iris", fill=(80, 140, 60))

        draw.ellipse([cx - 95, cy - 15, cx - 85, cy + 15], fill=(10, 10, 10))
        draw.text((cx - 110, cy + 50), "Pupil", fill=(60, 60, 60))

        draw.ellipse([cx - 70, cy - 30, cx - 20, cy + 30], fill=(200, 200, 220), outline=(160, 160, 180), width=2)
        draw.text((cx - 60, cy + 35), "Lens", fill=(160, 160, 180))

        draw.arc([cx + 20, cy - 130, cx + 160, cy + 130], 270, 90, fill=(220, 160, 60), width=6)
        draw.text((cx + 110, cy + 80), "Retina", fill=(220, 160, 60))

        draw.line([(cx + 140, cy), (cx + 220, cy)], fill=(240, 200, 60), width=5)
        draw.text((cx + 170, cy - 20), "Optic\nNerve", fill=(240, 200, 60))

        draw.text((cx - 20, cy - 8), "Vitreous", fill=(140, 140, 160))

        draw.text((40, self.H - 100), "Photoreceptors:", fill=(0, 212, 255))
        draw.text((40, self.H - 78), "120 million rods (dim light) | 6 million cones (color)", fill=(140, 150, 160))
        draw.text((40, self.H - 55), "Focal length: ~17 mm | Visual acuity: 20/20", fill=(140, 150, 160))

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_tuberculosis(self) -> Image.Image:
        return self._draw_bacteria()

    def _draw_malaria(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "PLASMODIUM MALARIA LIFECYCLE", "Parasitology | Intraerythrocytic Stages")
        cx, cy = self.W // 2, self.H // 2 + 20

        draw.ellipse([cx - 100, cy - 60, cx + 100, cy + 60], fill=(180, 50, 50), outline=(200, 70, 70), width=3)
        draw.text((cx - 80, cy - 50), "Red Blood Cell", fill=(255, 200, 200))

        draw.ellipse([cx - 30, cy - 20, cx + 30, cy + 20], fill=(80, 60, 140), outline=(120, 100, 200), width=2)
        draw.text((cx - 25, cy - 8), "Tropho-", fill=(180, 160, 240))
        draw.text((cx - 20, cy + 5), "zoite", fill=(180, 160, 240))

        stages_x = [150, 350, 550, 750, 950]
        stages = ["Merozoite", "Ring", "Trophozoite", "Schizont", "Gametocyte"]
        for i, (sx, name) in enumerate(zip(stages_x, stages)):
            sy = self.H - 200
            draw.ellipse([sx - 20, sy - 20, sx + 20, sy + 20],
                         fill=(80 + i * 20, 60, 140), outline=(120, 100, 200), width=2)
            draw.text((sx - len(name) * 3, sy + 25), name, fill=(160, 140, 200))
            if i < len(stages) - 1:
                draw.line([(sx + 25, sy), (stages_x[i + 1] - 25, sy)], fill=(100, 80, 160), width=2)

        draw.text((40, self.H - 80), "Transmitted by Anopheles mosquito | P. falciparum most deadly", fill=(140, 150, 160))
        draw.text((40, self.H - 55), "~250 million cases/year | Complex lifecycle (human + mosquito)", fill=(140, 150, 160))

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_stomach(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "STOMACH ANATOMY", "Gastroenterology | Digestive System")
        cx, cy = self.W // 2, self.H // 2 + 20

        pts = [(cx - 60, cy - 120), (cx + 80, cy - 100), (cx + 120, cy - 40),
               (cx + 100, cy + 60), (cx + 40, cy + 120), (cx - 40, cy + 100),
               (cx - 100, cy + 20), (cx - 80, cy - 60)]
        draw.polygon(pts, fill=(180, 120, 100), outline=(200, 140, 120), width=3)
        draw.polygon([(p[0] + 10, p[1] + 10) for p in pts[:4]] + [(cx + 50, cy), (cx - 30, cy)],
                     fill=(200, 140, 120))

        draw.text((cx - 30, cy - 90), "Fundus", fill=(255, 220, 200))
        draw.text((cx + 20, cy - 10), "Body", fill=(255, 220, 200))
        draw.text((cx + 50, cy + 70), "Antrum", fill=(255, 220, 200))
        draw.text((cx + 90, cy + 110), "Pylorus", fill=(255, 220, 200))

        draw.rectangle([cx - 70, cy - 140, cx - 50, cy - 120], fill=(160, 100, 80), outline=(180, 120, 100), width=2)
        draw.text((cx - 90, cy - 160), "Esophagus", fill=(180, 140, 120))

        draw.rectangle([cx + 100, cy + 100, cx + 140, cy + 115], fill=(160, 100, 80), outline=(180, 120, 100), width=2)
        draw.text((cx + 145, cy + 100), "Duodenum", fill=(180, 140, 120))

        for i in range(6):
            y = cy - 60 + i * 25
            x_start = cx - 60 + i * 5
            draw.line([(x_start, y), (x_start + 80, y)], fill=(220, 160, 140), width=1)

        draw.text((40, self.H - 80), "Capacity: ~1 liter | pH: 1.5-3.5 (HCl)", fill=(140, 150, 160))
        draw.text((40, self.H - 55), "Pepsin digests proteins | 3 muscular layers | Rugae folds", fill=(140, 150, 160))

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_spine(self) -> Image.Image:
        img, draw = self._new_canvas()
        self._draw_title(draw, "SPINAL COLUMN STRUCTURE", "Orthopedics | Vertebral Architecture")
        cx = self.W // 2 - 100

        regions = [
            ("Cervical (C1-C7)", (60, 180, 220), 7, 90),
            ("Thoracic (T1-T12)", (50, 180, 100), 12, 200),
            ("Lumbar (L1-L5)", (240, 160, 40), 5, 440),
            ("Sacrum (S1-S5)", (200, 100, 60), 5, 570),
            ("Coccyx", (160, 80, 80), 3, 660),
        ]

        y = 90
        for name, color, count, start_y in regions:
            for i in range(count):
                vy = start_y + i * (120 // max(count, 1))
                w = 35 + (regions.index((name, color, count, start_y))) * 5
                draw.rectangle([cx - w, vy, cx + w, vy + 10], fill=color, outline=tuple(c + 30 for c in color), width=1)
                if i < count - 1:
                    draw.ellipse([cx - 5, vy + 10, cx + 5, vy + 15], fill=(200, 200, 160))

            mid_y = start_y + count * (120 // max(count, 1)) // 2
            draw.text((cx + 80, mid_y), name, fill=color)

        draw.line([(cx, 95), (cx, 700)], fill=(240, 200, 60), width=2)
        draw.text((cx - 60, 720), "Spinal Cord", fill=(240, 200, 60))

        draw.text((40, self.H - 55), "33 vertebrae | S-shaped curve | Protects spinal cord", fill=(140, 150, 160))

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _draw_generic(self, topic: str) -> Image.Image:
        img, draw = self._new_canvas()
        title = topic[:40].upper() if len(topic) > 40 else topic.upper()
        self._draw_title(draw, f"SCIENTIFIC VISUALIZATION: {title}", "Quantum Visual Engine v4.0 Analysis")
        cx, cy = self.W // 2, self.H // 2

        for i in range(5):
            x = 120 + i * 220
            y = 150
            _radial_gradient(draw, (x, cy - 50), 50, (40, 60, 120), (6, 8, 18))
            draw.ellipse([x - 40, cy - 90, x + 40, cy - 10], outline=(60, 130, 220), width=2)
            draw.text((x - 25, cy - 60), f"Node {i + 1}", fill=(100, 160, 240))
            if i < 4:
                draw.line([(x + 42, cy - 50), (x + 178, cy - 50)], fill=(50, 180, 100), width=2)

        draw.rectangle([80, cy + 40, self.W - 80, cy + 280], outline=(30, 40, 60), width=1)
        draw.text((100, cy + 55), "Analysis Components:", fill=(0, 212, 255))
        items = [
            "Structural elements and molecular composition",
            "Functional relationships and interactions",
            "Dynamic behavior and regulatory mechanisms",
            "Clinical significance and applications",
            "Quantitative measurements and parameters",
        ]
        for i, item in enumerate(items):
            draw.text((120, cy + 85 + i * 30), f"{i + 1}. {item}", fill=(140, 150, 160))

        draw.text((self.W - 320, self.H - 30), "Quantum Visual Engine v4.0", fill=(60, 70, 90))
        return img

    def _enhance_image(self, image: Image.Image) -> Image.Image:
        enhanced = ImageEnhance.Contrast(image).enhance(1.15)
        enhanced = ImageEnhance.Sharpness(enhanced).enhance(1.2)
        enhanced = ImageEnhance.Color(enhanced).enhance(1.08)
        return enhanced

    def _generate_fallback(self, topic: str) -> Dict:
        img, draw = self._new_canvas()
        self._draw_title(draw, f"VISUALIZATION: {topic.upper()[:40]}", "Quantum Visual Engine v4.0")
        draw.text((self.W // 2 - 100, self.H // 2), f"Topic: {topic}", fill=(0, 212, 255))
        img_base64 = self._image_to_base64(img)
        return {
            'success': False,
            'method': 'fallback',
            'topic': topic,
            'base64': img_base64,
            'timestamp': datetime.now().isoformat()
        }

    @staticmethod
    def _image_to_base64(image: Image.Image) -> str:
        buffer = io.BytesIO()
        image.save(buffer, format='PNG', quality=95)
        buffer.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"


class MultiModalResponseGenerator:
    def __init__(self):
        self.knowledge_base = EnhancedMedicalKnowledgeBase()
        self.image_generator = UltraRealisticImageGenerator()
        self._topic_keywords = self._build_topic_index()
        logger.info("[Visual Engine] Multi-Modal Response Generator v4.0 initialized")

    def _build_topic_index(self) -> Dict[str, str]:
        return {
            'coronavirus': 'covid-19', 'sars': 'covid-19', 'covid': 'covid-19', 'pandemic': 'covid-19',
            'gene': 'dna', 'genetic': 'dna', 'genome': 'dna', 'chromosome': 'dna', 'nucleotide': 'dna',
            'helix': 'dna', 'base pair': 'dna', 'replication': 'dna',
            'antibody': 'immune_system', 'immunity': 'immune_system', 'immune': 'immune_system',
            'vaccine': 'immune_system', 'lymphocyte': 'immune_system', 'white blood': 'immune_system',
            'macrophage': 'immune_system', 't cell': 'immune_system', 'b cell': 'immune_system',
            'tumor': 'cancer', 'oncology': 'cancer', 'carcinoma': 'cancer', 'malignant': 'cancer',
            'metastasis': 'cancer', 'chemotherapy': 'cancer', 'oncogene': 'cancer',
            'cardiac': 'heart', 'cardiovascular': 'heart', 'artery': 'heart', 'ventricle': 'heart',
            'atrium': 'heart', 'aorta': 'heart', 'coronary': 'heart', 'myocardium': 'heart',
            'neuron': 'neuron', 'neural': 'neuron', 'synapse': 'neuron', 'axon': 'neuron',
            'dendrite': 'neuron', 'nerve cell': 'neuron', 'action potential': 'neuron',
            'cerebral': 'brain', 'cortex': 'brain', 'hippocampus': 'brain', 'cerebellum': 'brain',
            'frontal lobe': 'brain', 'neuroscience': 'brain', 'thalamus': 'brain',
            'respiratory': 'lung', 'breathing': 'lung', 'alveoli': 'lung', 'pulmonary': 'lung',
            'bronchi': 'lung', 'trachea': 'lung', 'pneumonia': 'lung',
            'mitochondria': 'cell', 'organelle': 'cell', 'cytoplasm': 'cell', 'eukaryotic': 'cell',
            'prokaryotic': 'cell', 'nucleus': 'cell', 'ribosome': 'cell', 'golgi': 'cell',
            'germ': 'pathogen', 'infection': 'pathogen', 'microbe': 'pathogen', 'microbial': 'pathogen',
            'bicep': 'muscle', 'skeletal muscle': 'muscle', 'myocyte': 'muscle', 'sarcomere': 'muscle',
            'myosin': 'muscle', 'actin': 'muscle', 'contraction': 'muscle', 'fiber': 'muscle',
            'nerve': 'nervous_system', 'spinal cord': 'nervous_system', 'cns': 'nervous_system',
            'peripheral': 'nervous_system', 'myelin': 'nervous_system',
            'strep': 'bacteria', 'staph': 'bacteria', 'e.coli': 'bacteria', 'e. coli': 'bacteria',
            'antibiotic': 'bacteria', 'gram positive': 'bacteria', 'gram negative': 'bacteria',
            'prokaryote': 'bacteria', 'bacterial': 'bacteria',
            'flu': 'influenza', 'h1n1': 'influenza', 'hemagglutinin': 'influenza',
            'neuraminidase': 'influenza', 'influenza': 'influenza',
            'hiv': 'hiv', 'aids': 'hiv', 'retrovirus': 'hiv', 'cd4': 'hiv',
            'ebola': 'virus', 'measles': 'virus', 'rabies': 'virus', 'hepatitis': 'virus',
            'viral': 'virus', 'capsid': 'virus', 'envelope': 'virus',
            'erythrocyte': 'red_blood_cell', 'red blood': 'red_blood_cell', 'hemoglobin': 'red_blood_cell',
            'rbc': 'red_blood_cell', 'anemia': 'red_blood_cell',
            'kidney': 'kidney', 'renal': 'kidney', 'nephron': 'kidney', 'glomerulus': 'kidney',
            'liver': 'liver', 'hepatic': 'liver', 'hepatocyte': 'liver', 'bile': 'liver',
            'eye': 'eye', 'retina': 'eye', 'cornea': 'eye', 'lens': 'eye', 'pupil': 'eye',
            'optic': 'eye', 'vision': 'eye', 'photoreceptor': 'eye',
            'tuberculosis': 'tuberculosis', 'tb': 'tuberculosis', 'mycobacterium': 'tuberculosis',
            'malaria': 'malaria', 'plasmodium': 'malaria', 'mosquito': 'malaria',
            'stomach': 'stomach', 'gastric': 'stomach', 'digestive': 'stomach', 'pepsin': 'stomach',
            'spine': 'spine', 'vertebra': 'spine', 'spinal column': 'spine', 'vertebral': 'spine',
            'disc': 'spine', 'lumbar': 'spine', 'cervical': 'spine', 'thoracic': 'spine',
        }

    def _extract_topic(self, query: str) -> str:
        query_lower = query.lower()

        for known_topic in sorted(self.knowledge_base.topics.keys(), key=len, reverse=True):
            if known_topic.replace('_', ' ') in query_lower or known_topic in query_lower:
                return known_topic

        for keyword, mapped_topic in sorted(self._topic_keywords.items(), key=lambda x: len(x[0]), reverse=True):
            if keyword in query_lower:
                return mapped_topic

        words = query.split()
        return max(words, key=len).lower() if words else "general"

    def detect_visual_topic(self, query: str) -> Dict:
        topic = self._extract_topic(query)
        info = self.knowledge_base.get_topic_info(topic)
        needs_visual = info is not None and info.get('visual', False)
        return {
            'detected': needs_visual,
            'topic': topic,
            'category': info.get('category', 'unknown') if info else 'unknown',
            'has_knowledge': info is not None
        }

    def generate_visual_only(self, topic: str) -> Dict:
        info = self.knowledge_base.get_topic_info(topic)
        category = info.get('category', 'general') if info else 'general'
        return self.image_generator.generate_image(topic, category)

    def generate_response(self, query: str) -> Dict:
        topic = self._extract_topic(query)
        info = self.knowledge_base.get_topic_info(topic)
        if info is None:
            return {
                'success': False,
                'query': query,
                'topic': topic,
                'is_visual_topic': False,
                'text_response': None,
                'visual': None,
                'timestamp': datetime.now().isoformat()
            }

        needs_visual = info.get('visual', False)
        visual_response = None
        if needs_visual:
            visual_response = self.image_generator.generate_image(topic, info.get('category', 'general'))

        return {
            'success': True,
            'topic': topic,
            'text_response': {
                'title': info.get('title', topic.upper()),
                'category': info.get('category', 'general'),
                'brief': info.get('description', ''),
            },
            'visual': visual_response,
            'timestamp': datetime.now().isoformat(),
            'is_visual_topic': needs_visual,
        }

    def get_available_topics(self) -> Dict:
        return {
            'visual_topics': self.knowledge_base.visual_topics,
            'all_topics': list(self.knowledge_base.topics.keys()),
            'count': len(self.knowledge_base.topics),
            'categories': list(set(t.get('category', 'unknown') for t in self.knowledge_base.topics.values()))
        }
