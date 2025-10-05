import React from "react";
// Assuming this is a Next.js environment for the prompt's context
import Link from "next/link"; 
import { Code, Users, ThumbsUp, ChevronRight, Zap, GraduationCap, MessageSquare } from "lucide-react";

// --- Type Definitions for Props ---

// Type definition for Lucide icons, which are React components
type IconType = React.ElementType;

interface FeatureProps {
  title: string;
  desc: string;
  Icon: IconType;
}

interface CallToActionButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "secondary";
  className?: string;
}

// --- Utility Components (Simulating shadcn/ui styles and functionality) ---

// Feature Card with Icon
const Feature: React.FC<FeatureProps> = ({ title, desc, Icon }) => {
  return (
    <div className="flex flex-col space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primary/50 md:p-8">
      <div className="p-3 w-fit rounded-full bg-primary/10 text-primary">
        {/* Icon prop is rendered here */}
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="text-muted-foreground text-base leading-relaxed">{desc}</p>
    </div>
  );
}

// Button-like component to simulate shadcn Button and Next.js Link styling

const CallToActionButton: React.FC<CallToActionButtonProps> = ({
  href,
  children,
  variant = "default",
  className = "",
}) => {
  const baseClasses =
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-11 px-6 py-2 tracking-wide";

  const defaultClasses =
    "bg-primary text-primary-foreground shadow-xl hover:bg-primary/90";
  const secondaryClasses =
    "bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/80 border border-input";

  const variantClasses = variant === "default" ? defaultClasses : secondaryClasses;

  return (
    <Link href={href} className={`${baseClasses} ${variantClasses} ${className}`}>
      {children}
    </Link>
  );
};

// Main navigation/header component
const Header: React.FC = () => {
    return (
        <header className="py-4 border-b border-border/40 sticky top-0 z-10 bg-background/90 backdrop-blur-sm">
            <div className="mx-auto max-w-5xl px-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tighter text-foreground">
                    Dev<span className="text-primary">Ripple</span>
                </h1>
                <nav className="hidden sm:flex space-x-6 text-sm">
                    {/* Use standard <a> for section links to avoid full page load */}
                    <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</a>
                    <a href="#workflow" className="text-muted-foreground hover:text-primary transition-colors">How It Works</a>
                    <a href="#cta" className="text-muted-foreground hover:text-primary transition-colors">Join</a>
                </nav>
                <CallToActionButton href="/dashboard" variant="secondary" className="h-9 px-4 py-2">
                    Go to Dashboard
                </CallToActionButton>
            </div>
        </header>
    );
}

// CSS string for colors and font import
const customCss = `
  /* Load Inter font (using a web-safe sans-serif fallback) */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');
  

`;

// The main landing page component
const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      
      {/* FIX: Hydration Error
        The <style> block is fixed by using dangerouslySetInnerHTML, which
        tells React not to manage its content during hydration, preventing 
        the server/client content mismatch (due to different string 
        serialization/escaping).
      */}
      <style dangerouslySetInnerHTML={{ __html: customCss }} />
      
      {/* NOTE: In a real project, Tailwind CSS is imported via a global CSS file, 
          not a <script> tag. The script tag is left as it was in the original 
          code for simulation purposes, though it has no effect in a standard
          Next.js/TSX environment. */}
      {/* <script src="https://cdn.tailwindcss.com"></script> */}

      {/* <Header /> */}

      <main className="mx-auto max-w-5xl px-4 py-12 md:py-24">
        {/* === 1. Hero Section === */}
        <section className="text-center mb-20 md:mb-32">
          <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium mb-5 bg-muted text-muted-foreground border-primary/20">
              <Zap className="w-4 h-4 mr-2 text-primary" />
              Collaboration is the fastest path to mastery.
          </div>
          <h1 className="text-pretty text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tighter leading-tight mb-6">
            Peer-to-Peer <span className="text-primary">Coding Mastery</span>
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground md:text-xl">
            DevRipple is the platform for serious coders to collaborate, share knowledge, and <span className="font-semibold font-sans italic">level up through daily problem-solving</span> and rigorous, inline code reviews.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <CallToActionButton href="/dashboard">
                Start Collaborating <ChevronRight className="w-5 h-5 ml-2" />
            </CallToActionButton>
            <CallToActionButton href="#features" variant="secondary">
                Explore Features
            </CallToActionButton>
          </div>
        </section>

        {/* --- 2. Core Features Grid Section --- */}
        <section id="features" className="mb-20 md:mb-32">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 tracking-tight">
            How DevRipple Empowers You
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Feature
              Icon={Users}
              title="Group Collaboration"
              desc="Structured group feeds with 'Today’s Question' keep everyone focused on a single, rotating challenge for comparative learning."
            />
            <Feature
              Icon={GraduationCap}
              title="Rich Submissions"
              desc="Go beyond the code. Submit solutions with a built-in editor, detailed approach, and LaTeX for T.C./S.C. analysis."
            />
            <Feature
              Icon={ThumbsUp}
              title="Inline Code Reviews"
              desc="Receive and give high-quality feedback. Comment directly on lines of code with Markdown/LaTeX and upvote the most helpful critiques."
            />
          </div>
        </section>

        {/* --- 3. Workflow Highlight Section --- */}
        <section id="workflow" className="mb-20 md:mb-32 flex flex-col items-center">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 tracking-tight">
                Our Simple, Effective Workflow
            </h2>
            <div className="w-full grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                {/* Step 1 */}
                <div className="text-center p-6 border-2 border-primary/10 rounded-xl bg-muted/30 shadow-sm">
                    <div className="text-3xl font-bold text-primary mb-2">1.</div>
                    <Users className="w-8 h-8 mx-auto mb-3 text-primary/80" />
                    <h4 className="font-semibold mb-1">Join a Group</h4>
                    <p className="text-sm text-muted-foreground">Find or create a group for your favorite language or topic.</p>
                </div>
                {/* Step 2 */}
                <div className="text-center p-6 border-2 border-primary/10 rounded-xl bg-muted/30 shadow-sm">
                    <div className="text-3xl font-bold text-primary mb-2">2.</div>
                    <Code className="w-8 h-8 mx-auto mb-3 text-primary/80" />
                    <h4 className="font-semibold mb-1">Solve the Daily Problem</h4>
                    <p className="text-sm text-muted-foreground">Tackle the 'Today’s Question' and submit your detailed solution.</p>
                </div>
                {/* Step 3 */}
                <div className="text-center p-6 border-2 border-primary/10 rounded-xl bg-muted/30 shadow-sm">
                    <div className="text-3xl font-bold text-primary mb-2">3.</div>
                    <MessageSquare className="w-8 h-8 mx-auto mb-3 text-primary/80" />
                    <h4 className="font-semibold mb-1">Review Peers' Code</h4>
                    <p className="text-sm text-muted-foreground">Leave specific, constructive feedback directly on lines of code.</p>
                </div>
                {/* Step 4 */}
                <div className="text-center p-6 border-2 border-primary/10 rounded-xl bg-muted/30 shadow-sm">
                    <div className="text-3xl font-bold text-primary mb-2">4.</div>
                    <Zap className="w-8 h-8 mx-auto mb-3 text-primary/80" />
                    <h4 className="font-semibold mb-1">Grow Exponentially</h4>
                    <p className="text-sm text-muted-foreground">Absorb diverse solutions and critiques to accelerate your learning.</p>
                </div>
            </div>
        </section>

        {/* --- 4. Final CTA Section --- */}
        <section id="cta" className="text-center p-12 md:p-16 bg-card border border-primary/10 rounded-2xl shadow-2xl shadow-primary/10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready to Join the Ripple?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg mb-8">
                Stop coding in isolation. Start growing with a community that values quality, critique, and continuous improvement.
            </p>
            <CallToActionButton href="/dashboard">
                Get Started Today <ChevronRight className="w-5 h-5 ml-2" />
            </CallToActionButton>
        </section>

      </main>

      {/* --- Footer --- */}
      <footer className="mt-24 py-10 border-t border-border/40 bg-background text-foreground">
  <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground">
    <p className="mb-2">
      &copy; {new Date().getFullYear()} <span className="font-semibold text-primary">DevRipple</span>. All rights reserved.
    </p>
    <div className="space-x-2 text-xs text-muted-foreground">
      <span>Created By</span>
      <span className="text-blue-600 font-medium">💖 Priyanshu Singh</span>
    </div>
  </div>
</footer>
    </div>
  )
}

export default HomePage;