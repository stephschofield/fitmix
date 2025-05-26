"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"

// Define the user type
interface User {
  id: string
  name: string
  email: string
  image?: string
}

// Define the auth context type
interface AuthContextType {
  user: User | null
  isLoading: boolean
  logout: () => void
}

// Create the auth context
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  logout: () => {},
})

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext)

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = () => {
      try {
        // Try to get user data from cookie
        const userData = document.cookie
          .split("; ")
          .find((row) => row.startsWith("user_data="))
          ?.split("=")[1]

        // If not in cookie, try localStorage (for our client-side auth flow)
        const localUserData = localStorage.getItem("user_data")

        if (userData) {
          setUser(JSON.parse(decodeURIComponent(userData)))
        } else if (localUserData) {
          setUser(JSON.parse(localUserData))
        } else {
          setUser(null)

          // Redirect to login if on protected route
          const protectedRoutes = ["/dashboard", "/playlist", "/ai-generator"]
          const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

          if (isProtectedRoute) {
            router.push("/login")
          }
        }
      } catch (error) {
        console.error("Auth error:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [pathname, router])

  // Logout function
  const logout = async () => {
    try {
      // Clear localStorage
      localStorage.removeItem("user_data")

      // Clear cookies via API
      await fetch("/api/auth/logout")

      setUser(null)
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return <AuthContext.Provider value={{ user, isLoading, logout }}>{children}</AuthContext.Provider>
}
