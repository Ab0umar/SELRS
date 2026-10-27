import { ENV } from "../../_core/env";
import { getDbConnection } from "../../db";
import { AiManagementStore } from "./managementStore";
import { readManusTask } from "./providers/manus";

export async function reconcileManusTasks(
  store = new AiManagementStore(getDbConnection),
  read = readManusTask,
) {
  if (process.env.AI_CORE_MANAGEMENT_ENABLED !== "true") return;
  for (const request of await store.listUnsettledManus()) {
    try {
      const remote = await read(request.task_id);
      const failed =
        remote.status === "error" ||
        remote.statusEvent?.agent_status === "error";
      if (
        failed ||
        (remote.status === "stopped" &&
          remote.has_running_background_jobs === false)
      ) {
        if (request.synthetic_probe) {
          await store.complete(
            request.request_id,
            {
              inputTokens: 0,
              outputTokens: 0,
              status: failed ? "failed" : "success",
            },
            remote.credit_usage ?? null,
          );
        } else
          await store.recordManusCompletion(
            request.request_id,
            request.task_id,
            failed ? "failed" : "success",
            remote.credit_usage ?? null,
          );
      }
    } catch {
      // Unknown remote outcomes remain reserved and are checked on the next tick.
    } finally {
      await store.markManusChecked(request.request_id, request.task_id);
    }
  }
}

let timer: ReturnType<typeof setInterval> | undefined;
export function initManusAccountingReconciler() {
  if (timer || !ENV.manusApiKey) return;
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await reconcileManusTasks();
    } catch {
      console.error("[ai-accounting] Could not reconcile pending Manus tasks");
    } finally {
      busy = false;
    }
  };
  timer = setInterval(() => void tick(), 15000);
  timer.unref();
  void tick();
}
