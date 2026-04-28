import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { adminApi } from '@/services/api';
import { AlertCircle, Loader } from 'lucide-react';
export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuthStore();
    const [step, setStep] = useState('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setOtpLoading(true);
        try {
            const normalizedPhone = phone.slice(-10);
            await adminApi.sendOtp(normalizedPhone);
            setStep('otp');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to send OTP';
            setError(message);
        }
        finally {
            setOtpLoading(false);
        }
    };
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const normalizedPhone = phone.slice(-10);
            await login(normalizedPhone, otp);
            navigate('/kyc-queue');
        }
        catch (err) {
            const message = err instanceof Error
                ? err.message
                : 'Failed to verify OTP. Only admins can access this dashboard.';
            setError(message);
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-100", children: _jsxs("div", { className: "w-full max-w-md p-8 bg-white rounded-lg shadow-lg", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 text-center mb-8", children: "NearBy Admin" }), error && (_jsxs("div", { className: "mb-6 p-4 bg-red-50 border border-red-200 rounded-md\n            flex items-start gap-3", children: [_jsx(AlertCircle, { className: "text-red-600 flex-shrink-0 mt-0.5", size: 20 }), _jsx("p", { className: "text-sm text-red-700", children: error })] })), step === 'phone' ? (_jsxs("form", { onSubmit: handleSendOtp, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Phone Number" }), _jsx("input", { type: "tel", value: phone, onChange: (e) => setPhone(e.target.value), placeholder: "10-digit phone number", maxLength: 10, pattern: "[0-9]{10}", className: "w-full px-4 py-2 border border-gray-300 rounded-md\n                  focus:outline-none focus:ring-2 focus:ring-blue-500", required: true }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Enter 10-digit number. +91 will be added automatically." })] }), _jsxs("button", { type: "submit", disabled: otpLoading || phone.length !== 10, className: "w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400\n                text-white font-medium py-2 rounded-md transition-colors\n                flex items-center justify-center gap-2", children: [otpLoading && _jsx(Loader, { size: 20, className: "animate-spin" }), "Send OTP"] })] })) : (_jsxs("form", { onSubmit: handleVerifyOtp, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "OTP" }), _jsxs("p", { className: "text-xs text-gray-500 mb-2", children: ["Sent to +91", phone.slice(-10)] }), _jsx("input", { type: "text", value: otp, onChange: (e) => setOtp(e.target.value.slice(0, 6)), placeholder: "6-digit OTP", maxLength: 6, pattern: "[0-9]{6}", className: "w-full px-4 py-2 border border-gray-300 rounded-md\n                  focus:outline-none focus:ring-2 focus:ring-blue-500 text-center\n                  text-2xl font-bold tracking-widest", required: true })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: () => {
                                        setStep('phone');
                                        setOtp('');
                                        setError('');
                                    }, className: "flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900\n                  font-medium py-2 rounded-md transition-colors", children: "Back" }), _jsxs("button", { type: "submit", disabled: isLoading || otp.length !== 6, className: "flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400\n                  text-white font-medium py-2 rounded-md transition-colors\n                  flex items-center justify-center gap-2", children: [isLoading && _jsx(Loader, { size: 20, className: "animate-spin" }), "Verify"] })] })] })), _jsx("p", { className: "text-xs text-gray-500 text-center mt-6", children: "Only admin users can access this dashboard" })] }) }));
}
//# sourceMappingURL=LoginPage.js.map