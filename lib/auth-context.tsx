"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { supabase, getCurrentUser } from "@/lib/supabase-client"

export interface User {
  id: string
  name: string
  email: string
  role: "user" | "admin"
  isVerified: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; redirectTo?: string }>
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Debug function to log state changes
  const logAuthState = (action: string, data: any) => {
    console.log(`[Auth Debug - ${action}]`, {
      ...data,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'server-side',
    });
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        logAuthState('Initialize', 'Starting auth initialization...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        logAuthState('Session Check', { session, error });

        if (error) throw error;

        if (session?.user && mounted) {
          const userData = await getCurrentUser();
          if (userData) {
            const userState = {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              isVerified: userData.is_verified,
            };
            setUser(userState);
            setIsAuthenticated(true);
            logAuthState('User State Updated', { user: userState });
          }
        }
      } catch (error) {
        logAuthState('Initialize Error', error);
        if (mounted) {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logAuthState('Auth State Change', { event, session });

      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        try {
          const userData = await getCurrentUser();
          if (userData) {
            const userState = {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              isVerified: userData.is_verified,
            };
            setUser(userState);
            setIsAuthenticated(true);
            logAuthState('Auth State Updated', { user: userState });
          }
        } catch (error) {
          logAuthState('State Change Error', error);
        }
      }
    });

    return () => {
      logAuthState('Cleanup', 'Unsubscribing from auth changes');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    logAuthState('Login Start', { email });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const userData = await getCurrentUser();
      logAuthState('Login Response', { userData });

      if (!userData) {
        throw new Error("User data not found");
      }

      if (!userData.is_verified) {
        await supabase.auth.signOut();
        return {
          success: false,
          message: "Your account is pending approval. Please wait for the institute to verify your account.",
        };
      }

      const targetPath = userData.role === "admin" ? "/admin/users" : "/dashboard";
      logAuthState('Login Success', { targetPath });

      return {
        success: true,
        message: "Login successful",
        redirectTo: targetPath
      };
    } catch (error: any) {
      logAuthState('Login Error', error);
      return { success: false, message: error.message };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase.from("users").insert([
          {
            id: data.user.id,
            name,
            email,
            role: "user",
            is_verified: false,
          },
        ]);

        if (profileError) throw profileError;
      }

      return { success: true, message: "Registration successful. Please wait for admin approval." };
    } catch (error: any) {
      logAuthState('Registration Error', error);
      return { success: false, message: error.message };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      logAuthState('Logout Error', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

