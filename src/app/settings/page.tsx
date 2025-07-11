"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import RequireAuth from "../../components/RequireAuth";
import { saveAs } from "file-saver";
import { useTheme } from "../../components/ThemeProvider";



interface UserSettings {
  user_id: string;
  email_notifications: boolean;
  in_app_notifications: boolean;
}

interface UserActivity {
  id: string;
  user_id: string;
  action: string;
  details?: string;
  timestamp: string;
}



export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Theme toggle
  const { theme, setTheme, mounted } = useTheme();

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme as 'light' | 'dark' | 'system');
  };

  // Fetch user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
      setUserEmail(data.user?.email || null);
    });
  }, []);

  // Fetch user settings
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single()
      .then(({ data, error }) => {
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user settings:', error);
        } else if (data) {
          setUserSettings(data);
        } else {
          // Create default settings if none exist
          supabase
            .from("user_settings")
            .insert([{ user_id: userId, email_notifications: true, in_app_notifications: true }])
            .single()
            .then(({ data: newSettings }) => {
              if (newSettings) setUserSettings(newSettings);
            });
        }
      });
  }, [userId]);

  // Fetch user activity
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("user_activity")
      .select("*")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setUserActivity(data || []);
      });
  }, [userId]);

  // Log activity
  const logActivity = async (action: string, details?: string) => {
    if (!userId) return;
    await supabase
      .from("user_activity")
      .insert([{ user_id: userId, action, details }]);
  };

  // Update notification preferences
  const handleNotificationToggle = async (type: 'email' | 'in_app', value: boolean) => {
    if (!userId || !userSettings) return;
    setLoading(true);
    const field = type === 'email' ? 'email_notifications' : 'in_app_notifications';
    const { error } = await supabase
      .from("user_settings")
      .update({ [field]: value })
      .eq("user_id", userId);
    if (!error) {
      setUserSettings({ ...userSettings, [field]: value });
      setSuccess(`${type === 'email' ? 'Email' : 'In-app'} notifications ${value ? 'enabled' : 'disabled'}.`);
      await logActivity('notification_preference_changed', `${field}: ${value}`);
    } else {
      setError('Failed to update notification preferences.');
    }
    setLoading(false);
  };



  // Sign out
  const handleSignOut = async () => {
    await logActivity('user_logout');
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Change email
  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setLoading(false);
    if (error) setError(error.message);
    else {
      setSuccess("Email update requested. Check your new email for a confirmation link.");
      setUserEmail(newEmail);
      setNewEmail("");
      await logActivity('email_change_requested', `New email: ${newEmail}`);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) setError(error.message);
    else {
      setSuccess("Password updated successfully.");
      setNewPassword("");
      await logActivity('password_changed');
    }
  };

  // Reset password (send email)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail || userEmail || "");
    setLoading(false);
    if (error) setError(error.message);
    else {
      setSuccess("Password reset email sent. Check your inbox.");
      setResetEmail("");
      await logActivity('password_reset_requested', `Email: ${resetEmail || userEmail}`);
    }
  };

  // Delete account (requires confirmation)
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
    if (deleteConfirm !== "DELETE") {
      setError('Type DELETE in all caps to confirm.');
      setLoading(false);
      return;
    }
    // Supabase does not allow deleting your own user directly from client SDK for security reasons.
    // You can delete user data here and/or show a message to contact support.
    setLoading(false);
    setSuccess("Account deletion is not supported from the dashboard. Please contact support.");
    setDeleteConfirm("");
    await logActivity('account_deletion_requested');
  };

  // Download my data (CSV export)
  const handleDownloadData = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const [jobsRes, logsRes] = await Promise.all([
        supabase.from('print_jobs').select('*').eq('user_id', userId),
        supabase.from('maintenance_logs').select('*').eq('user_id', userId),
      ]);
      const jobs = jobsRes.data || [];
      const logs = logsRes.data || [];
      const jobsCsv = [
        'Print Jobs',
        Object.keys(jobs[0] || {}).join(','),
        ...jobs.map(j => Object.values(j).join(',')),
        '',
        'Maintenance Logs',
        Object.keys(logs[0] || {}).join(','),
        ...logs.map(l => Object.values(l).join(',')),
      ].join('\n');
      const blob = new Blob([jobsCsv], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, 'printcare_data.csv');
      setSuccess('Data exported as CSV.');
      await logActivity('data_exported');
    } catch {
      setError('Failed to export data.');
    }
    setLoading(false);
  }, [userId]);

  // Submit feedback
  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim() || !userId) return;
    setLoading(true);
    setError("");
    const { error } = await supabase
      .from("feedback")
      .insert([{ user_id: userId, message: feedbackMessage.trim() }]);
    setLoading(false);
    if (error) setError('Failed to submit feedback.');
    else {
      setSuccess('Feedback submitted successfully. Thank you!');
      setFeedbackMessage("");
      await logActivity('feedback_submitted');
    }
  };

  return (
    <RequireAuth>
      <div>
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <p className="mb-2">Manage your account, OctoPrint integration, and notification preferences.</p>

        {/* Account Info */}
        <div className="border rounded p-4 bg-white dark:bg-gray-900 mb-6">
          <h2 className="font-semibold mb-2">Account</h2>
          <div>Email: <span className="font-mono">{userEmail}</span></div>
          <div>User ID: <span className="font-mono">{userId}</span></div>

          {/* Change Email */}
          <form onSubmit={handleChangeEmail} className="mt-4 flex flex-col md:flex-row gap-2 items-end">
            <div className="flex-1">
              <label className="block font-semibold mb-1">Change Email</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="New email" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" required />
            </div>
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition" disabled={loading || !newEmail}>Update Email</button>
          </form>

          {/* Change Password */}
          <form onSubmit={handleChangePassword} className="mt-4 flex flex-col md:flex-row gap-2 items-end">
            <div className="flex-1">
              <label className="block font-semibold mb-1">Change Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" required />
            </div>
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition" disabled={loading || !newPassword}>Update Password</button>
          </form>

          {/* Reset Password */}
          <form onSubmit={handleResetPassword} className="mt-4 flex flex-col md:flex-row gap-2 items-end">
            <div className="flex-1">
              <label className="block font-semibold mb-1">Reset Password (send email)</label>
              <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="Email to reset (leave blank for current)" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" />
            </div>
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition" disabled={loading}>Send Reset Email</button>
          </form>

          {/* Delete Account */}
          <form onSubmit={handleDeleteAccount} className="mt-4 flex flex-col md:flex-row gap-2 items-end">
            <div className="flex-1">
              <label className="block font-semibold mb-1 text-red-700">Delete Account</label>
              <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="Type DELETE to confirm" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" />
            </div>
            <button type="submit" className="bg-red-600 text-white rounded px-4 py-2 font-semibold hover:bg-red-700 transition" disabled={loading}>Delete Account</button>
          </form>

          <button onClick={handleSignOut} className="mt-2 bg-red-600 text-white rounded px-4 py-1 font-semibold hover:bg-red-700 transition">Sign Out</button>
          {success && <div className="text-green-600 font-semibold mt-2">{success}</div>}
          {error && <div className="text-red-600 font-semibold mt-2">{error}</div>}
        </div>

        {/* Theme Toggle */}
        <div className="border rounded p-4 bg-white dark:bg-gray-900 mb-6">
          <h2 className="font-semibold mb-2">Theme</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => handleThemeChange('light')} 
              className={`px-4 py-2 rounded ${theme === 'light' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              disabled={!mounted}
            >
              Light
            </button>
            <button 
              onClick={() => handleThemeChange('dark')} 
              className={`px-4 py-2 rounded ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              disabled={!mounted}
            >
              Dark
            </button>
            <button 
              onClick={() => handleThemeChange('system')} 
              className={`px-4 py-2 rounded ${theme === 'system' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              disabled={!mounted}
            >
              System
            </button>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="border rounded p-4 bg-white dark:bg-gray-900 mb-6">
          <h2 className="font-semibold mb-2">Notification Preferences</h2>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={userSettings?.email_notifications || false}
                onChange={e => handleNotificationToggle('email', e.target.checked)}
                disabled={loading}
              /> 
              Email me about maintenance reminders
            </label>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={userSettings?.in_app_notifications || false}
                onChange={e => handleNotificationToggle('in_app', e.target.checked)}
                disabled={loading}
              /> 
              In-app notifications for print job status
            </label>
          </div>
        </div>

        {/* Download My Data */}
        <div className="border rounded p-4 bg-white dark:bg-gray-900 mb-6">
          <h2 className="font-semibold mb-2">Download My Data</h2>
          <button onClick={handleDownloadData} className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition" disabled={loading}>Export as CSV</button>
        </div>

        {/* Activity Log */}
        <div className="border rounded p-4 bg-white dark:bg-gray-900 mb-6">
          <h2 className="font-semibold mb-2">Activity Log</h2>
          {userActivity.length === 0 ? (
            <div className="text-gray-500">No recent activity.</div>
          ) : (
            <div className="space-y-2">
              {userActivity.map(activity => (
                <div key={activity.id} className="flex justify-between items-start text-sm">
                  <div>
                    <span className="font-semibold">{activity.action}</span>
                    {activity.details && <span className="text-gray-500 ml-2">({activity.details})</span>}
                  </div>
                  <span className="text-gray-400 text-xs">{new Date(activity.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback/Support */}
        <div className="border rounded p-4 bg-white dark:bg-gray-900 mb-6">
          <h2 className="font-semibold mb-2">Feedback & Support</h2>
          <form onSubmit={handleFeedback} className="space-y-2">
            <textarea
              value={feedbackMessage}
              onChange={e => setFeedbackMessage(e.target.value)}
              placeholder="Share your feedback, report bugs, or request features..."
              className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800"
              rows={3}
              required
            />
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition" disabled={loading || !feedbackMessage.trim()}>Submit Feedback</button>
          </form>
        </div>
      </div>
    </RequireAuth>
  );
} 