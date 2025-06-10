import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { AadhaarVerificationService, AadhaarPDFData } from '@/lib/aadhaarVerification';
import { useToast } from '@/hooks/use-toast';

interface AadhaarVerificationProps {
  onVerificationComplete: (aadhaarData: AadhaarPDFData) => void;
  onCancel: () => void;
}

const AadhaarVerification: React.FC<AadhaarVerificationProps> = ({ 
  onVerificationComplete, 
  onCancel 
}) => {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'upload' | 'processing' | 'complete'>('upload');
  const [aadhaarData, setAadhaarData] = useState<AadhaarPDFData | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file only",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    setVerificationStep('processing');

    try {
      const verificationResult = await AadhaarVerificationService.verifyAadhaarPDF(file);
      
      if (verificationResult) {
        setAadhaarData(verificationResult);
        setVerificationStep('complete');
        toast({
          title: "Verification Successful",
          description: "Aadhaar document verified successfully",
        });
      } else {
        throw new Error('Verification failed');
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Could not verify Aadhaar document. Please ensure it's a valid UIDAI issued PDF.",
        variant: "destructive",
      });
      setVerificationStep('upload');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmVerification = () => {
    if (aadhaarData) {
      onVerificationComplete(aadhaarData);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <FileText className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Aadhaar Verification</h2>
        <p className="text-gray-600 text-sm">
          Upload your Aadhaar PDF for secure verification
        </p>
      </div>

      {verificationStep === 'upload' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-4">
              Click to upload your Aadhaar PDF
            </p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="aadhaar-upload"
              disabled={isVerifying}
            />
            <label
              htmlFor="aadhaar-upload"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
            >
              Select PDF File
            </label>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Security Notice:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Only upload official UIDAI issued Aadhaar PDF</li>
                  <li>File is processed locally on your device</li>
                  <li>No data is sent to external servers</li>
                  <li>PDF will be verified for digital signatures</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={onCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {verificationStep === 'processing' && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying Aadhaar document...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
        </div>
      )}

      {verificationStep === 'complete' && aadhaarData && (
        <div className="space-y-4">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Verification Complete
            </h3>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div>
              <span className="text-sm font-medium text-gray-600">Name:</span>
              <p className="text-gray-900">{aadhaarData.name}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Aadhaar Number:</span>
              <p className="text-gray-900">
                {aadhaarData.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Date of Birth:</span>
              <p className="text-gray-900">{aadhaarData.dateOfBirth}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={onCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleConfirmVerification} className="flex-1 bg-green-600 hover:bg-green-700">
              Confirm & Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AadhaarVerification;