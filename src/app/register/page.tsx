import { AuthForm } from "@/components/auth/auth-form";

export default function RegisterPage() {
  return (
    <main className="page stack">
      <section className="panel stack">
        <h1>はじめから</h1>
        <AuthForm mode="register" />
      </section>
    </main>
  );
}
