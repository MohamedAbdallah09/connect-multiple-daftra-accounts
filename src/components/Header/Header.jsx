import { useState } from "react";
import "./Header.css";
import * as config from "../../config.js";

export default function Header({
    accounts,
    setAddingAccount,
    setAccounts,
    username,
    setPage,
}) {
    const [showAccounts, setShowAccounts] = useState(false);
    function handleAccountsClick() {
        setShowAccounts((prev) => !prev);
    }
    async function deleteAccount(domain_id) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this account?"
        );
        if (!confirmed) return;
        const token = localStorage.getItem("token");
        const res = await fetch(`${config.API_URL}/accounts/${domain_id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const data = await res.json();
        if (res.ok) {
            setAccounts((prevAccounts) =>
                prevAccounts.filter((acc) => acc.domain_id !== domain_id)
            );
        } else {
            alert("Failed to delete account");
        }
        if (data.success) {
            if (!data.usedByAnotherUser) {
                deleteInvoices(data.domain_id);
                deleteJournals(data.domain_id);
                deletePurchaseInvoices(data.domain_id);
                deleteCostCenters(data.domain_id);
            }
        }
    }
    async function deleteInvoices(domain_id) {
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${config.API_URL}/invoices/${domain_id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(
                    `Failed to delete invoices: ${res.status} - ${errorText}`
                );
            }
        } catch (error) {
            console.error("Error deleting invoices:", error.message);
        }
    }
    async function deleteCostCenters(domain_id) {
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(
                `${config.API_URL}/cost_center_transactions/${domain_id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(
                    `Failed to delete cost center: ${res.status} - ${errorText}`
                );
            }
        } catch (error) {
            console.error("Error deleting cost center:", error.message);
        }
    }
    async function deleteJournals(domain_id) {
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(
                `${config.API_URL}/journal_transactions/${domain_id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(
                    `Failed to delete journals: ${res.status} - ${errorText}`
                );
            }
        } catch (error) {
            console.error("Error deleting journals:", error.message);
        }
    }
    async function deletePurchaseInvoices(domain_id) {
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(
                `${config.API_URL}/purchase_invoices/${domain_id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(
                    `Failed to delete purchase invoices: ${res.status} - ${errorText}`
                );
            }
        } catch (error) {
            console.error("Error deleting purchase invoices:", error.message);
        }
    }
    function handleLogout() {
        localStorage.removeItem("token");
        setPage("login");
    }
    return (
        <header className="header">
            <div className="header-container">
                <div className="header-left">
                    <h1>Hello, {username || "There"}!</h1>
                </div>
                <div className="header-right" style={{ position: "relative" }}>
                    <img
                        src="https://cdn.daftra.com/assets/img/avatar/avatar_light_32px.svg"
                        alt="profile"
                        className="profile"
                        onClick={handleAccountsClick}
                    />
                    {showAccounts && (
                        <div className="accounts-dropdown">
                            <h4>Accounts</h4>
                            <ul>
                                {accounts.length === 0 ? (
                                    <li>No accounts added</li>
                                ) : (
                                    accounts.map((account, index) => (
                                        <li key={index} className="account">
                                            {account.business_name}
                                            <span
                                                onClick={() =>
                                                    deleteAccount(
                                                        account.domain_id
                                                    )
                                                }
                                            >
                                                <i className="danger fas fa-trash"></i>
                                            </span>
                                        </li>
                                    ))
                                )}
                            </ul>
                            <button
                                className="submit"
                                onClick={() => {
                                    setShowAccounts(false);
                                    setAddingAccount(true);
                                }}
                            >
                                Add An Account
                            </button>
                            <button onClick={handleLogout} className="danger">
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
