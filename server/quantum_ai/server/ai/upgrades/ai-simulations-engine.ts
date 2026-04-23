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

interface PhysicsBody {
  id: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  acceleration: { x: number; y: number; z: number };
  mass: number;
  shape: 'sphere' | 'box' | 'cylinder' | 'plane';
  dimensions: { width: number; height: number; depth: number };
  friction: number;
  restitution: number;
  isStatic: boolean;
}

interface SimulationEnvironment {
  id: string;
  name: string;
  type: 'physics' | 'fluid' | 'particle' | 'agent' | 'ecosystem' | 'market';
  bodies: PhysicsBody[];
  gravity: { x: number; y: number; z: number };
  timeStep: number;
  currentTime: number;
  constraints: SimulationConstraint[];
  agents: SimulationAgent[];
}

interface SimulationConstraint {
  id: string;
  type: 'distance' | 'hinge' | 'slider' | 'spring';
  bodyA: string;
  bodyB: string;
  parameters: Record<string, number>;
}

interface SimulationAgent {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  state: Record<string, any>;
  policy: 'random' | 'greedy' | 'learned' | 'scripted';
  rewards: number[];
  actions: string[];
  observations: any[];
}

interface ParticleSystem {
  id: string;
  particles: Particle[];
  emitterPosition: { x: number; y: number; z: number };
  emissionRate: number;
  particleLifetime: number;
  forces: { x: number; y: number; z: number }[];
}

interface Particle {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  life: number;
  color: { r: number; g: number; b: number; a: number };
  size: number;
}

interface SimulationResult {
  success: boolean;
  environment: SimulationEnvironment;
  stepsTaken: number;
  executionTime: number;
  metrics: {
    totalEnergy: number;
    kineticEnergy: number;
    potentialEnergy: number;
    collisions: number;
    agentRewards: Record<string, number>;
  };
}

export class AISimulationsEngine {
  private environments: Map<string, SimulationEnvironment> = new Map();
  private particleSystems: Map<string, ParticleSystem> = new Map();
  private simulationHistory: Map<string, SimulationResult[]> = new Map();
  private defaultGravity = { x: 0, y: -9.81, z: 0 };
  private maxBodies = 1000;
  private maxParticles = 10000;

  constructor() {
    console.log("[AI Simulations Engine] Initializing virtual physics and agent simulation");
    this.initializeDefaultEnvironments();
  }

  private initializeDefaultEnvironments(): void {
    this.createEnvironment("physics-sandbox", "physics", {
      gravity: this.defaultGravity,
      timeStep: 0.016
    });

    this.createEnvironment("particle-world", "particle", {
      gravity: { x: 0, y: -2, z: 0 },
      timeStep: 0.033
    });

    this.createEnvironment("agent-arena", "agent", {
      gravity: { x: 0, y: 0, z: 0 },
      timeStep: 0.1
    });
  }

  createEnvironment(
    name: string,
    type: SimulationEnvironment['type'],
    config: { gravity?: { x: number; y: number; z: number }; timeStep?: number }
  ): SimulationEnvironment {
    const env: SimulationEnvironment = {
      id: `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      bodies: [],
      gravity: config.gravity || this.defaultGravity,
      timeStep: config.timeStep || 0.016,
      currentTime: 0,
      constraints: [],
      agents: []
    };

    this.environments.set(env.id, env);
    this.simulationHistory.set(env.id, []);
    return env;
  }

  addBody(envId: string, body: Omit<PhysicsBody, 'id'>): PhysicsBody {
    const env = this.environments.get(envId);
    if (!env) throw new Error(`Environment ${envId} not found`);
    if (env.bodies.length >= this.maxBodies) throw new Error(`Maximum body count reached`);

    const newBody: PhysicsBody = {
      ...body,
      id: `body_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    env.bodies.push(newBody);
    return newBody;
  }

  addAgent(envId: string, agent: Omit<SimulationAgent, 'id' | 'rewards' | 'actions' | 'observations'>): SimulationAgent {
    const env = this.environments.get(envId);
    if (!env) throw new Error(`Environment ${envId} not found`);

    const newAgent: SimulationAgent = {
      ...agent,
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      rewards: [],
      actions: [],
      observations: []
    };

    env.agents.push(newAgent);
    return newAgent;
  }

  createParticleSystem(config: {
    emitterPosition: { x: number; y: number; z: number };
    emissionRate: number;
    particleLifetime: number;
    initialVelocity?: { x: number; y: number; z: number };
  }): ParticleSystem {
    const system: ParticleSystem = {
      id: `particles_${Date.now()}`,
      particles: [],
      emitterPosition: config.emitterPosition,
      emissionRate: config.emissionRate,
      particleLifetime: config.particleLifetime,
      forces: [{ x: 0, y: -0.5, z: 0 }]
    };

    this.particleSystems.set(system.id, system);
    return system;
  }

  private integratePhysics(env: SimulationEnvironment): { collisions: number } {
    let collisions = 0;
    const dt = env.timeStep;

    for (const body of env.bodies) {
      if (body.isStatic) continue;

      body.acceleration.x = env.gravity.x;
      body.acceleration.y = env.gravity.y;
      body.acceleration.z = env.gravity.z;

      body.velocity.x += body.acceleration.x * dt;
      body.velocity.y += body.acceleration.y * dt;
      body.velocity.z += body.acceleration.z * dt;

      body.position.x += body.velocity.x * dt;
      body.position.y += body.velocity.y * dt;
      body.position.z += body.velocity.z * dt;

      if (body.position.y < 0 && body.velocity.y < 0) {
        body.position.y = 0;
        body.velocity.y *= -body.restitution;
        body.velocity.x *= (1 - body.friction);
        body.velocity.z *= (1 - body.friction);
        collisions++;
      }
    }

    for (let i = 0; i < env.bodies.length; i++) {
      for (let j = i + 1; j < env.bodies.length; j++) {
        if (this.checkCollision(env.bodies[i], env.bodies[j])) {
          this.resolveCollision(env.bodies[i], env.bodies[j]);
          collisions++;
        }
      }
    }

    return { collisions };
  }

  private checkCollision(a: PhysicsBody, b: PhysicsBody): boolean {
    if (a.shape === 'sphere' && b.shape === 'sphere') {
      const dx = a.position.x - b.position.x;
      const dy = a.position.y - b.position.y;
      const dz = a.position.z - b.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const radiusSum = a.dimensions.width / 2 + b.dimensions.width / 2;
      return distance < radiusSum;
    }

    const aMin = {
      x: a.position.x - a.dimensions.width / 2,
      y: a.position.y - a.dimensions.height / 2,
      z: a.position.z - a.dimensions.depth / 2
    };
    const aMax = {
      x: a.position.x + a.dimensions.width / 2,
      y: a.position.y + a.dimensions.height / 2,
      z: a.position.z + a.dimensions.depth / 2
    };
    const bMin = {
      x: b.position.x - b.dimensions.width / 2,
      y: b.position.y - b.dimensions.height / 2,
      z: b.position.z - b.dimensions.depth / 2
    };
    const bMax = {
      x: b.position.x + b.dimensions.width / 2,
      y: b.position.y + b.dimensions.height / 2,
      z: b.position.z + b.dimensions.depth / 2
    };

    return (aMin.x <= bMax.x && aMax.x >= bMin.x) &&
           (aMin.y <= bMax.y && aMax.y >= bMin.y) &&
           (aMin.z <= bMax.z && aMax.z >= bMin.z);
  }

  private resolveCollision(a: PhysicsBody, b: PhysicsBody): void {
    if (a.isStatic && b.isStatic) return;

    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const dz = b.position.z - a.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

    const nx = dx / distance;
    const ny = dy / distance;
    const nz = dz / distance;

    const relVelX = b.velocity.x - a.velocity.x;
    const relVelY = b.velocity.y - a.velocity.y;
    const relVelZ = b.velocity.z - a.velocity.z;

    const relVelNormal = relVelX * nx + relVelY * ny + relVelZ * nz;

    if (relVelNormal > 0) return;

    const restitution = Math.min(a.restitution, b.restitution);
    const impulse = -(1 + restitution) * relVelNormal / (1 / a.mass + 1 / b.mass);

    if (!a.isStatic) {
      a.velocity.x -= impulse * nx / a.mass;
      a.velocity.y -= impulse * ny / a.mass;
      a.velocity.z -= impulse * nz / a.mass;
    }

    if (!b.isStatic) {
      b.velocity.x += impulse * nx / b.mass;
      b.velocity.y += impulse * ny / b.mass;
      b.velocity.z += impulse * nz / b.mass;
    }
  }

  private updateAgents(env: SimulationEnvironment): void {
    for (const agent of env.agents) {
      const observation = this.getAgentObservation(agent, env);
      agent.observations.push(observation);

      let action: string;
      switch (agent.policy) {
        case 'random':
          action = ['move_up', 'move_down', 'move_left', 'move_right', 'stay'][Math.floor(Math.random() * 5)];
          break;
        case 'greedy':
          action = this.greedyAction(agent, env);
          break;
        case 'learned':
          action = this.learnedAction(agent, observation);
          break;
        default:
          action = 'stay';
      }

      agent.actions.push(action);
      this.executeAgentAction(agent, action);

      const reward = this.calculateReward(agent, env);
      agent.rewards.push(reward);
    }
  }

  private getAgentObservation(agent: SimulationAgent, env: SimulationEnvironment): any {
    return {
      position: agent.position,
      nearbyBodies: env.bodies
        .filter(b => {
          const dx = b.position.x - agent.position.x;
          const dy = b.position.y - agent.position.y;
          const dz = b.position.z - agent.position.z;
          return Math.sqrt(dx * dx + dy * dy + dz * dz) < 10;
        })
        .map(b => ({ id: b.id, position: b.position })),
      otherAgents: env.agents
        .filter(a => a.id !== agent.id)
        .map(a => ({ id: a.id, position: a.position }))
    };
  }

  private greedyAction(agent: SimulationAgent, env: SimulationEnvironment): string {
    const targetX = 0;
    const targetY = 0;
    const dx = targetX - agent.position.x;
    const dy = targetY - agent.position.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'move_right' : 'move_left';
    } else {
      return dy > 0 ? 'move_up' : 'move_down';
    }
  }

  private learnedAction(agent: SimulationAgent, observation: any): string {
    const actions = ['move_up', 'move_down', 'move_left', 'move_right', 'stay'];
    const scores = actions.map(() => Math.random());
    const maxIdx = scores.indexOf(Math.max(...scores));
    return actions[maxIdx];
  }

  private executeAgentAction(agent: SimulationAgent, action: string): void {
    const moveSpeed = 0.5;
    switch (action) {
      case 'move_up':
        agent.position.y += moveSpeed;
        break;
      case 'move_down':
        agent.position.y -= moveSpeed;
        break;
      case 'move_left':
        agent.position.x -= moveSpeed;
        break;
      case 'move_right':
        agent.position.x += moveSpeed;
        break;
    }
  }

  private calculateReward(agent: SimulationAgent, env: SimulationEnvironment): number {
    const distanceToCenter = Math.sqrt(
      agent.position.x * agent.position.x +
      agent.position.y * agent.position.y +
      agent.position.z * agent.position.z
    );
    return Math.max(0, 10 - distanceToCenter);
  }

  private updateParticles(system: ParticleSystem, dt: number): void {
    for (const force of system.forces) {
      for (const particle of system.particles) {
        particle.velocity.x += force.x * dt;
        particle.velocity.y += force.y * dt;
        particle.velocity.z += force.z * dt;

        particle.position.x += particle.velocity.x * dt;
        particle.position.y += particle.velocity.y * dt;
        particle.position.z += particle.velocity.z * dt;

        particle.life -= dt;
      }
    }

    system.particles = system.particles.filter(p => p.life > 0);

    const newParticles = Math.floor(system.emissionRate * dt);
    for (let i = 0; i < newParticles && system.particles.length < this.maxParticles; i++) {
      system.particles.push({
        position: { ...system.emitterPosition },
        velocity: {
          x: (Math.random() - 0.5) * 2,
          y: Math.random() * 2,
          z: (Math.random() - 0.5) * 2
        },
        life: system.particleLifetime,
        color: { r: 1, g: Math.random(), b: 0, a: 1 },
        size: 0.1
      });
    }
  }

  async stepSimulation(envId: string, steps: number = 1): Promise<SimulationResult> {
    const startTime = Date.now();
    const env = this.environments.get(envId);
    if (!env) throw new Error(`Environment ${envId} not found`);

    let totalCollisions = 0;

    for (let i = 0; i < steps; i++) {
      const { collisions } = this.integratePhysics(env);
      totalCollisions += collisions;

      if (env.agents.length > 0) {
        this.updateAgents(env);
      }

      env.currentTime += env.timeStep;
    }

    for (const [, system] of this.particleSystems) {
      this.updateParticles(system, env.timeStep * steps);
    }

    const metrics = this.calculateMetrics(env, totalCollisions);

    const result: SimulationResult = {
      success: true,
      environment: env,
      stepsTaken: steps,
      executionTime: Date.now() - startTime,
      metrics
    };

    const history = this.simulationHistory.get(envId) || [];
    history.push(result);
    if (history.length > 1000) history.shift();
    this.simulationHistory.set(envId, history);

    return result;
  }

  private calculateMetrics(env: SimulationEnvironment, collisions: number): SimulationResult['metrics'] {
    let kineticEnergy = 0;
    let potentialEnergy = 0;

    for (const body of env.bodies) {
      const speed = Math.sqrt(
        body.velocity.x ** 2 + body.velocity.y ** 2 + body.velocity.z ** 2
      );
      kineticEnergy += 0.5 * body.mass * speed ** 2;
      potentialEnergy += body.mass * Math.abs(env.gravity.y) * body.position.y;
    }

    const agentRewards: Record<string, number> = {};
    for (const agent of env.agents) {
      agentRewards[agent.id] = agent.rewards.reduce((a, b) => a + b, 0);
    }

    return {
      totalEnergy: kineticEnergy + potentialEnergy,
      kineticEnergy,
      potentialEnergy,
      collisions,
      agentRewards
    };
  }

  async runAIScenario(scenario: string): Promise<{ success: boolean; result: any; analysis: string }> {
    const env = this.createEnvironment(`scenario_${Date.now()}`, "agent", {
      gravity: { x: 0, y: 0, z: 0 },
      timeStep: 0.1
    });

    for (let i = 0; i < 4; i++) {
      this.addAgent(env.id, {
        name: `Agent_${i}`,
        position: {
          x: (Math.random() - 0.5) * 20,
          y: (Math.random() - 0.5) * 20,
          z: 0
        },
        state: { health: 100, score: 0 },
        policy: i === 0 ? 'learned' : 'random'
      });
    }

    let totalRewards = 0;
    for (let step = 0; step < 100; step++) {
      const result = await this.stepSimulation(env.id, 1);
      for (const reward of Object.values(result.metrics.agentRewards)) {
        totalRewards += reward;
      }
    }

    const openai = getOpenAI();
    if (!openai) {
      return {
        success: true,
        result: { agents: env.agents, totalRewards, steps: 100 },
        analysis: `Simulation "${scenario}" completed with ${env.agents.length} agents. [AI unavailable]`
      };
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are CYRUS's AI Simulation Analysis module. Analyze simulation results and provide insights."
          },
          {
            role: "user",
            content: `Analyze this simulation scenario: "${scenario}"
Results:
- Agents: ${env.agents.length}
- Steps: 100
- Total Rewards: ${totalRewards.toFixed(2)}
- Final positions: ${JSON.stringify(env.agents.map(a => ({ name: a.name, position: a.position })))}`
          }
        ],
        max_tokens: 500
      });

      return {
        success: true,
        result: {
          agents: env.agents,
          totalRewards,
          steps: 100
        },
        analysis: response.choices[0].message.content || "Simulation complete."
      };
    } catch (error) {
      return {
        success: true,
        result: {
          agents: env.agents,
          totalRewards,
          steps: 100
        },
        analysis: `Simulation "${scenario}" completed with ${env.agents.length} agents over 100 steps. Total accumulated rewards: ${totalRewards.toFixed(2)}.`
      };
    }
  }

  getEnvironments(): SimulationEnvironment[] {
    return Array.from(this.environments.values());
  }

  getParticleSystems(): ParticleSystem[] {
    return Array.from(this.particleSystems.values());
  }

  getStatus(): {
    environmentCount: number;
    totalBodies: number;
    totalAgents: number;
    particleSystemCount: number;
    totalParticles: number;
  } {
    let totalBodies = 0;
    let totalAgents = 0;
    let totalParticles = 0;

    for (const env of this.environments.values()) {
      totalBodies += env.bodies.length;
      totalAgents += env.agents.length;
    }

    for (const system of this.particleSystems.values()) {
      totalParticles += system.particles.length;
    }

    return {
      environmentCount: this.environments.size,
      totalBodies,
      totalAgents,
      particleSystemCount: this.particleSystems.size,
      totalParticles
    };
  }
}

export const aiSimulationsEngine = new AISimulationsEngine();
