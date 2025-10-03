export const paths = {
  // Users and groups
  user: (uid: string) => `users/${uid}`,
  userPublic: (uid: string) => `userPublic/${uid}`,
  userNotifications: (uid: string) => `userNotifications/${uid}`,
  userGroups: (uid: string) => `userGroups/${uid}`,
  groups: () => `groups`,
  group: (groupId: string) => `groups/${groupId}`,
  groupMembers: (groupId: string) => `groupMembers/${groupId}`,
  groupMember: (groupId: string, uid: string) => `groupMembers/${groupId}/${uid}`,
  groupSecondaryAdmins: (groupId: string) => `groupSecondaryAdmins/${groupId}`,
  groupSecondaryAdmin: (groupId: string, uid: string) => `groupSecondaryAdmins/${groupId}/${uid}`,
  groupJoinRequests: (groupId: string) => `groupJoinRequests/${groupId}`,
  groupStats: (groupId: string) => `groupStats/${groupId}`,
  userStats: (uid: string) => `userStats/${uid}`,

  // Questions (24h lifetime handled via createdAt/expiresAt fields)
  groupQuestionsCollection: (groupId: string) => `groupQuestions/${groupId}`,
  groupQuestionDocument: (groupId: string, questionId: string) => `groupQuestions/${groupId}/${questionId}`,

  // === SOLUTIONS (EPHEMERAL) ===

  solutionsCollection: (groupId: string, questionId: string) => 
    `ephemeralSubmissions/${groupId}/${questionId}`,

  solutionDocument: (groupId: string, questionId: string, solutionId: string) =>
    `ephemeralSubmissions/${groupId}/${questionId}/${solutionId}`,

  solutionComments: (groupId: string, questionId: string, solutionId: string) =>
    `${paths.solutionDocument(groupId, questionId, solutionId)}/comments`,
  
  solutionUpvotes: (groupId: string, questionId: string, solutionId: string, userId?: string) =>
    userId
      ? `${paths.solutionDocument(groupId, questionId, solutionId)}/upvotes/${userId}`
      : `${paths.solutionDocument(groupId, questionId, solutionId)}/upvotes`,
}