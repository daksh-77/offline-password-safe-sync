
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, EyeOff, RefreshCw, Copy, Shield, AlertTriangle } from 'lucide-react';
import { Password } from '@/lib/passwordStorage';
import { PasswordStorageService } from '@/lib/passwordStorage';
import { PasswordAnalyzer } from '@/lib/passwordAnalyzer';
import { BreachMonitor } from '@/lib/breachMonitor';
import { useToast } from '@/hooks/use-toast';

interface PasswordFormProps {
  password?: Password | null;
  onSave: (password: Password) => void;
  onCancel: () => void;
}

const PasswordForm: React.FC<PasswordFormProps> = ({ password, onSave, onCancel }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    category: 'Personal'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordAnalysis, setPasswordAnalysis] = useState<any>(null);
  const [isCheckingBreach, setIsCheckingBreach] = useState(false);
  const [breachStatus, setBreachStatus] = useState<'safe' | 'warning' | 'danger'>('safe');

  useEffect(() => {
    if (password) {
      setFormData({
        name: password.name,
        username: password.username,
        password: password.password,
        url: password.url || '',
        notes: password.notes || '',
        category: password.category
      });
    }
  }, [password]);

  useEffect(() => {
    if (formData.password) {
      analyzePassword(formData.password);
      checkPasswordBreach(formData.password);
    }
  }, [formData.password]);

  const analyzePassword = (password: string) => {
    const analysis = PasswordAnalyzer.analyzePassword(password);
    setPasswordAnalysis(analysis);
  };

  const checkPasswordBreach = async (password: string) => {
    if (password.length < 4) return;
    
    setIsCheckingBreach(true);
    try {
      const result = await BreachMonitor.checkPasswordBreach(password);
      if (result.isBreached) {
        setBreachStatus('danger');
      } else {
        const safety = BreachMonitor.getPasswordSafety(password);
        setBreachStatus(safety);
      }
    } catch (error) {
      console.error('Breach check failed:', error);
    } finally {
      setIsCheckingBreach(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateRandomPassword = () => {
    const newPassword = PasswordStorageService.generatePassword(16, true);
    setFormData(prev => ({ ...prev, password: newPassword }));
    toast({
      title: "Password Generated",
      description: "A strong password has been generated for you",
    });
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(formData.password);
      toast({
        title: "Copied",
        description: "Password copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy password",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.username.trim() || !formData.password.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const passwordData: Password = {
      id: password?.id || crypto.randomUUID(),
      name: formData.name.trim(),
      username: formData.username.trim(),
      password: formData.password,
      url: formData.url.trim(),
      notes: formData.notes.trim(),
      category: formData.category,
      createdAt: password?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    onSave(passwordData);
  };

  const getStrengthColor = () => {
    if (!passwordAnalysis) return 'bg-gray-300';
    if (passwordAnalysis.score < 30) return 'bg-red-500';
    if (passwordAnalysis.score < 60) return 'bg-yellow-500';
    if (passwordAnalysis.score < 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getBreachStatusColor = () => {
    switch (breachStatus) {
      case 'safe': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'danger': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getBreachStatusIcon = () => {
    switch (breachStatus) {
      case 'safe': return <Shield className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'danger': return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Button
                onClick={onCancel}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                {password ? 'Edit Password' : 'Add New Password'}
              </h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Gmail, Facebook, Bank Account"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Personal">Personal</option>
                  <option value="Work">Work</option>
                  <option value="Financial">Financial</option>
                  <option value="Social">Social</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username/Email *
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter username or email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-3">
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="text-gray-400 hover:text-gray-600"
                    title="Copy password"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* Password Analysis */}
              {formData.password && passwordAnalysis && (
                <div className="mt-3 space-y-3">
                  {/* Strength Meter */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Password strength:</span>
                      <span className={`font-medium ${
                        passwordAnalysis.score < 30 ? 'text-red-600' :
                        passwordAnalysis.score < 60 ? 'text-yellow-600' :
                        passwordAnalysis.score < 80 ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {passwordAnalysis.level} ({passwordAnalysis.score}/100)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${getStrengthColor()}`}
                        style={{ width: `${passwordAnalysis.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Crack Time */}
                  <div className="text-sm text-gray-600">
                    <strong>Estimated crack time:</strong> {passwordAnalysis.estimatedCrackTime}
                  </div>

                  {/* Breach Status */}
                  <div className={`p-3 rounded-lg border flex items-center gap-2 text-sm ${getBreachStatusColor()}`}>
                    {isCheckingBreach ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      getBreachStatusIcon()
                    )}
                    <span>
                      {isCheckingBreach ? 'Checking for breaches...' :
                       breachStatus === 'danger' ? 'Password found in data breaches!' :
                       breachStatus === 'warning' ? 'Password may be vulnerable' :
                       'No known breaches detected'}
                    </span>
                  </div>

                  {/* Feedback */}
                  {passwordAnalysis.feedback.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Suggestions:</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        {passwordAnalysis.feedback.map((feedback: string, index: number) => (
                          <li key={index} className="flex items-start gap-1">
                            <span className="w-1 h-1 bg-blue-500 rounded-full mt-2"></span>
                            {feedback}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="button"
                onClick={generateRandomPassword}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate Strong Password
              </Button>
            </div>

            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <input
                type="url"
                id="url"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional notes or security questions..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                onClick={onCancel}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {password ? 'Update Password' : 'Save Password'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PasswordForm;
