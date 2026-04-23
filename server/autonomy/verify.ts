import { ExecutionResult, VerificationResult } from "./types.js";

export function verifyExecution(execResults: ExecutionResult[]): VerificationResult[] {
  return execResults.map((res) => {
    const pass = res.status === "success";
    return {
      stepId: res.stepId,
      status: pass ? "pass" : "fail",
      notes: pass ? ["Output accepted"] : [`Failure: ${res.detail}`],
    };
  });
}

