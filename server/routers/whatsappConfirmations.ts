import { router, adminProcedure } from "../_core/procedures";
import { confirmationListInput } from "../../shared/whatsapp-confirmations";
import { listWhatsAppConfirmations } from "../services/whatsappConfirmations";
export const whatsappConfirmationsRouter = router({
  list: adminProcedure
    .input(confirmationListInput)
    .query(({ input }) => listWhatsAppConfirmations(input)),
});
