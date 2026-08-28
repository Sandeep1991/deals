import type { Ad } from "../types";

interface Props {
  ad: Ad;
}

export function AdCard({ ad }: Props) {
  return (
    <a
      href={ad.url}
      target="_blank"
      rel="noopener noreferrer"
      className="ad-card"
    >
      <div className="ad-card-header">
        <span className="ad-category">{ad.category}</span>
        <span className="ad-price">{ad.price}</span>
      </div>
      <h3 className="ad-title">{ad.title}</h3>
      <p className="ad-description">{ad.description}</p>
      <span className="ad-link">
        View deal
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </span>
    </a>
  );
}
