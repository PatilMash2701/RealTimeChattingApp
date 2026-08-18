import React from "react";
import PulseLogo from "./PulseLogo";

interface AuthShellProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function AuthShell({ children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 flex justify-center">
          <PulseLogo size="md" showTagline />
        </div>
        <div className="glass-card rounded-2xl p-8 sm:p-10">{children}</div>
        {footer && <div className="mt-6 text-center">{footer}</div>}
      </div>
    </div>
  );
}
