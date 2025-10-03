import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center px-4">
      <img
        src="https://img.freepik.com/free-vector/404-error-found-concept-illustration_114360-5529.jpg"
        alt="404 Error Illustration"
        className="w-full max-w-md mb-6"
      />
      {/* <h1 className="text-5xl font-bold text-red-600 mb-4">404</h1> */}
      <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
      <p className="text-gray-600 mb-6">
        Sorry, the page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Go Back Home
      </Link>
    </div>
  );
}