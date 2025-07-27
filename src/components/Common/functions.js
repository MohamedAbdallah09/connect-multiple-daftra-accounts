export function format(number) {
    return number.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function getLuminance(r, g, b) {
    const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
export function getTextColorBasedOnBackground(bgColor) {
    const temp = document.createElement("div");
    temp.style.color = bgColor;
    document.body.appendChild(temp);
    const resolvedColor = getComputedStyle(temp).color;
    document.body.removeChild(temp);
    const rgb = resolvedColor.match(/\d+/g).map(Number);
    const luminance = getLuminance(rgb[0], rgb[1], rgb[2]);
    return luminance > 0.75 ? "black" : "white";
}
