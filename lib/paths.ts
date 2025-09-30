// Canonical RTDB schema for groups, questions, and 24h-ephemeral solutions
//
// Root nodes:
// - groups/{groupId}
// - groupQuestions/{groupId}/{questionId}
// - ephemeralSubmissions/{groupId}/{questionId}/{solutionId}
//   - comments/{commentId}            <-- Nested under solutionId
//   - upvotes/{userId}: true          <-- Nested under solutionId
//   - bookmarkedBy/{userId}: true     <-- Nested under solutionId
// - groupStats/{groupId}/{uid}
// - userStats/{uid}

export const paths = {
  // Users and groups
  user: (uid: string) => `users/${uid}`,
  userPublic: (uid: string) => `userPublic/${uid}`,
  userNotifications: (uid: string) => `userNotifications/${uid}`,
  userGroups: (uid: string) => `userGroups/${uid}`,
  groups: () => `groups`,
  group: (groupId: string) => `groups/${groupId}`,
  groupMembers: (groupId: string) => `groupMembers/${groupId}`,
  groupJoinRequests: (groupId: string) => `groupJoinRequests/${groupId}`,
  groupStats: (groupId: string) => `groupStats/${groupId}`,
  userStats: (uid: string) => `userStats/${uid}`,

  // Questions (24h lifetime handled via createdAt/expiresAt fields)
  groupQuestionsCollection: (groupId: string) => `groupQuestions/${groupId}`,
  groupQuestionDocument: (groupId: string, questionId: string) => `groupQuestions/${groupId}/${questionId}`,

  // === SOLUTIONS (EPHEMERAL) ===

  /** The collection of all solutions for a specific group and question. */
  solutionsCollection: (groupId: string, questionId: string) => 
    `ephemeralSubmissions/${groupId}/${questionId}`,

  /** The document path for a specific solution. */
  solutionDocument: (groupId: string, questionId: string, solutionId: string) =>
    `ephemeralSubmissions/${groupId}/${questionId}/${solutionId}`,

  /** The collection of all comments for a specific solution. */
  solutionComments: (groupId: string, questionId: string, solutionId: string) =>
    `${paths.solutionDocument(groupId, questionId, solutionId)}/comments`,
  
  /** The upvotes collection path, optionally for a specific user. */
  solutionUpvotes: (groupId: string, questionId: string, solutionId: string, userId?: string) =>
    userId
      ? `${paths.solutionDocument(groupId, questionId, solutionId)}/upvotes/${userId}`
      : `${paths.solutionDocument(groupId, questionId, solutionId)}/upvotes`,

  /** The bookmarks collection path, optionally for a specific user. */
  solutionBookmarks: (groupId: string, questionId: string, solutionId: string, userId?: string) =>
    userId
      ? `${paths.solutionDocument(groupId, questionId, solutionId)}/bookmarkedBy/${userId}`
      : `${paths.solutionDocument(groupId, questionId, solutionId)}/bookmarkedBy`,
}