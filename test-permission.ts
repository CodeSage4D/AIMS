import { hasPermission } from "./src/lib/permissions";
import { db } from "./src/lib/db";

async function run() {
  const user = await db.user.findFirst({
    where: { role: "INTERN" }
  });
  if (!user) {
    console.log("No intern found");
    return;
  }
  
  const perm = await hasPermission(user.id, user.role, "dashboardAccess");
  console.log(`Permission for ${user.id} (${user.role}): ${perm}`);
}

run().catch(console.error).finally(() => process.exit(0));
