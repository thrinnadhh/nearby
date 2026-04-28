/**
 * Hook for managing OTP countdown timer
 * - Starts countdown from initialSeconds
 * - Automatically stops at 0
 * - Can be manually reset or started
 */
export declare function useOtpTimer(initialSeconds?: number): {
    timeRemaining: number;
    isActive: boolean;
    isExpired: boolean;
    start: () => void;
    reset: () => void;
    stop: () => void;
    formatTime: () => string;
};
/**
 * Hook for managing OTP resend cooldown
 * - After sending OTP, user must wait before resending
 * - Default cooldown: 30 seconds
 */
export declare function useResendCooldown(cooldownSeconds?: number): {
    canResend: boolean;
    secondsRemaining: number;
    startCooldown: () => void;
    reset: () => void;
};
/**
 * Hook for tracking OTP verification attempts
 * - Counts failed attempts
 * - Locks out after 3 attempts
 * - Resets on successful verification
 */
export declare function useOtpAttempts(maxAttempts?: number): {
    attempts: number;
    remainingAttempts: number;
    isLockedOut: boolean;
    recordAttempt: (success: boolean) => void;
    reset: () => void;
};
//# sourceMappingURL=otpHooks.d.ts.map