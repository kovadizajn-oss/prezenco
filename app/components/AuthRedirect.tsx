'use client'

import { useEffect } from 'react'

export default function AuthRedirect() {
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      window.location.href = '/reset-password' + hash
    }
  }, [])

  return null
}