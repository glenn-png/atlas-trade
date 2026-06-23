import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm px-6">
      <div className="mb-8 text-center">
        <div className="text-[11px] font-bold tracking-[3px] uppercase text-slate-500 mb-2">Atlas Trade</div>
        <h1 className="text-[24px] font-bold text-white">Sign in</h1>
      </div>
      <LoginForm />
    </div>
  );
}
