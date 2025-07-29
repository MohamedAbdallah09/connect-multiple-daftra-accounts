import { useEffect, useState, Fragment } from "react";
import LoadingSpinner from "../Common/LoadingSpinner";
import SyncButton from "../Sync/SyncButton";
import PaginationButtons from "./PaginationButtons.jsx";
import * as config from "../../config.js";
import { format } from "../Common/functions.js";
async function getJournalsFromDB(token, filters) {
    const query = new URLSearchParams();
    if (filters.dateFrom) query.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) query.append("dateTo", filters.dateTo);
    if (filters.account && filters.account !== "all-accounts") {
        query.append("account", filters.account);
    }
    const response = await fetch(
        `${config.API_URL}/journal_transactions?${query.toString()}`,
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

export default function JournalsTab({
    accounts,
    filters,
    onSyncComplete,
    setCardsData,
}) {
    const [journals, setJournals] = useState([]);
    const [visibleCount, setVisibleCount] = useState(20);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchJournals() {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const data = await getJournalsFromDB(token, filters);
                setJournals(data);
                setVisibleCount(20);
            } catch (err) {
                console.error("Error fetching Journals:", err);
                setJournals([]);
            } finally {
                setLoading(false);
            }
        }
        fetchJournals();
    }, [filters, accounts]);
    useEffect(() => {
        const journalsCount = journals.length;
        const total = journals.reduce(
            (sum, journal) => sum + journal.total_debit,
            0
        );
        setCardsData([
            { title: "journals", description: journalsCount },
            { title: "Total", description: format(total) },
        ]);
    }, [journals, setCardsData]);
    const visibleJournals = journals.slice(visibleCount - 20, visibleCount);
    return (
        <>
            {accounts.length ? (
                <>
                    <div className="action-buttons">
                        <SyncButton
                            syncType={"journals"}
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
                                    prev + 20 <= journals.length + 20
                                        ? prev + 20
                                        : prev
                                );
                            }}
                            visibleCount={visibleCount}
                            item={journals}
                        />
                    </div>
                    <div className="table-container">
                        <LoadingSpinner show={loading} />
                        {!loading && journals.length === 0 && (
                            <p className="error-msg">No journals found.</p>
                        )}
                        {!loading && journals.length > 0 && (
                            <>
                                <table>
                                    <thead>
                                        <tr>
                                            <th colSpan={2}>Account</th>
                                            <th>Debit</th>
                                            <th>Credit</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleJournals.map((journal) => (
                                            <Fragment
                                                key={
                                                    journal.id +
                                                    "-" +
                                                    journal.domain_id
                                                }
                                            >
                                                {journal.journal_transaction.map(
                                                    (jt, index) => (
                                                        <tr key={index}>
                                                            <td>
                                                                {
                                                                    jt
                                                                        .journal_account
                                                                        .name
                                                                }
                                                            </td>
                                                            <td>
                                                                {
                                                                    jt
                                                                        .journal_account
                                                                        .code
                                                                }
                                                            </td>
                                                            <td className="price">
                                                                {format(
                                                                    jt.debit
                                                                )}
                                                            </td>
                                                            <td className="price">
                                                                {format(
                                                                    jt.credit
                                                                )}
                                                            </td>
                                                            <td className="date">
                                                                {jt.date}
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                                <tr className="totals-row">
                                                    <td
                                                        colSpan={2}
                                                        className="price"
                                                    >
                                                        Total
                                                    </td>
                                                    <td className="price">
                                                        {format(
                                                            journal.total_debit
                                                        )}{" "}
                                                        {journal.currency_code}
                                                    </td>
                                                    <td className="price">
                                                        {format(
                                                            journal.total_credit
                                                        )}{" "}
                                                        {journal.currency_code}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                                <tr className="separator-row">
                                                    <td colSpan={5}></td>
                                                </tr>
                                            </Fragment>
                                        ))}
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
