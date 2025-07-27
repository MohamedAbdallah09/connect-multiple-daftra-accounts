import { useState } from "react";
import LoadingSpinner from "../Common/LoadingSpinner";
import * as config from "../../config.js";

export default function Login({
    onSuccess,
    goToSignup,
    setAccounts,
    setUsername,
}) {
    const [loginEmail, setLoginEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    async function handleLogin(e) {
        e.preventDefault();
        setIsLoading(true);

        const response = await fetch(`${config.API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: loginEmail, password }),
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem("token", data.token);
            const accountResult = await fetch(`${config.API_URL}/accounts`, {
                headers: {
                    Authorization: `Bearer ${data.token}`,
                },
            });
            const accounts = await accountResult.json();
            setAccounts(accounts);
            setUsername(data.username);
            onSuccess();
        } else {
            setError(data.error);
        }
        setIsLoading(false);
    }
    return (
        <div className="auth-container">
            <LoadingSpinner show={isLoading} />
            <form className="auth-form" onSubmit={handleLogin}>
                <h2 className="auth-title">Login</h2>
                {error && <div className="error-msg">{error}</div>}
                <label>Email</label>
                <input
                    autoFocus
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
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
                    <button
                        className="submit"
                        type="submit"
                        disabled={isLoading}
                    >
                        Login
                    </button>
                </div>
                <p className="auth-switch-text">
                    Don't have an account?{" "}
                    <span className="auth-switch-link" onClick={goToSignup}>
                        Sign up
                    </span>
                </p>
            </form>
        </div>
    );
}
