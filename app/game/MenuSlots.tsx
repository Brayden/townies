'use client';
import { useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
export default function MenuSlots({
  items,
  label,
  pageSize = 6,
}: {
  items: { id: string; content: ReactNode }[];
  label: string;
  pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  const last = Math.max(0, Math.ceil(items.length / pageSize) - 1),
    current = Math.min(page, last);
  return (
    <>
      <div className="menu-slots" aria-label={label}>
        {items
          .slice(current * pageSize, current * pageSize + pageSize)
          .map((item) => (
            <div className="menu-slot" key={item.id}>
              {item.content}
            </div>
          ))}
      </div>
      {last > 0 && (
        <nav className="menu-pagination" aria-label={`${label} pages`}>
          <button
            className="secondary-button"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            aria-label={`Previous ${label.toLowerCase()}`}
          >
            <ArrowLeft size={16} />
            Previous
          </button>
          <span>
            {current + 1} / {last + 1}
          </span>
          <button
            className="secondary-button"
            disabled={current === last}
            onClick={() => setPage(current + 1)}
            aria-label={`Next ${label.toLowerCase()}`}
          >
            Next
            <ArrowRight size={16} />
          </button>
        </nav>
      )}
    </>
  );
}
