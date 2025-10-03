"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { ref, get } from "firebase/database"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogIn } from "lucide-react"

export default function SearchPage() {
  const { user, signIn } = useAuth()
  const [language, setLanguage] = useState("")
  const [tag, setTag] = useState("")
  const [authorUid, setAuthorUid] = useState("")
  const [ids, setIds] = useState<string[]>([])
  const [results, setResults] = useState<any[]>([])

  async function run() {
    const idSet = new Set<string>()
    const ops: Array<Promise<void>> = []

    if (language) {
      ops.push(
        get(ref(db, `indexByLanguage/${language.toLowerCase()}`)).then((snap) => {
          const v = snap.val() || {}
          Object.keys(v).forEach((k) => idSet.add(k))
        })
      )
    }
    if (tag) {
      ops.push(
        get(ref(db, `indexByTag/${tag.toLowerCase()}`)).then((snap) => {
          const v = snap.val() || {}
          Object.keys(v).forEach((k) => idSet.add(k))
        })
      )
    }
    if (authorUid) {
      ops.push(
        get(ref(db, `indexByAuthor/${authorUid}`)).then((snap) => {
          const v = snap.val() || {}
          Object.keys(v).forEach((k) => idSet.add(k))
        })
      )
    }

    await Promise.all(ops)
    setIds(Array.from(idSet))
  }

  useEffect(() => {
    if (!ids.length) {
      setResults([])
      return
    }

    const fetchResults = async () => {
      const ops = ids.map((id) =>
        get(ref(db, `solutions_global/${id}`)).then((snap) => snap.val())
      )
      const all = await Promise.all(ops)
      setResults(all.filter(Boolean))
    }

    fetchResults()
  }, [ids])

  return (
    <>
      {!user ? (
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
        <main className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="mb-4 text-2xl font-semibold">Search</h1>
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Language (e.g., cpp)" value={language} onChange={(e) => setLanguage(e.target.value)} />
            <Input placeholder="Tag (e.g., greedy)" value={tag} onChange={(e) => setTag(e.target.value)} />
            <Input placeholder="Author UID" value={authorUid} onChange={(e) => setAuthorUid(e.target.value)} />
          </div>
          <div className="mt-3">
            <Button onClick={run}>Search</Button>
          </div>
          <div className="mt-6 space-y-2">
            {results.length ? (
              results.map((s: any) => (
                <div key={s.id} className="rounded-md border p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="font-medium">{s.authorName}</div>
                    <div className="text-xs text-muted-foreground">{s.language}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{s.tags?.join(", ")}</div>
                  <div className="mt-2">
                    <Link className="text-sm underline" href={`/groups/${s.groupId}`}>
                      View in group
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No results.</div>
            )}
          </div>
        </main>
      )}
    </>
  )
}