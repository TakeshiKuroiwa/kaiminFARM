import Link from "next/link";

export default function RecoveryCodePage() {
  return (
    <main className="page stack">
      <section className="panel stack">
        <h1>復旧コードを保存してください</h1>
        <p className="muted">
          復旧コードは登録完了時に一度だけ表示されます。表示が消えた場合、再表示はできません。
        </p>
        <Link className="button" href="/game">
          ゲームを開始
        </Link>
      </section>
    </main>
  );
}
