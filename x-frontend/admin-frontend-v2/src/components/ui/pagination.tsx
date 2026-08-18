import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline"
import { Button } from "./button"

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems?: number
  itemsPerPage?: number
  onPageChange: (page: number) => void
  showItemsPerPage?: boolean
  itemsPerPageOptions?: number[]
  onItemsPerPageChange?: (itemsPerPage: number) => void
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  showItemsPerPage = false,
  itemsPerPageOptions = [5, 10, 20, 50],
  onItemsPerPageChange,
  className = "",
}: PaginationProps) {
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pageNumbers: (number | string)[] = []
    const maxPageButtons = 7 // Total buttons to show including ellipsis

    if (totalPages <= maxPageButtons) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      // Complex pagination with ellipsis
      if (currentPage <= 4) {
        // Near the beginning
        for (let i = 1; i <= 5; i++) {
          pageNumbers.push(i)
        }
        pageNumbers.push("...")
        pageNumbers.push(totalPages)
      } else if (currentPage >= totalPages - 3) {
        // Near the end
        pageNumbers.push(1)
        pageNumbers.push("...")
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pageNumbers.push(i)
        }
      } else {
        // In the middle
        pageNumbers.push(1)
        pageNumbers.push("...")
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i)
        }
        pageNumbers.push("...")
        pageNumbers.push(totalPages)
      }
    }

    return pageNumbers
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || 0)

  if (totalPages <= 1) {
    return null // Don't show pagination for single page
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Left side: Items info */}
      <div className="flex items-center space-x-4">
        {totalItems && (
          <p className="text-sm text-muted-foreground">
            Showing {startItem} to {endItem} of {totalItems} items
          </p>
        )}
        
        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center space-x-2">
            <label className="text-sm text-muted-foreground">Items per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="h-8 w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
            >
              {itemsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Navigation */}
      <div className="flex items-center space-x-2">
        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        <div className="flex items-center space-x-1">
          {getPageNumbers().map((pageNum, index) => (
            <React.Fragment key={index}>
              {pageNum === "..." ? (
                <span className="px-2 py-1 text-sm text-muted-foreground">...</span>
              ) : (
                <Button
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(Number(pageNum))}
                  className={`h-8 w-8 p-0 ${
                    pageNum === currentPage 
                      ? "bg-eu-blue hover:bg-eu-blue-700 text-white" 
                      : ""
                  }`}
                >
                  {pageNum}
                </Button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
