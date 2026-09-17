import { loadConfig } from "./dist/auth.js";
import { buildToolDefs, executeTool } from "./dist/tools.js";

const config = loadConfig();
const tools = buildToolDefs(config);
const byName = Object.fromEntries(tools.map((t) => [t.name, t]));

console.log("=== total tools:", tools.length, "| any delete tools registered?", tools.some((t) => t.isDelete), "===");

console.log("\n=== list_people (limit=2, fields) ===");
console.log(
  JSON.stringify(
    await executeTool(config, byName["list_people"], {
      limit: 2,
      fields: "firstName,lastName,tags",
    }),
    null,
    2
  ).slice(0, 800)
);

console.log("\n=== list_notes personId=1511 limit=2 (undocumented endpoint) ===");
console.log(
  JSON.stringify(
    await executeTool(config, byName["list_notes"], { personId: 1511, limit: 2 }),
    null,
    2
  ).slice(0, 800)
);

console.log("\n=== list_smart_lists ===");
console.log(
  JSON.stringify(await executeTool(config, byName["list_smart_lists"], {}), null, 2).slice(
    0,
    500
  )
);

console.log("\n=== guard test: fake DELETE tool, no confirm (must throw, no network call) ===");
const fakeDeleteTool = {
  name: "delete_test",
  method: "DELETE",
  pathTemplate: "/people/{id}",
  params: [{ name: "id", in: "path", required: true }],
  hasExtraQuery: false,
  hasExtraBody: false,
  isDelete: true,
};
try {
  await executeTool({ ...config, allowDelete: true }, fakeDeleteTool, { id: 999999 });
  console.log("UNEXPECTED: did not throw");
} catch (e) {
  console.log("OK, threw as expected:", e.message);
}

console.log("\n=== guard test: allowDelete=false at config level (must throw even with confirm=true) ===");
try {
  await executeTool({ ...config, allowDelete: false }, fakeDeleteTool, { id: 999999, confirm: true });
  console.log("UNEXPECTED: did not throw");
} catch (e) {
  console.log("OK, threw as expected:", e.message);
}
