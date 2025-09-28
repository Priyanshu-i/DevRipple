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
  groupQuestions: (groupId: string) => `groupQuestions/${groupId}`,
  todaysQuestionId: (groupId: string) => `groups/${groupId}/todaysQuestionId`,
  solutionsEphemeral: (groupId: string) => `ephemeralSubmissions/${groupId}`,
  solutionsGlobal: () => `solutions_global`, // for discover/search if needed
  groupsDiscoverable: () => `groups`, // relies on groups[groupId].discoverable === true
}
