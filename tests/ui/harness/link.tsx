import type { ComponentProps } from 'react'
import { navigate } from './navigation'
export default function Link({ href = '', onClick, ...props }: ComponentProps<'a'>) {
  return <a {...props} href={href} onClick={e => { onClick?.(e); if (!e.defaultPrevented) { e.preventDefault(); navigate(href) } }} />
}
