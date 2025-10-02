import type { Handler } from "@netlify/functions";
import { db } from "../../lib/firebase-admin";
import { paths } from "../../lib/paths"; // Your schema paths

// Utility: delete all children of a path
async function deleteAllAtPath(path: string) {
  console.log(`Deleting at path: ${path}`);
  await db.ref(path).remove();
}

export const handler: Handler = async () => {
  try {
    // Clean ephemeral collections
    await Promise.all([
      deleteAllAtPath("ephemeralSubmissions"),
      deleteAllAtPath("groupQuestions"),
      deleteAllAtPath("indexByAuthor"),
      deleteAllAtPath("indexByLanguage"),
      deleteAllAtPath("indexBytag"),
      deleteAllAtPath("solutions_global"),
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Cleanup complete" }),
    };
  } catch (error) {
    console.error("Cleanup failed", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Cleanup failed" }) };
  }
};
