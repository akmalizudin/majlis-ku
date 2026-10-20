import { signOut } from "@/auth";

export function SignOutButton({ label }: { label: string }) {
  async function action() {
    "use server";
    await signOut({ redirectTo: "/" });
  }
  return (
    <form action={action}>
      <button type="submit" className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-ink/70 hover:text-ink">
        {label}
      </button>
    </form>
  );
}