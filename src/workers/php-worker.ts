/**
 * Labo STI - Dedicated Web Worker for PHP 8.2 WASM execution
 * Runs isolated from the main UI thread (PRD §8.1, F-22 à F-24, T-10)
 */

import { executerScriptPhpCore, SUPPORTED_PHP_EXTENSIONS } from "../lib/php/php-worker-core";
import type { PhpWorkerIncomingMessage, PhpWorkerOutgoingMessage } from "../lib/php/types";

// Ensure this script can run as a dedicated Web Worker
const ctx: Worker = self as unknown as Worker;

ctx.onmessage = async (event: MessageEvent<PhpWorkerIncomingMessage>) => {
  const msg = event.data;

  try {
    switch (msg.type) {
      case "INIT": {
        const out: PhpWorkerOutgoingMessage = {
          type: "READY",
          phpVersion: msg.phpVersion || "8.2.14",
          extensions: SUPPORTED_PHP_EXTENSIONS,
        };
        ctx.postMessage(out);
        break;
      }

      case "EXECUTE": {
        const result = await executerScriptPhpCore(msg.payload);
        const out: PhpWorkerOutgoingMessage = {
          type: "EXECUTION_RESULT",
          payload: result,
        };
        ctx.postMessage(out);
        break;
      }

      case "PING": {
        const out: PhpWorkerOutgoingMessage = { type: "PONG" };
        ctx.postMessage(out);
        break;
      }

      case "RESET": {
        const out: PhpWorkerOutgoingMessage = {
          type: "READY",
          phpVersion: "8.2.14",
          extensions: SUPPORTED_PHP_EXTENSIONS,
        };
        ctx.postMessage(out);
        break;
      }

      default: {
        const out: PhpWorkerOutgoingMessage = {
          type: "ERROR",
          error: `Type de message inconnu : ${(msg as { type: string }).type}`,
        };
        ctx.postMessage(out);
      }
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const out: PhpWorkerOutgoingMessage = {
      type: "ERROR",
      error: `Erreur interne du Worker PHP : ${errorMsg}`,
    };
    ctx.postMessage(out);
  }
};
