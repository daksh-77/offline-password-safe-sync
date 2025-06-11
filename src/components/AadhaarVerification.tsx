
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { AadhaarService, AadhaarDetails } from '@/lib/aadhaarService';

interface AadhaarVerificationProps {
  onVerificationComplete: (details: AadhaarDetails) => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
}

const AadhaarVerification: React.FC<AadhaarVerificationProps> = ({
  onVerificationComplete,
  onCancel,
  title = "Aadhaar Verification",
  description = "Upload your Aadhaar PDF for secure verification"
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedDetails, setExtractedDetails] = useState<AadhaarDetails | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const details = await AadhaarService.extractAadhaarFromPDF(file);
      setExtractedDetails(details);
    } catch (error: any) {
      setError(error.message || 'Failed to process Aadhaar PDF');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmVerification = () => {
    if (extractedDetails) {
      onVerificationComplete(extractedDetails);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!extractedDetails ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Upload your Aadhaar PDF file for verification
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="aadhaar-upload"
                disabled={isUploading}
              />
              <label htmlFor="aadhaar-upload">
                <Button
                  as="span"
                  disabled={isUploading}
                  className="cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Choose PDF File
                    </>
                  )}
                </Button>
              </label>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Only valid Aadhaar PDF files are accepted</p>
              <p>• Your data is processed locally and securely</p>
              <p>• No data is sent to external servers</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-accent rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-medium">Verification Successful</h3>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>Name:</strong> {extractedDetails.name}</p>
                <p><strong>Aadhaar Number:</strong> {extractedDetails.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}</p>
                {extractedDetails.dob && <p><strong>DOB:</strong> {extractedDetails.dob}</p>}
                {extractedDetails.gender && <p><strong>Gender:</strong> {extractedDetails.gender}</p>}
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleConfirmVerification} className="flex-1">
                Confirm & Continue
              </Button>
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AadhaarVerification;
