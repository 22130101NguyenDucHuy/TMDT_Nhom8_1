export default function TransactionColumn({ title, items }) {
  return (
    <div className="lb-panel">
      <h3>{title}</h3>
      <div className="lb-list-stack">
        {items.map((item) => (
          <article className="lb-transaction-row" key={item.id}>
            <div>
              <strong>{item.book}</strong>
              <span>{item.partner}</span>
            </div>
            <div>
              <b>{item.amount}</b>
              <span>{item.status}</span>
            </div>
            <time>{item.when}</time>
          </article>
        ))}
      </div>
    </div>
  );
}
