import React from 'react';

const Home: React.FC = () => {
  return (
    <div
      className="relative hero min-h-screen"
      style={{
        backgroundImage: "url('/images/hero-bg.png')",
      }}
    >
      <div
        className="hero-content"
        style={{
          top: "30%",
          position: "absolute",
          width: "100%",
          transform: "translateY(-50%)",
        }}
      >
        <div className="max-w-full overflow-hidden">
          <img
            src="/images/hero-text.png"
            alt="L4D2"
            className="w-full mx-auto"
            style={{
              width: "100vw",
              opacity: 0.80,
            }}
          />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[90vh] flex justify-center">
        <img
          src="/images/l4d2-hand.png"
          alt="L4D2 Hand"
          className="w-auto h-full object-cover"
        />
      </div>
    </div>
  );
};

export default Home;