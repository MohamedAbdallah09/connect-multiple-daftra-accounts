require("dotenv").config();

module.exports = {
    SECRET_KEY: process.env.SECRET_KEY,
    USERS_FILE: process.env.USERS_FILE,
    ACCOUNTS_FILE: process.env.ACCOUNTS_FILE,
    INVOICES_FILE: process.env.INVOICES_FILE,
    JOURNALS_FILE: process.env.JOURNALS_FILE,
    PURCHASE_INVOICES_FILE: process.env.PURCHASE_INVOICES_FILE,
    COST_CENTER_TRANSACTIONS_FILE: process.env.COST_CENTER_TRANSACTIONS_FILE,
};
