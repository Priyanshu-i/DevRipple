"use client"

import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

// Import shadcn/ui components for responsiveness and styling
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
// REPLACE DropdownMenu with Popover
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
// We keep DropdownMenu imports for the MobileNav component's structure if you still want it there
import { DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu" 

// Import Lucide React icons
import { Menu, Search, Trophy, LayoutDashboard, LogOut, User, Zap, LucideIcon } from "lucide-react"

// --- Type Definitions for TypeScript (Kept for correctness) ---
type NavLinkType = {
  href: string;
  label: string;
  icon: LucideIcon; 
};
type NavLinkItemProps = NavLinkType & {
  className?: string;
};

// Define the main navigation links
const navLinks: NavLinkType[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Search", icon: Search },
  // { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
]

export function TopNav() {
  const { user, signIn, signOutUser } = useAuth()

  // Custom component for a clean navigation link
  const NavLinkItem = ({ href, label, icon: Icon, className = "" }: NavLinkItemProps) => (
    <Link
      href={href}
      className={`flex items-center gap-2 p-2 rounded-md transition-colors text-sm font-medium hover:bg-accent hover:text-accent-foreground ${className}`}
    >
      <Icon className="h-4 w-4" /> 
      {label}
    </Link>
  )

  // Custom component for the main desktop navigation
  const DesktopNav = () => (
    <div className="hidden md:flex items-center gap-6">
      <div className="flex items-center space-x-4">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* User Status Section - REPLACED WITH POPOVER */}
      {user ? (
  <Popover>
    <PopoverTrigger asChild>
      <button
        className="relative flex items-center justify-center h-9 w-9 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Avatar className="h-9 w-9 border-2 border-primary/50 transition-transform hover:scale-[1.05]">
          <AvatarImage src={user.photoURL ?? ""} alt={user.displayName ?? "user"} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {user.displayName?.[0] ?? "U"}
          </AvatarFallback>
        </Avatar>
      </button>
    </PopoverTrigger>

    <PopoverContent
      align="end"
      side="bottom"
      className="w-56 p-0 rounded-lg shadow-md"
    >
      {/* User Info */}
      <div className="p-4 pb-3">
        <div className="flex flex-col space-y-1">
          <p className="text-sm font-medium leading-none">
            {user.displayName ?? "User"}
          </p>
          <p className="text-xs leading-none text-muted-foreground truncate">
            {user.email ?? "No email"}
          </p>
        </div>
      </div>

      <Separator />

      {/* Links */}
      <div className="p-1 space-y-0">
        <Link
          href="/profile"
          className="flex items-center w-full px-2 py-1.5 text-sm rounded-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </Link>

        <button
          onClick={signOutUser}
          className="flex items-center w-full px-2 py-1.5 text-sm rounded-sm text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </button>
      </div>
    </PopoverContent>
  </Popover>
) : (
  <Button size="sm" onClick={signIn} className="group transition-transform hover:scale-[1.05]">
    <Zap className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
    Sign in
  </Button>
)}

    </div>
  )

  // Custom component for the mobile navigation (Sheet/Hamburger)
  const MobileNav = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <h4 className="flex items-center gap-2 text-xl font-bold text-primary border-b pb-4">
          <img src="/favicon.svg" alt="Favicon" className="h-6 w-6" />
          DevRipple
        </h4>
        <div className="flex flex-col space-y-1 mt-4 flex-grow">
          {/* Main Navigation Links */}
          {navLinks.map((link) => (
            <NavLinkItem key={link.href} {...link} />
          ))}
          <Separator className="my-2" />
          
          {/* User Specific Links */}
          {user ? (
            <>
              <div className="flex items-center gap-3 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL ?? ""} alt={user.displayName ?? "user"} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">{user.displayName?.[0] ?? "U"}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold leading-none">{user.displayName ?? "User"}</span>
                  <span className="text-xs text-muted-foreground truncate">{user.email ?? "No email"}</span>
                </div>
              </div>
              <NavLinkItem href="/profile" label="Profile" icon={User} />
              <Button 
                variant="ghost" 
                onClick={signOutUser} 
                className="flex justify-start text-red-600 hover:bg-red-50 hover:text-red-700 mt-2"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </>
          ) : (
            <Button onClick={signIn} className="w-full mt-2">
              <Zap className="mr-2 h-4 w-4" />
              Sign in with Google
            </Button>
          )}

        </div>
      </SheetContent>
    </Sheet>
  )

  // --- Main Render ---
  return (
    <header className="sticky top-0 z-50 border-b shadow-sm bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-2.5">
        {/* Logo/Brand (Always visible) */}
        <div className="flex items-center gap-2">
          <MobileNav />
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary transition-colors hover:text-primary/90">
            <img src="/favicon.svg" alt="Favicon" className="h-6 w-6" />
            DevRipple
          </Link>
        </div>

        {/* Navigation and User Status (Desktop) */}
        <DesktopNav />
      </nav>
    </header>
  )
}