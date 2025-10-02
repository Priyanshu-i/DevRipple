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
import { formatDistanceToNowStrict } from 'date-fns' // Assuming you have date-fns installed for better time formatting

// shadcn/ui components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge" // Added Badge for a modern look

// Lucide React icons
import { LogIn, Users, PlusCircle, Code, Clock, ChevronDown, ChevronUp, Zap, Swords } from "lucide-react" // Added Zap and Swords

export default function DashboardPage() {
  const { user, signIn } = useAuth()
  const [joinOpen, setJoinOpen] = useState(false)
  const [isYourGroupsOpen, setIsYourGroupsOpen] = useState(true)
  const [isDiscoverGroupsOpen, setIsDiscoverGroupsOpen] = useState(false)

  // Data fetching logic remains the same
  const { data: recent } = useSWRSubscription(user ? "recentSolutions" : null, (key, { next }) => {
    if (!user) return
    const q = query(ref(db, `solutions_global`), orderByChild("createdAt"), limitToLast(10))
    const unsub = onValue(q, (snap) => {
      const val = snap.val() || {}
      const arr = Object.values(val) as any[]
      // Note: Firebase `orderByChild` is ascending. We reverse here.
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

  // Filter Logic for Discoverable Groups (remains the same and is fine)
  const discoverableGroups = useMemo(() => {
    if (!allGroups) {
      return []
    }
    
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
        const isDiscoverable = group.discoverable === true
        const isMember = myGroupIds.has(gid)
        const isNotMember = !isMember
        return isDiscoverable && isNotMember
      })
      .map((gid) => ({ id: gid, ...allGroups[gid] }))
    
    return filtered
  }, [allGroups, myGroups])

  // --- Styled Helper Component for Section Headers ---
  const CollapsibleSectionHeader = ({ title, icon: Icon, isOpen, setIsOpen }: 
    { title: string, icon: React.ElementType, isOpen: boolean, setIsOpen: (open: boolean) => void }) => {
      const ToggleIcon = isOpen ? ChevronUp : ChevronDown;
      return (
        <CollapsibleTrigger asChild>
          <div 
            className="flex items-center justify-between cursor-pointer w-full p-3 -m-3 rounded-lg hover:bg-muted/40 transition-colors" // Added negative margin for full-width click area
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 text-primary shrink-0" />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
              <ToggleIcon className="w-4 h-4" />
            </Button>
          </div>
        </CollapsibleTrigger>
      )
  }

  return (
    <main className="w-full min-h-screen bg-background">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-14">
        
        {/* === Header and Call-to-Action === */}
        <header className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Hello, {user?.displayName ? <span className="text-primary">{user.displayName.split(' ')[0]}</span> : "Coder"}!
          </h1>
          {/* Only show Create Group button if user is signed in */}
          {user && (
            <div className="flex gap-3 w-full sm:w-auto">
                <Button 
                    onClick={() => setJoinOpen(true)} 
                    variant="outline" 
                    className="w-1/2 sm:w-auto"
                >
                    <Code className="mr-2 h-4 w-4" />
                    Join Group
                </Button>
                <Button asChild className="w-1/2 sm:w-auto">
                    <Link href="/groups/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Group
                    </Link>
                </Button>
            </div>
          )}
        </header>

        <Separator className="mb-8 sm:mb-10" />

        {!user ? (
          /* Sign-in Card for Unauthenticated User */
          <Card className="shadow-2xl border-2 border-primary/20 max-w-xl mx-auto my-12">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-2 text-primary">
                <LogIn className="h-6 w-6 shrink-0" />
                <span>Get Started</span>
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Sign in to manage your groups, track progress, and view global activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={signIn} size="lg" className="w-full text-lg font-semibold h-12">
                Sign in with Google
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* === Authenticated Dashboard Layout: Three-Column Grid === */
          // Layout uses a modern feel: Action sidebar, Main Content, Activity sidebar
          <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-10 gap-6 sm:gap-8">
            
            {/* 1. Left Action Column (1/4 or 2/10) */}
            <div className="lg:col-span-1 xl:col-span-2 space-y-6 hidden lg:block">
                <Card className="p-4 shadow-xl border border-border/50 sticky top-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        Quick Actions
                    </h3>
                    <div className="space-y-3">
                        <Button asChild variant="ghost" className="w-full justify-start h-10">
                            <Link href="/groups/new">
                                <PlusCircle className="mr-3 h-4 w-4" />
                                Create New Group
                            </Link>
                        </Button>
                        <Button variant="ghost" className="w-full justify-start h-10" onClick={() => setJoinOpen(true)}>
                            <Code className="mr-3 h-4 w-4" />
                            Join with Code
                        </Button>
                        <Separator className="my-4" />
                        <Button asChild variant="ghost" className="w-full justify-start h-10">
                            <Link href="/profile">
                                <Users className="mr-3 h-4 w-4" />
                                Manage Profile
                            </Link>
                        </Button>
                    </div>
                </Card>
            </div>


            {/* 2. Middle Column (Groups) - Takes 2/4 or 5/10 space on large screens */}
            <div className="lg:col-span-2 xl:col-span-5 space-y-8">
              
              {/* Your Groups Section (Collapsible & High-Priority) */}
{/* Your Groups Section (Collapsible & High-Priority) */}
<section>
  <Collapsible open={isYourGroupsOpen} onOpenChange={setIsYourGroupsOpen}>
    <CollapsibleSectionHeader 
      title="Your Groups" 
      icon={Users} 
      isOpen={isYourGroupsOpen} 
      setIsOpen={setIsYourGroupsOpen} 
    />
    <CollapsibleContent>
      <Card className="mt-4 p-0 shadow-lg border-2 border-primary/10 h-[400px] lg:h-[600px] flex flex-col">
        {/* Scrollable area for groups */}
        <ScrollArea className="flex-1 px-4 pb-4 overflow-y-auto">
          <CardContent className="pt-4 sm:pt-6">
            {/* GroupList should use a responsive grid internally if possible */}
            <GroupList /> 
          </CardContent>
        </ScrollArea>
      </Card>

      {/* Fallback for empty state on Your Groups */}
      {Array.isArray(myGroups) && myGroups.length === 0 && (
        <Card className="mt-4 p-6 text-center shadow-lg">
          <CardTitle className="text-lg">No Groups Yet!</CardTitle>
          <CardDescription className="mt-2">
            Start by creating a new group or joining one with a code.
          </CardDescription>
          <Button asChild className="mt-4">
            <Link href="/groups/new">Create First Group</Link>
          </Button>
        </Card>
      )}
    </CollapsibleContent>
  </Collapsible>
</section>


              {/* Discoverable Groups Section (Collapsible & Secondary Priority) */}
              <section>
  <Collapsible open={isDiscoverGroupsOpen} onOpenChange={setIsDiscoverGroupsOpen}>
    <CollapsibleSectionHeader 
      title="Discover New Groups" 
      icon={Swords} // Changed to Swords (or something competition related)
      isOpen={isDiscoverGroupsOpen} 
      setIsOpen={setIsDiscoverGroupsOpen} 
    />
    <CollapsibleContent>
      <Card className="mt-4 shadow-lg h-[450px] lg:h-[650px] flex flex-col">
        <CardHeader className="pb-4">
          <CardDescription className="text-sm">
            Public groups accepting new members. Join a challenge or a learning community!
          </CardDescription>
        </CardHeader>

        {/* Scrollable area */}
        <ScrollArea className="flex-1 px-4 pb-4 overflow-y-auto">
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
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
                <div className="text-sm text-muted-foreground col-span-full py-8 text-center border border-dashed rounded-lg">
                  No public groups to discover right now. Check back later!
                </div>
              )}
            </div>
          </CardContent>
        </ScrollArea>
      </Card>
    </CollapsibleContent>
  </Collapsible>
</section>

            </div>

            {/* 3. Right Activity Column (1/4 or 3/10) */}
            <div className="lg:col-span-1 xl:col-span-3">
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5 text-primary shrink-0" />
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">Global Activity</h2>
                </div>
                {/* Fixed height to force scrolling and prevent a "big block" in worst case data */}
                <Card className="h-[450px] lg:h-[700px] flex flex-col shadow-xl border-primary/20"> 
                  <CardHeader className="pb-3">
                    <CardDescription className="text-sm">
                      Latest solutions submitted across all groups.
                    </CardDescription>
                  </CardHeader>
                  {/* ScrollArea handles overflow gracefully */}
                  <ScrollArea className="flex-1 px-4 pb-4 overflow-y-auto"> 
                    <div className="space-y-3 pr-2">
                      {recent?.length ? (
                        recent.map((s: any) => (
                          <Link href={`/groups/${s.groupId}`} key={s.id} className="block">
                            <div className="rounded-lg border p-3 text-sm transition-all hover:bg-accent/70 hover:shadow-md cursor-pointer">
                              <div className="flex items-start justify-between gap-2">
                                {/* Author Name/Link */}
                                <div className="font-semibold line-clamp-1 min-w-0 flex-1">
                                    {s.authorName}
                                </div>
                                {/* Time/Language */}
                                <Badge 
                                    variant="secondary" 
                                    className="text-xs font-normal bg-primary/10 text-primary shrink-0"
                                >
                                    {s.language}
                                </Badge>
                              </div>
                              
                              {/* Problem/Assignment */}
                              <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                {s.problemLink || "Custom Assignment"}
                              </div>

                              {/* View Link & Group Name */}
                              <div className="mt-2 flex justify-between items-center text-xs">
                                <span className="text-primary font-medium hover:underline">
                                    View Submission
                                </span>
                                <div className="text-muted-foreground">
                                    {s.createdAt ? formatDistanceToNowStrict(s.createdAt, { addSuffix: true }) : 'just now'}
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground p-8 text-center">
                          No recent activity yet. Be the first to submit a solution!
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              </section>
            </div>
          </div>
        )}

        {/* Join Group Modal (remains the same) */}
        <BasicModal
          open={joinOpen}
          onOpenChange={setJoinOpen}
          title="Join with Group Code"
          description="Enter the code shared by the group admin to become a member."
        >
          <JoinByCode />
        </BasicModal>
      </div>
    </main>
  )
}