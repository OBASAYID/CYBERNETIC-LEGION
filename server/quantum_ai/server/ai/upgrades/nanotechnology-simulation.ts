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

interface Atom {
  id: string;
  element: string;
  atomicNumber: number;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  charge: number;
  mass: number;
}

interface MolecularBond {
  id: string;
  atom1: string;
  atom2: string;
  type: 'covalent' | 'ionic' | 'metallic' | 'hydrogen' | 'van_der_waals';
  strength: number;
  length: number;
}

interface Nanostructure {
  id: string;
  name: string;
  type: 'nanotube' | 'fullerene' | 'graphene' | 'quantum_dot' | 'nanoparticle' | 'nanowire' | 'nanosheet';
  atoms: Atom[];
  bonds: MolecularBond[];
  properties: {
    diameter?: number;
    length?: number;
    area?: number;
    bandgap?: number;
    conductivity?: number;
  };
}

interface NanoscaleSimulation {
  id: string;
  name: string;
  structures: Nanostructure[];
  temperature: number;
  pressure: number;
  timeStep: number;
  currentTime: number;
  potentialEnergy: number;
  kineticEnergy: number;
}

interface SimulationResult {
  success: boolean;
  simulation: NanoscaleSimulation;
  steps: number;
  executionTime: number;
  energyHistory: { time: number; potential: number; kinetic: number }[];
  structuralChanges: { atomId: string; displacement: number }[];
}

const ELEMENT_DATA: Record<string, { atomicNumber: number; mass: number; radius: number }> = {
  'H': { atomicNumber: 1, mass: 1.008, radius: 0.53 },
  'C': { atomicNumber: 6, mass: 12.011, radius: 0.77 },
  'N': { atomicNumber: 7, mass: 14.007, radius: 0.75 },
  'O': { atomicNumber: 8, mass: 15.999, radius: 0.73 },
  'Si': { atomicNumber: 14, mass: 28.086, radius: 1.17 },
  'P': { atomicNumber: 15, mass: 30.974, radius: 1.10 },
  'S': { atomicNumber: 16, mass: 32.065, radius: 1.04 },
  'Fe': { atomicNumber: 26, mass: 55.845, radius: 1.26 },
  'Au': { atomicNumber: 79, mass: 196.967, radius: 1.44 },
  'Ag': { atomicNumber: 47, mass: 107.868, radius: 1.44 }
};

export class NanotechnologySimulation {
  private simulations: Map<string, NanoscaleSimulation> = new Map();
  private structures: Map<string, Nanostructure> = new Map();
  private boltzmannConstant = 8.617e-5;
  private maxAtoms = 10000;

  constructor() {
    console.log("[Nanotechnology Simulation] Initializing nanoscale physics engine");
    this.initializeDefaultStructures();
  }

  private initializeDefaultStructures(): void {
    this.createCarbon60Fullerene();
    this.createGrapheneSheet(5, 5);
    this.createCarbonNanotube(5, 10);
  }

  createAtom(element: string, position: { x: number; y: number; z: number }): Atom {
    const data = ELEMENT_DATA[element] || ELEMENT_DATA['C'];

    return {
      id: `atom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      element,
      atomicNumber: data.atomicNumber,
      position: { ...position },
      velocity: { x: 0, y: 0, z: 0 },
      charge: 0,
      mass: data.mass
    };
  }

  createBond(atom1: Atom, atom2: Atom, type: MolecularBond['type']): MolecularBond {
    const dx = atom2.position.x - atom1.position.x;
    const dy = atom2.position.y - atom1.position.y;
    const dz = atom2.position.z - atom1.position.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const strengthMap = {
      'covalent': 350,
      'ionic': 500,
      'metallic': 200,
      'hydrogen': 20,
      'van_der_waals': 5
    };

    return {
      id: `bond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      atom1: atom1.id,
      atom2: atom2.id,
      type,
      strength: strengthMap[type],
      length
    };
  }

  createCarbon60Fullerene(): Nanostructure {
    const atoms: Atom[] = [];
    const bonds: MolecularBond[] = [];

    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const radius = 3.5;

    const vertices: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < 12; i++) {
      const theta = (i * Math.PI * 2) / 12;
      const phi = Math.acos(1 - 2 * ((i + 0.5) / 12));
      vertices.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi)
      });
    }

    for (let i = 0; i < 60; i++) {
      const baseVertex = vertices[i % 12];
      const angle = (i / 5) * Math.PI * 2;
      const offset = (i % 5) * 0.3;

      atoms.push(this.createAtom('C', {
        x: baseVertex.x * (1 + offset * 0.1) + Math.cos(angle) * 0.2,
        y: baseVertex.y * (1 + offset * 0.1) + Math.sin(angle) * 0.2,
        z: baseVertex.z * (1 + offset * 0.1)
      }));
    }

    for (let i = 0; i < atoms.length; i++) {
      const distances: { idx: number; dist: number }[] = [];
      for (let j = 0; j < atoms.length; j++) {
        if (i !== j) {
          const dx = atoms[j].position.x - atoms[i].position.x;
          const dy = atoms[j].position.y - atoms[i].position.y;
          const dz = atoms[j].position.z - atoms[i].position.z;
          distances.push({ idx: j, dist: Math.sqrt(dx * dx + dy * dy + dz * dz) });
        }
      }
      distances.sort((a, b) => a.dist - b.dist);
      for (let k = 0; k < 3 && k < distances.length; k++) {
        if (i < distances[k].idx) {
          bonds.push(this.createBond(atoms[i], atoms[distances[k].idx], 'covalent'));
        }
      }
    }

    const structure: Nanostructure = {
      id: `c60_${Date.now()}`,
      name: 'Carbon-60 Fullerene (Buckyball)',
      type: 'fullerene',
      atoms,
      bonds,
      properties: {
        diameter: 7.0,
        bandgap: 1.9,
        conductivity: 0.01
      }
    };

    this.structures.set(structure.id, structure);
    return structure;
  }

  createGrapheneSheet(width: number, height: number): Nanostructure {
    const atoms: Atom[] = [];
    const bonds: MolecularBond[] = [];
    const bondLength = 1.42;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const x = col * bondLength * 1.5;
        const y = row * bondLength * Math.sqrt(3) + (col % 2) * bondLength * Math.sqrt(3) / 2;
        atoms.push(this.createAtom('C', { x, y, z: 0 }));
      }
    }

    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const dx = atoms[j].position.x - atoms[i].position.x;
        const dy = atoms[j].position.y - atoms[i].position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bondLength * 1.2) {
          bonds.push(this.createBond(atoms[i], atoms[j], 'covalent'));
        }
      }
    }

    const structure: Nanostructure = {
      id: `graphene_${Date.now()}`,
      name: `Graphene Sheet (${width}x${height})`,
      type: 'graphene',
      atoms,
      bonds,
      properties: {
        area: width * height * bondLength * bondLength * 2.6,
        bandgap: 0,
        conductivity: 1e6
      }
    };

    this.structures.set(structure.id, structure);
    return structure;
  }

  createCarbonNanotube(circumference: number, length: number): Nanostructure {
    const atoms: Atom[] = [];
    const bonds: MolecularBond[] = [];
    const bondLength = 1.42;
    const radius = (circumference * bondLength) / (2 * Math.PI);

    for (let z = 0; z < length; z++) {
      for (let i = 0; i < circumference; i++) {
        const angle = (i / circumference) * Math.PI * 2 + (z % 2) * Math.PI / circumference;
        atoms.push(this.createAtom('C', {
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
          z: z * bondLength * 0.866
        }));
      }
    }

    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const dx = atoms[j].position.x - atoms[i].position.x;
        const dy = atoms[j].position.y - atoms[i].position.y;
        const dz = atoms[j].position.z - atoms[i].position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < bondLength * 1.3) {
          bonds.push(this.createBond(atoms[i], atoms[j], 'covalent'));
        }
      }
    }

    const structure: Nanostructure = {
      id: `nanotube_${Date.now()}`,
      name: `Carbon Nanotube (${circumference},${circumference})`,
      type: 'nanotube',
      atoms,
      bonds,
      properties: {
        diameter: radius * 2,
        length: length * bondLength * 0.866,
        bandgap: circumference % 3 === 0 ? 0 : 0.5,
        conductivity: circumference % 3 === 0 ? 1e7 : 1e3
      }
    };

    this.structures.set(structure.id, structure);
    return structure;
  }

  createQuantumDot(element: string, radius: number): Nanostructure {
    const atoms: Atom[] = [];
    const bonds: MolecularBond[] = [];
    const spacing = 2.5;

    for (let x = -radius; x <= radius; x += spacing) {
      for (let y = -radius; y <= radius; y += spacing) {
        for (let z = -radius; z <= radius; z += spacing) {
          if (x * x + y * y + z * z <= radius * radius) {
            atoms.push(this.createAtom(element, { x, y, z }));
          }
        }
      }
    }

    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const dx = atoms[j].position.x - atoms[i].position.x;
        const dy = atoms[j].position.y - atoms[i].position.y;
        const dz = atoms[j].position.z - atoms[i].position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < spacing * 1.2) {
          bonds.push(this.createBond(atoms[i], atoms[j], 'metallic'));
        }
      }
    }

    const bandgap = 2.0 / radius;

    const structure: Nanostructure = {
      id: `qdot_${Date.now()}`,
      name: `${element} Quantum Dot (r=${radius}nm)`,
      type: 'quantum_dot',
      atoms,
      bonds,
      properties: {
        diameter: radius * 2,
        bandgap,
        conductivity: 1000
      }
    };

    this.structures.set(structure.id, structure);
    return structure;
  }

  createSimulation(name: string, structureIds: string[], config: {
    temperature?: number;
    pressure?: number;
    timeStep?: number;
  }): NanoscaleSimulation {
    const structures: Nanostructure[] = [];
    for (const id of structureIds) {
      const structure = this.structures.get(id);
      if (structure) structures.push(structure);
    }

    const simulation: NanoscaleSimulation = {
      id: `sim_${Date.now()}`,
      name,
      structures,
      temperature: config.temperature || 300,
      pressure: config.pressure || 101325,
      timeStep: config.timeStep || 0.001,
      currentTime: 0,
      potentialEnergy: 0,
      kineticEnergy: 0
    };

    this.initializeThermalMotion(simulation);
    this.simulations.set(simulation.id, simulation);
    return simulation;
  }

  private initializeThermalMotion(simulation: NanoscaleSimulation): void {
    const kT = this.boltzmannConstant * simulation.temperature;

    for (const structure of simulation.structures) {
      for (const atom of structure.atoms) {
        const sigma = Math.sqrt(kT / atom.mass);
        atom.velocity.x = this.gaussianRandom() * sigma * 100;
        atom.velocity.y = this.gaussianRandom() * sigma * 100;
        atom.velocity.z = this.gaussianRandom() * sigma * 100;
      }
    }
  }

  private gaussianRandom(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  async runSimulation(simId: string, steps: number): Promise<SimulationResult> {
    const startTime = Date.now();
    const simulation = this.simulations.get(simId);
    if (!simulation) throw new Error(`Simulation ${simId} not found`);

    const energyHistory: { time: number; potential: number; kinetic: number }[] = [];
    const initialPositions: Map<string, { x: number; y: number; z: number }> = new Map();

    for (const structure of simulation.structures) {
      for (const atom of structure.atoms) {
        initialPositions.set(atom.id, { ...atom.position });
      }
    }

    for (let step = 0; step < steps; step++) {
      this.integrateStep(simulation);
      simulation.currentTime += simulation.timeStep;

      if (step % 10 === 0) {
        energyHistory.push({
          time: simulation.currentTime,
          potential: simulation.potentialEnergy,
          kinetic: simulation.kineticEnergy
        });
      }
    }

    const structuralChanges: { atomId: string; displacement: number }[] = [];
    for (const structure of simulation.structures) {
      for (const atom of structure.atoms) {
        const initial = initialPositions.get(atom.id);
        if (initial) {
          const dx = atom.position.x - initial.x;
          const dy = atom.position.y - initial.y;
          const dz = atom.position.z - initial.z;
          const displacement = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (displacement > 0.1) {
            structuralChanges.push({ atomId: atom.id, displacement });
          }
        }
      }
    }

    return {
      success: true,
      simulation,
      steps,
      executionTime: Date.now() - startTime,
      energyHistory,
      structuralChanges
    };
  }

  private integrateStep(simulation: NanoscaleSimulation): void {
    const dt = simulation.timeStep;

    for (const structure of simulation.structures) {
      for (const atom of structure.atoms) {
        atom.velocity.x *= 0.999;
        atom.velocity.y *= 0.999;
        atom.velocity.z *= 0.999;

        atom.position.x += atom.velocity.x * dt;
        atom.position.y += atom.velocity.y * dt;
        atom.position.z += atom.velocity.z * dt;
      }

      for (const bond of structure.bonds) {
        const atom1 = structure.atoms.find(a => a.id === bond.atom1);
        const atom2 = structure.atoms.find(a => a.id === bond.atom2);

        if (atom1 && atom2) {
          const dx = atom2.position.x - atom1.position.x;
          const dy = atom2.position.y - atom1.position.y;
          const dz = atom2.position.z - atom1.position.z;
          const currentLength = Math.sqrt(dx * dx + dy * dy + dz * dz);

          const stretch = currentLength - bond.length;
          const forceMag = -bond.strength * stretch * 0.001;

          const fx = forceMag * dx / currentLength;
          const fy = forceMag * dy / currentLength;
          const fz = forceMag * dz / currentLength;

          atom1.velocity.x -= fx / atom1.mass * dt;
          atom1.velocity.y -= fy / atom1.mass * dt;
          atom1.velocity.z -= fz / atom1.mass * dt;

          atom2.velocity.x += fx / atom2.mass * dt;
          atom2.velocity.y += fy / atom2.mass * dt;
          atom2.velocity.z += fz / atom2.mass * dt;
        }
      }
    }

    let totalKinetic = 0;
    let totalPotential = 0;

    for (const structure of simulation.structures) {
      for (const atom of structure.atoms) {
        const speed = Math.sqrt(
          atom.velocity.x ** 2 + atom.velocity.y ** 2 + atom.velocity.z ** 2
        );
        totalKinetic += 0.5 * atom.mass * speed ** 2;
      }

      for (const bond of structure.bonds) {
        const atom1 = structure.atoms.find(a => a.id === bond.atom1);
        const atom2 = structure.atoms.find(a => a.id === bond.atom2);
        if (atom1 && atom2) {
          const dx = atom2.position.x - atom1.position.x;
          const dy = atom2.position.y - atom1.position.y;
          const dz = atom2.position.z - atom1.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const stretch = dist - bond.length;
          totalPotential += 0.5 * bond.strength * stretch ** 2;
        }
      }
    }

    simulation.kineticEnergy = totalKinetic;
    simulation.potentialEnergy = totalPotential;
  }

  async analyzeNanostructure(structureId: string): Promise<{
    analysis: string;
    properties: Record<string, any>;
  }> {
    const structure = this.structures.get(structureId);
    if (!structure) throw new Error(`Structure ${structureId} not found`);

    const properties = {
      ...structure.properties,
      atomCount: structure.atoms.length,
      bondCount: structure.bonds.length,
      averageBondLength: structure.bonds.reduce((sum, b) => sum + b.length, 0) / structure.bonds.length,
      composition: this.getComposition(structure)
    };

    const openai = getOpenAI();
    if (!openai) {
      return {
        analysis: `${structure.name}: ${structure.type} with ${structure.atoms.length} atoms [AI unavailable]`,
        properties
      };
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are CYRUS's Nanotechnology Analysis module. Provide scientific analysis of nanostructures."
          },
          {
            role: "user",
            content: `Analyze this nanostructure:
Name: ${structure.name}
Type: ${structure.type}
Atoms: ${structure.atoms.length}
Bonds: ${structure.bonds.length}
Properties: ${JSON.stringify(properties, null, 2)}`
          }
        ],
        max_tokens: 600
      });

      return {
        analysis: response.choices[0].message.content || "Analysis complete.",
        properties
      };
    } catch (error) {
      return {
        analysis: `${structure.name}: A ${structure.type} structure with ${structure.atoms.length} atoms and ${structure.bonds.length} bonds. Key properties include diameter of ${structure.properties.diameter?.toFixed(2) || 'N/A'}nm and bandgap of ${structure.properties.bandgap?.toFixed(2) || 'N/A'}eV.`,
        properties
      };
    }
  }

  private getComposition(structure: Nanostructure): Record<string, number> {
    const composition: Record<string, number> = {};
    for (const atom of structure.atoms) {
      composition[atom.element] = (composition[atom.element] || 0) + 1;
    }
    return composition;
  }

  getStructures(): Nanostructure[] {
    return Array.from(this.structures.values());
  }

  getSimulations(): NanoscaleSimulation[] {
    return Array.from(this.simulations.values());
  }

  getStatus(): {
    structureCount: number;
    simulationCount: number;
    totalAtoms: number;
    totalBonds: number;
  } {
    let totalAtoms = 0;
    let totalBonds = 0;

    for (const structure of this.structures.values()) {
      totalAtoms += structure.atoms.length;
      totalBonds += structure.bonds.length;
    }

    return {
      structureCount: this.structures.size,
      simulationCount: this.simulations.size,
      totalAtoms,
      totalBonds
    };
  }
}

export const nanotechnologySimulation = new NanotechnologySimulation();
