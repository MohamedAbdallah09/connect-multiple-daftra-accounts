import { getTextColorBasedOnBackground } from "../Common/functions";

export default function StatusBadge({ bgColor, text }) {
    return (
        <span
            className="status"
            style={{
                background: bgColor,
                color: getTextColorBasedOnBackground(bgColor),
            }}
        >
            {text}
        </span>
    );
}
