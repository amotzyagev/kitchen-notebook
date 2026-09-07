export function navigate(url: string) { window.history.pushState(null, '', url); window.dispatchEvent(new PopStateEvent('popstate')) }
export function useRouter() { return { push: navigate } }
