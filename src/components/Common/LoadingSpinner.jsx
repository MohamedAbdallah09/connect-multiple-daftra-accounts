export default function LoadingSpinner({ show }) {
    if (!show) return null;
    const spinnerStyle = {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 1000000,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    };
    const spinnerInner = {
        width: "80px",
        height: "80px",
        border: "8px solid rgba(255, 255, 255, 0.3)",
        borderTop: "8px solid white",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
    };
    return (
        <div style={spinnerStyle}>
            <div style={spinnerInner}></div>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
