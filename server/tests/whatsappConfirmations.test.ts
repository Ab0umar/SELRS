import { afterEach, describe, expect, it, vi } from "vitest";
import { ENV } from "../_core/env";
import { parseConfirmationReceipts } from "../services/whatsappConfirmations";
import { whatsappConfirmationsRouter } from "../routers/whatsappConfirmations";
import { makeCallerAs } from "./helpers/auth";
afterEach(() => vi.restoreAllMocks());
describe("confirmation delivery boundary", () => {
  it("keeps statuses isolated to the configured confirmation phone and sanitizes error details", () => {
    const original = ENV.whatsappPhoneNumberId;
    ENV.whatsappPhoneNumberId = "configured-phone";
    try {
      const payload = (phone: string) => ({
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  metadata: { phone_number_id: phone },
                  statuses: [
                    {
                      id: "fixture-message",
                      status: "failed",
                      timestamp: "1792890000",
                      errors: [
                        {
                          code: 131026,
                          error_data: {
                            details:
                              "Undelivered 201012345678 EAAprivateSecret",
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ],
      });
      expect(parseConfirmationReceipts(payload("other-phone"))).toEqual([]);
      expect(
        parseConfirmationReceipts(payload("configured-phone"))[0],
      ).toMatchObject({
        state: "failed",
        errorCode: "131026",
        errorDetails: "Undelivered [number] [redacted]",
      });
    } finally {
      ENV.whatsappPhoneNumberId = original;
    }
  });
  it.each(["doctor", "reception", "viewer"])(
    "rejects %s before reading recipient logs",
    async (role) => {
      await expect(
        whatsappConfirmationsRouter
          .createCaller(makeCallerAs(role))
          .list({ page: 1, search: "" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );
});
