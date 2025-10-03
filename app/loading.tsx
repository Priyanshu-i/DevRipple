// app/dashboard/loading.js (or wherever your loading.js file is)

import AnimatedLoading from '../components/AnimateLoading';

// --- Fallback Component Definition ---
const MinimalFallback = () => (
    <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl font-semibold text-gray-700">Loading...</p>
    </div>
);
// -------------------------------------

// You can flip this boolean to instantly switch between the full animation 
// and the minimal text without changing the main function body.
const USE_FULL_ANIMATION = true; 

export default function Loading() {
    if (USE_FULL_ANIMATION) {
        // Render the complex component
        return <AnimatedLoading />;
    } else {
        // Render the simple fallback
        return <MinimalFallback />;
    }
}