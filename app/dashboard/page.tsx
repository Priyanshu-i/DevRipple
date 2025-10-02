"use client"

import { useAuth } from "@/hooks/use-auth"
import { GroupList, GroupCard } from "@/components/groups/group-list"
import Link from "next/link"
import useSWRSubscription from "swr/subscription"
import { db } from "@/lib/firebase"
import { onValue, ref, query, orderByChild, limitToLast } from "firebase/database"
import { JoinByCode } from "@/components/groups/join-by-code"
import { useState, useMemo } from "react"
import { BasicModal } from "@/components/modals/basic-modal"

// shadcn/ui components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// Lucide React icons
import { LogIn, Users, PlusCircle, Code, Clock, ChevronDown, ChevronUp } from "lucide-react"

export default function DashboardPage() {
  const { user, signIn } = useAuth()
  const [joinOpen, setJoinOpen] = useState(false)
  const [isYourGroupsOpen, setIsYourGroupsOpen] = useState(true)
  const [isDiscoverGroupsOpen, setIsDiscoverGroupsOpen] = useState(true)

  const { data: recent } = useSWRSubscription(user ? "recentSolutions" : null, (key, { next }) => {
    if (!user) return
    const q = query(ref(db, `solutions_global`), orderByChild("createdAt"), limitToLast(10))
    const unsub = onValue(q, (snap) => {
      const val = snap.val() || {}
      const arr = Object.values(val) as any[]
      arr.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).reverse()
      next(null, arr)
    })
    return () => unsub()
  })

  const { data: myGroups } = useSWRSubscription(user ? `userGroups/${user.uid}` : null, (key, { next }) => {
    if (!user) return
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() || {}))
    return () => unsub()
  })

  const { data: allGroups } = useSWRSubscription(user ? `groups` : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() || {}))
    return () => unsub()
  })

  // Helper component for section headers with a collapsible trigger
  const CollapsibleSectionHeader = ({ title, icon: Icon, isOpen, setIsOpen }: 
    { title: string, icon: React.ElementType, isOpen: boolean, setIsOpen: (open: boolean) => void }) => {
      const ToggleIcon = isOpen ? ChevronUp : ChevronDown;
      return (
        <CollapsibleTrigger asChild>
          <div 
            className="flex items-center justify-between cursor-pointer w-full p-2 rounded-md hover:bg-accent transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5 text-primary shrink-0" />
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight">{title}</h2>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0">
              <ToggleIcon className="w-4 h-4" />
            </Button>
          </div>
        </CollapsibleTrigger>
      )
  }

  // --- Filter Logic for Discoverable Groups ---
  // Using useMemo to prevent unnecessary recalculations
  const discoverableGroups = useMemo(() => {
    if (!allGroups) {
      return []
    }
    
    // Create a Set of group IDs the user is a member of for fast lookup
    const myGroupIds = new Set(
      Array.isArray(myGroups) 
        ? myGroups.map(g => g.id)
        : myGroups 
          ? Object.keys(myGroups)
          : []
    )
    
    const filtered = Object.keys(allGroups)
      .filter((gid) => {
        const group = allGroups[gid]
        if (!group) return false
        
        // Must be discoverable
        const isDiscoverable = group.discoverable === true
        
        // User must NOT be a member (check if gid exists in myGroupIds Set)
        const isMember = myGroupIds.has(gid)
        const isNotMember = !isMember
        
        return isDiscoverable && isNotMember
      })
      .map((gid) => ({ id: gid, ...allGroups[gid] }))
    
    return filtered
  }, [allGroups, myGroups])

  return (
    <main className="w-full min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Header and Call-to-Action */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          {/* Only show Create Group button if user is signed in */}
          {user && (
            <Button asChild className="w-full sm:w-auto">
              <Link href="/groups/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Group
              </Link>
            </Button>
          )}
        </div>

        <Separator className="mb-6 sm:mb-8" />

        {!user ? (
          /* Sign-in Card for Unauthenticated User */
          <Card className="shadow-lg max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5 shrink-0" />
                <span>Welcome Back!</span>
              </CardTitle>
              <CardDescription>
                Sign in with Google to access your groups and view activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={signIn} size="lg" className="w-full sm:w-auto">
                Sign in with Google
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Authenticated Dashboard Layout */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Left Column (Groups) - Takes 2/3 space on large screens */}
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              
              {/* Your Groups Section (Collapsible) */}
              <section>
                <Collapsible open={isYourGroupsOpen} onOpenChange={setIsYourGroupsOpen}>
                  <CollapsibleSectionHeader 
                    title="Your Groups" 
                    icon={Users} 
                    isOpen={isYourGroupsOpen} 
                    setIsOpen={setIsYourGroupsOpen} 
                  />
                  <CollapsibleContent>
                    <Card className="mt-2">
                      <CardContent className="pt-4 sm:pt-6">
                        <GroupList />
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              </section>

              {/* Join a Group & Discoverable Groups */}
              <section className="space-y-4 sm:space-y-6">
                {/* Join with Code Card/Action */}
                <Card className="p-4 border-primary/20 bg-primary/5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Code className="w-5 h-5 text-primary shrink-0" />
                        <span>Join with a Code</span>
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Enter the secret code shared by a group administrator.
                      </CardDescription>
                    </div>
                    <Button onClick={() => setJoinOpen(true)} className="w-full sm:w-auto shrink-0">
                      Enter Code
                    </Button>
                  </div>
                </Card>

                {/* Discoverable Groups Section */}
                <Collapsible open={isDiscoverGroupsOpen} onOpenChange={setIsDiscoverGroupsOpen}>
                  <CollapsibleSectionHeader 
                    title="Discoverable Groups" 
                    icon={PlusCircle} 
                    isOpen={isDiscoverGroupsOpen} 
                    setIsOpen={setIsDiscoverGroupsOpen} 
                  />
                  <CollapsibleContent>
                    <Card className="mt-2">
                      <CardHeader className="pb-4">
                        <CardDescription className="text-sm">
                          Public groups you can join now. Groups you already belong to are hidden.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {discoverableGroups.length > 0 ? (
                            discoverableGroups.map((g: any) => (
                              <GroupCard
                                key={g.id}
                                groupId={g.id}
                                name={g.name}
                                description={g.description}
                                isMember={false}
                                isAdmin={g.adminUid === user.uid}
                                discoverable={!!g.discoverable}
                                adminUid={g.adminUid}
                              />
                            ))
                          ) : (
                            <div className="text-sm text-muted-foreground col-span-full py-8 text-center">
                              No new public groups available right now.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              </section>
            </div>

            {/* Right Column (Recent Activity) - Takes 1/3 space on large screens */}
            <div className="lg:col-span-1">
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-primary shrink-0" />
                  <h2 className="text-lg sm:text-xl font-semibold tracking-tight">Recent Activity</h2>
                </div>
                <Card className="h-[400px] sm:h-[500px] flex flex-col">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-sm">
                      Recently submitted solutions across all groups.
                    </CardDescription>
                  </CardHeader>
                  <ScrollArea className="flex-1 px-4 pb-4">
                    <div className="space-y-3 pr-4">
                      {recent?.length ? (
                        recent.map((s: any) => (
                          <div key={s.id} className="rounded-lg border p-3 text-sm transition-all hover:bg-muted/50">
                            <div className="flex items-start justify-between gap-2">
                              {/* Author Name/Link */}
                              {s.authorId ? (
                                <Link 
                                  href={`/contact/${s.authorId}`}
                                  className="font-semibold hover:text-primary transition-colors line-clamp-1 min-w-0"
                                >
                                  {s.authorName}
                                </Link>
                              ) : (
                                <div className="font-medium line-clamp-1 min-w-0">{s.authorName}</div>
                              )}
                              <div className="text-xs text-muted-foreground shrink-0">{s.language}</div>
                            </div>
                            
                            {/* Problem/Assignment */}
                            <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {s.problemLink || "Custom assignment"}
                            </div>

                            {/* View Link */}
                            <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                              <Link 
                                className="text-xs text-primary hover:underline font-medium" 
                                href={`/groups/${s.groupId}`}
                              >
                                View Solution
                              </Link>
                              <div className="text-xs text-muted-foreground">
                                in <span className="font-medium">{s.groupName || 'Unknown'}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground p-4 text-center">
                          No recent activity yet.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              </section>
            </div>
          </div>
        )}

        {/* Join Group Modal */}
        <BasicModal
          open={joinOpen}
          onOpenChange={setJoinOpen}
          title="Join with Group Code"
          description="Enter the code shared by the group admin."
        >
          <JoinByCode />
        </BasicModal>
      </div>
    </main>
  )
}