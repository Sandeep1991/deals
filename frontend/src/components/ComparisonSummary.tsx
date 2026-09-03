import type { MerchantBasket } from "../types";

interface Props {
  comparison: {
    event_summary?: string;
    recommended_merchant?: string | null;
    savings?: number | null;
    merchants?: MerchantBasket[];
  };
}

export function ComparisonSummary({ comparison }: Props) {
  const merchants = comparison.merchants ?? [];
  if (merchants.length === 0) return null;

  return (
    <div className="comparison-card">
      {comparison.event_summary && (
        <p className="comparison-title">{comparison.event_summary}</p>
      )}
      <div className="comparison-grid">
        {merchants.map((basket) => (
          <div
            key={basket.merchant}
            className={`comparison-store ${
              basket.merchant === comparison.recommended_merchant ? "recommended" : ""
            }`}
          >
            <div className="comparison-store-header">
              <h3>{basket.merchant}</h3>
              {basket.merchant === comparison.recommended_merchant && (
                <span className="comparison-badge">Best deal</span>
              )}
            </div>
            <ul>
              {basket.quotes.map((quote) => (
                <li key={`${basket.merchant}-${quote.item_name}`}>
                  <span>{quote.item_name}</span>
                  <span>{quote.ad.price}</span>
                </li>
              ))}
            </ul>
            <p className="comparison-total">
              {basket.subtotal != null
                ? basket.subtotal_is_partial
                  ? `Est. total: $${basket.subtotal.toFixed(2)} (${basket.priced_items ?? "?"}/${basket.total_items ?? "?"} items priced)`
                  : `Est. total: $${basket.subtotal.toFixed(2)}`
                : "Est. total: see item prices"}
            </p>
          </div>
        ))}
      </div>
      {comparison.recommended_merchant && comparison.savings != null && comparison.savings > 0 && (
        <p className="comparison-savings">
          Save about ${comparison.savings.toFixed(2)} at {comparison.recommended_merchant}
        </p>
      )}
    </div>
  );
}
