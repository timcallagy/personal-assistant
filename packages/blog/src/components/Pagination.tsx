import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  const getPageUrl = (page: number) => {
    if (page === 1) return basePath;
    return `${basePath}${basePath.includes('?') ? '&' : '?'}page=${page}`;
  };

  return (
    <nav className="flex items-center justify-center gap-2 mt-12">
      {/* Previous */}
      {currentPage > 1 ? (
        <Link
          href={getPageUrl(currentPage - 1)}
          className="px-4 py-2 border border-border text-secondary hover:border-accent hover:text-accent transition-colors"
        >
          Previous
        </Link>
      ) : (
        <span className="px-4 py-2 border border-border text-muted cursor-not-allowed">
          Previous
        </span>
      )}

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => {
            // Show first, last, current, and neighbors
            return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
          })
          .map((pageNum, index, arr) => {
            // Add ellipsis
            const prevPage = arr[index - 1];
            const showEllipsis = prevPage && pageNum - prevPage > 1;

            return (
              <span key={pageNum} className="flex items-center">
                {showEllipsis && <span className="px-2 text-muted">...</span>}
                {pageNum === currentPage ? (
                  <span className="w-10 h-10 flex items-center justify-center bg-accent text-white">
                    {pageNum}
                  </span>
                ) : (
                  <Link
                    href={getPageUrl(pageNum)}
                    className="w-10 h-10 flex items-center justify-center border border-border text-secondary hover:border-accent hover:text-accent transition-colors"
                  >
                    {pageNum}
                  </Link>
                )}
              </span>
            );
          })}
      </div>

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={getPageUrl(currentPage + 1)}
          className="px-4 py-2 border border-border text-secondary hover:border-accent hover:text-accent transition-colors"
        >
          Next
        </Link>
      ) : (
        <span className="px-4 py-2 border border-border text-muted cursor-not-allowed">
          Next
        </span>
      )}
    </nav>
  );
}
