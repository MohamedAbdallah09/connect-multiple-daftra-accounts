import { useState } from "react";
import Sync from "./Sync";
import "./SyncButton.css";
import "./ProgressBar.css";
import { createPortal } from "react-dom";
import SyncFilter from "./SyncFilter";
export default function SyncButton({ syncType, accounts, onSyncComplete }) {
    const [syncing, setSyncing] = useState(false);
    const [showSyncFilters, setShowSyncFilters] = useState(false);
    const [syncFilters, setSyncFilters] = useState("");
    function handleClick() {
        setShowSyncFilters(true);
    }
    return (
        <>
            <button className="sync" onClick={handleClick}>
                Sync {syncType} from Daftra
            </button>
            {createPortal(
                showSyncFilters && (
                    <SyncFilter
                        setSyncFilters={setSyncFilters}
                        setShowSyncFilters={setShowSyncFilters}
                        accounts={accounts}
                        syncType={syncType}
                        setSyncing={setSyncing}
                    />
                ),
                document.body
            )}
            {createPortal(
                syncing && (
                    <Sync
                        accounts={accounts}
                        syncFilters={syncFilters}
                        onSyncComplete={onSyncComplete}
                        type={syncType}
                        setSyncing={setSyncing}
                    />
                ),
                document.body
            )}
        </>
    );
}
