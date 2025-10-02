"use client" 

import { useParams } from "next/navigation" 
import { db } from "@/lib/firebase" 
import useSWRSubscription from "swr/subscription" 
import { onValue, ref } from "firebase/database" 
import { paths } from "@/lib/paths" 
import { 
    AtSign, 
    NotebookText, 
    Link, // Used for the External Links section title
    Loader2, 
    SquareUser, // Used for the Avatar placeholder 
    ExternalLink, // Used in the link chips
    Linkedin, 
    Github, 
    Globe, 
} from "lucide-react" 

// --- TYPES --- 
interface UserPublicProfile { 
    displayName?: string 
    username?: string 
    bio?: string 
    linkedin?: string 
    github?: string 
    website?: string 
    // ✅ This field is where the Google profile avatar pic URL is stored
    photoURL?: string 
} 

// Type for the SWR subscription 'next' callback parameter 
type NextCallback<T> = { next: (err: any, data: T) => void } 

// --- SHADCN/UI & UTILITY SIMULATION (Tailwind classes for aesthetics) ---

/**
 * Simulates a shadcn Card component with modern styling.
 */
const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 transition-colors ${className}`}>
        {children}
    </div>
)

/**
 * Simulates a styled link chip for external websites.
 */
const LinkChip = ({ children, href, icon: Icon, color, className = "" }: { 
    children: React.ReactNode, 
    href: string, 
    icon: React.ElementType, 
    color: string, 
    className?: string 
}) => (
    <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center p-3 transition-all duration-200 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 ${className}`}
    >
        {Icon && <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${color}`} />}
        <div className="flex-1 min-w-0">
            <span className="truncate text-gray-900 dark:text-white">{children}</span>
            {/* Secondary text showing the raw URL */}
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{href.replace(/^(https?:\/\/)?(www\.)?/i, "").split('/')[0]}</p>
        </div>
        <ExternalLink className="w-4 h-4 ml-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
    </a>
)

/**
 * Simulates a shadcn Separator component.
 */
const Separator = ({ className = "" }: { className?: string }) => (
    <div className={`w-full h-px bg-gray-200 dark:bg-gray-700/70 ${className}`} />
)

// ✅ This is the key component to render the avatar image
const Avatar = ({ photoURL, displayName }: { photoURL?: string, displayName?: string }) => {
    const avatarClasses = "w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-800 shadow-xl overflow-hidden flex items-center justify-center text-gray-500 dark:text-gray-400 transition-all duration-300"
    
    if (photoURL) {
        // Renders the Google profile image
        return (
            <div className={avatarClasses}>
                <img 
                    // This is the source for the Google email avatar
                    src={photoURL} 
                    alt={`${displayName || "User"}'s profile picture`} 
                    className="w-full h-full object-cover"
                    // Add referrerPolicy="no-referrer" for better compatibility/security
                    referrerPolicy="no-referrer"
                />
            </div>
        )
    }

    // Render the placeholder if no photoURL
    return (
        <div className={`${avatarClasses} bg-gray-200 dark:bg-gray-700`}>
            {/* The SquareUser icon from lucide-react */}
            <SquareUser className="w-16 h-16" />
        </div>
    )
}

// --- COMPONENT --- 

export default function ContactPage() { 
    const { uid } = useParams<{ uid: string }>() 
    
    // 1. Public Profile Data Subscription (userPublic/{uid}) 
    const { data: profile } = useSWRSubscription<UserPublicProfile>( 
        uid ? paths.userPublic(uid) : null, 
        (key: string, { next }: NextCallback<UserPublicProfile>) => { 
            if (!uid) return 
            console.log("📊 Subscribing to public profile at:", key) 
            const unsub = onValue(ref(db, key), (snap) => { 
                const data = snap.val() as UserPublicProfile 
                console.log("📊 Public profile data received:", data) 
                next(null, data) 
            }) 
            return () => unsub() 
        } 
    ) 

    if (!uid) { 
        return <main className="mx-auto max-w-3xl px-4 py-12 text-center text-gray-600 dark:text-gray-400 min-h-screen bg-gray-50 dark:bg-gray-900">No user specified.</main> 
    } 

    if (!profile) { 
        return ( 
            <main className="mx-auto max-w-3xl px-4 py-12 text-center min-h-screen bg-gray-50 dark:bg-gray-900"> 
                <div className="flex flex-col items-center justify-center h-48"> 
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" /> 
                    <p className="mt-4 text-gray-500 dark:text-gray-400">Loading profile data...</p> 
                </div> 
            </main> 
        ) 
    } 
    
    // Prepare link data, filtering out empty or placeholder URLs
    const links = [
        { icon: Linkedin, name: "LinkedIn", url: profile?.linkedin, color: "text-blue-700" },
        { icon: Github, name: "GitHub", url: profile?.github, color: "text-gray-900 dark:text-white" },
        { icon: Globe, name: "Website", url: profile?.website, color: "text-emerald-600" },
    ].filter(link => link.url && link.url !== "#" && link.url.trim() !== "");

    // Use the displayName from the profile
    const displayUserName = profile?.displayName || "Anonymous User";

    return ( 
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 font-sans"> 
            <div className="mx-auto max-w-3xl space-y-6"> 

                {/* 1. Profile Header Card (LinkedIn-like layout) */}
                <Card className="p-0 overflow-hidden relative">
                    
                    {/* Mock Header Background Image / Color */}
                    <div className="h-20 sm:h-36 bg-gradient-to-r from-blue-600/90 to-blue-400/90 dark:from-blue-800 dark:to-blue-600 shadow-inner"></div>
                    
                    <div className="relative -mt-12 sm:-mt-16 px-6 pb-6">
                        
                        {/* ✅ This is where the Avatar component is used */}
                        <Avatar 
                            photoURL={profile?.photoURL} 
                            displayName={displayUserName} 
                        />

                        {/* Main Identity */}
                        <div className="mt-4">
                            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                                {displayUserName}
                            </h1>
                            
                            <p className="mt-1 text-lg font-medium text-gray-600 dark:text-gray-300 flex items-center">
                                <AtSign className="w-4 h-4 mr-1.5 flex-shrink-0" /> 
                                {profile?.username || "No Username"}
                            </p>
                        </div>
                        
                    </div>
                </Card>

                {/* 2. Bio/Summary Card (Only show if bio exists) */}
                {profile?.bio && (
                    <Card>
                        <h2 className="text-xl font-bold mb-4 flex items-center text-gray-900 dark:text-white border-b border-blue-200/50 dark:border-blue-700/50 pb-2">
                            <NotebookText className="w-5 h-5 mr-2 text-blue-500" /> 
                            About
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {profile.bio}
                        </p>
                    </Card>
                )}
                
                {/* 3. External Links / Contact Card (Only show if links exist) */}
                {links.length > 0 && (
                    <Card>
                        <h2 className="text-xl font-bold mb-4 flex items-center text-gray-900 dark:text-white border-b border-blue-200/50 dark:border-blue-700/50 pb-2">
                            <Link className="w-5 h-5 mr-2 text-blue-500" />
                            Connect
                        </h2>

                        <div className="grid grid-cols-1 gap-3">
                            {links.map(({ icon: Icon, name, url, color }) => (
                                <LinkChip 
                                    key={name} 
                                    href={url!} 
                                    icon={Icon} 
                                    color={color}
                                >
                                    {name}
                                </LinkChip>
                            ))}
                        </div>
                    </Card>
                )}
                
                {/* 4. Footer (User UID Information) */}
                <div className="pt-4 text-center text-xs text-gray-400 dark:text-gray-500">
                    <Separator className="mb-4" />
                    <p>Public Profile Identifier (UID): <span className="font-mono text-gray-600 dark:text-gray-300 text-sm break-all">{uid}</span></p>
                </div>

            </div>
        </main>
    )
}