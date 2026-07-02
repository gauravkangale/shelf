import React, { useEffect, useState } from "react";

export default function AnalogWatch() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const seconds = time.getSeconds();
    const minutes = time.getMinutes();
    const hours = time.getHours();

    const secondDeg = seconds * 6;
    const minuteDeg = minutes * 6 + seconds * 0.1;
    const hourDeg = (hours % 12) * 30 + minutes * 0.5;

    const romanNumerals = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

    return (
        <div
            style={{
                height: "100%",
                minHeight: "80vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "transparent", // No background as requested
                fontFamily: "'Playfair Display', 'Georgia', serif",
            }}
        >
            <div
                style={{
                    width: 420,
                    height: 420,
                    position: "relative",
                    userSelect: "none",
                }}
            >
                {/* SVG Layer for detailed Gold and Blue Baroque textures */}
                <svg viewBox="0 0 400 400" style={{ width: "100%", height: "100%" }}>
                    <defs>
                        {/* Realistic Multi-stop Gold Gradient */}
                        <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFF5D1" />
                            <stop offset="25%" stopColor="#D4AF37" />
                            <stop offset="50%" stopColor="#AA7C11" />
                            <stop offset="75%" stopColor="#E6CA65" />
                            <stop offset="100%" stopColor="#5A3E0F" />
                        </linearGradient>

                        {/* Baroque Blue Texture Gradient */}
                        <radialGradient id="blueBase" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#7FA1D2" />
                            <stop offset="60%" stopColor="#3B639B" />
                            <stop offset="90%" stopColor="#1E3354" />
                            <stop offset="100%" stopColor="#111D30" />
                        </radialGradient>

                        {/* Clock Dial Cream Face */}
                        <radialGradient id="dialFace" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="80%" stopColor="#FFFDF9" />
                            <stop offset="100%" stopColor="#EFE6D5" />
                        </radialGradient>
                    </defs>

                    {/* Outer Scalloped Ornate Gold Edging */}
                    <circle cx="200" cy="200" r="195" fill="url(#goldRim)" />
                    {[...Array(36)].map((_, i) => (
                        <circle
                            key={`scallop-${i}`}
                            cx={200 + 193 * Math.sin((i * 10 * Math.PI) / 180)}
                            cy={200 - 193 * Math.cos((i * 10 * Math.PI) / 180)}
                            r="6"
                            fill="url(#goldRim)"
                        />
                    ))}

                    {/* Deep Textured Blue Ring */}
                    <circle cx="200" cy="200" r="184" fill="#3B2607" />
                    <circle cx="200" cy="200" r="181" fill="url(#goldRim)" />
                    <circle cx="200" cy="200" r="172" fill="url(#blueBase)" />

                    {/* Four Main Gold Emblem Accents (Top, Bottom, Left, Right) */}
                    {[0, 90, 180, 270].map((angle) => (
                        <g key={`emblem-${angle}`} transform={`rotate(${angle} 200 200)`}>
                            <path d="M200,16 C215,16 222,32 214,48 C208,60 192,60 186,48 C178,32 185,16 200,16 Z" fill="url(#goldRim)" stroke="#3B2607" strokeWidth="1" />
                            <circle cx="200" cy="34" r="5" fill="#1E3354" />
                        </g>
                    ))}

                    {/* Baroque Scrollwork Line Flourishes inside Blue Ring */}
                    {[...Array(8)].map((_, i) => (
                        <path
                            key={`scroll-${i}`}
                            d="M200,45 C220,48 235,65 230,85 C225,100 210,95 200,110"
                            fill="none"
                            stroke="url(#goldRim)"
                            strokeWidth="1.5"
                            opacity="0.4"
                            transform={`rotate(${i * 45} 200 200)`}
                        />
                    ))}

                    {/* Inner Dial Gold Border */}
                    <circle cx="200" cy="200" r="132" fill="url(#goldRim)" />
                    <circle cx="200" cy="200" r="128" fill="#2C1D05" />

                    {/* Main Cream Dial Face */}
                    <circle cx="200" cy="200" r="126" fill="url(#dialFace)" />

                    {/* Dual Concentric Minute Tracks */}
                    <circle cx="200" cy="200" r="121" fill="none" stroke="#5C462B" strokeWidth="1" opacity="0.7" />
                    <circle cx="200" cy="200" r="111" fill="none" stroke="#5C462B" strokeWidth="1" opacity="0.7" />

                    {/* Minute Rail-Track Increments */}
                    {[...Array(60)].map((_, i) => (
                        <line
                            key={`tick-${i}`}
                            x1="200"
                            y1={i % 5 === 0 ? "75" : "79"}
                            x2="200"
                            y2="87"
                            stroke="#2C1D05"
                            strokeWidth={i % 5 === 0 ? "2" : "0.75"}
                            transform={`rotate(${i * 6} 200 200)`}
                        />
                    ))}

                    {/* Ornate Central Medallion */}
                    <circle cx="200" cy="200" r="52" fill="url(#goldRim)" stroke="#2C1D05" strokeWidth="1" />
                    <circle cx="200" cy="200" r="48" fill="url(#blueBase)" opacity="0.15" />
                    {[...Array(8)].map((_, i) => (
                        <path
                            key={`center-f-${i}`}
                            d="M200,200 C210,180 215,175 200,152 C185,175 190,180 200,200"
                            fill="url(#goldRim)"
                            transform={`rotate(${i * 45} 200 200)`}
                            stroke="#3B2607"
                            strokeWidth="0.5"
                        />
                    ))}
                </svg>

                {/* Roman Numerals Layout (Using your exact vector calculation engine) */}
                {romanNumerals.map((num, i) => {
                    const angle = i * 30;
                    const rad = (angle * Math.PI) / 180;
                    // Mapped beautifully within the cream section
                    const x = 200 + 98 * Math.sin(rad);
                    const y = 200 - 98 * Math.cos(rad);

                    return (
                        <div
                            key={num}
                            style={{
                                position: "absolute",
                                left: x,
                                top: y,
                                transform: "translate(-50%, -50%)",
                                fontSize: "21px",
                                fontWeight: "900",
                                fontFamily: "'Playfair Display', 'Times New Roman', serif",
                                color: "#1A1104",
                            }}
                        >
                            {num}
                        </div>
                    );
                })}

                {/* Vintage Hour Hand (Spade Profile) */}
                <div
                    style={{
                        position: "absolute",
                        width: 10,
                        height: 75,
                        background: "#111111",
                        left: "50%",
                        bottom: "50%",
                        transform: `translateX(-50%) rotate(${hourDeg}deg)`,
                        transformOrigin: "bottom center",
                        clipPath: "polygon(50% 0%, 100% 20%, 70% 30%, 70% 100%, 30% 100%, 30% 30%, 0% 20%)",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                        zIndex: 3,
                    }}
                />

                {/* Vintage Minute Hand (Whale-Tail Assembly) */}
                <div
                    style={{
                        position: "absolute",
                        width: 6,
                        height: 115,
                        background: "#222222",
                        left: "50%",
                        bottom: "50%",
                        transform: `translateX(-50%) rotate(${minuteDeg}deg)`,
                        transformOrigin: "bottom center",
                        clipPath: "polygon(50% 0%, 100% 15%, 65% 25%, 65% 100%, 35% 100%, 35% 25%, 0% 15%)",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                        zIndex: 4,
                    }}
                />

                {/* Breguet-Style Needle Second Hand */}
                <div
                    style={{
                        position: "absolute",
                        width: 2,
                        height: 135,
                        background: "#6b0d0d",
                        left: "50%",
                        bottom: "50%",
                        transform: `translateX(-50%) rotate(${secondDeg}deg)`,
                        transformOrigin: "50% 100%",
                        zIndex: 5,
                    }}
                >
                    {/* Ring detail on the second hand tail */}
                    <div
                        style={{
                            position: "absolute",
                            top: 25,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            border: "2px solid #6b0d0d",
                            background: "transparent",
                        }}
                    />
                </div>

                {/* Heavy Cast Central Cap Button */}
                <div
                    style={{
                        position: "absolute",
                        width: 16,
                        height: 16,
                        background: "radial-gradient(circle, #FFF5D1 0%, #D4AF37 60%, #AA7C11 100%)",
                        border: "2px solid #1a1104",
                        borderRadius: "50%",
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
                        zIndex: 10,
                    }}
                />
            </div>
        </div>
    );
}