import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16 flex items-center">
      <div className="container mx-auto px-4 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link 
            to="/" 
            className="bg-blue-700 hover:bg-blue-800 text-white py-3 px-8 rounded-md font-medium transition-colors"
          >
            Back to Home
          </Link>
          <Link 
            to="/booking" 
            className="border border-blue-700 text-blue-700 hover:bg-blue-50 py-3 px-8 rounded-md font-medium transition-colors"
          >
            Book a Service
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;