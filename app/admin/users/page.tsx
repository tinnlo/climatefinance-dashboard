"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Trash2, Edit, UserPlus, CheckCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ProtectedRoute } from "@/components/protected-route"
import { getSupabaseClient } from "@/lib/supabase-client"
import { deleteUser } from "@/lib/user-management"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchParamsProvider } from "../../components/SearchParamsProvider"

// Define the User interface to match what comes from Supabase
interface User {
  id: string
  name?: string
  email: string
  role?: string
  created_at?: string
  is_verified?: boolean
  [key: string]: any // Allow for additional properties
}

function AdminUsersContent() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user" as "user" | "admin",
    password: "",
  })

  const fetchUsers = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Direct Supabase query to fetch users
      const { data, error } = await getSupabaseClient()
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching users:', error);
        setError(error.message);
        toast.error("Failed to load users");
        return;
      }
      
      console.log('Fetched users:', data);
      setUsers(data as User[] || []);
    } catch (err) {
      console.error("Error fetching users:", err)
      setError("An unexpected error occurred")
      toast.error("Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name || "",
      email: user.email,
      role: (user.role as "user" | "admin") || "user",
      password: "",
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return
    }

    try {
      const { error } = await getSupabaseClient()
        .from('users')
        .delete()
        .eq('id', userId);
        
      if (error) {
        toast.error(`Failed to delete user: ${error.message}`)
        return;
      }
      
      toast.success("User deleted successfully")
      setUsers(users.filter((u) => u.id !== userId))
    } catch (err) {
      console.error("Error deleting user:", err)
      toast.error("Failed to delete user")
    }
  }

  const handleAddUser = () => {
    setFormData({
      name: "",
      email: "",
      role: "user",
      password: "",
    })
    setIsAddDialogOpen(true)
  }

  const handleVerifyUser = async (user: User) => {
    setError("")
    setSuccess("")

    try {
      console.log(`Attempting to verify user: ${user.name} (ID: ${user.id})`)

      // First, check if the user exists and get their current verification status
      const { data: userData, error: fetchError } = await getSupabaseClient()
        .from("users")
        .select("is_verified")
        .eq("id", user.id)
        .single()

      if (fetchError) {
        console.error("Error fetching user data:", fetchError)
        throw new Error(`Failed to fetch user data: ${fetchError.message}`)
      }

      console.log("Fetched user data:", userData)

      if (!userData) {
        console.error(`User ${user.name} not found in the database.`)
        throw new Error(`User ${user.name} not found in the database.`)
      }

      if (userData.is_verified) {
        console.log(`User ${user.name} is already verified.`)
        setSuccess(`User ${user.name} is already verified.`)
        return
      }

      // If not verified, update the user's verification status
      const { data: updateData, error: updateError } = await getSupabaseClient()
        .from("users")
        .update({ is_verified: true })
        .eq("id", user.id)
        .select()

      console.log("Update operation result:", updateData)

      if (updateError) {
        console.error("Error updating user verification status:", updateError)
        throw new Error(`Failed to update user verification status: ${updateError.message}`)
      }

      if (updateData && updateData.length > 0) {
        console.log(`Successfully verified user ${user.name}`)
        setUsers(users.map((u) => (u.id === user.id ? { ...u, is_verified: true } : u)))
        setSuccess(`User ${user.name} has been verified successfully.`)
      } else {
        console.error(`No rows were updated for user ${user.name}`)
        throw new Error(`Failed to verify user ${user.name}. No changes were made.`)
      }

      await fetchUsers() // Refresh the user list
    } catch (error: any) {
      console.error("Error in handleVerifyUser:", error)
      setError(`Failed to verify user ${user.name}: ${error.message}`)
    }
  }

  const submitEditUser = async () => {
    if (!selectedUser) return

    try {
      const { data, error: updateError } = await getSupabaseClient()
        .from("users")
        .update({
          name: formData.name,
          email: formData.email,
          role: formData.role,
        })
        .eq("id", selectedUser.id)
        .select()
        .single()

      if (updateError) throw updateError

      setUsers(
        users.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                name: formData.name,
                email: formData.email,
                role: formData.role,
              }
            : u,
        ),
      )
      setSuccess("User updated successfully")
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error("Error updating user:", error)
      setError("Failed to update user")
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      // Cast the newRole to the correct type
      const roleValue = newRole as 'user' | 'admin';
      
      const { data, error } = await getSupabaseClient()
        .from('users')
        .update({ role: roleValue })
        .eq('id', userId)
        .select();
        
      if (error) {
        toast.error(`Failed to update user role: ${error.message}`);
        return;
      }
      
      toast.success("User role updated successfully");
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      console.error("Error updating user role:", err);
      toast.error("Failed to update user role");
    }
  };

  const submitAddUser = async () => {
    try {
      const { data, error } = await getSupabaseClient().auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
          },
        },
      })

      if (error) throw error

      // Create a user record in the users table
      const { error: insertError } = await getSupabaseClient()
        .from("users")
        .insert([
          {
            id: data.user?.id,
            name: formData.name,
            email: formData.email,
            role: formData.role,
            is_verified: false,
          },
        ])

      if (insertError) throw insertError

      toast.success("User added successfully. They will need to verify their email.")
      setIsAddDialogOpen(false)
      fetchUsers() // Refresh the user list
    } catch (error: any) {
      console.error("Error adding user:", error)
      setError(error.message || "Failed to add user")
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background/95 to-forest/30">
      <Header />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-light tracking-tight">User Management</h1>
          <Button onClick={handleAddUser}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="info" className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-4 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-5">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name || 'N/A'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Select
                            defaultValue={user.role || 'user'}
                            onValueChange={(value: 'user' | 'admin') => handleRoleChange(user.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          {!user.is_verified && (
                            <Button variant="ghost" size="icon" onClick={() => handleVerifyUser(user)}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitEditUser}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add User Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
              <DialogDescription>Create a new user account</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Name</Label>
                <Input
                  id="add-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-email">Email</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-password">Password</Label>
                <Input
                  id="add-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitAddUser}>Add User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

export default function AdminUsersPage() {
  return (
    <ProtectedRoute adminOnly>
      <SearchParamsProvider>
        <AdminUsersContent />
      </SearchParamsProvider>
    </ProtectedRoute>
  )
}

