import { useState, useEffect } from "react";
import Select from "react-select";
const customSelectStyles = {
    control: (base, state) => ({
        ...base,
        padding: "0",
        border: "1px solid #ccc",
        borderRadius: "4px",
        fontSize: "12px",
        boxShadow: state.isFocused
            ? "0 0 0 2px rgba(78, 83, 129, 0.2)"
            : "none",
        borderColor: state.isFocused ? "#4e5381" : "#ccc",
        "&:hover": {
            borderColor: "#4e5381",
        },
    }),
    menu: (base) => ({
        ...base,
        zIndex: 100,
    }),
    option: (base, state) => ({
        ...base,
        fontSize: "12px",
        backgroundColor: state.isSelected
            ? "#4E5381"
            : state.isFocused
            ? "#f0f0f0"
            : "white",
        color: state.isSelected ? "white" : "#333",
        padding: "6px 10px",
        cursor: "pointer",
        borderRadius: "3px",
    }),
};
function setDateToEndOfDay(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    date.setHours(23, 59, 59, 999);
    const pad = (n) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
        date.getSeconds()
    )}`;
}
export default function SyncFilter({
    setSyncFilters,
    setShowSyncFilters,
    accounts,
    setSyncing,
}) {
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [selectedAccount, setSelectedAccount] = useState({
        value: "all-accounts",
        label: "All Accounts",
    });
    const options = [
        { value: "all-accounts", label: "All Accounts" },
        ...accounts.map((account) => ({
            value: account.domain_id,
            label: account.business_name,
        })),
    ];
    useEffect(() => {
        const today = new Date();
        setDateTo(today.toISOString().split("T")[0]);
    }, []);
    function handleSubmit(e) {
        e.preventDefault();
        const filters = {
            dateFrom: dateFrom,
            dateTo: setDateToEndOfDay(dateTo),
            account: selectedAccount.value,
        };
        setShowSyncFilters(false);
        setSyncFilters(filters);
        setSyncing(true);
    }

    function cancelSync(e) {
        e.preventDefault();
        setShowSyncFilters(false);
    }
    return (
        <section className="filter-container sync">
            <form onSubmit={handleSubmit}>
                <div className="filter-item">
                    <label>Date From:</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                    />
                </div>
                <div className="filter-item">
                    <label>Date To:</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                    />
                </div>
                <div className="filter-item">
                    <label>Select an account:</label>
                    <Select
                        styles={customSelectStyles}
                        options={options}
                        isSearchable={options.length > 10}
                        value={selectedAccount}
                        onChange={setSelectedAccount}
                    />
                </div>
                <div className="filter-actions">
                    <button className="back" onClick={cancelSync}>
                        Back
                    </button>
                    <button className="submit filter-submit" type="submit">
                        Sync
                    </button>
                </div>
            </form>
        </section>
    );
}
