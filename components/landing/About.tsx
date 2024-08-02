import React from 'react';

const About: React.FC = () => {
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
      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <img
          src="/images/l4d2-characters.png"
          alt="L4D2 Characters"
          className="w-auto h-full object-cover"
          style={{
            marginBottom: "-6%",
            opacity: 0.70,
          }}
        />
      </div>
    </div>
  );
};

export default About;