import { useEffect, useState, Fragment } from "react";
import LoadingSpinner from "../Common/LoadingSpinner";
import SyncButton from "../Sync/SyncButton";
import PaginationButtons from "./PaginationButtons.jsx";
import * as config from "../../config.js";
import { format } from "../Common/functions.js";
async function getCostCentersFromDB(token, filters) {
    const query = new URLSearchParams();
    if (filters.dateFrom) query.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) query.append("dateTo", filters.dateTo);
    if (filters.account && filters.account !== "all-accounts") {
        query.append("account", filters.account);
    }
    const response = await fetch(
        `${config.API_URL}/cost_center_transactions?${query.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
    if (!response.ok) {
        throw new Error("Failed to fetch journals");
    }
    const data = await response.json();
    return await data;
}

export default function CostCentersTab({
    accounts,
    filters,
    onSyncComplete,
    setCardsData,
}) {
    const [costCentersTransactions, setCostCentersTransactions] = useState([]);
    const [visibleCount, setVisibleCount] = useState(20);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchCostCenters() {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const data = await getCostCentersFromDB(token, filters);
                setCostCentersTransactions(data);
                setVisibleCount(20);
            } catch (err) {
                console.error("Error fetching cost centers:", err);
                setCostCentersTransactions([]);
            } finally {
                setLoading(false);
            }
        }
        fetchCostCenters();
    }, [filters, accounts]);
    useEffect(() => {
        const costCentersTransactionsCount = costCentersTransactions.length;
        const totalDebit = costCentersTransactions.reduce(
            (sum, costCenterTransaction) => sum + costCenterTransaction.debit,
            0
        );
        const totalCredit = costCentersTransactions.reduce(
            (sum, costCenterTransaction) => sum + costCenterTransaction.credit,
            0
        );
        setCardsData([
            {
                title: "cost center transactions",
                description: costCentersTransactionsCount,
            },
            {
                title: "total debit",
                description: format(totalDebit),
            },
            ,
            {
                title: "total credit",
                description: format(totalCredit),
            },
            {
                title: "total",
                description:
                    totalCredit === totalDebit
                        ? format(0)
                        : totalCredit > totalDebit
                        ? "credit: " + format(totalCredit - totalDebit)
                        : "debit: " + format(totalDebit - totalCredit),
            },
        ]);
    }, [costCentersTransactions, setCardsData]);
    const visibleCostCenters =
        costCentersTransactions.slice(visibleCount - 20, visibleCount) || [];
    return (
        <>
            {accounts.length ? (
                <>
                    <div className="action-buttons">
                        <SyncButton
                            syncType={"cost centers"}
                            accounts={accounts}
                            onSyncComplete={onSyncComplete}
                        />
                        <PaginationButtons
                            onPrevClick={() =>
                                setVisibleCount((prev) =>
                                    prev > 20 ? prev - 20 : prev
                                )
                            }
                            onNextClick={() => {
                                setVisibleCount((prev) =>
                                    prev + 20 <=
                                    costCentersTransactions.length + 20
                                        ? prev + 20
                                        : prev
                                );
                            }}
                            visibleCount={visibleCount}
                            item={costCentersTransactions}
                        />
                    </div>
                    <div className="table-container">
                        <LoadingSpinner show={loading} />
                        {!loading && costCentersTransactions.length === 0 && (
                            <p className="error-msg">No cost centers found.</p>
                        )}
                        {!loading && costCentersTransactions.length > 0 && (
                            <>
                                <table>
                                    <thead>
                                        <tr>
                                            <th colSpan={2}>Cost center</th>
                                            <th colSpan={2}>Journal account</th>
                                            <th rowSpan={2}>Percent</th>
                                            <th colSpan={2}>Transaction</th>
                                            <th rowSpan={2}>Date</th>
                                        </tr>
                                        <tr>
                                            <th>Code</th>
                                            <th>Name</th>
                                            <th>Code</th>
                                            <th>Name</th>
                                            <th>Debit</th>
                                            <th>Credit</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleCostCenters.map(
                                            (costCenterTransaction, i) => {
                                                return (
                                                    <tr key={i}>
                                                        <td>
                                                            {
                                                                costCenterTransaction
                                                                    .cost_center_transaction_cost_center
                                                                    .code
                                                            }
                                                        </td>
                                                        <td>
                                                            {
                                                                costCenterTransaction
                                                                    .cost_center_transaction_cost_center
                                                                    .name
                                                            }
                                                        </td>
                                                        <td>
                                                            {
                                                                costCenterTransaction
                                                                    .cost_center_transaction_journal_account
                                                                    .code
                                                            }
                                                        </td>
                                                        <td>
                                                            {
                                                                costCenterTransaction
                                                                    .cost_center_transaction_journal_account
                                                                    .name
                                                            }
                                                        </td>
                                                        <td>
                                                            {costCenterTransaction.percentage +
                                                                "%"}
                                                        </td>
                                                        <td>
                                                            {format(
                                                                costCenterTransaction.debit
                                                            ) +
                                                                " " +
                                                                costCenterTransaction.currency_code}
                                                        </td>
                                                        <td>
                                                            {format(
                                                                costCenterTransaction.credit
                                                            ) +
                                                                " " +
                                                                costCenterTransaction.currency_code}
                                                        </td>
                                                        <td className="date">
                                                            {
                                                                costCenterTransaction.date
                                                            }
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                        )}
                                    </tbody>
                                </table>
                            </>
                        )}
                    </div>
                </>
            ) : (
                <p className="error-msg">Add a Daftra account first.</p>
            )}
        </>
    );
}
