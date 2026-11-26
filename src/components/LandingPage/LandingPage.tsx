import { useEffect, useRef } from "react";
import logo from "../../assets/coronavirus.png";
import "./LandingPage.scss";

interface LandingPageProps {
  onDismiss: () => void;
}

/**
 * Welcome card shown over the live map on a visitor's first visit.
 * Uses a native <dialog> so focus trapping, Escape and the backdrop come for free.
 */
function LandingPage({ onDismiss }: LandingPageProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog ref={dialogRef} className="landing" aria-labelledby="landing-title" onClose={onDismiss}>
      <img className="landing__logo" src={logo} alt="" width={72} height={72} />
      <h1 id="landing-title">Covid Mapper</h1>
      <p className="landing__tagline">Global insights at your fingertips</p>
      <p className="landing__body">
        Compare COVID-19 cases, deaths and testing across the world. Countries are shaded by the measure you choose —
        click one, or search by name, to see its full figures.
      </p>
      <form method="dialog">
        <button type="submit" className="button button--primary" autoFocus>
          Explore the map
        </button>
      </form>
    </dialog>
  );
}

export default LandingPage;
