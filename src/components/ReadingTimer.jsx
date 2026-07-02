import React, { useEffect, useState } from "react";

export default function DigitalAestheticClock() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Format time segments with leading zeros
    const hours = String(time.getHours()).padStart(2, "0");
    const minutes = String(time.getMinutes()).padStart(2, "0");
    const seconds = String(time.getSeconds()).padStart(2, "0");

    // Format date string for the subtitle aesthetic
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    const formattedDate = time.toLocaleDateString("en-US", options).toUpperCase();

    return (
        <div
            style={{
                height: "100vh",
                width: "100vw",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                background: "transparent",
                fontFamily: "'Courier New', Courier, monospace",
                userSelect: "none",
                color: "#111111",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                }}
            >
                {/* Main Digital Display */}
                <div
                    style={{
                        fontSize: "calc(4rem + 4vw)",
                        fontWeight: "300",
                        letterSpacing: "-2px",
                        lineHeight: "1",
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <span>{hours}</span>
                    <span style={{ opacity: time.getSeconds() % 2 === 0 ? 1 : 0.2, transition: "opacity 0.2s" }}>:</span>
                    <span>{minutes}</span>
                    <span
                        style={{
                            fontSize: "0.35em",
                            fontWeight: "400",
                            marginLeft: "12px",
                            alignSelf: "flex-end",
                            marginBottom: "0.15em",
                            opacity: 0.8
                        }}
                    >
                        {seconds}
                    </span>
                </div>

                {/* Minimalist Date Underline */}
                <div
                    style={{
                        fontSize: "0.85rem",
                        letterSpacing: "4px",
                        fontWeight: "600",
                        opacity: 0.5,
                        marginTop: "8px"
                    }}
                >
                    {formattedDate}
                </div>
            </div>
        </div>
    );
}