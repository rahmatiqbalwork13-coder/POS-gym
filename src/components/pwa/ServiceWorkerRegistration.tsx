'use client'

import { useEffect } from 'react'

// Version should match the cache name in sw.js
const APP_VERSION = 'v3'
const VERSION_KEY = 'gympos-app-version'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Check version and force reload if different
    const storedVersion = localStorage.getItem(VERSION_KEY)
    if (storedVersion && storedVersion !== APP_VERSION) {
      // Clear all caches and reload
      localStorage.setItem(VERSION_KEY, APP_VERSION)
      if ('caches' in window) {
        caches.keys().then((cacheNames) => {
          Promise.all(cacheNames.map((name) => caches.delete(name))).then(() => {
            window.location.reload()
          })
        })
      }
    } else if (!storedVersion) {
      localStorage.setItem(VERSION_KEY, APP_VERSION)
    }

    if ('serviceWorker' in navigator) {
      // Unregister old service workers first
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister()
        })
      })

      // Register new service worker
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered:', registration.scope)
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New content available, reload page
                    window.location.reload()
                  }
                })
              }
            })
          })
          .catch((error) => {
            console.log('SW registration failed:', error)
          })
      })
    }
  }, [])

  return null
}
