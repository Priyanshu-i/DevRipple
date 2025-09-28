"use client"

import type React from "react"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { onAuthStateChanged, type User, signInWithPopup, signOut } from "firebase/auth"
import { auth, googleProvider, db } from "@/lib/firebase"
import { ref, serverTimestamp, update } from "firebase/database"

type AuthContextValue = {
  user: User | null
  loading: boolean
  signIn: () => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOutUser: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setLoading(false)
      if (u) {
        // Create/update profile node
        const userRef = ref(db, `users/${u.uid}`)
        await update(userRef, {
          uid: u.uid,
          displayName: u.displayName ?? "",
          photoURL: u.photoURL ?? "",
          email: u.email ?? "",
          updatedAt: serverTimestamp(),
        })
      }
    })
    return () => unsub()
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn: async () => {
        await signInWithPopup(auth, googleProvider)
      },
      signOutUser: async () => {
        await signOut(auth)
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
