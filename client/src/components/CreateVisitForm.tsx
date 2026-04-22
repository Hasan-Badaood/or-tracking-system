import React, { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { visitsAPI, FamilyContactInput } from '@/api/visits';

interface CreateVisitFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

const emptyContact = (): FamilyContactInput => ({
  name: '',
  relationship: '',
  phone: '',
  email: '',
  consent_given: false,
});

export const CreateVisitForm: React.FC<CreateVisitFormProps> = ({ onSuccess, onCancel }) => {
  const [mrn, setMrn] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');

  const [contacts, setContacts] = useState<FamilyContactInput[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateContact = (index: number, field: keyof FamilyContactInput, value: string | boolean) => {
    setContacts((prev) => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const addContact = () => setContacts((prev) => [...prev, emptyContact()]);

  const removeContact = (index: number) => setContacts((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    for (let i = 0; i < contacts.length; i++) {
      const fc = contacts[i];
      if (!fc.name.trim() || !fc.phone.trim() || !fc.relationship.trim()) {
        setError(`Contact ${i + 1}: name, phone, and relationship are required`);
        return;
      }
      if (!fc.consent_given) {
        setError(`Contact ${i + 1}: patient consent must be given`);
        return;
      }
    }

    setLoading(true);

    try {
      const payload: Parameters<typeof visitsAPI.create>[0] = {
        patient: {
          mrn,
          first_name: firstName,
          last_name: lastName,
          ...(dob && { date_of_birth: dob }),
          ...(gender && { gender }),
        },
        ...(contacts.length > 0 && {
          family_contacts: contacts.map((fc) => ({
            name: fc.name.trim(),
            relationship: fc.relationship.trim(),
            phone: fc.phone.trim(),
            ...(fc.email?.trim() && { email: fc.email.trim() }),
            consent_given: fc.consent_given,
          })),
        }),
      };

      await visitsAPI.create(payload);

      setMrn(''); setFirstName(''); setLastName(''); setDob(''); setGender('');
      setContacts([]);
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
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
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

          {/* Family contacts */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                Family Contacts <span className="text-gray-400 font-normal">(optional)</span>
              </p>
              <button
                type="button"
                onClick={addContact}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded-md px-2.5 py-1 hover:bg-blue-50 transition-colors"
              >
                + Add contact
              </button>
            </div>

            {contacts.length === 0 && (
              <p className="text-xs text-gray-400 italic">
                No contacts added. Click "Add contact" to add a family member who can track the patient's progress.
              </p>
            )}

            {contacts.map((fc, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Contact {i + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeContact(i)}
                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`fc-name-${i}`}>Name *</Label>
                    <Input
                      id={`fc-name-${i}`}
                      value={fc.name}
                      onChange={(e) => updateContact(i, 'name', e.target.value)}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`fc-rel-${i}`}>Relationship *</Label>
                    <Input
                      id={`fc-rel-${i}`}
                      value={fc.relationship}
                      onChange={(e) => updateContact(i, 'relationship', e.target.value)}
                      placeholder="e.g. Spouse, Parent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`fc-phone-${i}`}>Phone * <span className="text-gray-400 font-normal">(for SMS)</span></Label>
                    <Input
                      id={`fc-phone-${i}`}
                      type="tel"
                      value={fc.phone}
                      onChange={(e) => updateContact(i, 'phone', e.target.value)}
                      placeholder="+44 7700 000000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`fc-email-${i}`}>Email <span className="text-gray-400 font-normal">(for OTP)</span></Label>
                    <Input
                      id={`fc-email-${i}`}
                      type="email"
                      value={fc.email}
                      onChange={(e) => updateContact(i, 'email', e.target.value)}
                      placeholder="contact@email.com"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fc.consent_given}
                    onChange={(e) => updateContact(i, 'consent_given', e.target.checked)}
                    className="h-4 w-4 mt-0.5 shrink-0"
                  />
                  <span className="text-gray-700">
                    Patient consents to this contact tracking their surgical progress
                  </span>
                </label>
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Registering...' : 'Register Visit'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
