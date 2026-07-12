"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  mode: "login" | "register";
};

type ApiResult =
  | {
      ok: true;
      data: {
        recoveryCode?: string;
      };
    }
  | {
      ok: false;
      error: {
        message: string;
      };
    };

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setRecoveryCode("");
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const payload =
      mode === "register"
        ? {
            loginId: String(form.get("loginId") ?? ""),
            password: String(form.get("password") ?? ""),
            displayName: String(form.get("displayName") ?? ""),
            townName: String(form.get("townName") ?? ""),
            acceptedTerms: form.get("acceptedTerms") === "on"
          }
        : {
            loginId: String(form.get("loginId") ?? ""),
            password: String(form.get("password") ?? "")
          };

    let result: ApiResult;
    try {
      const response = await fetch(mode === "register" ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      result = (await response.json()) as ApiResult;
    } catch {
      setSubmitting(false);
      setMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
      return;
    }
    setSubmitting(false);

    if (!result.ok) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "register") {
      setRecoveryCode(result.data.recoveryCode ?? "");
      setMessage("登録が完了しました。復旧コードを保存してください。");
      return;
    }

    router.push("/game");
    router.refresh();
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label>
        ログインID
        <input name="loginId" autoComplete="username" required minLength={4} maxLength={24} />
      </label>
      <label>
        パスワード
        <input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} />
      </label>
      {mode === "register" ? (
        <>
          <label>
            プレイヤー名
            <input name="displayName" required maxLength={24} />
          </label>
          <label>
            町の名前
            <input name="townName" required maxLength={24} />
          </label>
          <label className="row">
            <input name="acceptedTerms" type="checkbox" required style={{ width: "auto" }} />
            <span>
              <Link href="/terms">利用規約</Link>に同意します
            </span>
          </label>
        </>
      ) : null}
      <button type="submit" disabled={submitting}>
        {submitting ? "送信中" : mode === "register" ? "アカウント作成" : "ログイン"}
      </button>
      <p className="muted small">
        {mode === "register" ? (
          <Link href="/login">登録済みの方はログインへ</Link>
        ) : (
          <Link href="/register">はじめての方はアカウント作成へ</Link>
        )}
        {" / "}
        <Link href="/terms">利用規約</Link>
      </p>
      {message ? <p className={recoveryCode ? "success" : "error"}>{message}</p> : null}
      {recoveryCode ? (
        <div className="panel stack">
          <strong>復旧コード</strong>
          <code>{recoveryCode}</code>
          <p className="muted">このコードは再表示できません。安全な場所に保存してください。</p>
          <button type="button" onClick={() => router.push("/game")}>
            保存したのでゲームを開始
          </button>
        </div>
      ) : null}
    </form>
  );
}
