// Canonical RTDB schema for groups, questions, and 24h-ephemeral solutions
//
// Root nodes:
// - groups/{groupId}
// - groupQuestions/{groupId}/{questionId}
// - ephemeralSubmissions/{groupId}/{questionId}/{solutionId}
//     - comments/{commentId}
//     - upvotes/{userId}: true
//     - bookmarkedBy/{userId}: true
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

  // Solutions (ephemeral, nested by group and question)
  solutionsEphemeral: (groupId: string, questionId: string) => `ephemeralSubmissions/${groupId}/${questionId}`,
  solutionEphemeralDoc: (groupId: string, questionId: string, solutionId: string) =>
    `ephemeralSubmissions/${groupId}/${questionId}/${solutionId}`,
  solutionEphemeralComments: (groupId: string, questionId: string, solutionId: string) =>
    `ephemeralSubmissions/${groupId}/${questionId}/${solutionId}/comments`,
  solutionEphemeralUpvotes: (groupId: string, questionId: string, solutionId: string, userId?: string) =>
    userId
      ? `ephemeralSubmissions/${groupId}/${questionId}/${solutionId}/upvotes/${userId}`
      : `ephemeralSubmissions/${groupId}/${questionId}/${solutionId}/upvotes`,
  solutionEphemeralBookmarks: (groupId: string, questionId: string, solutionId: string, userId?: string) =>
    userId
      ? `ephemeralSubmissions/${groupId}/${questionId}/${solutionId}/bookmarkedBy/${userId}`
      : `ephemeralSubmissions/${groupId}/${questionId}/${solutionId}/bookmarkedBy`,
}
