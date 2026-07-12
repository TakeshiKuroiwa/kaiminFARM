export default function HomePage() {
  return (
    <main className="page stack">
      <section className="panel stack">
        <p className="muted">kaiminちゃんのねむり丘タウン</p>
        <h1>眠っている間にも、やさしい町は育っていく。</h1>
        <p>
          建物、畑、公園、探索拠点を配置し、小さな集落を少しずつ発展させる放置型町づくりゲームです。
        </p>
        <div className="nav">
          <a className="button" href="/login">
            ログイン
          </a>
          <a className="button secondary" href="/register">
            はじめから
          </a>
        </div>
      </section>
    </main>
  );
}
