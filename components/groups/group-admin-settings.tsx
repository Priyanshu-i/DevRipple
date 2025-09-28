"use client"

import { useEffect, useState } from "react"
import { ref, onValue, update } from "firebase/database"
import { db } from "@/lib/firebase"
import { paths } from "@/lib/paths"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"

export function GroupAdminSettings({ groupId }: { groupId: string }) {
  const [code, setCode] = useState("")
  const [discoverable, setDiscoverable] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsub = onValue(ref(db, paths.group(groupId)), (snap) => {
      const g = snap.val() || {}
      setCode(g.code || "")
      setDiscoverable(!!g.discoverable)
    })
    return () => unsub()
  }, [db, groupId])

  const save = async () => {
    setLoading(true)
    try {
      await update(ref(db, paths.group(groupId)), { code, discoverable })
      toast({ title: "Group settings saved" })
    } catch (e: any) {
      toast({ title: "Failed to save", description: e?.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code">Group Code</Label>
        <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., ALPHA-1234" />
        <p className="text-xs text-muted-foreground">Share this code for instant joins.</p>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={discoverable} onCheckedChange={setDiscoverable} id="discoverable" />
        <Label htmlFor="discoverable">Discoverable (show in 'You can join')</Label>
      </div>
      <Button onClick={save} disabled={loading}>
        {loading ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  )
}
