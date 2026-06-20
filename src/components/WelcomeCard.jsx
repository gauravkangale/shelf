import React, { useRef } from 'react';

export default function WelcomeCard({ activeProfileName }) {
  const graphicRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!graphicRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();

    // Get mouse position relative to center (-0.5 to 0.5)
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    // Max rotation angles (e.g. 25 degrees)
    const rotateY = x * 35;
    const rotateX = -y * 35;

    graphicRef.current.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.06)`;
    graphicRef.current.style.transition = 'transform 0.1s ease-out';
  };

  const handleMouseLeave = () => {
    if (!graphicRef.current) return;
    graphicRef.current.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
    graphicRef.current.style.transition = 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)';
  };

  return (
    <section className="welcome-card-container">
      <div className="welcome-info">
        <h1 className="welcome-title">
          Happy reading,<br />
          <span className="welcome-name">{activeProfileName}</span>
        </h1>
        <p className="welcome-text">
          Wow! you've delved deep into the wizarding world's secrets.
          Have Harry's parents died yet? Oops, looks like you're not there yet.
          Get reading now!
        </p>
        <button
          className="primary-btn"
          onClick={() => window.open('http://localhost:5173/', '_blank')}
        >
          Start reading ↗
        </button>
      </div>

      {/* Central Animated Open Book Visual */}
      <div
        className="open-book-banner"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="open-book-graphic" ref={graphicRef}>
          <div className="book-page-left">
            <div className="page-chapter">Chapter XVI</div>
            <div className="page-text-line medium"></div>
            <div className="page-text-line"></div>
            <div className="page-text-line short"></div>
            <div className="page-text-line"></div>
            <div className="page-text-line medium"></div>
            <div className="page-text-line"></div>
            <div className="page-text-line short"></div>
            <div className="page-text-line medium"></div>
            <div className="page-text-line"></div>
            <div className="page-text-line short"></div>
          </div>
          <div className="book-spine"></div>
          <div className="book-page-right">
            <img
              className="size-[20px] object-cover"
              src="/public/mpage.png"
              alt=""
            />


            <div className="page-text-line medium" style={{ marginTop: '8px' }}></div>
            <div className="page-text-line"></div>
            <div className="page-text-line short"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
