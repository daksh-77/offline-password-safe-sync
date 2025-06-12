
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, CreditCard, Calendar, Users } from 'lucide-react';
import { AadhaarDetails } from '@/lib/aadhaarService';

interface ManualAadhaarEntryProps {
  onSubmit: (details: AadhaarDetails) => void;
  onCancel: () => void;
}

const ManualAadhaarEntry: React.FC<ManualAadhaarEntryProps> = ({
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<AadhaarDetails>({
    name: '',
    aadhaarNumber: '',
    dob: '',
    gender: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.aadhaarNumber.trim()) {
      newErrors.aadhaarNumber = 'Aadhaar number is required';
    } else if (!/^\d{12}$/.test(formData.aadhaarNumber.replace(/\s/g, ''))) {
      newErrors.aadhaarNumber = 'Aadhaar number must be 12 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        aadhaarNumber: formData.aadhaarNumber.replace(/\s/g, '')
      });
    }
  };

  const formatAadhaarNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.substring(0, 14); // Max 12 digits + 2 spaces
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Enter Aadhaar Details</CardTitle>
        <p className="text-sm text-muted-foreground text-center">
          Please enter your Aadhaar details manually
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Full Name *
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your full name"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="aadhaar" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Aadhaar Number *
            </Label>
            <Input
              id="aadhaar"
              type="text"
              value={formData.aadhaarNumber}
              onChange={(e) => setFormData({ 
                ...formData, 
                aadhaarNumber: formatAadhaarNumber(e.target.value)
              })}
              placeholder="1234 5678 9012"
              className={errors.aadhaarNumber ? 'border-destructive' : ''}
            />
            {errors.aadhaarNumber && (
              <p className="text-sm text-destructive">{errors.aadhaarNumber}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dob" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date of Birth (Optional)
            </Label>
            <Input
              id="dob"
              type="text"
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              placeholder="DD/MM/YYYY"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Gender (Optional)
            </Label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md text-sm"
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Others">Others</option>
            </select>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
            >
              Continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ManualAadhaarEntry;
