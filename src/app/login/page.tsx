import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  if (session?.user) redirect(callbackUrl ?? "/");

  return (
    <div className="max-w-sm mx-auto mt-16">
      <div className="rounded-lg border border-border bg-card p-8 space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold">登录</h1>
          <p className="text-sm text-muted mt-1">选择一个方式继续</p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: callbackUrl ?? "/" });
          }}
        >
          <button type="submit" className="btn-outline w-full">
            <GitHubIcon /> 使用 GitHub 登录
          </button>
        </form>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl ?? "/" });
          }}
        >
          <button type="submit" className="btn-outline w-full">
            <GoogleIcon /> 使用 Google 登录
          </button>
        </form>
      </div>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.69-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.34.95.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.94 10.94 0 0 1 5.74 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.59.23 2.76.12 3.05.73.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.4-5.27 5.69.42.36.79 1.07.79 2.17v3.21c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4">
      <path
        fill="#EA4335"
        d="M12 5c1.6 0 3 .6 4.1 1.5l3-3C17.2 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.6 2.8C6.1 7.2 8.8 5 12 5z"
      />
      <path
        fill="#34A853"
        d="M23 12.3c0-.8-.1-1.5-.2-2.3H12v4.4h6.2c-.3 1.5-1.1 2.7-2.4 3.5l3.6 2.8c2.1-1.9 3.6-4.8 3.6-8.4z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.1c-.2-.6-.3-1.3-.3-2.1s.1-1.5.3-2.1L1.6 7.1A11 11 0 0 0 1 12c0 1.8.4 3.4 1.1 4.9l3.6-2.8z"
      />
      <path
        fill="#4285F4"
        d="M12 23c3 0 5.5-1 7.3-2.6l-3.6-2.8c-1 .6-2.3 1-3.7 1-3.2 0-5.9-2.2-6.9-5.1l-3.6 2.8C3.5 20.4 7.4 23 12 23z"
      />
    </svg>
  );
}
