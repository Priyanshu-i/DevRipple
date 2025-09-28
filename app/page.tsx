import Link from "next/link"

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <section className="mb-10">
        <h1 className="text-pretty text-3xl font-semibold">DevRipple</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Peer-to-peer coding collaboration and knowledge sharing. Join or create groups, solve daily problems, review
          code inline, and grow together.
        </p>
        <div className="mt-6">
          <Link className="rounded-md bg-primary px-4 py-2 text-primary-foreground" href="/dashboard">
            Go to Dashboard
          </Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Feature
          title="Groups & Feeds"
          desc="Structured group feeds with 'Today’s Question' to keep everyone focused."
        />
        <Feature
          title="Rich Submissions"
          desc="Code editor, approach, LaTeX for T.C./S.C., and tags for organization."
        />
        <Feature title="Reviews & Upvotes" desc="Threaded and inline comments with Markdown + LaTeX and upvotes." />
      </section>
    </main>
  )
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-md border p-4">
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}
