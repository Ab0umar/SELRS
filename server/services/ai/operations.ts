import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { getDbConnection } from "../../db";
import { AiManagementError } from "./managementStore";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { and, eq } from "drizzle-orm";
import { aiOperationRequests } from "../../../drizzle/schema";
export type AcceptAiOperation = (
  writer?: Pick<MySql2Database, "update">,
) => Promise<void>;

const operationSchema = z.object({
  scope: z.enum(["marketing", "probe"]),
  owner: z.coerce.number(),
  state: z.enum(["preflight", "accepted", "rejected"]),
  context_json: z.string(),
});
export async function readAiOperation(
  requestId: string,
  scope: "marketing" | "probe",
  owner: number,
) {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT scope,owner,state,context_json FROM ai_operation_requests WHERE request_id=? AND scope=? AND owner=?",
      [requestId, scope, owner],
    );
    if (!rows[0]) return null;
    const row = operationSchema.parse(rows[0]);
    return {
      state: row.state,
      context: JSON.parse(row.context_json) as unknown,
    };
  } finally {
    connection.release();
  }
}
async function operationState(
  requestId: string,
  state: "accepted" | "rejected",
) {
  const connection = await getDbConnection();
  try {
    await connection.execute(
      "UPDATE ai_operation_requests SET state=? WHERE request_id=? AND state='preflight'",
      [state, requestId],
    );
  } finally {
    connection.release();
  }
}
export async function trackedAiOperation<T>(
  operation: {
    requestId: string;
    scope: "marketing" | "probe";
    owner: number;
    context: object;
  },
  work: (accept: AcceptAiOperation) => Promise<T>,
) {
  const connection = await getDbConnection();
  try {
    const [result] = await connection.execute<
      import("mysql2/promise").ResultSetHeader
    >(
      "INSERT IGNORE INTO ai_operation_requests (request_id,scope,owner,context_json) VALUES (?,?,?,?)",
      [
        operation.requestId,
        operation.scope,
        operation.owner,
        JSON.stringify(operation.context),
      ],
    );
    if (result.affectedRows !== 1) throw new AiManagementError("duplicate");
  } finally {
    connection.release();
  }
  try {
    return await work(async (writer) => {
      if (!writer) return operationState(operation.requestId, "accepted");
      await writer
        .update(aiOperationRequests)
        .set({ state: "accepted" })
        .where(
          and(
            eq(aiOperationRequests.requestId, operation.requestId),
            eq(aiOperationRequests.state, "preflight"),
          ),
        );
    });
  } catch (error) {
    // Once accepted, an ambiguous provider result must retain its request identity.
    await operationState(operation.requestId, "rejected");
    throw error;
  }
}
