export default function PaginationButtons({
    onPrevClick,
    onNextClick,
    visibleCount,
    item,
}) {
    return (
        <div className="pagination-buttons">
            <button
                className="prev submit"
                onClick={onPrevClick}
                disabled={visibleCount <= 20}
            >
                <i className="fas fa-arrow-left"></i>
            </button>
            <button
                className="next submit"
                onClick={onNextClick}
                disabled={visibleCount + 20 >= item.length + 20}
            >
                <i className="fas fa-arrow-right"></i>
            </button>
        </div>
    );
}
