// Tabs.jsx
import { useState, useEffect } from "react";
import InvoicesTab from "./InvoicesTab";
import JournalsTab from "./JournalsTab";
import PurchaseInvoicesTab from "./PurchaseInvoicesTab";
import CostCentersTab from "./CostCentersTab";
import "./Tabs.css";

export default function Tabs({
    accounts,
    filters,
    activeTab,
    setActiveTab,
    setCardsData,
}) {
    const [reloadTab, setReloadTab] = useState(false);
    return (
        <section className="tabs-container">
            <div className="tabs-header">
                <button
                    className={activeTab === "invoices" ? "active" : "back"}
                    onClick={() => setActiveTab("invoices")}
                >
                    Invoices
                </button>
                <button
                    className={activeTab === "journals" ? "active" : "back"}
                    onClick={() => setActiveTab("journals")}
                >
                    Journals
                </button>
                <button
                    className={
                        activeTab === "purchase invoices" ? "active" : "back"
                    }
                    onClick={() => setActiveTab("purchase invoices")}
                >
                    Purchase invoices
                </button>
                <button
                    className={activeTab === "cost centers" ? "active" : "back"}
                    onClick={() => setActiveTab("cost centers")}
                >
                    Cost centers
                </button>
            </div>
            <div className="tabs-content">
                {activeTab === "invoices" && (
                    <>
                        <InvoicesTab
                            key={reloadTab}
                            accounts={accounts}
                            filters={filters}
                            onSyncComplete={() => setReloadTab((prev) => !prev)}
                            setCardsData={setCardsData}
                        />
                    </>
                )}
                {activeTab === "journals" && (
                    <JournalsTab
                        key={reloadTab}
                        accounts={accounts}
                        filters={filters}
                        onSyncComplete={() => setReloadTab((prev) => !prev)}
                        setCardsData={setCardsData}
                    />
                )}
                {activeTab === "purchase invoices" && (
                    <>
                        <PurchaseInvoicesTab
                            key={reloadTab}
                            accounts={accounts}
                            filters={filters}
                            onSyncComplete={() => setReloadTab((prev) => !prev)}
                            setCardsData={setCardsData}
                        />
                    </>
                )}
                {activeTab === "cost centers" && (
                    <>
                        <CostCentersTab
                            key={reloadTab}
                            accounts={accounts}
                            filters={filters}
                            onSyncComplete={() => setReloadTab((prev) => !prev)}
                            setCardsData={setCardsData}
                        />
                    </>
                )}
            </div>
        </section>
    );
}
