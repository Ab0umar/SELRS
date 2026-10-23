import { customType } from "drizzle-orm/mysql-core";

// Queue leases and Meta reply windows must not depend on the host/session time zone.
export const autoReplyTime = customType<{ data: Date; driverData: string }>({
  dataType: () => "bigint",
  toDriver: (value) => String(value.getTime()),
  fromDriver: (value) => new Date(Number(value)),
});
