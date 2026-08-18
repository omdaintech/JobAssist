import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from './badge'

interface Column<T> {
    key: keyof T | string
    header: string
    cell?: (value: any, row: T) => ReactNode
    className?: string
}

interface DataTableProps<T> {
    data: T[]
    columns: Column<T>[]
    onRowClick?: (row: T) => void
    loading?: boolean
    emptyMessage?: string
    getRowId?: (row: T, index: number) => string | number
    expandedRowId?: string | number | null
    renderExpandedRow?: (row: T) => ReactNode
}

export function DataTable<T>({
    data,
    columns,
    onRowClick,
    loading = false,
    emptyMessage = "No data available",
    getRowId,
    expandedRowId,
    renderExpandedRow
}: DataTableProps<T>) {
    if (loading) {
        return (
            <div className="rounded-lg border bg-card">
                <div className="p-6">
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-12 bg-gray-200 animate-pulse rounded" />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="p-6 text-center">
                    <p className="text-muted-foreground">{emptyMessage}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b">
                            {columns.map((column, index) => (
                                <th
                                    key={String(column.key) + index}
                                    className={cn(
                                        "h-12 px-4 text-left align-middle font-medium text-muted-foreground",
                                        column.className
                                    )}
                                >
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => {
                            const rowId = getRowId ? getRowId(row, rowIndex) : ((row as any)?.id ?? rowIndex)
                            const isExpanded = expandedRowId !== undefined && expandedRowId !== null && expandedRowId === rowId

                            return (
                                <React.Fragment key={String(rowId)}>
                                    <tr
                                        className={cn(
                                            "border-b transition-colors hover:bg-muted/50",
                                            onRowClick && "cursor-pointer"
                                        )}
                                        onClick={() => onRowClick?.(row)}
                                    >
                                        {columns.map((column, colIndex) => {
                                            const value = getNestedValue(row, String(column.key))
                                            return (
                                                <td
                                                    key={String(column.key) + colIndex}
                                                    className={cn(
                                                        "p-4 align-middle",
                                                        column.className
                                                    )}
                                                >
                                                    {column.cell ? column.cell(value, row) : value}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                    {isExpanded && renderExpandedRow && (
                                        <tr key={`${String(rowId)}-expanded`} className="border-b bg-muted/40">
                                            <td colSpan={columns.length} className="p-6">
                                                {renderExpandedRow(row)}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// Utility function to get nested object values
function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
}

// Pre-built cell renderers
export const StatusBadge = ({ status }: { status: boolean }) => (
    <Badge variant={status ? "success" : "secondary"}>
        {status ? "Active" : "Inactive"}
    </Badge>
)

export const DateCell = ({ date }: { date: string | Date | null }) => {
    if (!date) return <span className="text-muted-foreground">-</span>

    const formatted = new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })

    return <span className="text-sm">{formatted}</span>
}

export const NumberCell = ({ value }: { value: number }) => (
    <span className="font-mono text-sm">{(value || 0).toLocaleString()}</span>
) 
