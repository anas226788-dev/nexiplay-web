'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
}

export default function Pagination({ currentPage, totalPages, totalItems, itemsPerPage }: PaginationProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    if (totalPages <= 1) return null;

    // Build URL for a given page number, preserving other search params
    const buildPageUrl = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        if (page <= 1) {
            params.delete('page');
        } else {
            params.set('page', String(page));
        }
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
    };

    // Generate page numbers with ellipsis logic
    const getPageNumbers = (): (number | 'ellipsis')[] => {
        const pages: (number | 'ellipsis')[] = [];
        const maxVisible = 7; // Max page buttons to show

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage > 3) {
                pages.push('ellipsis');
            }

            // Pages around current
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push('ellipsis');
            }

            // Always show last page
            pages.push(totalPages);
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <nav aria-label="Pagination" className="mt-12 mb-4">
            {/* Items info */}
            <p className="text-center text-sm text-gray-500 mb-4">
                Showing <span className="text-gray-300 font-medium">{startItem}-{endItem}</span> of{' '}
                <span className="text-gray-300 font-medium">{totalItems}</span> items
            </p>

            {/* Pagination buttons */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
                {/* Previous Button */}
                {currentPage > 1 ? (
                    <Link
                        href={buildPageUrl(currentPage - 1)}
                        className="pagination-btn group"
                        aria-label="Previous page"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hidden sm:inline text-sm">Prev</span>
                    </Link>
                ) : (
                    <span className="pagination-btn opacity-30 cursor-not-allowed" aria-disabled="true">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hidden sm:inline text-sm">Prev</span>
                    </span>
                )}

                {/* Page Numbers */}
                {pageNumbers.map((page, index) =>
                    page === 'ellipsis' ? (
                        <span
                            key={`ellipsis-${index}`}
                            className="w-8 h-10 flex items-center justify-center text-gray-600 text-sm select-none"
                        >
                            ···
                        </span>
                    ) : page === currentPage ? (
                        <span
                            key={page}
                            className="pagination-btn-active"
                            aria-current="page"
                        >
                            {page}
                        </span>
                    ) : (
                        <Link
                            key={page}
                            href={buildPageUrl(page)}
                            className="pagination-btn"
                        >
                            {page}
                        </Link>
                    )
                )}

                {/* Next Button */}
                {currentPage < totalPages ? (
                    <Link
                        href={buildPageUrl(currentPage + 1)}
                        className="pagination-btn group"
                        aria-label="Next page"
                    >
                        <span className="hidden sm:inline text-sm">Next</span>
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                ) : (
                    <span className="pagination-btn opacity-30 cursor-not-allowed" aria-disabled="true">
                        <span className="hidden sm:inline text-sm">Next</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </span>
                )}
            </div>

            {/* Quick jump for large page counts */}
            {totalPages > 10 && (
                <div className="flex items-center justify-center gap-3 mt-4">
                    {currentPage > 1 && (
                        <Link
                            href={buildPageUrl(1)}
                            className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                        >
                            ← First Page
                        </Link>
                    )}
                    {currentPage < totalPages && (
                        <Link
                            href={buildPageUrl(totalPages)}
                            className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                        >
                            Last Page →
                        </Link>
                    )}
                </div>
            )}
        </nav>
    );
}
