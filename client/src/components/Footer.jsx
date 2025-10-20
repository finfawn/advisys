import React from "react";

function Footer() {
  return (
    <footer className="w-full bg-white border-t   py-8 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
        <div>
          © {new Date().getFullYear()} AdviSys. All rights reserved.
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="hover:text-gray-900">Features</a>
          <a href="#how-it-works" className="hover:text-gray-900">How it works</a>
          <a href="/auth" className="hover:text-gray-900">Sign in</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;


