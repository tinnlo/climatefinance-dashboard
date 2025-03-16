"use client"

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Create a Supabase client for client-side usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Define user type based on the Database type
type User = Database['public']['Tables']['users']['Row'];
type UserUpdate = Database['public']['Tables']['users']['Update'];

/**
 * Get all users from Supabase
 */
export async function getUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return { users: [], error: error.message };
    }

    return { users: data || [], error: null };
  } catch (error) {
    console.error('Error in getUsers:', error);
    return { users: [], error: 'Failed to fetch users' };
  }
}

/**
 * Get a user by ID from Supabase
 */
export async function getUserById(id: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return { user: null, error: error.message };
    }

    return { user: data, error: null };
  } catch (error) {
    console.error('Error in getUserById:', error);
    return { user: null, error: 'Failed to fetch user' };
  }
}

/**
 * Update a user in Supabase
 */
export async function updateUser(id: string, userData: UserUpdate) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return { user: null, error: error.message };
    }

    return { user: data, error: null };
  } catch (error) {
    console.error('Error in updateUser:', error);
    return { user: null, error: 'Failed to update user' };
  }
}

/**
 * Delete a user from Supabase
 */
export async function deleteUser(id: string) {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error in deleteUser:', error);
    return { success: false, error: 'Failed to delete user' };
  }
}

/**
 * Get the current user from Supabase
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Error getting current user:', error);
      return { user: null, error: error.message };
    }

    if (!user) {
      return { user: null, error: null };
    }

    // Get the user profile data
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error getting user profile:', profileError);
      return { user, profile: null, error: profileError.message };
    }

    return { user, profile, error: null };
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return { user: null, profile: null, error: 'Failed to get current user' };
  }
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin() {
  try {
    const { user, profile } = await getCurrentUser();
    return !!profile && profile.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
} 