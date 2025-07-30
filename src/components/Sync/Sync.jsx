import { useEffect, useState, useRef } from "react";
import * as config from "../../config.js";

function buildDaftraURL(domain, subdomainProvider, entity, page, filters) {
    let base = `https://${domain}.${subdomainProvider}.com/v2/api/entity/${entity}/list/1`;
    let query = [`page=${page}`, `filter[draft]=0`];
    Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach((val) => {
                query.push(`${key}=${val}`);
            });
        } else {
            query.push(`${key}=${value}`);
        }
    });
    const fullUrl = `${base}?${query.join("&")}`;
    console.log(fullUrl);
    return fullUrl;
}

function buildFilters(toSync, syncFilters, branches) {
    const filters = {};
    const { dateFrom, dateTo } = syncFilters;
    const prefix =
        toSync === "journals"
            ? "filter[journal.date]"
            : toSync === "cost centers"
            ? "filter[cost_center_transaction_journal.date]"
            : "filter[date]";
    filters[`${prefix}[gte]`] = dateFrom;
    filters[`${prefix}[lte]`] = dateTo;
    if (toSync === "invoices" || toSync === "purchase invoices") {
        filters["filter[type][in][]"] = [5, 6, 0];
        filters["filter[branch_id][in][]"] = branches;
    }
    return filters;
}

const syncHandlers = {
    invoices: (item, followUp, domain_id) => ({
        invoice_id: item.id,
        domain_id,
        type: item.type,
        summary_total: item.summary_total,
        date: item.date,
        client_business_name: item.client_business_name,
        currency_code: item.currency_code,
        payment_status: item.payment_status,
        requisition_delivery_status: item.requisition_delivery_status,
        follow_up_status: followUp,
    }),

    "purchase invoices": (item, followUp, domain_id) => ({
        invoice_id: item.id,
        domain_id,
        type: item.type,
        summary_total: item.summary_total,
        date: item.date,
        client_business_name: item.supplier_business_name,
        currency_code: item.currency_code,
        payment_status: item.payment_status,
        requisition_delivery_status: item.requisition_delivery_status,
        follow_up_status: followUp,
    }),

    journals: (item, _, domain_id) => ({
        journal_id: item.journal_id,
        domain_id,
        currency_credit: item.currency_credit,
        currency_debit: item.currency_debit,
        currency_code: item.currency_code,
        date: item.journal.date,
        journal_account_id: item.journal_account_id,
        subkey: item.subkey,
        debit: item.debit,
        credit: item.credit,
        journal: item.journal,
        journal_account: item.journal_account,
    }),

    "cost centers": (item, _, domain_id) => {
        const { id, ...rest } = item;
        return {
            ...rest,
            domain_id,
            date: item.created.split(" ")[0],
        };
    },
};

async function getFollowUpStatus(access_token, domain, id, subdomainProvider) {
    const res = await fetch(
        `https://${domain}.${subdomainProvider}.com/v2/api/entity/follow_up_status/${id}`,
        {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${access_token}`,
            },
        }
    );
    return await res.json();
}

async function getPageData({
    access_token,
    domain,
    page,
    syncFilters,
    domain_id,
    subdomainProvider,
    toSync,
    dataToPost,
    branches,
}) {
    const toSyncEntity = {
        invoices: "invoice",
        journals: "journal_transaction",
        "purchase invoices": "purchase_order",
        "cost centers": "cost_center_transaction",
    }[toSync];
    const filters = buildFilters(toSync, syncFilters, branches);
    const url = buildDaftraURL(
        domain,
        subdomainProvider,
        toSyncEntity,
        page,
        filters
    );
    const response = await fetch(url, {
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${access_token}`,
        },
    });
    const result = await response.json();
    const allSynced = result.data;
    const syncedFollowUpStatus = [];
    for (const item of allSynced) {
        let followUpStatus = null;
        if (
            (toSync === "invoices" || toSync === "purchase invoices") &&
            item.follow_up_status
        ) {
            if (!syncedFollowUpStatus.includes(item.follow_up_status)) {
                followUpStatus = await getFollowUpStatus(
                    access_token,
                    domain,
                    item.follow_up_status,
                    subdomainProvider
                );
                syncedFollowUpStatus.push(followUpStatus.id);
            }
        }
        const handler = syncHandlers[toSync];
        if (handler) {
            const itemObject = handler(item, followUpStatus, domain_id);
            dataToPost.data.push(itemObject);
        }
    }
    return result;
}

async function postSyncedData(data, type) {
    const endpoints = {
        invoices: "invoices",
        journals: "journal_transactions",
        "purchase invoices": "purchase_invoices",
        "cost centers": "cost_center_transactions",
    };
    const url = `${config.API_URL}/${endpoints[type]}`;
    await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
    });
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
            (async () => {
                let filteredAccounts = [...accounts];
                if (syncFilters.account !== "all-accounts") {
                    filteredAccounts = accounts.filter(
                        (acc) => acc.domain_id === syncFilters.account
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
                    let subdomainProvider = "daftra";
                    try {
                        const firstPage = await getPageData({
                            access_token: account.access_token,
                            domain: account.domain,
                            page: 1,
                            syncFilters,
                            domain_id: account.domain_id,
                            subdomainProvider,
                            toSync: type,
                            dataToPost,
                            branches: account.branches,
                        });
                        const totalPages = firstPage.last_page || 1;
                        setMaxPages(totalPages);
                        setCurrentPage(1);
                        for (let i = 2; i <= totalPages; i++) {
                            if (syncCancelledRef.current) return;
                            await getPageData({
                                access_token: account.access_token,
                                domain: account.domain,
                                page: i,
                                syncFilters,
                                domain_id: account.domain_id,
                                subdomainProvider,
                                toSync: type,
                                dataToPost,
                                branches: account.branches,
                            });
                            setCurrentPage(i);
                        }
                    } catch (err) {
                        console.error(
                            "Failed with daftra subdomain. Retrying with daftara..."
                        );
                        subdomainProvider = "daftara";
                        const firstPage = await getPageData({
                            access_token: account.access_token,
                            domain: account.domain,
                            page: 1,
                            syncFilters,
                            domain_id: account.domain_id,
                            subdomainProvider,
                            toSync: type,
                            dataToPost,
                            branches: account.branches,
                        });
                        const totalPages = firstPage.last_page || 1;
                        setMaxPages(totalPages);
                        setCurrentPage(1);
                        for (let i = 2; i <= totalPages; i++) {
                            if (syncCancelledRef.current) return;
                            await getPageData({
                                access_token: account.access_token,
                                domain: account.domain,
                                page: i,
                                syncFilters,
                                domain_id: account.domain_id,
                                subdomainProvider,
                                toSync: type,
                                dataToPost,
                                branches: account.branches,
                            });
                            setCurrentPage(i);
                        }
                    }
                    await delay(500);
                }

                await postSyncedData(dataToPost, type);
                if (!syncCancelledRef.current) {
                    await delay(500);
                    setSyncing(false);
                    onSyncComplete();
                }
            })();
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
