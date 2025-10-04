"use client"

import { useParams, useRouter } from "next/navigation"
import useSWRSubscription from "swr/subscription"
import { db } from "@/lib/firebase"
import { onValue, ref } from "firebase/database"
import { SubmitForm } from "@/components/solution/submit-form"
import { paths } from "@/lib/paths"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// Define interfaces for type safety
interface Group {
  name: string
  // ... other group properties
}

interface Question {
  title: string
  link?: string
  prompt?: string
  points?: number
  difficulty?: 'Easy' | 'Medium' | 'Hard' | string
  // ... other question properties
}

export default function SubmitSolutionPage() {
  const params = useParams<{ groupId: string; questionId: string }>()
  const { groupId, questionId } = params
  const router = useRouter()

  if (!groupId || !questionId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-700 dark:text-red-400">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 dark:text-red-300">
              Invalid group or question ID in URL. Navigation might be missing parameters.
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  // Fetch Group Details
  const { data: group } = useSWRSubscription(
    groupId ? paths.group(groupId) : null, 
    (key, { next }) => {
      // The snap.val() is explicitly typed to Group for better type inference
      const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() as Group | null))
      return () => unsub()
    }
  )

  // Fetch Question Details
  const { data: question } = useSWRSubscription(
    groupId && questionId ? paths.groupQuestionDocument(groupId, questionId) : null,
    (key, { next }) => {
      // The snap.val() is explicitly typed to Question for better type inference
      const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() as Question | null))
      return () => unsub()
    }
  )

  // Redirect handler after successful submission
  const handleSuccess = () => {
    // Navigate back to the question viewing page
    router.push(`/groups/${groupId}/${questionId}`)
  }

  const handleBackClick = () => {
    // Navigate back to the question viewing page
    router.push(`/groups/${groupId}/${questionId}`)
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Go Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground"
        onClick={handleBackClick}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Question
      </Button>

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Submit Solution</h1>
        <p className="text-sm text-muted-foreground">
          Group: <span className="font-semibold">{group?.name ?? groupId}</span>
        </p>
      </div>

      {/* Question Preview Card */}
      {question ? (
        <Card className="mb-6 border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="text-xl flex items-center justify-between">
              <span>{question.title}</span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-normal">
                {question.difficulty && (
                  <span className={`
                    ${question.difficulty === 'Easy' ? 'text-green-600 dark:text-green-400' : ''}
                    ${question.difficulty === 'Medium' ? 'text-yellow-600 dark:text-yellow-400' : ''}
                    ${question.difficulty === 'Hard' ? 'text-red-600 dark:text-red-400' : ''}
                  `}>
                    {question.difficulty}
                  </span>
                )}
                {question.points && <span>• {question.points} pts</span>}
              </div>
            </CardTitle>
            {question.link && (
              <CardDescription>
                <a 
                  href={question.link} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View Problem →
                </a>
              </CardDescription>
            )}
          </CardHeader>
          {question.prompt && (
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {question.prompt}
                </ReactMarkdown>
              </div>
            </CardContent>
          )}
        </Card>
      ) : (
        <Card className="mb-6">
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground text-center">
              Loading question details...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Your Solution</CardTitle>
          <CardDescription>
            Fill in all required fields to submit your solution. Your submission will be visible to group members for 24 hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Ensure SubmitForm is correctly imported and receives the necessary props */}
          <SubmitForm 
            groupId={groupId} 
            questionId={questionId} 
            onSuccess={handleSuccess}
          />
        </CardContent>
      </Card>

      {/* Submission Guidelines */}
      <Card className="mt-6 bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Submission Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Ensure your code is well-formatted and properly indented</li>
            <li>Explain your approach clearly with step-by-step reasoning</li>
            <li>Use LaTeX notation for complexities (e.g., O(n), O(n log n))</li>
            <li>Add relevant tags to help others find similar solutions</li>
            <li>Your submission will be visible for 24 hours before expiring</li>
            <li>Statistics and leaderboard data will be preserved after expiration</li>
          </ul>
        </CardContent>
      </Card>
    </main>
  )
}