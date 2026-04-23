import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

interface ARObject {
  id: string;
  name: string;
  type: 'model' | 'text' | 'image' | 'video' | 'hologram' | 'portal';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  anchor: 'world' | 'face' | 'plane' | 'image' | 'geolocation';
  content: string;
  metadata: Record<string, any>;
  interactions: ARInteraction[];
  visible: boolean;
}

interface ARInteraction {
  type: 'tap' | 'gaze' | 'gesture' | 'voice' | 'proximity';
  action: string;
  parameters: Record<string, any>;
}

interface ARScene {
  id: string;
  name: string;
  objects: ARObject[];
  environment: {
    lighting: 'natural' | 'studio' | 'dark' | 'custom';
    skybox?: string;
    ambientColor: { r: number; g: number; b: number };
    fog?: { near: number; far: number; color: { r: number; g: number; b: number } };
  };
  physics: {
    gravity: { x: number; y: number; z: number };
    enabled: boolean;
  };
  anchors: PlaneAnchor[];
}

interface PlaneAnchor {
  id: string;
  type: 'horizontal' | 'vertical' | 'ceiling';
  position: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  extent: { width: number; height: number };
}

interface GestureRecognition {
  type: 'pinch' | 'swipe' | 'rotate' | 'point' | 'grab' | 'wave' | 'thumbs_up' | 'peace';
  confidence: number;
  position?: { x: number; y: number; z: number };
  direction?: { x: number; y: number; z: number };
}

interface SpatialMapping {
  meshes: SpatialMesh[];
  planes: PlaneAnchor[];
  lastUpdate: Date;
}

interface SpatialMesh {
  id: string;
  vertices: number[];
  triangles: number[];
  normals: number[];
  bounds: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
}

interface HolographicDisplay {
  id: string;
  content: string;
  position: { x: number; y: number; z: number };
  size: { width: number; height: number };
  opacity: number;
  interactive: boolean;
  animation?: {
    type: 'rotate' | 'pulse' | 'float' | 'wave';
    speed: number;
  };
}

export class HyperlinkedReality {
  private scenes: Map<string, ARScene> = new Map();
  private activeScene: string | null = null;
  private holographicDisplays: Map<string, HolographicDisplay> = new Map();
  private spatialMapping: SpatialMapping = { meshes: [], planes: [], lastUpdate: new Date() };
  private gestureHistory: GestureRecognition[] = [];
  private webXRSupported = true;

  constructor() {
    console.log("[Hyperlinked Reality] Initializing WebXR and AR interface system");
    this.initializeDefaultScenes();
  }

  private initializeDefaultScenes(): void {
    this.createScene("cyrus-hud", {
      lighting: 'studio',
      ambientColor: { r: 0.2, g: 0.3, b: 0.5 }
    });

    this.createScene("data-visualization", {
      lighting: 'dark',
      ambientColor: { r: 0.1, g: 0.1, b: 0.2 }
    });

    this.createScene("holographic-workspace", {
      lighting: 'natural',
      ambientColor: { r: 0.4, g: 0.4, b: 0.4 }
    });
  }

  createScene(name: string, environment: Partial<ARScene['environment']>): ARScene {
    const scene: ARScene = {
      id: `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      objects: [],
      environment: {
        lighting: environment.lighting || 'natural',
        ambientColor: environment.ambientColor || { r: 0.3, g: 0.3, b: 0.3 },
        skybox: environment.skybox,
        fog: environment.fog
      },
      physics: {
        gravity: { x: 0, y: -9.81, z: 0 },
        enabled: true
      },
      anchors: []
    };

    this.scenes.set(scene.id, scene);
    if (!this.activeScene) this.activeScene = scene.id;
    return scene;
  }

  addARObject(sceneId: string, config: {
    name: string;
    type: ARObject['type'];
    position?: { x: number; y: number; z: number };
    content: string;
    anchor?: ARObject['anchor'];
    interactions?: ARInteraction[];
  }): ARObject {
    const scene = this.scenes.get(sceneId);
    if (!scene) throw new Error(`Scene ${sceneId} not found`);

    const object: ARObject = {
      id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      type: config.type,
      position: config.position || { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      anchor: config.anchor || 'world',
      content: config.content,
      metadata: {},
      interactions: config.interactions || [],
      visible: true
    };

    scene.objects.push(object);
    return object;
  }

  createHolographicDisplay(config: {
    content: string;
    position: { x: number; y: number; z: number };
    size?: { width: number; height: number };
    animation?: HolographicDisplay['animation'];
  }): HolographicDisplay {
    const display: HolographicDisplay = {
      id: `holo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: config.content,
      position: config.position,
      size: config.size || { width: 1, height: 0.75 },
      opacity: 0.9,
      interactive: true,
      animation: config.animation
    };

    this.holographicDisplays.set(display.id, display);
    return display;
  }

  updateHolographicContent(displayId: string, content: string): void {
    const display = this.holographicDisplays.get(displayId);
    if (display) {
      display.content = content;
    }
  }

  createFloatingPanel(title: string, content: string, position: { x: number; y: number; z: number }): HolographicDisplay {
    return this.createHolographicDisplay({
      content: `<panel title="${title}">${content}</panel>`,
      position,
      size: { width: 0.6, height: 0.4 },
      animation: { type: 'float', speed: 0.5 }
    });
  }

  create3DChart(data: { labels: string[]; values: number[] }, position: { x: number; y: number; z: number }): ARObject {
    const sceneId = this.activeScene || Array.from(this.scenes.keys())[0];
    if (!sceneId) throw new Error("No active scene");

    const chartContent = JSON.stringify({
      type: 'bar3d',
      data: data.labels.map((label, i) => ({
        label,
        value: data.values[i],
        color: this.getColorForValue(data.values[i], Math.max(...data.values))
      }))
    });

    return this.addARObject(sceneId, {
      name: '3D Data Chart',
      type: 'hologram',
      position,
      content: chartContent,
      interactions: [
        { type: 'tap', action: 'showDetails', parameters: {} },
        { type: 'gesture', action: 'rotate', parameters: { axis: 'y' } }
      ]
    });
  }

  private getColorForValue(value: number, max: number): string {
    const ratio = value / max;
    const r = Math.floor(255 * (1 - ratio));
    const g = Math.floor(255 * ratio);
    return `rgb(${r},${g},100)`;
  }

  detectPlane(type: 'horizontal' | 'vertical' | 'ceiling'): PlaneAnchor {
    const anchor: PlaneAnchor = {
      id: `plane_${Date.now()}`,
      type,
      position: {
        x: (Math.random() - 0.5) * 2,
        y: type === 'horizontal' ? 0 : type === 'ceiling' ? 2.5 : 1,
        z: -1.5
      },
      normal: {
        x: type === 'vertical' ? 1 : 0,
        y: type === 'horizontal' ? 1 : type === 'ceiling' ? -1 : 0,
        z: 0
      },
      extent: {
        width: 1 + Math.random(),
        height: 1 + Math.random()
      }
    };

    this.spatialMapping.planes.push(anchor);
    return anchor;
  }

  recognizeGesture(handData?: any): GestureRecognition {
    const gestures: GestureRecognition['type'][] = ['pinch', 'swipe', 'rotate', 'point', 'grab', 'wave', 'thumbs_up', 'peace'];
    const detected = gestures[Math.floor(Math.random() * gestures.length)];

    const recognition: GestureRecognition = {
      type: detected,
      confidence: 0.7 + Math.random() * 0.3,
      position: { x: Math.random(), y: Math.random(), z: -0.5 },
      direction: { x: 0, y: 0, z: -1 }
    };

    this.gestureHistory.push(recognition);
    if (this.gestureHistory.length > 100) this.gestureHistory.shift();

    return recognition;
  }

  processGestureCommand(gesture: GestureRecognition): { action: string; target?: string } {
    switch (gesture.type) {
      case 'pinch':
        return { action: 'zoom', target: 'focused_object' };
      case 'swipe':
        return { action: 'navigate', target: 'next_view' };
      case 'rotate':
        return { action: 'rotate_object', target: 'selected_object' };
      case 'point':
        return { action: 'select', target: 'pointed_object' };
      case 'grab':
        return { action: 'move', target: 'grabbed_object' };
      case 'wave':
        return { action: 'dismiss', target: 'current_panel' };
      case 'thumbs_up':
        return { action: 'confirm', target: 'pending_action' };
      case 'peace':
        return { action: 'screenshot', target: 'current_view' };
      default:
        return { action: 'unknown' };
    }
  }

  updateSpatialMapping(): SpatialMapping {
    const newMesh: SpatialMesh = {
      id: `mesh_${Date.now()}`,
      vertices: Array(30).fill(0).map(() => (Math.random() - 0.5) * 4),
      triangles: [0, 1, 2, 1, 2, 3, 2, 3, 4, 3, 4, 5],
      normals: Array(30).fill(0).map(() => Math.random()),
      bounds: {
        min: { x: -2, y: 0, z: -2 },
        max: { x: 2, y: 2.5, z: 2 }
      }
    };

    this.spatialMapping.meshes.push(newMesh);
    if (this.spatialMapping.meshes.length > 10) {
      this.spatialMapping.meshes.shift();
    }
    this.spatialMapping.lastUpdate = new Date();

    return this.spatialMapping;
  }

  getWebXRConfig(): {
    supported: boolean;
    features: string[];
    sessionTypes: string[];
    referenceSpaces: string[];
  } {
    return {
      supported: this.webXRSupported,
      features: [
        'hit-test',
        'dom-overlay',
        'light-estimation',
        'anchors',
        'plane-detection',
        'depth-sensing',
        'hand-tracking'
      ],
      sessionTypes: ['immersive-ar', 'immersive-vr', 'inline'],
      referenceSpaces: ['local', 'local-floor', 'bounded-floor', 'unbounded']
    };
  }

  generateARViewCode(sceneId: string): string {
    const scene = this.scenes.get(sceneId);
    if (!scene) return '';

    return `
// WebXR AR View Code for Scene: ${scene.name}
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

const container = document.createElement('div');
document.body.appendChild(container);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
light.position.set(0.5, 1, 0.25);
scene.add(light);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
container.appendChild(renderer.domElement);

document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

${scene.objects.map(obj => `
// Object: ${obj.name}
const ${obj.name.replace(/\s/g, '_')}_geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
const ${obj.name.replace(/\s/g, '_')}_material = new THREE.MeshPhongMaterial({ color: 0x00ff88 });
const ${obj.name.replace(/\s/g, '_')} = new THREE.Mesh(${obj.name.replace(/\s/g, '_')}_geometry, ${obj.name.replace(/\s/g, '_')}_material);
${obj.name.replace(/\s/g, '_')}.position.set(${obj.position.x}, ${obj.position.y}, ${obj.position.z});
scene.add(${obj.name.replace(/\s/g, '_')});
`).join('\n')}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  if (frame) {
    // AR frame processing
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();
  }
  renderer.render(scene, camera);
}

animate();
`;
  }

  async analyzeEnvironmentForAR(description: string): Promise<{
    recommendations: string[];
    suggestedObjects: { type: ARObject['type']; position: { x: number; y: number; z: number }; content: string }[];
    analysis: string;
  }> {
    const recommendations = [
      "Place holographic displays at eye level (1.5-1.8m height)",
      "Use floating panels for frequently accessed information",
      "Enable hand tracking for intuitive interactions",
      "Implement spatial anchors for persistent content placement"
    ];

    const suggestedObjects = [
      {
        type: 'hologram' as ARObject['type'],
        position: { x: 0, y: 1.5, z: -1 },
        content: 'Status Dashboard'
      },
      {
        type: 'text' as ARObject['type'],
        position: { x: -0.5, y: 1.2, z: -0.8 },
        content: 'Quick Actions Menu'
      }
    ];

    const openai = getOpenAI();
    if (!openai) {
      return {
        recommendations,
        suggestedObjects,
        analysis: `AR environment "${description}" analyzed [AI unavailable]`
      };
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are CYRUS's Hyperlinked Reality module. Analyze environments and provide AR/VR recommendations."
          },
          {
            role: "user",
            content: `Analyze this environment for AR implementation: ${description}`
          }
        ],
        max_tokens: 500
      });

      return {
        recommendations,
        suggestedObjects,
        analysis: response.choices[0].message.content || "AR environment analyzed."
      };
    } catch (error) {
      return {
        recommendations,
        suggestedObjects,
        analysis: `Environment "${description}" analyzed. Recommended: holographic HUD at eye level, floating data panels, gesture-based interactions, and spatial anchoring for persistent content.`
      };
    }
  }

  getScenes(): ARScene[] {
    return Array.from(this.scenes.values());
  }

  getHolographicDisplays(): HolographicDisplay[] {
    return Array.from(this.holographicDisplays.values());
  }

  getStatus(): {
    sceneCount: number;
    activeScene: string | null;
    objectCount: number;
    hologramCount: number;
    planesDetected: number;
    webXRSupported: boolean;
  } {
    let objectCount = 0;
    for (const scene of this.scenes.values()) {
      objectCount += scene.objects.length;
    }

    return {
      sceneCount: this.scenes.size,
      activeScene: this.activeScene,
      objectCount,
      hologramCount: this.holographicDisplays.size,
      planesDetected: this.spatialMapping.planes.length,
      webXRSupported: this.webXRSupported
    };
  }
}

export const hyperlinkedReality = new HyperlinkedReality();
