import globe from "../../assets/wired-globe.gif";
import "./ErrorPage.scss";

function ErrorPage() {
  return (
    <main className="error-page" role="alert">
      <img src={globe} alt="" width={160} height={160} />
      <h1>Something went wrong</h1>
      <p>The map hit an unexpected problem. Reloading usually fixes it.</p>
      <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
        Reload the page
      </button>
    </main>
  );
}

export default ErrorPage;
