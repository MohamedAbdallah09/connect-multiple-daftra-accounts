import { useEffect, useState, useRef } from "react";
import * as config from "../../config.js";

async function getAndPostToDB(
    access_token,
    domain,
    page,
    syncFilters,
    domain_id,
    subdomainProvider,
    toSync,
    dataToPost
) {
    let syncType = "";
    if (toSync === "invoices") {
        syncType = "invoice";
    } else if (toSync === "journals") {
        syncType = "journal_transaction";
    } else if (toSync === "purchase invoices") {
        syncType = "purchase_order";
    } else if (toSync === "cost centers") {
        syncType = "cost_center_transaction";
    }
    try {
        console.log(
            `https://${domain}.${subdomainProvider}.com/v2/api/entity/${syncType}/list/1?page=${page}&filter[type][in][]=6&filter[type][in][]=0&filter[created][gte]=${syncFilters.dateFrom}&filter[created][lte]=${syncFilters.dateTo}&filter[draft]=0`
        );
        const response = await fetch(
            `https://${domain}.${subdomainProvider}.com/v2/api/entity/${syncType}/list/1?page=${page}&filter[type][in][]=6&filter[type][in][]=0&filter[created][gte]=${syncFilters.dateFrom}&filter[created][lte]=${syncFilters.dateTo}&filter[draft]=0`,
            {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${access_token}`,
                },
            }
        );
        const data = await response.json();
        console.log(data);
        const allSynced = data.data;
        for (const syncedItem of allSynced) {
            let followUpStatus = null;
            let syncedItemObject = {};
            if (toSync === "invoices" || toSync === "purchase invoices") {
                if (syncedItem.follow_up_status) {
                    followUpStatus = await getFollowUpStatus(
                        access_token,
                        domain,
                        syncedItem.follow_up_status,
                        subdomainProvider
                    );
                }
                syncedItemObject = makeSyncedItemObject(
                    toSync,
                    syncedItem,
                    followUpStatus,
                    domain_id
                );
            } else if (toSync === "journals") {
                syncedItemObject = makeSyncedItemObject(
                    toSync,
                    syncedItem,
                    followUpStatus,
                    domain_id
                );
            } else if (toSync === "cost centers") {
                syncedItemObject = makeSyncedItemObject(
                    toSync,
                    syncedItem,
                    followUpStatus,
                    domain_id
                );
            }
            dataToPost.data.push(syncedItemObject);
        }
        return data;
    } catch (err) {
        throw new Error(err);
    }
}
function makeSyncedItemObject(toSync, syncedItem, followUpStatus, domain_id) {
    let itemObject = {};
    if (toSync === "invoices" || toSync === "purchase invoices") {
        itemObject = {
            invoice_id: syncedItem.id,
            domain_id,
            type: syncedItem.type,
            summary_total: syncedItem.summary_total,
            date: syncedItem.date,
            business_name:
                toSync === "invoices"
                    ? syncedItem.client_business_name
                    : syncedItem.supplier_business_name,
            currency_code: syncedItem.currency_code,
            payment_status: syncedItem.payment_status,
            requisition_delivery_status: syncedItem.requisition_delivery_status,
            follow_up_status: followUpStatus,
        };
    } else if (toSync === "journals") {
        itemObject = {
            id: syncedItem.id,
            journal_id: syncedItem.journal_id,
            domain_id: domain_id,
            currency_credit: syncedItem.currency_credit,
            currency_debit: syncedItem.currency_debit,
            currency_code: syncedItem.currency_code,
            date: syncedItem.journal.date,
            journal_account_id: syncedItem.journal_account_id,
            subkey: syncedItem.subkey,
            debit: syncedItem.debit,
            credit: syncedItem.credit,
            journal: syncedItem.journal,
            journal_account: syncedItem.journal_account,
        };
    } else if (toSync === "cost centers") {
        itemObject = syncedItem;
        itemObject.domain_id = domain_id;
        itemObject.date = itemObject.created.split(" ")[0];
    }
    return itemObject;
}
async function postSyncedData(syncedData, syncType) {
    if (syncType === "invoices") {
        await fetch(`${config.API_URL}/invoices`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + localStorage.getItem("token"),
            },
            body: JSON.stringify(syncedData),
        });
    } else if (syncType === "journals") {
        await fetch(`${config.API_URL}/journal_transactions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + localStorage.getItem("token"),
            },
            body: JSON.stringify(syncedData),
        });
    } else if (syncType === "purchase invoices") {
        await fetch(`${config.API_URL}/purchase_invoices`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + localStorage.getItem("token"),
            },
            body: JSON.stringify(syncedData),
        });
    } else if (syncType === "cost centers") {
        await fetch(`${config.API_URL}/cost_center_transactions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + localStorage.getItem("token"),
            },
            body: JSON.stringify(syncedData),
        });
    }
}
async function getFollowUpStatus(
    access_token,
    domain,
    follwUpStatusId,
    subdomainProvider
) {
    const response = await fetch(
        `https://${domain}.${subdomainProvider}.com/v2/api/entity/follow_up_status/${follwUpStatusId}`,
        {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${access_token}`,
            },
        }
    );
    const data = await response.json();
    return {
        id: data.id,
        color: data.color,
        name: data.name,
    };
}
async function SyncAllFromDaftra(
    accounts,
    setSyncing,
    setCurrentAccount,
    setCurrentPage,
    setMaxPages,
    syncFilters,
    onSyncComplete,
    syncCancelledRef,
    type
) {
    let filteredAccounts = [...accounts];
    if (syncFilters.account !== "all-accounts") {
        filteredAccounts = accounts.filter(
            (account) => account.domain_id === syncFilters.account
        );
    }
    const dataToPost = {
        data: [],
        filters: {
            date_from: syncFilters.dateFrom,
            date_to: syncFilters.dateTo,
            account: filteredAccounts,
        },
    };

    for (const account of filteredAccounts) {
        if (syncCancelledRef.current) return;
        setCurrentAccount(account.business_name);
        setMaxPages(1);
        setCurrentPage(0);
        let pageOne;
        let subdomainProvider = "daftra";
        try {
            pageOne = await getAndPostToDB(
                account.access_token,
                account.domain,
                1,
                syncFilters,
                account.domain_id,
                subdomainProvider,
                type,
                dataToPost
            );
            const totalPages = pageOne.last_page || 1;
            setMaxPages(totalPages);
            setCurrentPage(1);
            for (let i = 2; i <= totalPages; i++) {
                if (syncCancelledRef.current) return;
                await getAndPostToDB(
                    account.access_token,
                    account.domain,
                    i,
                    syncFilters,
                    account.domain_id,
                    subdomainProvider,
                    type,
                    dataToPost
                );
                setCurrentPage(i);
            }
        } catch (err) {
            subdomainProvider = "daftara";
            pageOne = await getAndPostToDB(
                account.access_token,
                account.domain,
                1,
                syncFilters,
                account.domain_id,
                subdomainProvider,
                type,
                dataToPost
            );
            const totalPages = pageOne.last_page || 1;
            setMaxPages(totalPages);
            setCurrentPage(1);
            for (let i = 2; i <= totalPages; i++) {
                if (syncCancelledRef.current) return;
                await getAndPostToDB(
                    account.access_token,
                    account.domain,
                    i,
                    syncFilters,
                    account.domain_id,
                    subdomainProvider,
                    type,
                    dataToPost
                );
                setCurrentPage(i);
            }
        }
        await delay(500);
    }
    postSyncedData(dataToPost, type);
    if (!syncCancelledRef.current) {
        await delay(500);
        setSyncing(false);
        onSyncComplete();
    }
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export default function Sync({
    accounts,
    syncFilters,
    onSyncComplete,
    type,
    setSyncing,
}) {
    const [currentAccount, setCurrentAccount] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [maxPages, setMaxPages] = useState(0);
    const syncCancelledRef = useRef(false);

    useEffect(() => {
        if (accounts.length > 0) {
            SyncAllFromDaftra(
                accounts,
                setSyncing,
                setCurrentAccount,
                setCurrentPage,
                setMaxPages,
                syncFilters,
                onSyncComplete,
                syncCancelledRef,
                type
            );
        }
    }, [accounts, setSyncing, onSyncComplete]);
    const progress = Math.min((currentPage / maxPages) * 100, 100);
    return (
        <div className="sync-progress-container">
            <div className="sync-progress">
                <p>
                    Syncing {type} from: <strong>{currentAccount}</strong>
                </p>
                <div className="progress-info">
                    <div className="progress-bar-wrapper">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="progress-percent">{Math.round(progress)}%</p>
                </div>
                <button
                    className="back"
                    onClick={() => {
                        syncCancelledRef.current = true;
                        setSyncing(false);
                        onSyncComplete();
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
