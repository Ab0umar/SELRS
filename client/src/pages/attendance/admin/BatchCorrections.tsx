import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Trash2, Plus } from 'lucide-react';

const tRPC = require('@/lib/trpc').trpc as any;

interface PunchEntry {
  id: string;
  empCd: string;
  date: string;
  time: string;
  direction: 'in' | 'out' | 'unknown';
  note?: string;
}

export default function BatchCorrections() {
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<PunchEntry[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const addEntry = () => {
    const newEntry: PunchEntry = {
      id: Math.random().toString(36).substr(2, 9),
      empCd: '',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      direction: 'in',
    };
    setEntries([...entries, newEntry]);
  };

  const updateEntry = (id: string, field: string, value: string) => {
    setEntries(
      entries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter((entry) => entry.id !== id));
  };

  const submitCorrections = useMutation({
    mutationFn: async () => {
      const validEntries = entries.filter((e) => e.empCd && e.date && e.time);
      if (validEntries.length === 0) {
        throw new Error('No valid entries to submit');
      }

      const punches = validEntries.map((entry) => ({
        empCd: entry.empCd,
        punchAt: new Date(`${entry.date}T${entry.time}:00`).toISOString(),
        direction: entry.direction as 'in' | 'out' | 'unknown',
        note: entry.note,
      }));

      return tRPC.attendance.batchAddPunches.mutate({ punches });
    },
    onSuccess: (result) => {
      setSuccessMessage(
        `${result.successful} of ${result.total} punches added successfully`
      );
      setEntries([]);
      queryClient.invalidateQueries({ queryKey: ['recentPunches'] });
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || 'Failed to submit corrections');
      setTimeout(() => setErrorMessage(''), 3000);
    },
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Batch Corrections</h1>
      <p className="text-sm text-gray-600">
        Add missing punches, correct timestamps, or manually override punch records.
      </p>

      {successMessage && (
        <Alert className="border-green-600 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Manual Punch Entries</CardTitle>
            <Button onClick={addEntry} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Add Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No entries added yet. Click "Add Entry" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-12 gap-2 p-4 bg-gray-50 rounded border items-end"
                >
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Employee Code
                    </label>
                    <Input
                      type="text"
                      value={entry.empCd}
                      onChange={(e) => updateEntry(entry.id, 'empCd', e.target.value)}
                      placeholder="E.g., EMP001"
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Date
                    </label>
                    <Input
                      type="date"
                      value={entry.date}
                      onChange={(e) => updateEntry(entry.id, 'date', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Time
                    </label>
                    <Input
                      type="time"
                      value={entry.time}
                      onChange={(e) => updateEntry(entry.id, 'time', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Direction
                    </label>
                    <select
                      value={entry.direction}
                      onChange={(e) =>
                        updateEntry(entry.id, 'direction', e.target.value)
                      }
                      className="w-full px-2 py-2 text-sm border rounded"
                    >
                      <option value="in">In</option>
                      <option value="out">Out</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Note (optional)
                    </label>
                    <Input
                      type="text"
                      value={entry.note || ''}
                      onChange={(e) => updateEntry(entry.id, 'note', e.target.value)}
                      placeholder="Reason for correction"
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      onClick={() => removeEntry(entry.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {entries.length > 0 && (
        <div className="flex gap-2">
          <Button
            onClick={() => submitCorrections.mutate()}
            disabled={submitCorrections.isPending}
            className="flex-1"
          >
            {submitCorrections.isPending
              ? 'Submitting...'
              : `Submit ${entries.length} Correction${entries.length !== 1 ? 's' : ''}`}
          </Button>
          <Button
            onClick={() => setEntries([])}
            variant="outline"
            disabled={submitCorrections.isPending}
          >
            Clear All
          </Button>
        </div>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-blue-900">
          <p>
            • <strong>Add missing punches:</strong> Employee forgot to clock in/out
          </p>
          <p>
            • <strong>Correct timestamps:</strong> System recorded wrong time
          </p>
          <p>
            • <strong>Adjust direction:</strong> Change in to out or vice versa
          </p>
          <p>
            • <strong>Add notes:</strong> Document the reason for any correction
          </p>
          <p className="text-xs text-blue-700 mt-3">
            All corrections are tracked in the audit log with user and timestamp information.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
