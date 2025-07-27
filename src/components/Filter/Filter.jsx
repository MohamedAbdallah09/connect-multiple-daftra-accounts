import { useState } from "react";
import Select from "react-select";
import "./Filter.css";
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
export default function Filter({ accounts, setFilters }) {
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [selectedAccount, setSelectedAccount] = useState({
        value: "all-accounts",
        label: "All Accounts",
    });
    const options = [
        { value: "all-accounts", label: "All Accounts" },
        ...accounts.map((account) => ({
            value: account.business_name,
            label: account.business_name,
        })),
    ];
    function handleSubmit(e) {
        e.preventDefault();
        const filters = {
            dateFrom,
            dateTo,
            account: selectedAccount?.value || "all-accounts",
        };
        setFilters(filters);
    }
    function handleClearFilter() {
        setDateFrom("");
        setDateTo("");
        setSelectedAccount({
            value: "all-accounts",
            label: "All Accounts",
        });
        const filters = {
            dateFrom,
            dateTo,
            account: selectedAccount?.value || "all-accounts",
        };
        setFilters(filters);
    }
    return (
        <section className="filter-container">
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
                    <button className="submit filter-submit" type="submit">
                        Search
                    </button>
                    <button className="back" onClick={handleClearFilter}>
                        Clear
                    </button>
                </div>
            </form>
        </section>
    );
}
