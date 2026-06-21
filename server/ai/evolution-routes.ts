/**
 * Self-Evolution API Routes
 * 
 * Allows admin users to request and manage code evolution
 * CRITICAL: Requires admin authentication
 */

import { Router } from "express";
import { selfEvolutionEngine, type CodeEvolutionRequest } from "../ai/self-evolution-engine.js";

const router = Router();

function getUserId(req: any): string | null {
  return (
    req.user?.claims?.sub ||
    (typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : null) ||
    (typeof req.headers["X-User-Id"] === "string" ? req.headers["X-User-Id"] : null) ||
    null
  );
}

function isAdmin(req: any): boolean {
  // Check if user is admin
  return (
    req.user?.claims?.role === "admin" ||
    req.headers["x-admin"] === "true" ||
    req.headers["x-user-id"] === "admin"
  );
}

// =====================================
// Request Evolution
// =====================================

router.post("/api/evolution/request", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Admin privileges required for self-evolution" });
    }

    const {
      intent,
      targetFile,
      targetFunction,
      evolutionType,
      description,
      constraints,
    } = req.body;

    if (!intent || !evolutionType || !description) {
      return res.status(400).json({ 
        error: "Missing required fields: intent, evolutionType, description" 
      });
    }

    const request: CodeEvolutionRequest = {
      userId,
      isAdmin: true,
      intent,
      targetFile,
      targetFunction,
      evolutionType,
      description,
      constraints: constraints || [],
    };

    const plan = await selfEvolutionEngine.requestEvolution(request);

    res.json({
      success: true,
      evolutionId: plan.id,
      plan: {
        id: plan.id,
        status: plan.status,
        estimatedImpact: plan.estimatedImpact,
        requiresRestart: plan.requiresRestart,
        proposedChanges: plan.proposedChanges.map(c => ({
          file: c.file,
          reasoning: c.reasoning,
        })),
        risks: plan.risks,
        benefits: plan.benefits,
        createdAt: plan.createdAt,
      },
      message: "Evolution plan created. Review and approve to proceed.",
    });
  } catch (error) {
    console.error("[Evolution API] Request failed:", error);
    res.status(500).json({
      error: "Evolution request failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Get Evolution Plan
// =====================================

router.get("/api/evolution/:evolutionId", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId || !isAdmin(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const plan = selfEvolutionEngine.getEvolutionPlan(req.params.evolutionId);

    if (!plan) {
      return res.status(404).json({ error: "Evolution plan not found" });
    }

    res.json({
      success: true,
      plan,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to retrieve evolution plan",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Approve and Execute Evolution
// =====================================

router.post("/api/evolution/:evolutionId/execute", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId || !isAdmin(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const result = await selfEvolutionEngine.executeEvolution(
      req.params.evolutionId,
      userId
    );

    res.json({
      success: result.success,
      evolutionId: result.evolutionId,
      changes: result.changes,
      rollbackAvailable: result.rollbackAvailable,
      message: result.message,
    });
  } catch (error) {
    console.error("[Evolution API] Execution failed:", error);
    res.status(500).json({
      error: "Evolution execution failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Rollback Evolution
// =====================================

router.post("/api/evolution/:evolutionId/rollback", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId || !isAdmin(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const success = await selfEvolutionEngine.rollbackEvolution(req.params.evolutionId);

    res.json({
      success,
      message: success 
        ? "Evolution rolled back successfully" 
        : "Rollback failed",
    });
  } catch (error) {
    console.error("[Evolution API] Rollback failed:", error);
    res.status(500).json({
      error: "Rollback failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Get Evolution History
// =====================================

router.get("/api/evolution/history/list", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId || !isAdmin(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const history = selfEvolutionEngine.getEvolutionHistory(limit);

    res.json({
      success: true,
      history: history.map(h => ({
        id: h.id,
        intent: h.request.intent,
        evolutionType: h.request.evolutionType,
        status: h.status,
        estimatedImpact: h.estimatedImpact,
        requiresRestart: h.requiresRestart,
        createdAt: h.createdAt,
        approvedBy: h.approvedBy,
        approvedAt: h.approvedAt,
      })),
      count: history.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to retrieve history",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Quick Evolution (for simple requests)
// =====================================

router.post("/api/evolution/quick", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId || !isAdmin(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: "Command required" });
    }

    // Parse command to create evolution request
    let evolutionType: CodeEvolutionRequest['evolutionType'] = 'enhance';
    let intent = command;

    if (command.toLowerCase().includes('fix')) {
      evolutionType = 'fix';
    } else if (command.toLowerCase().includes('refactor')) {
      evolutionType = 'refactor';
    } else if (command.toLowerCase().includes('add') || command.toLowerCase().includes('implement')) {
      evolutionType = 'add-feature';
    } else if (command.toLowerCase().includes('optimize') || command.toLowerCase().includes('improve')) {
      evolutionType = 'optimize';
    }

    const request: CodeEvolutionRequest = {
      userId,
      isAdmin: true,
      intent,
      evolutionType,
      description: command,
      constraints: ['maintain backward compatibility', 'preserve existing functionality'],
    };

    // Create plan
    const plan = await selfEvolutionEngine.requestEvolution(request);

    // Auto-approve and execute if low risk
    if (plan.estimatedImpact === 'low' && plan.risks.length === 0) {
      const result = await selfEvolutionEngine.executeEvolution(plan.id, userId);
      
      res.json({
        success: result.success,
        evolutionId: plan.id,
        executed: true,
        changes: result.changes,
        message: `Quick evolution completed. ${plan.requiresRestart ? 'Server restart required.' : ''}`,
      });
    } else {
      res.json({
        success: true,
        evolutionId: plan.id,
        executed: false,
        requiresApproval: true,
        estimatedImpact: plan.estimatedImpact,
        risks: plan.risks,
        message: "Evolution plan created but requires manual approval due to risk level.",
      });
    }
  } catch (error) {
    console.error("[Evolution API] Quick evolution failed:", error);
    res.status(500).json({
      error: "Quick evolution failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Evolution Status & Health
// =====================================

router.get("/api/evolution/status", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId || !isAdmin(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const history = selfEvolutionEngine.getEvolutionHistory(10);
    const recent = history.slice(0, 5);

    res.json({
      success: true,
      status: "operational",
      capabilities: {
        selfEvolution: true,
        codeAnalysis: true,
        safeRollback: true,
        adminControlled: true,
      },
      recentEvolutions: recent.map(e => ({
        id: e.id,
        status: e.status,
        impact: e.estimatedImpact,
        createdAt: e.createdAt,
      })),
      totalEvolutions: history.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Status check failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export { router as evolutionRouter };
