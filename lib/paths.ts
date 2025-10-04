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
  
  // === STATISTICS (PERSISTENT) ===
  // Group-level stats
  groupStats: (groupId: string) => `groupStats/${groupId}`,
  
  // User-level stats (global)
  userStats: (uid: string) => `userStats/${uid}`,
  
  // Group member stats (user stats within a specific group)
  groupMemberStats: (groupId: string, uid: string) => `groupStats/${groupId}/memberStats/${uid}`,
  groupMemberStatsCollection: (groupId: string) => `groupStats/${groupId}/memberStats`,
  
  // Question stats (persists after question deletion)
  questionStats: (groupId: string, questionId: string) => `groupStats/${groupId}/questionStats/${questionId}`,
  questionStatsCollection: (groupId: string) => `groupStats/${groupId}/questionStats`,
  
  // User submission stats per question (persists after solution deletion)
  userQuestionStats: (groupId: string, questionId: string, uid: string) => 
    `groupStats/${groupId}/questionStats/${questionId}/userStats/${uid}`,
  userQuestionStatsCollection: (groupId: string, questionId: string) => 
    `groupStats/${groupId}/questionStats/${questionId}/userStats`,

  // === QUESTIONS (EPHEMERAL - 24h lifetime) ===
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