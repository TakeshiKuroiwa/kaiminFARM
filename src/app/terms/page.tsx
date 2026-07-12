export default function TermsPage() {
  return (
    <main className="page stack">
      <section className="panel stack">
        <p className="muted">kaiminちゃんのねむり丘タウン</p>
        <h1>利用規約</h1>
        <p>
          この利用規約は、ねむり丘タウンで安心して町づくりを楽しむためのお約束だmin♪
        </p>
        <p className="muted small">最終更新日: 2026年7月12日</p>
      </section>

      <section className="panel stack">
        <h2>1. このゲームについて</h2>
        <p>
          kaiminFARMは、ブラウザで遊べる放置型町づくりゲームだmin♪
          町の建物、資源、住民、探索、イベントの状態は、ゲームを遊ぶために保存されるmin♪
        </p>
      </section>

      <section className="panel stack">
        <h2>2. アカウント</h2>
        <p>
          プレイヤーは、ログインIDとパスワードを自分で管理してほしいmin♪
          復旧コードは再表示できないので、登録後に安全な場所へ保存してほしいmin♪
        </p>
        <p>
          他の人のアカウントを使ったり、ログイン情報を無断で試したりする行為は禁止だmin♪
        </p>
      </section>

      <section className="panel stack">
        <h2>3. 禁止事項</h2>
        <p>以下の行為はしないでほしいmin♪</p>
        <ul>
          <li>不正アクセス、過度な連続リクエスト、脆弱性を悪用する行為</li>
          <li>他のプレイヤーの町やデータを妨害する行為</li>
          <li>法令や公序良俗に反する名前、町名、投稿、その他の入力</li>
          <li>ゲーム運営やサービス提供を妨げる行為</li>
        </ul>
      </section>

      <section className="panel stack">
        <h2>4. データの保存</h2>
        <p>
          ゲームの進行、資源、建物、住民、探索、イベント貢献、セッション情報は保存されるmin♪
          パスワード、セッショントークン、復旧コードは、そのままではなくハッシュ化して扱う方針だmin♪
        </p>
      </section>

      <section className="panel stack">
        <h2>5. サービスの変更・停止</h2>
        <p>
          ゲーム内容、機能、イベント、表示、データ構造は、改善や不具合対応のために変更されることがあるmin♪
          メンテナンスや障害によって、一時的に遊べなくなる場合もあるmin♪
        </p>
      </section>

      <section className="panel stack">
        <h2>6. 免責</h2>
        <p>
          できるだけ大切に町を守るけれど、通信環境、ブラウザ、外部サービス、予期しない不具合によって、
          データや表示に問題が起きる場合があるmin♪
        </p>
      </section>

      <section className="panel stack">
        <h2>7. 規約への同意</h2>
        <p>
          アカウントを作成したり、ログインしてゲームを遊んだりした時点で、この利用規約に同意したものとするmin♪
          みんなで気持ちよく、ねむり丘の町を育ててほしいmin♪
        </p>
        <a className="button" href="/register">
          アカウント作成へ
        </a>
      </section>
    </main>
  );
}
