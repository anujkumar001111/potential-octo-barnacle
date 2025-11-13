import { useState, useEffect, useCallback } from 'react'
import { useWindowApi } from '@/hooks/useWindowApi'

/**
 * Custom hook for managing browser navigation handlers and state
 * Handles URL navigation, back/forward/refresh operations, and navigation state
 */
export const useNavigationHandlers = () => {
    // Navigation state for browser controls
    const [canGoBack, setCanGoBack] = useState(false)
    const [canGoForward, setCanGoForward] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Use window API hook for type-safe access to Electron APIs
    const { getCurrentUrl, onUrlChange } = useWindowApi()

    // Get current URL and monitor URL changes on initialization
    useEffect(() => {
        const initUrl = async () => {
            const url = await getCurrentUrl()
            // setCurrentUrl is handled in the main component

            // Also get initial navigation state
            if (window.api?.view?.getNavigationState) {
                try {
                    const navState = await window.api.view.getNavigationState()
                    setCanGoBack(navState.canGoBack)
                    setCanGoForward(navState.canGoForward)
                } catch (error) {
                    console.error('[Navigation] Failed to get initial navigation state:', error)
                }
            }
        }

        // Monitor URL changes
        const unsubscribe = onUrlChange((url: string) => {
            // setCurrentUrl is handled in the main component
            console.log('URL changed:', url)

            // Update navigation state when URL changes
            if (window.api?.view?.getNavigationState) {
                window.api.view.getNavigationState().then(navState => {
                    setCanGoBack(navState.canGoBack)
                    setCanGoForward(navState.canGoForward)
                }).catch(error => {
                    console.error('[Navigation] Failed to update navigation state:', error)
                })
            }
        })

        initUrl()

        // Cleanup URL change listener
        return () => {
            unsubscribe()
        }
    }, [getCurrentUrl, onUrlChange])

    // Navigation handlers for BrowserArea
    // Requirement 3.2, 3.3, 3.4: Handle invalid URLs gracefully with user-friendly error messages
    const handleNavigate = useCallback(async (url: string, antdMessage: any, t: any) => {
        try {
            setIsLoading(true)
            if (window.api?.view?.navigateTo) {
                const result = await window.api.view.navigateTo(url)
                if (result && !result.success) {
                    // IPC returned error result
                    console.error('[Navigation] Navigation failed:', result.error)
                    antdMessage.error(t('navigation_failed') || 'Failed to navigate to URL')
                    // Current page remains loaded - no additional action needed
                } else {
                    console.log('[Navigation] Navigated to:', url)
                }
            }
        } catch (error) {
            // Requirement 3.2, 3.3, 3.4: Show user-friendly error message and keep current page loaded
            console.error('[Navigation] Failed to navigate:', error)
            antdMessage.error(t('navigation_failed') || 'Failed to navigate to URL')
            // Current page remains loaded - no additional action needed
        } finally {
            setIsLoading(false)
        }
    }, [])

    const handleBack = useCallback(async (antdMessage: any, t: any) => {
        try {
            if (window.api?.view?.goBack) {
                const result = await window.api.view.goBack()
                if (!result.success) {
                    console.warn('[Navigation] Go back failed:', result.error)
                    // Show user-friendly error message
                    antdMessage.warning(t('navigation_back_failed') || 'Cannot go back')
                }
            }
        } catch (error) {
            console.error('[Navigation] Failed to go back:', error)
            antdMessage.error(t('navigation_back_failed') || 'Failed to go back')
        }
    }, [])

    const handleForward = useCallback(async (antdMessage: any, t: any) => {
        try {
            if (window.api?.view?.goForward) {
                const result = await window.api.view.goForward()
                if (!result.success) {
                    console.warn('[Navigation] Go forward failed:', result.error)
                    // Show user-friendly error message
                    antdMessage.warning(t('navigation_forward_failed') || 'Cannot go forward')
                }
            }
        } catch (error) {
            console.error('[Navigation] Failed to go forward:', error)
            antdMessage.error(t('navigation_forward_failed') || 'Failed to go forward')
        }
    }, [])

    const handleReload = useCallback(async (antdMessage: any, t: any) => {
        try {
            setIsLoading(true)
            if (window.api?.view?.reload) {
                const result = await window.api.view.reload()
                if (result && !result.success) {
                    // IPC returned error result
                    console.error('[Navigation] Reload failed:', result.error)
                    antdMessage.error(t('navigation_reload_failed') || 'Failed to reload page')
                } else {
                    console.log('[Navigation] Page reloaded')
                }
            }
        } catch (error) {
            // Show user-friendly error message and keep current page loaded
            console.error('[Navigation] Failed to reload:', error)
            antdMessage.error(t('navigation_reload_failed') || 'Failed to reload page')
        } finally {
            setIsLoading(false)
        }
    }, [])

    return {
        canGoBack,
        canGoForward,
        isLoading,
        handleNavigate,
        handleBack,
        handleForward,
        handleReload
    }
}