import 'dotenv/config'
import type { Handler } from "@netlify/functions";
import { db } from "../../lib/firebase-admin";
import { paths } from "../../lib/paths"; 

// Utility: delete all children of a path
async function deleteAllAtPath(path: string) {
  console.log(`Deleting at path: ${path}`);
  await db.ref(path).remove();
}

export const handler: Handler = async () => {
  try {
    console.log("Cleanup function started");
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



// import 'dotenv/config'
// import type { Handler } from "@netlify/functions"
// import { db } from "../../lib/firebase-admin" // Removed 'firestore' import
// import { paths } from "../../lib/paths"
// // REMOVED CLIENT SDK IMPORTS: import { ref, update, runTransaction } from "firebase/database" ❌

// // Utility: delete all children of a path in Realtime Database
// async function deleteAllAtPath(path: string) {
//   console.log(`Deleting RTDB path: ${path}`)
//   // ✅ Admin SDK method
//   await db.ref(path).remove()
// }

// // Utility: mark question as expired in RTDB stats
// async function markQuestionExpired(groupId: string, questionId: string) {
//   try {
//     const questionStatsPath = paths.questionStats(groupId, questionId)
//     // ✅ Use Admin SDK's db.ref() to get the reference
//     const questionStatsRef = db.ref(questionStatsPath)
    
//     // ✅ Use Admin SDK's ref.update()
//     await questionStatsRef.update({
//       isExpired: true,
//       expiredAt: Date.now() // Use RTDB-compatible timestamp (number)
//     })
//     console.log(`Marked question ${questionId} as expired in stats (RTDB)`)
//   } catch (error) {
//     console.error(`Failed to mark question ${questionId} as expired (RTDB):`, error)
//   }
// }

// // Utility: update unique submitters count before deletion (RTDB)
// async function updateQuestionUniqueSubmitters(groupId: string, questionId: string) {
//   try {
//     // 1. Get all user stats for the question to count them
//     const userStatsCollectionPath = paths.userQuestionStatsCollection(groupId, questionId)
//     // ✅ Use Admin SDK's db.ref().once()
//     const userStatsSnapshot = await db.ref(userStatsCollectionPath).once("value")
//     const userStats = userStatsSnapshot.val() || {}
    
//     // The number of keys in the object is the count of unique submitters
//     const uniqueSubmitters = Object.keys(userStats).length 

//     // 2. Update the question stats node with the count
//     const questionStatsPath = paths.questionStats(groupId, questionId)
//     // ✅ Use Admin SDK's db.ref()
//     const questionStatsRef = db.ref(questionStatsPath)

//     // ✅ Use Admin SDK's ref.transaction()
//     await questionStatsRef.transaction((currentData) => {
//         const data = currentData || {};
//         return {
//             ...data, // Keep existing fields
//             uniqueSubmitters: uniqueSubmitters
//         };
//     });
    
//     console.log(`Updated unique submitters for question ${questionId}: ${uniqueSubmitters} (RTDB)`)
//   } catch (error) {
//     console.error(`Failed to update unique submitters for ${questionId} (RTDB):`, error)
//   }
// }

// // Main cleanup function
// async function cleanupExpiredContent() {
//   const now = Date.now()
//   console.log(`Starting cleanup at ${new Date(now).toISOString()}`)

//   // 1. Get all groups
//   const groupsSnapshot = await db.ref(paths.groups()).once("value")
//   const groups = groupsSnapshot.val() || {}
//   const groupIds = Object.keys(groups)

//   console.log(`Found ${groupIds.length} groups to process`)

//   for (const groupId of groupIds) {
//     console.log(`Processing group: ${groupId}`)

//     // 2. Get all questions for this group
//     const questionsSnapshot = await db
//       .ref(paths.groupQuestionsCollection(groupId))
//       .once("value")
//     const questions = questionsSnapshot.val() || {}

//     for (const [questionId, questionData] of Object.entries(questions)) {
//       const question = questionData as any
//       const expiresAt = question.expiresAt

//       // Check if question is expired
//       if (expiresAt && expiresAt <= now) {
//         console.log(`Question ${questionId} is expired. Cleaning up...`)

//         try {
//           // A. Update stats in RTDB before deletion
//           await updateQuestionUniqueSubmitters(groupId, questionId)
//           await markQuestionExpired(groupId, questionId) 

//           // B. Delete all solutions for this question (RTDB)
//           const solutionsPath = paths.solutionsCollection(groupId, questionId)
//           await deleteAllAtPath(solutionsPath)
//           console.log(`Deleted solutions for question ${questionId}`)
          
//           // C. Delete the user question stats collection (RTDB)
//           const userStatsCollectionPath = paths.userQuestionStatsCollection(groupId, questionId)
//           await deleteAllAtPath(userStatsCollectionPath)
//           console.log(`Deleted user stats for question ${questionId}`)

//           // D. Delete the question itself (RTDB)
//           await db.ref(paths.groupQuestionDocument(groupId, questionId)).remove()
//           console.log(`Deleted question ${questionId}`)
          
//         } catch (error) {
//           console.error(`Error cleaning up question ${questionId}:`, error)
//         }
//       }
//     }
//   }

//   // 3. Clean up global indices (Deletes everything under these paths)
//   console.log("Cleaning up global indices...")
//   await Promise.all([
//     deleteAllAtPath("solutions_global"),
//     deleteAllAtPath("indexByAuthor"),
//     deleteAllAtPath("indexByLanguage"),
//     deleteAllAtPath("indexByTag"),
//   ])

//   console.log("Cleanup completed successfully")
// }

// export const handler: Handler = async (event, context) => {
//   try {
//     console.log("=== Cleanup Function Started ===")
//     await cleanupExpiredContent()

//     return {
//       statusCode: 200,
//       body: JSON.stringify({
//         success: true,
//         message: "Cleanup completed successfully",
//         timestamp: new Date().toISOString()
//       }),
//     }
//   } catch (error) {
//     console.error("=== Cleanup Failed ===", error)
//     return {
//       statusCode: 500,
//       body: JSON.stringify({
//         success: false,
//         error: "Cleanup failed",
//         message: error instanceof Error ? error.message : String(error)
//       }),
//     }
//   }
// }
