"use client"

import Link from "next/link"
import { auth, db } from "@/lib/firebase"
import { update, ref } from "firebase/database"
import { paths } from "@/lib/paths"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

type LegacyProps = {
  id: string
  name: string
  description?: string
}

type RichProps = {
  groupId: string
  name: string
  description?: string
  isMember?: boolean
  isAdmin?: boolean
  discoverable?: boolean
  adminUid?: string
}

type Props = LegacyProps | RichProps

export function GroupCard(props: Props) {
  // normalize props
  const groupId = "groupId" in props ? props.groupId : props.id
  const name = props.name
  const description = props.description
  const isMember = "isMember" in props ? !!props.isMember : true
  const isAdmin = "isAdmin" in props ? !!props.isAdmin : false
  const discoverable = "discoverable" in props ? !!props.discoverable : false
  const adminUid = "adminUid" in props ? props.adminUid : undefined

  const requestToJoin = async () => {
    const user = auth.currentUser
    if (!user) {
      toast({ title: "Please sign in to request joining" })
      return
    }
    const reqId = `${user.uid}-${Date.now()}`
    const joinReqPath = `${paths.groupJoinRequests(groupId)}/${reqId}`
    const notifPath = adminUid ? `${paths.userNotifications(adminUid)}/${reqId}` : undefined
    const payload: any = {
      [joinReqPath]: { uid: user.uid, createdAt: Date.now(), status: "pending" },
    }
    if (notifPath) {
      payload[notifPath] = {
        type: "join_request",
        groupId,
        fromUid: user.uid,
        createdAt: Date.now(),
        status: "pending",
      }
    }
    try {
      await update(ref(db), payload)
      toast({ title: "Request sent" })
    } catch (e: any) {
      toast({ title: "Failed to send request", description: e?.message })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-pretty">{name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
      <CardFooter className="flex items-center gap-2">
        {isMember ? (
          <>
            <Link href={`/groups/${groupId}`}>
              <Button variant="default">Open</Button>
            </Link>
            {isAdmin && (
              <Link href={`/groups/${groupId}/info`}>
                <Button variant="secondary">Info</Button>
              </Link>
            )}
          </>
        ) : discoverable ? (
          <Button onClick={requestToJoin}>Request to Join</Button>
        ) : (
          <span className="text-sm text-muted-foreground">Private group</span>
        )}
      </CardFooter>
    </Card>
  )
}
