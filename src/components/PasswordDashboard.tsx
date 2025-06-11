import React, { useState, useEffect } from 'react';
import { Plus, Search, Download, Key, LogOut, Shield, Eye, EyeOff, Trash2, Edit, Cloud, Settings, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from './AuthProvider';
import { useTheme } from '@/contexts/ThemeContext';
import { PasswordStorageService, Password } from '@/lib/passwordStorage';
import { EncryptionKey } from '@/lib/encryption';
import PasswordForm from './PasswordForm';
import { useToast } from '@/hooks/use-toast';

interface PasswordDashboardProps {
  encryptionKey: EncryptionKey;
  onNavigateToSync?: () => void;
  onNavigateToLostKey?: () => void;
}

const PasswordDashboard: React.FC<PasswordDashboardProps> = ({ 
  encryptionKey, 
  onNavigateToSync,
  onNavigateToLostKey 
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Password Manager</h1>
                <p className="text-sm text-muted-foreground">Welcome, {user?.displayName || user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleTheme}
                variant="outline"
                size="sm"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              {onNavigateToSync && (
                <Button
                  onClick={onNavigateToSync}
                  variant="outline"
                  size="sm"
                >
                  <Cloud className="w-4 h-4 mr-2" />
                  Sync
                </Button>
              )}
              <Button
                onClick={handleExportVault}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {onNavigateToLostKey && (
                <Button
                  onClick={onNavigateToLostKey}
                  variant="outline"
                  size="sm"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Recovery
                </Button>
              )}
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search passwords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
            />
          </div>
          <Button
            onClick={() => setShowPasswordForm(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Password
          </Button>
        </div>

        {/* Password Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Passwords</p>
                <p className="text-2xl font-bold text-foreground">{passwords.length}</p>
              </div>
              <Key className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold text-foreground">
                  {new Set(passwords.map(p => p.category)).size}
                </p>
              </div>
              <Shield className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-2xl font-bold text-foreground">
                  {passwords.length > 0 ? 'Today' : 'Never'}
                </p>
              </div>
              <Download className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Passwords List */}
        <div className="bg-card rounded-lg shadow-sm border border-border">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Your Passwords</h2>
          </div>
          
          {filteredPasswords.length === 0 ? (
            <div className="text-center py-12">
              <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No passwords found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search term' : 'Get started by adding your first password'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setShowPasswordForm(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Password
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredPasswords.map((password) => (
                <div key={password.id} className="p-6 hover:bg-accent/50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-foreground truncate">
                          {password.name}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {password.category}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Username</p>
                          <p 
                            className="text-sm font-medium text-foreground cursor-pointer hover:text-primary"
                            onClick={() => copyToClipboard(password.username, 'Username')}
                          >
                            {password.username}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Password</p>
                          <div className="flex items-center gap-2">
                            <p 
                              className="text-sm font-medium text-foreground cursor-pointer hover:text-primary"
                              onClick={() => copyToClipboard(password.password, 'Password')}
                            >
                              {visiblePasswords.has(password.id) ? password.password : '••••••••'}
                            </p>
                            <button
                              onClick={() => togglePasswordVisibility(password.id)}
                              className="text-muted-foreground hover:text-foreground"
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
                            <p className="text-sm text-muted-foreground">Website</p>
                            <a 
                              href={password.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-primary hover:text-primary/80"
                            >
                              {password.url}
                            </a>
                          </div>
                        )}
                        {password.notes && (
                          <div>
                            <p className="text-sm text-muted-foreground">Notes</p>
                            <p className="text-sm text-foreground">{password.notes}</p>
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
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
