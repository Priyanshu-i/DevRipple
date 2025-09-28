import { CreateGroupForm } from "@/components/groups/create-group-form"

export default function NewGroupPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Create Group</h1>
      <CreateGroupForm />
    </main>
  )
}
