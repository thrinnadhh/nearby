import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { adminApi } from '@/services/api';
import { AlertCircle, Loader } from 'lucide-react';

interface LoginStep {
  type: 'phone' | 'otp';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [step, setStep] = useState<LoginStep['type']>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOtpLoading(true);

    try {
      const normalizedPhone = phone.slice(-10);
      await adminApi.sendOtp(normalizedPhone);
      setStep('otp');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to send OTP';
      setError(message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const normalizedPhone = phone.slice(-10);
      await login(normalizedPhone, otp);
      navigate('/kyc-queue');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to verify OTP. Only admins can access this dashboard.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
          NearBy Admin
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md
            flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit phone number"
                maxLength={10}
                pattern="[0-9]{10}"
                className="w-full px-4 py-2 border border-gray-300 rounded-md
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter 10-digit number. +91 will be added automatically.
              </p>
            </div>

            <button
              type="submit"
              disabled={otpLoading || phone.length !== 10}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400
                text-white font-medium py-2 rounded-md transition-colors
                flex items-center justify-center gap-2"
            >
              {otpLoading && <Loader size={20} className="animate-spin" />}
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OTP
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Sent to +91{phone.slice(-10)}
              </p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                placeholder="6-digit OTP"
                maxLength={6}
                pattern="[0-9]{6}"
                className="w-full px-4 py-2 border border-gray-300 rounded-md
                  focus:outline-none focus:ring-2 focus:ring-blue-500 text-center
                  text-2xl font-bold tracking-widest"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900
                  font-medium py-2 rounded-md transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400
                  text-white font-medium py-2 rounded-md transition-colors
                  flex items-center justify-center gap-2"
              >
                {isLoading && <Loader size={20} className="animate-spin" />}
                Verify
              </button>
            </div>
          </form>
        )}

        <p className="text-xs text-gray-500 text-center mt-6">
          Only admin users can access this dashboard
        </p>
      </div>
    </div>
  );
}
