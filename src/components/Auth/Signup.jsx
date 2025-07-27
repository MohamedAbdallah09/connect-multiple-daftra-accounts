import { useState } from "react";
import LoadingSpinner from "../Common/LoadingSpinner";
import * as config from "../../config.js";
export default function SignUp({ onSuccess, goToLogin }) {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    async function handleSignup(e) {
        e.preventDefault();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Invalid email format");
            return;
        }
        try {
            setIsLoading(true);
            const res = await fetch(`${config.API_URL}/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, username, password }),
            });
            const data = await res.json();
            if (res.ok) {
                onSuccess();
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError("Error connecting to server.");
        }
        setIsLoading(false);
    }

    return (
        <div className="auth-container">
            <LoadingSpinner show={isLoading} />
            <form onSubmit={handleSignup} className="auth-form">
                <h2 className="auth-title">Sign Up</h2>
                {error && <div className="error-msg">{error}</div>}
                <label>Username</label>
                <input
                    autoFocus
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <label>Email</label>
                <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <label>Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <div className="buttons">
                    <button className="submit" type="submit">
                        Sign up
                    </button>
                </div>
                <p className="auth-switch-text">
                    Already have an account?{" "}
                    <span onClick={goToLogin} className="auth-switch-link">
                        Login
                    </span>
                </p>
            </form>
        </div>
    );
}
