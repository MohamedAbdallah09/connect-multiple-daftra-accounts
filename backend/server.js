const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("./config");
const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors());

const SECRET_KEY = config.SECRET_KEY;
const USERS_FILE = config.USERS_FILE;
const ACCOUNTS_FILE = config.ACCOUNTS_FILE;
const INVOICES_FILE = config.INVOICES_FILE;
const JOURNALS_FILE = config.JOURNALS_FILE;
const PURCHASE_INVOICES_FILE = config.PURCHASE_INVOICES_FILE;
const COST_CENTER_TRANSACTIONS_FILE = config.COST_CENTER_TRANSACTIONS_FILE;

app.use((req, res, next) => {
    let size = 0;
    req.on("data", (chunk) => (size += chunk.length));
    req.on("end", () => {
        console.log(`Request size: ${(size / (1024 * 1024)).toFixed(2)} MB`);
    });
    next();
});

function readJSON(file) {
    if (!fs.existsSync(file)) return [];
    const content = fs.readFileSync(file, "utf8");
    if (!content.trim()) return [];
    return JSON.parse(content);
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

app.post("/signup", async (req, res) => {
    try {
        const { email, username, password } = req.body;
        if (!email || !username || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }
        const users = readJSON(USERS_FILE);
        if (users.find((user) => user.email === email)) {
            return res
                .status(400)
                .json({ error: "There is an account with that email" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: users.length ? users[users.length - 1].id + 1 : 1,
            email,
            username,
            password: hashedPassword,
        };
        users.push(newUser);
        writeJSON(USERS_FILE, users);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const users = readJSON("users.json");
    const user = users.find((user) => user.email === email);
    if (!user) {
        return res.status(401).json({ error: "Sorry, email not found." });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(401).json({ error: "Sorry, wrong password." });
    }
    const token = jwt.sign({ userId: user.id }, SECRET_KEY);
    res.json({ token, username: user.username });
});
app.get("/me", authenticateToken, (req, res) => {
    const users = readJSON(USERS_FILE);
    const accounts = readJSON(ACCOUNTS_FILE);
    const user = users.find((u) => u.id === req.user.userId);
    const userAccounts = accounts.filter(
        (acc) => acc.user_id === req.user.userId
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ username: user.username, accounts: userAccounts });
});

app.post("/invoices", authenticateToken, (req, res) => {
    const newInvoices = req.body.data;
    const filters = req.body.filters;
    if (!newInvoices || !filters) {
        return res.status(400).json({ error: "Missing Invoice fields" });
    }
    const syncedDomains = filters.account.map((acc) => acc.domain_id);
    let invoices = readJSON(INVOICES_FILE);
    const dateFrom = filters.date_from ? new Date(filters.date_from) : null;
    const dateTo = filters.date_to ? new Date(filters.date_to) : null;
    invoices = invoices.filter((invoice) => {
        const invoiceDate = new Date(invoice.date);
        let inRange = true;
        if (dateFrom) {
            inRange = inRange && invoiceDate >= dateFrom;
        }
        if (dateTo) {
            inRange = inRange && invoiceDate <= dateTo;
        }
        const inSyncedDomain = syncedDomains.includes(invoice.domain_id);
        return !(inRange && inSyncedDomain);
    });
    invoices.push(...newInvoices);
    invoices.sort((a, b) => new Date(b.date) - new Date(a.date));
    writeJSON(INVOICES_FILE, invoices);
    res.json({ success: true });
});
app.get("/invoices", authenticateToken, (req, res) => {
    const invoices = readJSON(INVOICES_FILE);
    const accounts = readJSON(ACCOUNTS_FILE);
    const userAccounts = accounts.filter(
        (acc) => acc.user_id === req.user.userId
    );
    const userDomainIds = new Set(userAccounts.map((acc) => acc.domain_id));
    const { dateFrom, dateTo, account } = req.query;
    let selectedDomainIds = [...userDomainIds];

    if (account && account !== "all-accounts") {
        const selectedAccount = userAccounts.find(
            (acc) => acc.business_name === account
        );
        if (!selectedAccount) return res.json([]);
        selectedDomainIds = [selectedAccount.domain_id];
    }
    const filteredInvoices = invoices.filter((inv) => {
        if (!selectedDomainIds.includes(inv.domain_id)) return false;
        if (dateFrom && new Date(inv.date) < new Date(dateFrom)) return false;
        if (dateTo && new Date(inv.date) > new Date(dateTo)) return false;
        return true;
    });
    res.json(filteredInvoices);
});
app.delete("/invoices/:domain_id", authenticateToken, (req, res) => {
    const domainId = parseInt(req.params.domain_id);
    const invoices = readJSON(INVOICES_FILE);
    const updatedInvoices = invoices.filter(
        (invoice) => invoice.domain_id !== domainId
    );
    writeJSON(INVOICES_FILE, updatedInvoices);
    res.json({
        success: true,
        domain_id: domainId,
    });
});

app.post("/purchase_invoices", authenticateToken, (req, res) => {
    const newInvoices = req.body.data;
    const filters = req.body.filters;
    if (!newInvoices || !filters) {
        return res.status(400).json({ error: "Missing journal fields" });
    }
    const syncedDomains = filters.account.map((acc) => acc.domain_id);
    let invoices = readJSON(PURCHASE_INVOICES_FILE);
    const dateFrom = filters.date_from ? new Date(filters.date_from) : null;
    const dateTo = filters.date_to ? new Date(filters.date_to) : null;
    invoices = invoices.filter((invoice) => {
        const invoiceDate = new Date(invoice.date);
        let inRange = true;
        if (dateFrom) {
            inRange = inRange && invoiceDate >= dateFrom;
        }
        if (dateTo) {
            inRange = inRange && invoiceDate <= dateTo;
        }
        const inSyncedDomain = syncedDomains.includes(invoice.domain_id);
        return !(inRange && inSyncedDomain);
    });
    invoices.push(...newInvoices);
    invoices.sort((a, b) => new Date(b.date) - new Date(a.date));
    writeJSON(PURCHASE_INVOICES_FILE, invoices);
    res.json({ success: true });
});
app.get("/purchase_invoices", authenticateToken, (req, res) => {
    const invoices = readJSON(PURCHASE_INVOICES_FILE);
    const accounts = readJSON(ACCOUNTS_FILE);
    const userAccounts = accounts.filter(
        (acc) => acc.user_id === req.user.userId
    );
    const userDomainIds = new Set(userAccounts.map((acc) => acc.domain_id));
    const { dateFrom, dateTo, account } = req.query;
    let selectedDomainIds = [...userDomainIds];
    if (account && account !== "all-accounts") {
        const selectedAccount = userAccounts.find(
            (acc) => acc.business_name === account
        );
        if (!selectedAccount) return res.json([]);
        selectedDomainIds = [selectedAccount.domain_id];
    }
    const filteredInvoices = invoices.filter((inv) => {
        if (!selectedDomainIds.includes(inv.domain_id)) return false;
        if (dateFrom && new Date(inv.date) < new Date(dateFrom)) return false;
        if (dateTo && new Date(inv.date) > new Date(dateTo)) return false;
        return true;
    });

    res.json(filteredInvoices);
});
app.delete("/purchase_invoices/:domain_id", authenticateToken, (req, res) => {
    const domainId = parseInt(req.params.domain_id);
    const invoices = readJSON(PURCHASE_INVOICES_FILE);
    const updatedInvoices = invoices.filter(
        (invoice) => invoice.domain_id !== domainId
    );
    writeJSON(PURCHASE_INVOICES_FILE, updatedInvoices);
    res.json({
        success: true,
        domain_id: domainId,
    });
});

app.post("/journal_transactions", authenticateToken, (req, res) => {
    const newJournals = req.body.data;
    const filters = req.body.filters;
    if (!newJournals || !filters) {
        return res.status(400).json({ error: "Missing journal fields" });
    }
    let journals = readJSON(JOURNALS_FILE);
    const syncedDomains = filters.account.map((acc) => acc.domain_id);
    const dateFrom = filters.date_from ? new Date(filters.date_from) : null;
    const dateTo = filters.date_to ? new Date(filters.date_to) : null;
    journals = journals.filter((journal) => {
        const journalDate = new Date(journal.date);
        let inRange = true;
        if (dateFrom) {
            inRange = inRange && journalDate >= dateFrom;
        }
        if (dateTo) {
            inRange = inRange && journalDate <= dateTo;
        }
        const inSyncedDomain = syncedDomains.includes(journal.domain_id);
        return !(inRange && inSyncedDomain);
    });
    journals.push(...newJournals);
    journals.sort((a, b) => new Date(b.date) - new Date(a.date));
    writeJSON(JOURNALS_FILE, journals);
    res.json({ success: true });
});
app.get("/journal_transactions", authenticateToken, (req, res) => {
    const journalsTransactions = readJSON(JOURNALS_FILE);
    const accounts = readJSON(ACCOUNTS_FILE);
    const userAccounts = accounts.filter(
        (acc) => acc.user_id === req.user.userId
    );
    const userDomainIds = userAccounts.map((acc) => acc.domain_id);
    const { dateFrom, dateTo, account } = req.query;
    let selectedDomainIds = [...userDomainIds];
    if (account && account !== "all-accounts") {
        const selectedAccount = userAccounts.find(
            (acc) => acc.business_name === account
        );
        if (!selectedAccount) return res.json([]);
        selectedDomainIds = [selectedAccount.domain_id];
    }
    const groupedMap = new Map();
    journalsTransactions.forEach((journal) => {
        if (!selectedDomainIds.includes(journal.domain_id)) return;
        const journalDate = new Date(journal.date);
        if (dateFrom && journalDate < new Date(dateFrom)) return;
        if (dateTo && journalDate > new Date(dateTo)) return;
        const key = `${journal.journal_id}-${journal.domain_id}`;
        if (!groupedMap.has(key)) {
            groupedMap.set(key, {
                id: journal.journal_id,
                domain_id: journal.domain_id,
                total_debit: journal.journal.total_debit,
                total_credit: journal.journal.total_credit,
                currency_code: journal.journal.currency_code,
                date: journal.date,
                journal_transaction: [],
            });
        }
        groupedMap.get(key).journal_transaction.push(journal);
    });
    const grouped = Array.from(groupedMap.values());
    res.json(grouped);
});
app.delete(
    "/journal_transactions/:domain_id",
    authenticateToken,
    (req, res) => {
        const domainId = parseInt(req.params.domain_id);
        const journals = readJSON(JOURNALS_FILE);
        const updatedJournals = journals.filter(
            (journal) => journal.domain_id !== domainId
        );
        writeJSON(JOURNALS_FILE, updatedJournals);
        res.json({
            success: true,
            domain_id: domainId,
        });
    }
);

app.post("/cost_center_transactions", authenticateToken, (req, res) => {
    const newCostCenterTransactions = req.body.data;
    const filters = req.body.filters;

    if (!newCostCenterTransactions || !filters) {
        return res.status(400).json({ error: "Missing journal fields" });
    }

    let costCenterTransactions = readJSON(COST_CENTER_TRANSACTIONS_FILE);
    const syncedDomains = filters.account.map((acc) => acc.domain_id);
    const dateFrom = filters.date_from ? new Date(filters.date_from) : null;
    const dateTo = filters.date_to ? new Date(filters.date_to) : null;
    costCenterTransactions = costCenterTransactions.filter(
        (costCenterTransaction) => {
            const costCenterTransactionDate = new Date(
                costCenterTransaction.date
            );
            let inRange = true;
            if (dateFrom) {
                inRange = inRange && costCenterTransactionDate >= dateFrom;
            }
            if (dateTo) {
                inRange = inRange && costCenterTransactionDate <= dateTo;
            }
            const inSyncedDomain = syncedDomains.includes(
                costCenterTransaction.domain_id
            );
            console.log(inRange);
            console.log(inSyncedDomain);
            console.log(!(inRange && inSyncedDomain));
            return !(inRange && inSyncedDomain);
        }
    );

    costCenterTransactions.push(...newCostCenterTransactions);
    costCenterTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    writeJSON(COST_CENTER_TRANSACTIONS_FILE, costCenterTransactions);
    res.json({ success: true });
});

app.get("/cost_center_transactions", authenticateToken, (req, res) => {
    const costCenterTransactions = readJSON(COST_CENTER_TRANSACTIONS_FILE);
    const accounts = readJSON(ACCOUNTS_FILE);
    const userAccounts = accounts.filter(
        (acc) => acc.user_id === req.user.userId
    );
    const userDomainIds = userAccounts.map((acc) => acc.domain_id);
    const { dateFrom, dateTo, account } = req.query;
    let selectedDomainIds = [...userDomainIds];
    if (account && account !== "all-accounts") {
        const selectedAccount = userAccounts.find(
            (acc) => acc.business_name === account
        );
        if (!selectedAccount) return res.json([]);
        selectedDomainIds = [selectedAccount.domain_id];
    }
    const filteredCostCentersTransactions = costCenterTransactions.filter(
        (costCenterTransaction) => {
            if (!selectedDomainIds.includes(costCenterTransaction.domain_id))
                return false;
            if (
                dateFrom &&
                new Date(costCenterTransaction.date) < new Date(dateFrom)
            )
                return false;
            if (
                dateTo &&
                new Date(costCenterTransaction.date) > new Date(dateTo)
            )
                return false;
            return true;
        }
    );
    res.json(filteredCostCentersTransactions);
});
app.delete(
    "/cost_center_transactions/:domain_id",
    authenticateToken,
    (req, res) => {
        const domainId = parseInt(req.params.domain_id);
        const costCenters = readJSON(COST_CENTER_TRANSACTIONS_FILE);
        const updatedCostCenters = costCenters.filter(
            (costCenter) => costCenter.domain_id !== domainId
        );
        writeJSON(COST_CENTER_TRANSACTIONS_FILE, updatedCostCenters);
        res.json({
            success: true,
            domain_id: domainId,
        });
    }
);

app.get("/accounts", authenticateToken, (req, res) => {
    const accounts = readJSON(ACCOUNTS_FILE);
    const userAccounts = accounts.filter(
        (acc) => acc.user_id === req.user.userId
    );
    res.json(userAccounts);
});
app.post("/accounts", authenticateToken, (req, res) => {
    const { domain, access_token, business_name, branches } = req.body;
    if (!domain || !access_token || !business_name) {
        return res.status(400).json({ error: "Missing fields" });
    }
    const accounts = readJSON(ACCOUNTS_FILE);
    const alreadyExists = accounts.find(
        (account) =>
            account.user_id === req.user.userId && account.domain === domain
    );
    if (alreadyExists) {
        return res.json({
            success: false,
            reason: "Account already exists!",
            domain_id: alreadyExists.domain_id,
        });
    }
    const existingDomain = accounts.find(
        (accouunt) => accouunt.domain === domain
    );
    const newDomainId = existingDomain
        ? existingDomain.domain_id
        : accounts.reduce(
              (max, accouunt) => Math.max(max, accouunt.domain_id || 0),
              0
          ) + 1;
    const newAccount = {
        domain_id: newDomainId,
        user_id: req.user.userId,
        domain,
        access_token,
        business_name,
        branches,
    };
    accounts.unshift(newAccount);
    writeJSON(ACCOUNTS_FILE, accounts);
    res.json({ success: true, domain_id: newDomainId });
});
app.delete("/accounts/:domain_id", authenticateToken, (req, res) => {
    const domainId = parseInt(req.params.domain_id);
    const accounts = readJSON(ACCOUNTS_FILE);
    let accountUsedByAnotherUser = false;
    const updatedAccounts = accounts.filter((account) => {
        if (
            account.domain_id === domainId &&
            account.user_id !== req.user.userId
        ) {
            accountUsedByAnotherUser = true;
        }
        return !(
            account.user_id === req.user.userId &&
            account.domain_id === domainId
        );
    });
    if (updatedAccounts.length === accounts.length) {
        return res.status(404).json({ error: "Account not found" });
    }
    writeJSON(ACCOUNTS_FILE, updatedAccounts);
    res.json({
        success: true,
        domain_id: domainId,
        usedByAnotherUser: accountUsedByAnotherUser,
    });
});

app.listen(3001, () => {
    console.log("Auth server running on http://localhost:3001");
});
