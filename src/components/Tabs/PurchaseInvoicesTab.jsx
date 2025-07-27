import { useEffect, useState } from "react";
import LoadingSpinner from "../Common/LoadingSpinner";
import SyncButton from "../Sync/SyncButton";
import StatusBadge from "./StatusBadge";
import PaginationButtons from "./PaginationButtons.jsx";
import { format } from "../Common/functions";
import * as config from "../../config.js";
function getPaymentStatus(status) {
    switch (status) {
        case 0:
            return { text: "Unpaid", color: "#fc5f7d" };
        case 1:
            return { text: "Partially Paid", color: "#facc15" };
        case 2:
            return { text: "Paid", color: "#6bcf63" };
        case 3:
            return { text: "Refunded", color: "#555" };
        default:
            return { text: "Unknown", color: "#ccc" };
    }
}

function getRequisitionDeliveryStatus(status) {
    switch (status) {
        case 1:
            return { text: "Received", color: "green" };
        case 2:
            return { text: "Rejected", color: "red" };
        case 3:
            return { text: "Under Delivery", color: "yellow" };
        default:
            return { text: "Unknown", color: "#ccc" };
    }
}
async function getInvoicesFromDB(token, filters) {
    const query = new URLSearchParams();
    if (filters.dateFrom) query.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) query.append("dateTo", filters.dateTo);
    if (filters.account && filters.account !== "all-accounts") {
        query.append("account", filters.account);
    }
    const response = await fetch(
        `${config.API_URL}/purchase_invoices?${query.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
    if (!response.ok) {
        throw new Error("Failed to fetch purchase invoices");
    }
    const data = await response.json();
    return data;
}

export default function PurchaseInvoicesTab({
    accounts,
    filters,
    onSyncComplete,
    setCardsData,
}) {
    const [invoices, setInvoices] = useState([]);
    const [visibleCount, setVisibleCount] = useState(20);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchInvoices() {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const data = await getInvoicesFromDB(token, filters);
                setInvoices(data);
                setVisibleCount(20);
            } catch (err) {
                console.error("Error fetching invoices:", err);
                setInvoices([]);
            } finally {
                setLoading(false);
            }
        }
        fetchInvoices();
    }, [filters, accounts]);
    useEffect(() => {
        const invoicesCount = invoices.length;
        const total = invoices.reduce((sum, invoice) => {
            const value =
                invoice.type === 6
                    ? -invoice.summary_total
                    : invoice.summary_total;
            return sum + value;
        }, 0);
        setCardsData([
            { title: "purchase invoices", description: invoicesCount },
            { title: "total", description: format(total) },
        ]);
    }, [invoices, setCardsData]);
    const visibleInvoices = invoices.slice(visibleCount - 20, visibleCount);

    return (
        <>
            {accounts.length ? (
                <>
                    <div className="action-buttons">
                        <SyncButton
                            syncType={"purchase invoices"}
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
                                    prev + 20 <= invoices.length + 20
                                        ? prev + 20
                                        : prev
                                );
                            }}
                            visibleCount={visibleCount}
                            item={invoices}
                        />
                    </div>
                    <div className="table-container">
                        <LoadingSpinner show={loading} />
                        {!loading && invoices.length === 0 && (
                            <p className="error-msg">
                                No purchase invoices found.
                            </p>
                        )}
                        {!loading && invoices.length > 0 && (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Supplier</th>
                                        <th>Date</th>
                                        <th>Follow up status</th>
                                        <th>Payment status</th>
                                        <th>Requisition delivery status</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleInvoices.map((invoice) => {
                                        let invoiceFollowUpStatusBGColor = "";
                                        let invoiceFollowUpStatusText = "";
                                        const {
                                            text: paymentText,
                                            color: paymentColor,
                                        } = getPaymentStatus(
                                            invoice.payment_status
                                        );
                                        const {
                                            text: reqText,
                                            color: reqColor,
                                        } = getRequisitionDeliveryStatus(
                                            invoice.requisition_delivery_status
                                        );
                                        if (invoice.follow_up_status) {
                                            invoiceFollowUpStatusText =
                                                invoice.follow_up_status.name;
                                            invoiceFollowUpStatusBGColor =
                                                invoice.follow_up_status.color;
                                        }
                                        return (
                                            <tr key={invoice.invoice_id}>
                                                <td>{invoice.business_name}</td>
                                                <td className="date">
                                                    {invoice.date}
                                                </td>
                                                <td>
                                                    <StatusBadge
                                                        bgColor={
                                                            invoiceFollowUpStatusBGColor
                                                        }
                                                        text={
                                                            invoiceFollowUpStatusText
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <StatusBadge
                                                        bgColor={paymentColor}
                                                        text={paymentText}
                                                    />
                                                </td>
                                                <td>
                                                    <StatusBadge
                                                        bgColor={reqColor}
                                                        text={reqText}
                                                    />
                                                </td>
                                                <td>
                                                    {format(
                                                        invoice.summary_total
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            ) : (
                <p className="error-msg">Add a Daftra account first.</p>
            )}
        </>
    );
}
