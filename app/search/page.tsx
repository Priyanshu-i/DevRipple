"use client"

import { useState } from "react"
import { db } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"
import useSWRSubscription from "swr/subscription"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function SearchPage() {
  const [language, setLanguage] = useState("")
  const [tag, setTag] = useState("")
  const [authorUid, setAuthorUid] = useState("")
  const [ids, setIds] = useState<string[]>([])

  function run() {
    const idSet = new Set<string>()
    const ops: Array<Promise<void>> = []
    if (language) {
      ops.push(
        new Promise((resolve) => {
          onValue(
            ref(db, `indexByLanguage/${language.toLowerCase()}`),
            (snap) => {
              const v = snap.val() || {}
              Object.keys(v).forEach((k) => idSet.add(k))
              resolve()
            },
            { onlyOnce: true },
          )
        }),
      )
    }
    if (tag) {
      ops.push(
        new Promise((resolve) => {
          onValue(
            ref(db, `indexByTag/${tag.toLowerCase()}`),
            (snap) => {
              const v = snap.val() || {}
              Object.keys(v).forEach((k) => idSet.add(k))
              resolve()
            },
            { onlyOnce: true },
          )
        }),
      )
    }
    if (authorUid) {
      ops.push(
        new Promise((resolve) => {
          onValue(
            ref(db, `indexByAuthor/${authorUid}`),
            (snap) => {
              const v = snap.val() || {}
              Object.keys(v).forEach((k) => idSet.add(k))
              resolve()
            },
            { onlyOnce: true },
          )
        }),
      )
    }
    Promise.all(ops).then(() => setIds(Array.from(idSet)))
  }

  const { data: results } = useSWRSubscription(
    ids.length ? `solutions_lookup/${ids.join(",")}` : null,
    (key, { next }) => {
      const collected: any[] = []
      let remaining = ids.length
      ids.forEach((id) => {
        onValue(
          ref(db, `solutions_global/${id}`),
          (snap) => {
            const v = snap.val()
            if (v) collected.push(v)
            remaining -= 1
            if (remaining === 0) next(null, collected)
          },
          { onlyOnce: true },
        )
      })
      return () => {}
    },
  )

  return (
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
        {results?.length ? (
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
  )
}
