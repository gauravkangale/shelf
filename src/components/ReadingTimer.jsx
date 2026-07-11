import React, { useEffect, useState } from "react";
import { THEME_COLOR_ROLES } from "../utils/themePresets";
import { Pencil, Sun, Moon, X, Plus, Trash2, Check } from "lucide-react";
import { uGet, uSet } from "../utils/userKey";
import NotebookScratchpad from "./NotebookScratchpad";

export default function DesktopNeumorphicDashboard({ username }) {
    const [time, setTime] = useState(new Date());
    const [weather, setWeather] = useState(null);
    const [cryptoData, setCryptoData] = useState(null);
    const [newsData, setNewsData] = useState(null);
    const [image, setImage] = useState(() => uGet('dashboard_image') || null);
    const fileInputRef = React.useRef(null);

    const syncPrefs = async (newPrefs) => {
        const token = localStorage.getItem('shelf_auth_token');
        if (!token) return false;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/preferences`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ preferences: newPrefs })
            });
            return res.ok;
            // eslint-disable-next-line no-unused-vars
        } catch (err) {
            return false;
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const rawBase64 = event.target.result;

            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX = 600;

                let w = img.width;
                let h = img.height;

                if (w > h && w > MAX) {
                    h = (h * MAX) / w;
                    w = MAX;
                } else if (h > MAX) {
                    w = (w * MAX) / h;
                    h = MAX;
                }

                canvas.width = w;
                canvas.height = h;

                const ctx = canvas.getContext("2d");
                if (!ctx) return;

                ctx.drawImage(img, 0, 0, w, h);

                const compressed = canvas.toDataURL("image/jpeg", 0.6);

                setImage(compressed);
                uSet("dashboard_image", compressed);
                syncPrefs({ dashboard_image: compressed })
                    .then(success => {
                        if (!success) alert("Failed to save image to database. It might be too large.");
                    });
            };

            img.onerror = () => {
                setImage(rawBase64);
                uSet("dashboard_image", rawBase64);
                syncPrefs({ dashboard_image: rawBase64 })
                    .then(success => {
                        if (!success) alert("Failed to save image to database. It might be too large.");
                    });
            };

            img.src = rawBase64;
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        const fetchPrefs = async () => {
            const token = localStorage.getItem('shelf_auth_token');
            if (!token) return;
            try {
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/preferences`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.preferences && data.preferences.dashboard_image !== undefined) {
                        setImage(data.preferences.dashboard_image);
                        uSet('dashboard_image', data.preferences.dashboard_image);
                    }
                }

                // eslint-disable-next-line no-unused-vars
                // eslint-disable-next-line no-empty
            } catch (err) { }
        };
        fetchPrefs();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const hours = String(time.getHours()).padStart(2, "0");
    const minutes = String(time.getMinutes()).padStart(2, "0");

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const dayName = days[time.getDay()];
    const currentMonth = months[time.getMonth()];
    const formattedDate = `${time.getFullYear()}/${String(time.getMonth() + 1).padStart(2, '0')}/${String(time.getDate()).padStart(2, '0')}`;

    const startOfYear = new Date(time.getFullYear(), 0, 1);
    const endOfYear = new Date(time.getFullYear() + 1, 0, 1);
    const yearProgress = Math.floor(((time - startOfYear) / (endOfYear - startOfYear)) * 100);

    const currentHours = time.getHours();
    const currentMinutes = time.getMinutes();
    const elapsedMinutes = currentHours * 60 + currentMinutes;
    const totalMinutesInDay = 24 * 60;
    const dayProgress = Math.floor((elapsedMinutes / totalMinutesInDay) * 100);
    const dayRemaining = 100 - dayProgress;

    const getGreetingIcon = () => {
        const hrs = time.getHours();
        if (hrs >= 6 && hrs < 18) {
            return <Sun size={36} strokeWidth={1.5} style={{ color: `var(${THEME_COLOR_ROLES.accentColor.cssVar})` }} />;
        }
        return <Moon size={36} strokeWidth={1.5} style={{ color: `var(${THEME_COLOR_ROLES.accentColor.cssVar})` }} />;
    };

    const getGreetingText = () => {
        const hrs = time.getHours();
        if (hrs < 12) return "Good Morning";
        if (hrs < 17) return "Good Afternoon";
        return "Good Evening";
    };

    const [calendarDate, setCalendarDate] = useState(new Date());
    const [hasNotesMap, setHasNotesMap] = useState({});
    const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
    const [newNoteText, setNewNoteText] = useState('');
    const [allNotes, setAllNotes] = useState(() => uGet('shelf_daily_notes', {}));
    const [isCalendarTextClicked, setIsCalendarTextClicked] = useState(false);


    useEffect(() => {
        const updateNotes = () => {
            const parsed = uGet('shelf_daily_notes') || {};
            setAllNotes(parsed);
            const map = {};
            Object.keys(parsed).forEach(key => {
                if (parsed[key] && parsed[key].length > 0) {
                    map[key] = true;
                }
            });
            setHasNotesMap(map);
        };

        updateNotes();

        window.addEventListener('notes-updated', updateNotes);
        window.addEventListener('storage', updateNotes);
        return () => {
            window.removeEventListener('notes-updated', updateNotes);
            window.removeEventListener('storage', updateNotes);
        };
    }, []);

    const handleAddNote = (e) => {
        e.preventDefault();
        if (!selectedCalendarDate || !newNoteText.trim()) return;

        const dateKey = selectedCalendarDate.toDateString();
        const newNote = {
            id: Date.now(),
            text: newNoteText.trim(),
            completed: false
        };

        const updated = {
            ...allNotes,
            [dateKey]: [...(allNotes[dateKey] || []), newNote]
        };

        setAllNotes(updated);
        uSet('shelf_daily_notes', updated);
        window.dispatchEvent(new Event('notes-updated'));
        setNewNoteText('');
    };

    const handleToggleNote = (noteId) => {
        if (!selectedCalendarDate) return;
        const dateKey = selectedCalendarDate.toDateString();
        const updated = {
            ...allNotes,
            [dateKey]: (allNotes[dateKey] || []).map((note) =>
                note.id === noteId ? { ...note, completed: !note.completed } : note
            )
        };
        setAllNotes(updated);
        uSet('shelf_daily_notes', updated);
        window.dispatchEvent(new Event('notes-updated'));
    };

    const handleDeleteNote = (noteId) => {
        if (!selectedCalendarDate) return;
        const dateKey = selectedCalendarDate.toDateString();
        const updated = {
            ...allNotes,
            [dateKey]: (allNotes[dateKey] || []).filter((note) => note.id !== noteId)
        };
        setAllNotes(updated);
        uSet('shelf_daily_notes', updated);
        window.dispatchEvent(new Event('notes-updated'));
    };

    const handlePrevMonth = () => {
        setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const calendarYear = calendarDate.getFullYear();
    const calendarMonth = calendarDate.getMonth();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();

    const outerShadow = `var(--shadow-md)`;
    const innerShadow = `none`;

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                const res = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?q=Pimpri-Chinchwad,IN&units=metric&appid=YOUR_API_KEY`
                );

                const data = await res.json();

                if (res.ok) {
                    setWeather(data);
                } else {
                    console.error(data.message);
                }
            } catch (err) {
                console.error(err);
            }
        };

        const fetchCrypto = async () => {
            try {
                const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true");
                const data = await res.json();
                if (res.ok) setCryptoData(data);
            } catch (err) {
                console.error(err);
            }
        };

        const fetchNews = async () => {
            try {
                const res = await fetch("https://api.rss2json.com/v1/api.json?rss_url=https://techcrunch.com/feed/");
                const data = await res.json();
                if (res.ok) setNewsData(data.items.slice(0, 4));
            } catch (err) {
                console.error(err);
            }
        };

        fetchWeather();
        fetchCrypto();
        fetchNews();
    }, []);

    return (
        <div
            style={{
                minHeight: "100vh",
                width: "100vw",
                backgroundColor: `var(${THEME_COLOR_ROLES.background.cssVar})`,
                color: `var(${THEME_COLOR_ROLES.textPrimary.cssVar})`,
                fontFamily: "var(--sans)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "20px",
                boxSizing: "border-box",
                userSelect: "none",
                overflow: "hidden",
            }}
        >
            {/* Desktop Grid Layout based on Screenshot 2026-07-03 at 10.24.07 AM.jpg */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gridGap: "20px",
                    maxWidth: "1100px",
                    width: "100%",
                }}
            >
                {/* --- ROW 1: Analog Clock & Greeting --- */}
                <div style={{ gridColumn: "1", display: "flex", justifyContent: "flex-start", alignItems: "flex-start" }}>
                    <div
                        style={{
                            width: "140px",
                            height: "140px",
                            borderRadius: "50%",
                            backgroundColor: `var(${THEME_COLOR_ROLES.panel.cssVar})`,
                            border: '1.5px solid var(--border-color)',
                            boxShadow: outerShadow,
                            position: "relative",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <div style={{ position: "absolute", top: "12px", fontSize: "14px", color: `var(${THEME_COLOR_ROLES.textSecondary.cssVar})`, fontWeight: "600" }}>12</div>
                        <div style={{ position: "absolute", bottom: "12px", fontSize: "14px", color: `var(${THEME_COLOR_ROLES.textSecondary.cssVar})`, fontWeight: "600" }}>6</div>
                        <div style={{ position: "absolute", left: "12px", fontSize: "14px", color: `var(${THEME_COLOR_ROLES.textSecondary.cssVar})`, fontWeight: "600" }}>9</div>
                        <div style={{ position: "absolute", right: "12px", fontSize: "14px", color: `var(${THEME_COLOR_ROLES.textSecondary.cssVar})`, fontWeight: "600" }}>3</div>

                        {/* Clock Hands */}
                        <div style={{ width: "6px", height: "40px", backgroundColor: `var(${THEME_COLOR_ROLES.textSecondary.cssVar})`, position: "absolute", bottom: "50%", left: "calc(50% - 3px)", transformOrigin: "bottom center", transform: `rotate(${(time.getHours() % 12) * 30 + time.getMinutes() * 0.5}deg)`, borderRadius: "3px" }} />
                        <div style={{ width: "4px", height: "55px", backgroundColor: `var(${THEME_COLOR_ROLES.textPrimary.cssVar})`, position: "absolute", bottom: "50%", left: "calc(50% - 2px)", transformOrigin: "bottom center", transform: `rotate(${time.getMinutes() * 6}deg)`, borderRadius: "2px" }} />
                        <div style={{ width: "12px", height: "12px", backgroundColor: `var(${THEME_COLOR_ROLES.accentColor.cssVar})`, borderRadius: "50%", zIndex: 10, border: `3px solid var(${THEME_COLOR_ROLES.panel.cssVar})` }} />
                    </div>
                </div>

                <div
                    style={{
                        gridColumn: "2 / 4",
                        backgroundColor: `var(${THEME_COLOR_ROLES.panel.cssVar})`,
                        border: '1.5px solid var(--border-color)',
                        borderRadius: "20px",
                        boxShadow: outerShadow,
                        padding: "24px 32px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        height: "140px",
                        boxSizing: "border-box",
                        position: "relative",
                        overflow: "hidden"
                    }}
                >
                    {/* Faded Month Backdrop Text */}
                    <div style={{
                        position: 'absolute',
                        right: '16px',
                        bottom: '-16px',
                        fontSize: '6.5rem',
                        fontWeight: '900',
                        fontFamily: 'var(--serif)',
                        color: `var(${THEME_COLOR_ROLES.ink.cssVar})`,
                        opacity: 0.05,
                        pointerEvents: 'none',
                        userSelect: 'none',
                        textTransform: 'uppercase',
                        letterSpacing: '4px'
                    }}>
                        {currentMonth.substring(0, 4)}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: `var(${THEME_COLOR_ROLES.textSecondary.cssVar})`, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                                {getGreetingText()}
                            </span>
                        </div>
                        <h1 style={{
                            fontFamily: "var(--serif)",
                            fontSize: "2.4rem",
                            margin: "0 0 4px 0",
                            color: `var(${THEME_COLOR_ROLES.ink.cssVar})`,
                            fontWeight: "800",
                            letterSpacing: "0.5px"
                        }}>
                            Hello <span style={{ color: `var(${THEME_COLOR_ROLES.accentColor.cssVar})` }}>{username}</span>
                        </h1>
                        <p style={{ margin: 0, fontSize: "0.95rem", color: `var(${THEME_COLOR_ROLES.textSecondary.cssVar})`, fontWeight: "500", fontStyle: "italic" }}>
                            Live every day with ease!
                        </p>
                    </div>
                    <div style={{ zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: '8px' }}>
                        {getGreetingIcon()}
                    </div>
                </div>

                {/* --- ROW 2: Digital Clock & Date Panel --- */}
                <div
                    style={{
                        gridColumn: "span 3",
                        backgroundColor: `var(${THEME_COLOR_ROLES.panel.cssVar})`,
                        border: '1.5px solid var(--border-color)',
                        borderRadius: "20px",
                        boxShadow: outerShadow,
                        padding: "20px 40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    {/* Recessed Clock Display */}
                    <div
                        style={{
                            backgroundColor: `var(${THEME_COLOR_ROLES.optionBg.cssVar})`,
                            border: '1px solid var(--border-color)',
                            borderRadius: "12px",
                            padding: "12px 24px",
                            fontSize: "4.5rem",
                            fontWeight: "700",
                            color: `var(${THEME_COLOR_ROLES.ink.cssVar})`,
                            letterSpacing: "3px",
                            display: "flex",
                            alignItems: "center",
                        }}
                    >
                        <span>{hours}</span>
                        <span style={{ opacity: time.getSeconds() % 2 === 0 ? 1 : 0.3, transition: "opacity 0.2s ease", margin: "0 6px" }}>:</span>
                        <span>{minutes}</span>
                    </div>

                    {/* Notebook Scratchpad */}
                    <NotebookScratchpad />

                    <div style={{ textAlign: "right" }}>
                        <h2 style={{ fontSize: "2.2rem", margin: "0 0 10px 0", color: `var(${THEME_COLOR_ROLES.ink.cssVar})`, fontWeight: "600" }}>{dayName}</h2>
                        <p style={{ fontSize: "1.2rem", margin: 0, color: `var(${THEME_COLOR_ROLES.textSecondary.cssVar})`, letterSpacing: "1px" }}>{formattedDate}</p>
                    </div>
                </div>

                {/* --- ROW 3: Day Progress Bar --- */}
                <div style={{ gridColumn: "span 3" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px", fontSize: "1rem", color: `var(${THEME_COLOR_ROLES.textSecondary.cssVar})`, fontWeight: "600" }}>
                        The day so far <span style={{ color: `var(${THEME_COLOR_ROLES.accentColor.cssVar})`, marginLeft: "8px" }}>{dayProgress}%</span>
                    </div>
                    <div
                        style={{
                            width: "100%",
                            height: "24px",
                            borderRadius: "12px",
                            backgroundColor: `var(${THEME_COLOR_ROLES.optionBg.cssVar})`,
                            border: '1px solid var(--border-color)',
                            padding: "3px",
                            boxSizing: "border-box"
                        }}
                    >
                        <div
                            style={{
                                height: "100%",
                                width: `${dayProgress}%`,
                                background: `linear-gradient(90deg, var(${THEME_COLOR_ROLES.accentSoft.cssVar}) 0%, var(${THEME_COLOR_ROLES.accentColor.cssVar}) 100%)`,
                                borderRadius: "8px",
                                transition: "width 1s ease"
                            }}
                        />
                    </div>
                </div>

                {/* --- ROW 4: Bottom Widgets --- */}

                {/* ================= IMAGES ================= */}
                <div
                    style={{
                        position: "relative",
                        borderRadius: "18px",
                        overflow: "hidden",
                        border: "1.5px solid var(--border-color)",
                        boxShadow: outerShadow,
                        height: "100%"
                    }}
                >

                    {/* IMAGE PREVIEW */}
                    {image ? (
                        <img
                            src={image}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover"
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#888",
                                borderRadius: "18px",
                                background: "rgba(0,0,0,0.04)"
                            }}
                        >
                            No image selected
                        </div>
                    )}

                    {/* PENCIL BUTTON */}
                    <button
                        className="pencil-edit-icon"
                        style={{
                            position: "absolute",
                            opacity: 1,
                            width: "22px",
                            height: "22px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer"
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (fileInputRef.current) {
                                fileInputRef.current.value = "";
                                fileInputRef.current.click();
                            }
                        }}
                        title="Upload Context Document"
                    >
                        <Pencil size={10} />
                    </button>

                    {/* FILE INPUT */}
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                    />
                </div>

                {/* ================= IT / SOFTWARE NEWS ================= */}
                <div
                    style={{
                        backgroundColor: `var(${THEME_COLOR_ROLES.panel.cssVar})`,
                        border: '1.5px solid var(--border-color)',
                        borderRadius: "20px",
                        boxShadow: outerShadow,
                        padding: "24px 20px",
                        flex: 1,
                        minWidth: "240px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        alignSelf: "flex-start"
                    }}
                >
                    <p
                        style={{
                            margin: "0 0 16px 0",
                            color: `var(${THEME_COLOR_ROLES.textSecondary.cssVar})`,
                            fontWeight: "600",
                            fontSize: "1rem",
                            textAlign: "center"
                        }}
                    >
                        TechCrunch News
                    </p>

                    {!newsData ? (
                        <div style={{ color: `var(${THEME_COLOR_ROLES.textSecondary.cssVar})`, marginTop: "20px" }}>Loading news...</div>
                    ) : (
                        newsData.map((n, i) => (
                            <div
                                key={i}
                                style={{
                                    width: "100%",
                                    padding: "8px 0",
                                    borderBottom: i < 3 ? "1.5px solid var(--border-color)" : "none"
                                }}
                            >
                                <a
                                    href={n.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ textDecoration: "none", display: "block" }}
                                    onMouseEnter={e => {
                                        const t = e.currentTarget.querySelector('.news-title');
                                        if (t) t.style.color = 'var(--accent-color)';
                                    }}
                                    onMouseLeave={e => {
                                        const t = e.currentTarget.querySelector('.news-title');
                                        if (t) t.style.color = `var(${THEME_COLOR_ROLES.ink.cssVar})`;
                                    }}
                                >
                                    <div
                                        className="news-title"
                                        style={{
                                            fontWeight: "700",
                                            color: `var(${THEME_COLOR_ROLES.ink.cssVar})`,
                                            fontSize: "0.85rem",
                                            marginBottom: "2px",
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                            transition: "color 0.2s ease"
                                        }}
                                    >
                                        {n.title}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "0.75rem",
                                            color: `var(${THEME_COLOR_ROLES.textSecondary.cssVar})`
                                        }}
                                    >
                                        {new Date(n.pubDate).toLocaleDateString()}
                                    </div>
                                </a>
                            </div>
                        ))
                    )}
                </div>



                {/* Calendar */}
                {/* Calendar */}
                <div style={{
                    backgroundColor: `var(${THEME_COLOR_ROLES.panel.cssVar})`,
                    border: '1.5px solid var(--border-color)',
                    borderRadius: "20px",
                    boxShadow: outerShadow,
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignSelf: "flex-start"
                }}>
                    <style>{`
                        @keyframes calendarGridFade {
                            from {
                                opacity: 0.5;
                            }
                            to {
                                opacity: 1;
                            }
                        }
                        @keyframes plansListFade {
                            from {
                                opacity: 0.6;
                                transform: translateY(1.5px);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0);
                            }
                        }
                    `}</style>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <span style={{ fontWeight: "700", fontSize: "1.2rem", color: `var(${THEME_COLOR_ROLES.ink.cssVar})` }}>
                            {months[calendarMonth]} {calendarYear}
                        </span>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <button onClick={handlePrevMonth} style={{ background: "transparent", border: "none", cursor: "pointer", color: `var(${THEME_COLOR_ROLES.textSecondary.cssVar})`, fontWeight: "bold" }}>{"<"}</button>
                            <span 
                                onClick={() => {
                                    setCalendarDate(new Date());
                                    setSelectedCalendarDate(new Date());
                                    setIsCalendarTextClicked(true);
                                    setTimeout(() => setIsCalendarTextClicked(false), 200);
                                }}
                                style={{ 
                                    fontWeight: "600", 
                                    fontSize: "0.9rem", 
                                    color: `var(${THEME_COLOR_ROLES.textSecondary.cssVar})`, 
                                    letterSpacing: "1px",
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    transform: isCalendarTextClicked ? 'scale(0.92)' : 'scale(1)',
                                    transition: 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    display: 'inline-block'
                                }}
                                title="Reset to Current Date"
                            >
                                CALENDAR
                            </span>
                            <button onClick={handleNextMonth} style={{ background: "transparent", border: "none", cursor: "pointer", color: `var(${THEME_COLOR_ROLES.textSecondary.cssVar})`, fontWeight: "bold" }}>{">"}</button>
                        </div>
                    </div>

                    <div 
                        key={`${calendarMonth}-${calendarYear}`}
                        style={{ 
                            display: "grid", 
                            gridTemplateColumns: "repeat(7, 1fr)", 
                            gap: "8px", 
                            textAlign: "center", 
                            fontSize: "0.9rem",
                            animation: "calendarGridFade 0.18s ease-out"
                        }}
                    >
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                            <span key={d} style={{ color: i === 0 || i === 6 ? "var(--rust)" : `var(${THEME_COLOR_ROLES.accentColor.cssVar})`, fontWeight: "700", fontSize: "0.75rem", marginBottom: "4px" }}>
                                {d}
                            </span>
                        ))}

                        {/* Blank spaces for typical calendar alignment */}
                        {[...Array(firstDay)].map((_, i) => <span key={`empty-${i}`} />)}

                        {[...Array(daysInMonth)].map((_, i) => {
                            const day = i + 1;
                            const isToday = time.getDate() === day && time.getMonth() === calendarMonth && time.getFullYear() === calendarYear;
                            const cellDate = new Date(calendarYear, calendarMonth, day);
                            const isSelected = selectedCalendarDate && 
                                selectedCalendarDate.getDate() === day && 
                                selectedCalendarDate.getMonth() === calendarMonth && 
                                selectedCalendarDate.getFullYear() === calendarYear;
                            const hasNotes = hasNotesMap[cellDate.toDateString()];
                            return (
                                <div
                                    key={i}
                                    onClick={() => setSelectedCalendarDate(cellDate)}
                                    onMouseEnter={e => {
                                        if (!isToday && !isSelected) {
                                            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!isToday && !isSelected) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }
                                    }}
                                    style={{
                                        fontWeight: "600",
                                        backgroundColor: isToday ? "var(--rust)" : "transparent",
                                        color: isToday ? "#FFFFFF" : `var(${THEME_COLOR_ROLES.ink.cssVar})`,
                                        borderRadius: "6px",
                                        padding: "4px 0",
                                        boxShadow: isToday ? '0 3px 8px rgba(0, 0, 0, 0.12)' : "none",
                                        position: "relative",
                                        cursor: "pointer",
                                        border: isSelected ? "1.5px solid var(--rust)" : "1.5px solid transparent",
                                        boxSizing: "border-box",
                                        transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)'
                                    }}
                                    title="Click to view/set Plans & Notes"
                                >
                                    {day}
                                    {hasNotes && (
                                        <span style={{
                                            position: 'absolute',
                                            bottom: '2px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            width: '4px',
                                            height: '4px',
                                            borderRadius: '50%',
                                            backgroundColor: isToday ? '#FFFFFF' : 'var(--rust, #b33933)'
                                        }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Inline Separator */}
                    <div style={{ borderTop: "1px solid var(--border-color)", margin: "16px 0" }} />

                    {/* Inline Quick Plans & Notes Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.95rem', color: `var(${THEME_COLOR_ROLES.ink.cssVar})` }}>
                                {selectedCalendarDate ? selectedCalendarDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Select a date'} Plans
                            </span>
                        </div>

                        <div 
                            key={selectedCalendarDate ? selectedCalendarDate.toDateString() : 'empty'}
                            style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '6px', 
                                maxHeight: '140px', 
                                overflowY: 'auto', 
                                paddingRight: '2px',
                                animation: "plansListFade 0.18s ease-out"
                            }}
                        >
                            {(!selectedCalendarDate || !allNotes[selectedCalendarDate.toDateString()] || allNotes[selectedCalendarDate.toDateString()].length === 0) ? (
                                <p style={{ margin: '8px 0', fontSize: '0.8rem', color: `var(${THEME_COLOR_ROLES.textSecondary.cssVar})`, fontStyle: 'italic', textAlign: 'center' }}>
                                    No plans set for this day.
                                </p>
                            ) : (
                                allNotes[selectedCalendarDate.toDateString()].map(note => (
                                    <div 
                                        key={note.id} 
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between', 
                                            padding: '6px 8px', 
                                            borderRadius: '8px', 
                                            backgroundColor: note.completed ? `var(${THEME_COLOR_ROLES.optionBg.cssVar})` : 'transparent',
                                            border: '1px solid var(--border-color)',
                                            opacity: note.completed ? 0.7 : 1,
                                            transition: 'all 0.2s ease-in-out'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer' }} onClick={() => handleToggleNote(note.id)}>
                                            <div style={{
                                                width: '14px',
                                                height: '14px',
                                                borderRadius: '4px',
                                                border: `1.5px solid ${note.completed ? 'var(--rust)' : `var(${THEME_COLOR_ROLES.textSecondary.cssVar})`}`,
                                                backgroundColor: note.completed ? 'var(--rust)' : 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#FFF',
                                                transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)'
                                            }}>
                                                {note.completed && <Check size={10} strokeWidth={3} />}
                                            </div>
                                            <span style={{ 
                                                fontSize: '0.8rem', 
                                                color: `var(${THEME_COLOR_ROLES.ink.cssVar})`,
                                                textDecoration: note.completed ? 'line-through' : 'none',
                                                userSelect: 'none',
                                                textAlign: 'left',
                                                transition: 'all 0.2s ease'
                                            }}>
                                                {note.text}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteNote(note.id)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--rust)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '2px',
                                                opacity: 0.6,
                                                transition: 'opacity 0.2s ease'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                            onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {selectedCalendarDate && (
                            <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px' }}>
                                <input 
                                    type="text"
                                    placeholder="Add a plan or note..."
                                    value={newNoteText}
                                    onChange={e => setNewNoteText(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        border: '1.5px solid var(--border-color)',
                                        backgroundColor: `var(${THEME_COLOR_ROLES.optionBg.cssVar})`,
                                        color: `var(${THEME_COLOR_ROLES.ink.cssVar})`,
                                        fontFamily: 'var(--sans)',
                                        fontSize: '0.8rem',
                                        outline: 'none',
                                        transition: 'border-color 0.2s ease'
                                    }}
                                />
                                <button 
                                    type="submit"
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--rust)',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                        transition: 'transform 0.2s ease, background-color 0.2s ease'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <Plus size={14} />
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}