export const paths = {
  user: (uid: string) => `users/${uid}`,
  userPublic: (uid: string) => `userPublic/${uid}`, // minimal public snapshot
  userNotifications: (uid: string) => `userNotifications/${uid}`,
  userGroups: (uid: string) => `userGroups/${uid}`, // { [groupId]: { role } }
  groups: () => `groups`,
  group: (groupId: string) => `groups/${groupId}`,
  groupMembers: (groupId: string) => `groupMembers/${groupId}`,
  groupJoinRequests: (groupId: string) => `groupJoinRequests/${groupId}`,
  groupStats: (groupId: string) => `groupStats/${groupId}`, // { [uid]: { points } }
  userStats: (uid: string) => `userStats/${uid}`, // totals across groups
  // Store group questions under a top-level collection for consistency
  groupQuestionsCollection: (groupId: string) => `groupQuestions/${groupId}`,

  // NEW path for a specific Question document.
  groupQuestionDocument: (groupId: string, questionId: string) => 
    `groupQuestions/${groupId}/${questionId}`, 

  // The solutions should now be nested under the question, or reference the questionId
  solutionsEphemeral: (groupId: string, questionId: string) => 
    `ephemeralSubmissions/${groupId}/${questionId}`,
  solutionsGlobal: () => `solutions_global`, // for discover/search if needed
  groupsDiscoverable: () => `groups`, // relies on groups[groupId].discoverable === true
  // Add this path for the permanent social data collections
  socialCollection: (collection: 'bookmarks' | 'upvotes' | 'comments', solutionId: string, userId?: string) => {
      if (collection === 'bookmarks') return `bookmarks/${userId}/${solutionId}`;
      if (collection === 'upvotes') return `upvotes/solutions/${solutionId}/${userId}`;
      if (collection === 'comments') return `comments/${solutionId}`;
      return ''; // Should not happen
  }
}
