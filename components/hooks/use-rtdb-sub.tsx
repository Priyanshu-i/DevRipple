"use client"

import useSWR from "swr"
import { onValue, ref, off, type DatabaseReference } from "firebase/database"
import { db } from "../../lib/firebase"

type Options<T> = {
  parse?: (val: any) => T
}

export function useRtdbSub<T = any>(path: string | null, opts?: Options<T>) {
  const key = path ? `rtdb:${path}` : null

  const { data, error, isLoading, mutate } = useSWR<T>(key, () => {
    return new Promise<T>((resolve, reject) => {
      if (!path) return resolve(undefined as unknown as T)
      const r = ref(db, path)
      const handler = (snap: any) => {
        const val = snap.val()
        resolve(opts?.parse ? opts.parse(val) : (val as T))
      }
      const errHandler = (err: any) => reject(err)
      onValue(r, handler, errHandler, { onlyOnce: true })
    })
  })

  // live updates
  // NOTE: separate live subscription so SWR can revalidate on change
  // Consumers can call mutate() to refresh if needed.
  if (key && typeof window !== "undefined") {
    const r: DatabaseReference = ref(db, path!)
    const handler = (snap: any) => {
      const val = snap.val()
      mutate(opts?.parse ? opts.parse(val) : (val as T), { revalidate: false })
    }
    onValue(r, handler)
    // cleanup
    addEventListener("beforeunload", () => off(r, "value", handler))
  }

  return { data, error, isLoading, mutate }
}
