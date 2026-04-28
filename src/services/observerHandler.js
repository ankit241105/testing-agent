import { randomUUID } from "node:crypto";

const executionStore = new Map();
let activeExecutionId = null;

function getExecutionOrThrow(executionId) {
  const execution = executionStore.get(executionId);
  if (!execution) {
    const error = new Error(`Unknown execution id: ${executionId}`);
    error.code = "UNKNOWN_EXECUTION";
    throw error;
  }
  return execution;
}

export function startObservationExecution() {
  const executionId = randomUUID();
  executionStore.set(executionId, {
    observationsByStep: new Map(),
    createdAt: Date.now()
  });
  activeExecutionId = executionId;
  return executionId;
}

export function closeObservationExecution(executionId) {
  executionStore.delete(executionId);
  if (activeExecutionId === executionId) {
    activeExecutionId = null;
  }
}

/**
 * @param {{
 *  executionId?: string,
 *  stepIndex?: number,
 *  step: object,
 *  html?: string,
 *  screenshot?: string,
 *  timestamp?: string,
 *  network?: object
 * }} payload
 */
export function recordObservation(payload) {
  const executionId = payload.executionId || activeExecutionId;
  if (!executionId) {
    const error = new Error("No active execution id available for observation.");
    error.code = "UNKNOWN_EXECUTION";
    throw error;
  }

  const execution = getExecutionOrThrow(executionId);
  const inferredStepIndex =
    Number.isInteger(payload.stepIndex) && payload.stepIndex >= 0
      ? payload.stepIndex
      : execution.observationsByStep.size;

  const observation = {
    executionId,
    stepIndex: inferredStepIndex,
    step: payload.step,
    html: payload.html || "",
    screenshot: payload.screenshot || "",
    timestamp: payload.timestamp || new Date().toISOString(),
    network: payload.network || null
  };

  execution.observationsByStep.set(inferredStepIndex, observation);
  return observation;
}

export async function waitForObservation(executionId, stepIndex, timeoutMs = 5000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const execution = executionStore.get(executionId);
    const observation = execution?.observationsByStep.get(stepIndex);
    if (observation) return observation;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return null;
}

