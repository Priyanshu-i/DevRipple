"use client"

import { useAuth } from "@/hooks/use-auth"
import { GroupList } from "@/components/groups/group-list"
import Link from "next/link"
import useSWRSubscription from "swr/subscription"
import { db } from "@/lib/firebase"
import { onValue, ref, query, orderByChild, limitToLast } from "firebase/database"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, 
  Plus, 
  Activity, 
  Bookmark, 
  Code, 
  ExternalLink, 
  Clock, 
  TrendingUp,
  User,
  Calendar,
  Heart,
  MessageCircle,
  ChevronRight
} from "lucide-react"

export default function DashboardPage() {
  const { user, signIn } = useAuth()

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

  const { data: bookmarkedSolutions } = useSWRSubscription(
    user ? `userBookmarks/${user.uid}` : null,
    (key, { next }) => {
      if (!user) return
      const unsub = onValue(ref(db, `bookmarks/${user.uid}`), async (snap) => {
        const bookmarks = snap.val() || {}
        const solutionIds = Object.keys(bookmarks)
        
        if (solutionIds.length === 0) {
          next(null, [])
          return
        }

        // Fetch solution details for each bookmarked solution
        const solutions = []
        for (const solutionId of solutionIds) {
          // We need to find the solution across all groups
          const globalSolutionsSnap = await new Promise((resolve) => {
            onValue(ref(db, 'solutions_global'), resolve, { onlyOnce: true })
          })
          const globalSolutions = (globalSolutionsSnap as any).val() || {}
          const solution = Object.values(globalSolutions).find((s: any) => s.id === solutionId)
          if (solution) {
            solutions.push(solution)
          }
        }
        
        solutions.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))
        next(null, solutions)
      })
      return () => unsub()
    }
  )

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-6">
                <User className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to CodeShare</h1>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed max-w-md mx-auto">
                Join coding groups, share solutions, and learn from the community. Sign in with Google to get started.
              </p>
              <Button 
                onClick={signIn}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                <User className="mr-2 h-5 w-5" />
                Sign in with Google
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
                  <p className="text-gray-600">Welcome back, {user.displayName}</p>
                </div>
              </div>
            </div>
            <Button asChild className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 shadow-lg transition-all duration-200 hover:shadow-xl">
              <Link href="/groups/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8">
            {/* Your Groups Section */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Your Groups</h2>
                    <p className="text-sm text-gray-600">Manage and access your coding groups</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <GroupList />
              </CardContent>
            </Card>

            {/* Activity Tabs */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <Tabs defaultValue="recent" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="recent" className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Recent Activity
                    </TabsTrigger>
                    <TabsTrigger value="bookmarks" className="flex items-center gap-2">
                      <Bookmark className="h-4 w-4" />
                      Bookmarks ({bookmarkedSolutions?.length || 0})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="recent" className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                        <Clock className="h-4 w-4" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Recent Solutions</h3>
                    </div>
                    
                    {recent?.length ? (
                      <div className="space-y-3">
                        {recent.map((s: any) => (
                          <SolutionCard key={s.id} solution={s} type="recent" />
                        ))}
                      </div>
                    ) : (
                      <EmptyState 
                        icon={Clock}
                        title="No recent activity"
                        description="Solutions from your groups will appear here"
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="bookmarks" className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                        <Bookmark className="h-4 w-4" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Saved Solutions</h3>
                    </div>
                    
                    {bookmarkedSolutions?.length ? (
                      <div className="space-y-3">
                        {bookmarkedSolutions.map((s: any) => (
                          <SolutionCard key={s.id} solution={s} type="bookmark" />
                        ))}
                      </div>
                    ) : (
                      <EmptyState 
                        icon={Bookmark}
                        title="No bookmarks yet"
                        description="Solutions you bookmark will appear here for easy access"
                      />
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-8 space-y-6">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">Quick Stats</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Recent Solutions</span>
                    <Badge variant="secondary">{recent?.length || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Bookmarked</span>
                    <Badge variant="secondary">{bookmarkedSolutions?.length || 0}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">Quick Actions</h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href="/groups/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Group
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href="/groups">
                      <Users className="mr-2 h-4 w-4" />
                      Browse Groups
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SolutionCard({ solution, type }: { solution: any; type: 'recent' | 'bookmark' }) {
  return (
    <Card className="border border-gray-200 hover:shadow-md transition-all duration-200 hover:border-gray-300">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm font-medium">
              {solution.authorName?.charAt(0) || "A"}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{solution.authorName}</h4>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Code className="h-3 w-3" />
                <Badge variant="outline" className="text-xs">
                  {solution.language}
                </Badge>
                {type === 'bookmark' && (
                  <>
                    <span className="text-xs text-gray-400">•</span>
                    <Bookmark className="h-3 w-3 text-amber-500" />
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Heart className="h-3 w-3 text-red-500" />
              <span>{solution.upvotesCount || 0}</span>
            </div>
          </div>
        </div>

        <div className="mb-3">
          {solution.problemLink ? (
            <div className="flex items-center gap-2 text-sm">
              <ExternalLink className="h-3 w-3 text-gray-400" />
              <a 
                href={solution.problemLink} 
                target="_blank" 
                rel="noreferrer" 
                className="text-blue-600 hover:text-blue-800 hover:underline truncate"
              >
                Problem Link
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Code className="h-3 w-3" />
              <span>Custom Assignment</span>
            </div>
          )}
        </div>

        {solution.approach && (
          <div className="mb-3 p-2 bg-gray-50 rounded-md">
            <p className="text-xs text-gray-600 mb-1">Approach</p>
            <p className="text-sm text-gray-800 line-clamp-2">{solution.approach}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {solution.tc && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                TC: {solution.tc}
              </span>
            )}
            {solution.sc && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                SC: {solution.sc}
              </span>
            )}
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link href={`/groups/${solution.groupId}`}>
              View Group
              <ChevronRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: any; 
  title: string; 
  description: string 
}) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 max-w-sm mx-auto">{description}</p>
    </div>
  )
}