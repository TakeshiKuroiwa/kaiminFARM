import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <main className="page stack">
      <section className="panel stack">
        <h1>ログイン</h1>
        <AuthForm mode="login" />
      </section>
    </main>
  );
}
