import React, { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { visitsAPI } from '@/api/visits';

interface CreateVisitFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export const CreateVisitForm: React.FC<CreateVisitFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const [mrn, setMrn] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');

  // Family contact (optional)
  const [fcName, setFcName] = useState('');
  const [fcRelationship, setFcRelationship] = useState('');
  const [fcPhone, setFcPhone] = useState('');
  const [fcEmail, setFcEmail] = useState('');
  const [fcConsent, setFcConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasFamilyContact = fcName.trim() !== '' || fcPhone.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (hasFamilyContact) {
      if (!fcName.trim() || !fcPhone.trim() || !fcRelationship.trim()) {
        setError('Family contact requires name, phone, and relationship');
        return;
      }
      if (!fcConsent) {
        setError('Family contact consent must be given');
        return;
      }
    }

    setLoading(true);

    try {
      await visitsAPI.create({
        patient: {
          mrn,
          first_name: firstName,
          last_name: lastName,
          ...(dob && { date_of_birth: dob }),
          ...(gender && { gender }),
        },
        ...(hasFamilyContact && {
          family_contact: {
            name: fcName.trim(),
            relationship: fcRelationship.trim(),
            phone: fcPhone.trim(),
            ...(fcEmail.trim() && { email: fcEmail.trim() }),
            consent_given: fcConsent,
          },
        }),
      });

      setMrn(''); setFirstName(''); setLastName(''); setDob(''); setGender('');
      setFcName(''); setFcRelationship(''); setFcPhone(''); setFcEmail(''); setFcConsent(false);
      onSuccess();
    } catch (err: any) {
      const msg: string = err.response?.data?.error || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('mrn') || msg.toLowerCase().includes('unique')) {
        setError(`A patient with MRN "${mrn}" already exists. Check the MRN and try again.`);
      } else {
        setError(msg || 'Failed to create visit');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register New Visit</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mrn">MRN *</Label>
              <Input
                id="mrn"
                value={mrn}
                onChange={(e) => setMrn(e.target.value)}
                placeholder="Medical Record Number"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">
              Family Contact <span className="text-gray-400 font-normal">(optional)</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fcName">Contact Name</Label>
                <Input
                  id="fcName"
                  value={fcName}
                  onChange={(e) => setFcName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fcRelationship">Relationship</Label>
                <Input
                  id="fcRelationship"
                  value={fcRelationship}
                  onChange={(e) => setFcRelationship(e.target.value)}
                  placeholder="e.g. Spouse, Parent"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fcPhone">Phone</Label>
                <Input
                  id="fcPhone"
                  type="tel"
                  value={fcPhone}
                  onChange={(e) => setFcPhone(e.target.value)}
                  placeholder="+44 7700 000000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fcEmail">Email (for OTP)</Label>
                <Input
                  id="fcEmail"
                  type="email"
                  value={fcEmail}
                  onChange={(e) => setFcEmail(e.target.value)}
                  placeholder="contact@email.com"
                />
              </div>
            </div>
            {hasFamilyContact && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={fcConsent}
                  onChange={(e) => setFcConsent(e.target.checked)}
                  className="h-4 w-4"
                />
                Patient consents to family members tracking their progress
              </label>
            )}
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Registering...' : 'Register Visit'}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
