import "./Cards.css";

export default function Cards({ data }) {
    return (
        <section className="cards-container">
            {data.map((item, index) => (
                <div className="card" key={index}>
                    <h2 className="card-title">{item.title}</h2>
                    <p className="card-description">{item.description}</p>
                </div>
            ))}
        </section>
    );
}
