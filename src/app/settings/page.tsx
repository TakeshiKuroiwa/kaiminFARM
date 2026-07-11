import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="page stack">
      <section className="panel stack">
        <h1>アカウント設定</h1>
        <p className="muted">パスワード変更や全端末ログアウトの画面はAPI実装済みです。UIは次の実装単位で拡張します。</p>
        <Link className="button secondary" href="/game">
          ゲームへ戻る
        </Link>
      </section>
    </main>
  );
}
