import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page stack">
      <section className="panel stack">
        <p className="muted">kaiminちゃんのねむり丘タウン</p>
        <h1>眠っている間にも、やさしい町は育っていく。</h1>
        <p>
          羊のkaiminちゃんと一緒に、小さな集落を少しずつ発展させる放置型町づくりゲームです。
        </p>
        <div className="nav">
          <Link className="button" href="/login">
            ログイン
          </Link>
          <Link className="button secondary" href="/register">
            はじめから
          </Link>
        </div>
      </section>
    </main>
  );
}
