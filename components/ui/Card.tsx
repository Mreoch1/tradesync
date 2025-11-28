'use client'

import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  header?: ReactNode
  footer?: ReactNode
}

export default function Card({ children, className = '', title, header, footer }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden ${className}`}>
      {(title || header) && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white">
          {header || (
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              {title}
            </h3>
          )}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50">
          {footer}
        </div>
      )}
    </div>
  )
}
