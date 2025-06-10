
import React, { useState, useEffect } from 'react';
import { Plus, Search, Download, Key, LogOut, Shield, Eye, EyeOff, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from './AuthProvider';
import { PasswordStorageService, Password } from '@/lib/passwordStorage';
import { EncryptionKey } from '@/lib/encryption';
import PasswordForm from './PasswordForm';
import { useToast } from '@/hooks/use-toast';

interface PasswordDashboardProps {
  encryptionKey: EncryptionKey;
}

const PasswordDashboard: React.FC<PasswordDashboardProps> = ({ encryptionKey }) => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [editingPassword, setEditingPassword] = useState<Password | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPasswords();
  }, []);

  const loadPasswords = () => {
    if (user) {
      const vault = PasswordStorageService.getVault(user.uid, encryptionKey);
      setPasswords(vault.passwords);
    }
  };

  const handleSavePassword = (password: Password) => {
    if (user) {
      PasswordStorageService.savePassword(user.uid, password, encryptionKey);
      loadPasswords();
      setShowPasswordForm(false);
      setEditingPassword(null);
      toast({
        title: "Success",
        description: "Password saved successfully",
      });
    }
  };

  const handleDeletePassword = (passwordId: string) => {
    if (user && window.confirm('Are you sure you want to delete this password?')) {
      PasswordStorageService.deletePassword(user.uid, passwordId, encryptionKey);
      loadPasswords();
      toast({
        title: "Success",
        description: "Password deleted successfully",
      });
    }
  };

  const handleExportVault = () => {
    if (user) {
      PasswordStorageService.exportVault(user.uid, encryptionKey);
      toast({
        title: "Success",
        description: "Vault exported successfully",
      });
    }
  };

  const togglePasswordVisibility = (passwordId: string) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(passwordId)) {
      newVisible.delete(passwordId);
    } else {
      newVisible.add(passwordId);
    }
    setVisiblePasswords(newVisible);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const filteredPasswords = passwords.filter(password =>
    password.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    password.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    password.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showPasswordForm) {
    return (
      <PasswordForm
        password={editingPassword}
        onSave={handleSavePassword}
        onCancel={() => {
          setShowPasswordForm(false);
          setEditingPassword(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Password Manager</h1>
                <p className="text-sm text-gray-500">Welcome, {user?.displayName || user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportVault}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Add */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search passwords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <Button
            onClick={() => setShowPasswordForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Password
          </Button>
        </div>

        {/* Password Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Passwords</p>
                <p className="text-2xl font-bold text-gray-900">{passwords.length}</p>
              </div>
              <Key className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(passwords.map(p => p.category)).size}
                </p>
              </div>
              <Shield className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Updated</p>
                <p className="text-2xl font-bold text-gray-900">
                  {passwords.length > 0 ? 'Today' : 'Never'}
                </p>
              </div>
              <Download className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Passwords List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Passwords</h2>
          </div>
          
          {filteredPasswords.length === 0 ? (
            <div className="text-center py-12">
              <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No passwords found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'Try adjusting your search term' : 'Get started by adding your first password'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setShowPasswordForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Password
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredPasswords.map((password) => (
                <div key={password.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {password.name}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {password.category}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Username</p>
                          <p 
                            className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                            onClick={() => copyToClipboard(password.username, 'Username')}
                          >
                            {password.username}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Password</p>
                          <div className="flex items-center gap-2">
                            <p 
                              className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                              onClick={() => copyToClipboard(password.password, 'Password')}
                            >
                              {visiblePasswords.has(password.id) ? password.password : '••••••••'}
                            </p>
                            <button
                              onClick={() => togglePasswordVisibility(password.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {visiblePasswords.has(password.id) ? 
                                <EyeOff className="w-4 h-4" /> : 
                                <Eye className="w-4 h-4" />
                              }
                            </button>
                          </div>
                        </div>
                        {password.url && (
                          <div>
                            <p className="text-sm text-gray-500">Website</p>
                            <a 
                              href={password.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              {password.url}
                            </a>
                          </div>
                        )}
                        {password.notes && (
                          <div>
                            <p className="text-sm text-gray-500">Notes</p>
                            <p className="text-sm text-gray-900">{password.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        onClick={() => {
                          setEditingPassword(password);
                          setShowPasswordForm(true);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeletePassword(password.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordDashboard;
