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
import { supabase } from "@/lib/supabase-client"

interface User {
  id: string
  name: string
  email: string
  role: "user" | "admin"
  created_at: string
  is_verified: boolean
}

export default function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
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

  useEffect(() => {
    fetchUsers()
  }, [user])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      setError("")
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role, created_at, is_verified")
        .order("created_at", { ascending: false })

      if (error) throw error

      // Filter out admin users
      const nonAdminUsers = data
        .filter((user) => user.role !== "admin")
        .map((user) => ({
          ...user,
          isVerified: user.is_verified,
        }))

      setUsers(nonAdminUsers)
    } catch (error) {
      console.error("Error fetching users:", error)
      setError("Failed to load users. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
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
      const { data: userData, error: fetchError } = await supabase
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
      const { data: updateData, error: updateError } = await supabase
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
      const { data, error: updateError } = await supabase
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

  const submitDeleteUser = async () => {
    if (!selectedUser) return

    try {
      setError("") // Clear any previous errors
      setSuccess("") // Clear any previous success messages
      
      console.log(`Attempting to delete user: ${selectedUser.name} (ID: ${selectedUser.id})`)
      
      // Call our API endpoint to delete the user
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error("Delete user API error:", data);
        throw new Error(data.error || 'Failed to delete user');
      }

      console.log("Delete user API response:", data);
      
      // Update UI
      setUsers(users.filter((u) => u.id !== selectedUser.id))
      setSuccess(data.message || "User deleted successfully")
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("Error deleting user:", error)
      setError(error instanceof Error ? error.message : "Failed to delete user")
    }
  }

  const submitAddUser = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
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

      if (data.user) {
        setUsers([
          ...users,
          {
            id: data.user.id,
            name: formData.name,
            email: formData.email,
            role: formData.role,
            created_at: new Date().toISOString(),
            is_verified: false,
          },
        ])
        setSuccess("User added successfully")
        setIsAddDialogOpen(false)
      }
    } catch (error) {
      console.error("Error adding user:", error)
      setError("Failed to add user")
    }
  }

  return (
    <ProtectedRoute adminOnly>
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
            <Alert className="mb-4">
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
                      <TableHead>Created At</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{user.is_verified ? "Yes" : "No"}</TableCell>
                        <TableCell className="text-right">
                          {!user.is_verified && (
                            <Button variant="ghost" size="icon" onClick={() => handleVerifyUser(user)}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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

          {/* Delete User Dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete User</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this user? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={submitDeleteUser}>
                  Delete
                </Button>
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
    </ProtectedRoute>
  )
}

