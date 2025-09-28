"use client"

import useSWRSubscription from "swr/subscription"
import { getDatabase, onValue, ref, type DataSnapshot, type Query } from "firebase/database"

type RtdbKey = string | Query

export function useRtdbValue<T = any>(key: RtdbKey) {
  const db = getDatabase()
  const { data, error } = useSWRSubscription<T>(key ? String(key) : null, (keyStr, { next }) => {
    const r = ref(db, keyStr)
    const unsub = onValue(
      r,
      (snap: DataSnapshot) => next(null, snap.val()),
      (err) => next(err as any, undefined),
    )
    return () => unsub()
  })
  return { data, error }
}
