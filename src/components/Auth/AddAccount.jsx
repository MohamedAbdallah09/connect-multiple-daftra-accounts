import { useState } from "react";
import LoadingSpinner from "../Common/LoadingSpinner";
import * as config from "../../config.js";
async function getAccessToken(
    domain,
    email,
    password,
    setIsLoading,
    setAddingAccount,
    setAccounts,
    setError,
    subdomainProvider
) {
    try {
        setIsLoading(true);
        const response = await fetch(
            `https://${domain}.${subdomainProvider}.com/v2/oauth/token`,
            {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    client_secret: "jCfy6cMh1X6NTxR3OWLuvEFa0si5uZKr05UeoAEs",
                    client_id: "1",
                    grant_type: "password",
                    username: email,
                    password: password,
                }),
            }
        );
        const data = await response.json();
        if (data.access_token) {
            const siteInfo = await getSiteInfo(data.access_token, domain);
            const siteBranches = await getBranches(data.access_token, domain);
            const postAccountResult = await postAccount(
                domain,
                data.access_token,
                siteInfo.business_name,
                siteBranches
            );
            if (postAccountResult?.success) {
                setAccounts((prevAccounts) => [
                    {
                        domain: domain,
                        access_token: data.access_token,
                        business_name: siteInfo.business_name,
                        domain_id: postAccountResult.domain_id,
                        branches: siteBranches,
                    },
                    ...prevAccounts,
                ]);
                setAddingAccount();
            } else {
                setError(postAccountResult.reason);
            }
        } else {
            setError("Invalid email or password");
        }
    } catch (err) {
        throw new Error(err);
    } finally {
        setIsLoading(false);
    }
}
async function getSiteInfo(access_token, domain) {
    const response = await fetch(
        `https://${domain}.daftra.com/api2/site_info`,
        {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${access_token}`,
            },
        }
    );
    const data = await response.json();
    return data.data.Site;
}
async function getBranches(access_token, domain) {
    const response = await fetch(
        `https://${domain}.daftra.com/v2/api/entity/branch/list`,
        {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${access_token}`,
            },
        }
    );
    const data = await response.json();
    return data.data.map((branch) => branch.id);
}
async function postAccount(domain, access_token, business_name, branches) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${config.API_URL}/accounts`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            domain,
            access_token,
            business_name,
            branches,
        }),
    });
    if (!response.ok) {
        return { success: false };
    }
    const data = await response.json();
    return data;
}

export default function AddAccount({ setAccounts, setAddingAccount }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [domain, setDomain] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        let subdomainProvider = "daftra";
        const tryAddAccount = async () => {
            await getAccessToken(
                domain,
                email,
                password,
                setIsLoading,
                setAddingAccount,
                setAccounts,
                setError,
                subdomainProvider
            );
        };
        try {
            await tryAddAccount();
        } catch (err) {
            try {
                subdomainProvider = "daftara";
                await tryAddAccount();
            } catch (err) {
                setError("Please try again later");
            }
        }
    }
    return (
        <>
            <LoadingSpinner show={isLoading} />
            <div className="auth-container">
                <form className="auth-form" onSubmit={handleSubmit}>
                    <h2 className="auth-title">Add an account</h2>
                    {error && <div className="error-msg">{error}</div>}
                    <div>
                        <label>Domain</label>
                        <input
                            type="text"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="buttons">
                        <button
                            type="button"
                            className="back"
                            onClick={setAddingAccount}
                        >
                            Back
                        </button>
                        <button
                            className="submit login"
                            type="submit"
                            disabled={isLoading}
                        >
                            Add account
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
