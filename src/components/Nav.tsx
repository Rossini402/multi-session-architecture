import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";

export async function Nav() {
  const session = await auth();

  return (
    <header className="border-b border-border bg-card/70 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          ✦ 技术雷达
        </Link>

        <div className="flex items-center gap-2">
          {session?.user && (
            <Link href="/favorites" className="btn-ghost">
              收藏
            </Link>
          )}
          {session?.user?.isAdmin && (
            <>
              <Link href="/library" className="btn-ghost">
                私库
              </Link>
              <Link href="/admin" className="btn-outline">
                管理
              </Link>
            </>
          )}

          {session?.user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted hidden sm:inline">
                  {session.user.name ?? session.user.email}
                </span>
                <button type="submit" className="btn-ghost text-xs">
                  退出
                </button>
              </div>
            </form>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn();
              }}
            >
              <button type="submit" className="btn-primary">
                登录
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
