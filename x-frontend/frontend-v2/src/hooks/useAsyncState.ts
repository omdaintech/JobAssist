import { useState, useCallback } from 'react'

interface AsyncState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
}

interface UseAsyncStateReturn<T> extends AsyncState<T> {
  setData: (data: T | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
  execute: <Args extends unknown[]>(
    asyncFn: (...args: Args) => Promise<T>,
    ...args: Args
  ) => Promise<T | null>
}

/**
 * Custom hook for managing async operations with loading and error states
 * @param initialData Initial data value
 * @returns Object with data, loading, error states and control functions
 */
export const useAsyncState = <T = any>(initialData: T | null = null): UseAsyncStateReturn<T> => {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    isLoading: false,
    error: null
  })

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data, error: null }))
  }, [])

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }))
  }, [])

  const reset = useCallback(() => {
    setState({
      data: initialData,
      isLoading: false,
      error: null
    })
  }, [initialData])

  const execute = useCallback(async <Args extends unknown[]>(
    asyncFn: (...args: Args) => Promise<T>,
    ...args: Args
  ): Promise<T | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await asyncFn(...args)
      setData(result)
      return result
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'An error occurred'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [setData, setError, setLoading])

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    setData,
    setLoading,
    setError,
    reset,
    execute
  }
}

/**
 * Hook for simple loading states without data management
 */
export const useLoading = (initialLoading = false) => {
  const [isLoading, setIsLoading] = useState(initialLoading)
  
  const withLoading = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      setIsLoading(true)
      return await asyncFn()
    } catch (error) {
      console.error('Error in withLoading:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { isLoading, setIsLoading, withLoading }
} 