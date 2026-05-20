import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Attendance Settings</h1>

      <Alert className="mb-6">
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Core attendance settings are configured in the Device Settings page. This page is reserved for additional module-specific settings.
        </AlertDescription>
      </Alert>

      {/* Device Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Device Configuration</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          <p className="mb-4">Configure fingerprint device settings:</p>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li>Device IP Address and Port</li>
            <li>Access Database path and configuration</li>
            <li>Sync frequency and timing</li>
            <li>Connection and timeout settings</li>
          </ul>
          <p className="text-blue-600 hover:underline cursor-pointer" onClick={() => (window.location.href = '/attendance/admin/sync')}>
            → Go to Device Settings
          </p>
        </CardContent>
      </Card>

      {/* Shift Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Shift Configuration</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-600">
          <p className="mb-4">Define work shifts and assign employees to shifts:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Create and manage shifts (start time, end time, break duration)</li>
            <li>Assign shifts to employees</li>
            <li>Set default shifts per employee</li>
          </ul>
          <p className="text-sm text-gray-500 mt-4">Shift management coming in Phase 2</p>
        </CardContent>
      </Card>

      {/* Attendance Rules */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Attendance Rules</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-600">
          <p className="mb-4">Configure attendance calculation rules:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Grace period for late arrival (minutes)</li>
            <li>Minimum worked hours for present status</li>
            <li>Overtime thresholds and rules</li>
            <li>Early leave tolerance (minutes)</li>
          </ul>
          <p className="text-sm text-gray-500 mt-4">Customizable rules configuration coming in Phase 2</p>
        </CardContent>
      </Card>

      {/* Holidays & Leaves */}
      <Card>
        <CardHeader>
          <CardTitle>Holidays & Leave Types</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-600">
          <p className="mb-4">Manage organizational holidays and leave types:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Define public holidays</li>
            <li>Create leave types (annual, sick, casual, etc.)</li>
            <li>Set leave policies and limits per employee</li>
          </ul>
          <p className="text-sm text-gray-500 mt-4">Holiday and leave management available in Leave Management section</p>
        </CardContent>
      </Card>
    </div>
  );
}
