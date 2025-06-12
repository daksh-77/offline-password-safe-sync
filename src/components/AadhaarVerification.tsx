import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle, CheckCircle, ArrowLeft, Edit } from 'lucide-react';
import { AadhaarService, AadhaarDetails } from '@/lib/aadhaarService';
import { useToast } from '@/hooks/use-toast';
import ManualAadhaarEntry from './ManualAadhaarEntry';

interface AadhaarVerificationProps {
  onVerificationComplete: (details: AadhaarDetails) => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  isLoading?: boolean;
}

const AadhaarVerification: React.FC<AadhaarVerificationProps> = ({
  onVerificationComplete,
  onCancel,
  title = "Aadhaar Verification",
  description = "Upload your Aadhaar PDF for verification",
  isLoading = false
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'upload' | 'processing' | 'success' | 'manual'>('upload');
  const [extractedDetails, setExtractedDetails] = useState<AadhaarDetails | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit for Aadhaar PDFs
      toast({
        title: "File Too Large",
        description: "Aadhaar PDFs should be under 5MB. Please upload a valid Aadhaar document.",
        variant: "destructive",
      });
      return;
    }

    await processAadhaarPDF(file);
  };

  const processAadhaarPDF = async (file: File) => {
    setIsProcessing(true);
    setVerificationStep('processing');

    try {
      console.log('Starting Aadhaar PDF processing...');
      const details = await AadhaarService.extractAadhaarFromPDF(file);
      
      console.log('Aadhaar details extracted:', { 
        name: details.name, 
        aadhaarNumber: `****-****-${details.aadhaarNumber.slice(-4)}`,
        dob: details.dob,
        gender: details.gender
      });

      setExtractedDetails(details);
      setVerificationStep('success');
      
      toast({
        title: "Verification Successful",
        description: "Aadhaar details extracted successfully from the PDF",
      });
    } catch (error: any) {
      console.error('Aadhaar verification failed:', error);
      setVerificationStep('upload');
      toast({
        title: "PDF Processing Failed",
        description: error.message || "Could not extract details from PDF. Please ensure it's a valid Aadhaar document or enter details manually.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDetails = () => {
    if (extractedDetails) {
      onVerificationComplete(extractedDetails);
    }
  };

  const handleManualEntry = (details: AadhaarDetails) => {
    setExtractedDetails(details);
    setVerificationStep('success');
    toast({
      title: "Details Entered",
      description: "Aadhaar details entered successfully",
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (verificationStep === 'manual') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <ManualAadhaarEntry
          onSubmit={handleManualEntry}
          onCancel={() => setVerificationStep('upload')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-6 border border-border">
        {onCancel && (
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
            className="mb-4"
            disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        {verificationStep === 'upload' && (
          <div className="space-y-4">
            <Button
              disabled={isProcessing || isLoading}
              onClick={triggerFileInput}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Aadhaar PDF
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              onClick={() => setVerificationStep('manual')}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              <Edit className="w-4 h-4 mr-2" />
              Enter Details Manually
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Security & Requirements:</p>
                  <ul className="space-y-1">
                    <li>• Upload only official Aadhaar PDF from UIDAI</li>
                    <li>• File is processed locally on your device</li>
                    <li>• Maximum file size: 5MB</li>
                    <li>• PDF must contain clear, readable text</li>
                    <li>• No password-protected PDFs</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {verificationStep === 'processing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-foreground mb-2">Processing Aadhaar PDF</h3>
            <p className="text-muted-foreground">Verifying document and extracting details...</p>
            <div className="mt-4 text-xs text-muted-foreground">
              <p>• Checking PDF integrity</p>
              <p>• Validating Aadhaar document</p>
              <p>• Extracting required information</p>
            </div>
          </div>
        )}

        {verificationStep === 'success' && extractedDetails && (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Verification Successful</h3>
              <p className="text-sm text-muted-foreground">Aadhaar details extracted successfully</p>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-foreground font-medium">{extractedDetails.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Aadhaar Number</label>
                <p className="text-foreground font-mono">
                  {extractedDetails.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 ****')}
                </p>
              </div>
              {extractedDetails.dob && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                  <p className="text-foreground">{extractedDetails.dob}</p>
                </div>
              )}
              {extractedDetails.gender && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Gender</label>
                  <p className="text-foreground">{extractedDetails.gender}</p>
                </div>
              )}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                <strong>✓ Document Verified:</strong> This appears to be a valid Aadhaar document with all required information.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setVerificationStep('upload')}
                variant="outline"
                className="flex-1"
                disabled={isLoading}
              >
                Upload Different PDF
              </Button>
              <Button
                onClick={handleConfirmDetails}
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Confirm & Continue'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AadhaarVerification;