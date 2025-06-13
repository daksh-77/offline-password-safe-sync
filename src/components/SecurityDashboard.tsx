import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, CheckCircle, RefreshCw, TrendingUp, Eye, AlertCircle } from 'lucide-react';
import { Password } from '@/lib/passwordStorage';
import { PasswordAnalyzer, SecurityScore } from '@/lib/passwordAnalyzer';
import { BreachMonitor, BreachSummary, BreachCheckResult } from '@/lib/breachMonitor';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface SecurityDashboardProps {
  passwords: Password[];
  onPasswordSelect?: (passwordId: string) => void;
}

const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ 
  passwords, 
  onPasswordSelect 
}) => {
  const { toast } = useToast();
  const [securityScore, setSecurityScore] = useState<SecurityScore | null>(null);
  const [breachSummary, setBreachSummary] = useState<BreachSummary | null>(null);
  const [breachResults, setBreachResults] = useState<Map<string, BreachCheckResult>>(new Map());
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);

  useEffect(() => {
    if (passwords.length > 0) {
      generateSecurityScore();
    }
  }, [passwords]);

  const generateSecurityScore = () => {
    const score = PasswordAnalyzer.generateSecurityScore(passwords);
    setSecurityScore(score);
  };

  const runBreachScan = async () => {
    if (passwords.length === 0) return;

    setIsScanning(true);
    
    try {
      console.log('Starting breach scan for', passwords.length, 'passwords');
      const results = await BreachMonitor.scanAllPasswords(passwords);
      setBreachResults(results);
      
      const summary = BreachMonitor.generateBreachSummary(results);
      setBreachSummary(summary);
      setLastScan(new Date());
      
      toast({
        title: "Breach Scan Complete",
        description: `Scanned ${passwords.length} passwords`,
      });
    } catch (error) {
      console.error('Breach scan failed:', error);
      toast({
        title: "Scan Failed",
        description: "Failed to complete breach scan",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const getPasswordSecurityLevel = (password: Password) => {
    const analysis = PasswordAnalyzer.analyzePassword(password.password);
    const breachResult = breachResults.get(password.id);
    
    if (breachResult?.isBreached) return 'danger';
    if (analysis.score < 50) return 'warning';
    return 'safe';
  };

  const getSecurityIcon = (level: 'safe' | 'warning' | 'danger') => {
    switch (level) {
      case 'safe': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'danger': return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getSecurityColor = (level: 'safe' | 'warning' | 'danger') => {
    switch (level) {
      case 'safe': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-amber-200 bg-amber-50';
      case 'danger': return 'border-red-200 bg-red-50';
    }
  };

  const getRiskLevelColor = (riskLevel: SecurityScore['riskLevel']) => {
    switch (riskLevel) {
      case 'Low': return 'text-green-700 bg-green-100';
      case 'Medium': return 'text-yellow-700 bg-yellow-100';
      case 'High': return 'text-orange-700 bg-orange-100';
      case 'Critical': return 'text-red-700 bg-red-100';
    }
  };

  if (passwords.length === 0) {
    return (
      <div className="bg-card p-8 rounded-lg border border-border text-center">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Passwords to Analyze</h3>
        <p className="text-muted-foreground">Add some passwords to see your security dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Score Overview */}
      {securityScore && (
        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Security Overview
            </h3>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(securityScore.riskLevel)}`}>
                {securityScore.riskLevel} Risk
              </span>
              <div className="text-2xl font-bold text-foreground">
                {securityScore.avgStrength}/100
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Overall Security Score</span>
              <span className="font-medium">{securityScore.avgStrength}%</span>
            </div>
            <Progress value={securityScore.avgStrength} className="h-3" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-accent rounded-lg">
              <div className="text-2xl font-bold text-foreground">{securityScore.totalPasswords}</div>
              <div className="text-sm text-muted-foreground">Total Passwords</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">{securityScore.strongPasswords}</div>
              <div className="text-sm text-green-600">Strong Passwords</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-2xl font-bold text-amber-700">{securityScore.weakPasswords}</div>
              <div className="text-sm text-amber-600">Weak Passwords</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-700">{securityScore.duplicates}</div>
              <div className="text-sm text-red-600">Duplicate Passwords</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Security Recommendations:</h4>
            <ul className="space-y-2">
              {securityScore.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Breach Monitoring */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Breach Monitoring
          </h3>
          <Button
            onClick={runBreachScan}
            disabled={isScanning}
            variant="outline"
            size="sm"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Scan for Breaches
              </>
            )}
          </Button>
        </div>

        {breachSummary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-accent rounded-lg">
                <div className="text-2xl font-bold text-foreground">{breachSummary.totalChecked}</div>
                <div className="text-sm text-muted-foreground">Passwords Checked</div>
              </div>
              <div className={`p-4 rounded-lg ${
                breachSummary.breachedPasswords > 0 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-green-50 border border-green-200'
              }`}>
                <div className={`text-2xl font-bold ${
                  breachSummary.breachedPasswords > 0 ? 'text-red-700' : 'text-green-700'
                }`}>
                  {breachSummary.breachedPasswords}
                </div>
                <div className={`text-sm ${
                  breachSummary.breachedPasswords > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  Breached Passwords
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Breach Recommendations:</h4>
              <ul className="space-y-1">
                {breachSummary.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-xs text-muted-foreground">
              Last scan: {breachSummary.lastScanDate.toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Run a breach scan to check if your passwords have been compromised in data breaches
            </p>
            <Button onClick={runBreachScan} disabled={isScanning}>
              {isScanning ? 'Scanning...' : 'Start Breach Scan'}
            </Button>
          </div>
        )}
      </div>

      {/* Password Security List */}
      {breachResults.size > 0 && (
        <div className="bg-card p-6 rounded-lg border border-border">
          <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Password Security Status
          </h3>
          
          <div className="space-y-3">
            {passwords.map(password => {
              const securityLevel = getPasswordSecurityLevel(password);
              const analysis = PasswordAnalyzer.analyzePassword(password.password);
              const breachResult = breachResults.get(password.id);
              
              return (
                <div
                  key={password.id}
                  className={`p-4 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${getSecurityColor(securityLevel)}`}
                  onClick={() => onPasswordSelect?.(password.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getSecurityIcon(securityLevel)}
                      <div>
                        <h4 className="font-medium text-foreground">{password.name}</h4>
                        <p className="text-sm text-muted-foreground">{password.username}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">
                        Strength: {analysis.score}/100
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {analysis.level}
                      </div>
                      {breachResult?.isBreached && (
                        <div className="text-xs text-red-600 font-medium">
                          Found in {breachResult.breachCount.toLocaleString()} breaches
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress bar for password strength */}
                  <div className="mt-3">
                    <Progress value={analysis.score} className="h-2" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard;