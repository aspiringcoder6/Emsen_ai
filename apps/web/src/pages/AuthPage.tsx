import { AuthBrandPanel } from "../features/auth/components/AuthBrandPanel";
import { AuthFormPanel } from "../features/auth/components/AuthFormPanel";
import type { AuthRequest } from "../types/app";

type AuthPageProps = {
  onAuthenticate: (request: AuthRequest) => Promise<void>;
};

export function AuthPage({ onAuthenticate }: AuthPageProps) {
  return (
    <main className="auth-shell grid min-h-screen bg-[#FBFDF7] lg:grid-cols-[minmax(460px,0.92fr)_1.08fr]">
      <AuthBrandPanel />
      <AuthFormPanel onAuthenticate={onAuthenticate} />
    </main>
  );
}
