import { useState, useEffect } from "react";
import "./App.css";
import "./components/Auth/Auth.css";
import Container from "./components/Common/Container";
import Header from "./components/Header/Header";
import Cards from "./components/Cards/Cards";
import Login from "./components/Auth/Login";
import Filter from "./components/Filter/Filter";
import Tabs from "./components/Tabs/Tabs";
import SignUp from "./components/Auth/Signup";
import AddAccount from "./components/Auth/AddAccount";
import * as config from "./config.js";
import { format } from "./components/Common/functions.js";

function App() {
    const [page, setPage] = useState("login");
    const [username, setUsername] = useState("");
    const [accounts, setAccounts] = useState([]);
    const [filters, setFilters] = useState({
        account: "all-accounts",
        date_from: null,
        date_to: null,
    });
    const [activeTab, setActiveTab] = useState("invoices");
    const [cardsData, setCardsData] = useState([
        {
            title: activeTab,
            description: 0,
        },
        {
            title: "Total",
            description: format(0),
        },
    ]);
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            fetch(`${config.API_URL}/me`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then((res) => {
                    if (!res.ok) throw new Error("Invalid token");
                    return res.json();
                })
                .then((data) => {
                    setUsername(data.username);
                    setAccounts(data.accounts);
                    setPage("app");
                })
                .catch(() => {
                    localStorage.removeItem("token");
                    setUser(null);
                });
        }
    }, []);
    if (page === "login") {
        return (
            <Login
                onSuccess={() => setPage("app")}
                goToSignup={() => setPage("signup")}
                setAccounts={setAccounts}
                setUsername={setUsername}
            />
        );
    }
    if (page === "signup") {
        return (
            <SignUp
                onSuccess={() => setPage("login")}
                goToLogin={() => setPage("login")}
            />
        );
    }
    if (page === "addAccount") {
        return (
            <AddAccount
                setAccounts={setAccounts}
                setAddingAccount={() => setPage("app")}
            />
        );
    }
    return (
        <>
            <Header
                setAccounts={setAccounts}
                accounts={accounts}
                setAddingAccount={() => setPage("addAccount")}
                username={username}
                setPage={setPage}
            />
            <Container>
                <Filter accounts={accounts} setFilters={setFilters} />
                <Cards data={cardsData} />
                <Tabs
                    accounts={accounts}
                    filters={filters}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    setCardsData={setCardsData}
                />
            </Container>
        </>
    );
}

export default App;
