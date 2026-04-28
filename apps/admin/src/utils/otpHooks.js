import { useState, useEffect, useCallback } from 'react';
/**
 * Hook for managing OTP countdown timer
 * - Starts countdown from initialSeconds
 * - Automatically stops at 0
 * - Can be manually reset or started
 */
export function useOtpTimer(initialSeconds = 300) {
    const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
    const [isActive, setIsActive] = useState(false);
    useEffect(() => {
        let interval = null;
        if (isActive && timeRemaining > 0) {
            interval = setInterval(() => {
                setTimeRemaining((prev) => {
                    if (prev <= 1) {
                        setIsActive(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (interval)
                clearInterval(interval);
        };
    }, [isActive, timeRemaining]);
    const start = useCallback(() => {
        setTimeRemaining(initialSeconds);
        setIsActive(true);
    }, [initialSeconds]);
    const reset = useCallback(() => {
        setTimeRemaining(initialSeconds);
        setIsActive(false);
    }, [initialSeconds]);
    const stop = useCallback(() => {
        setIsActive(false);
    }, []);
    const formatTime = useCallback((seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);
    return {
        timeRemaining,
        isActive,
        isExpired: timeRemaining === 0 && !isActive,
        start,
        reset,
        stop,
        formatTime: () => formatTime(timeRemaining),
    };
}
/**
 * Hook for managing OTP resend cooldown
 * - After sending OTP, user must wait before resending
 * - Default cooldown: 30 seconds
 */
export function useResendCooldown(cooldownSeconds = 30) {
    const [secondsRemaining, setSecondsRemaining] = useState(0);
    const [canResend, setCanResend] = useState(true);
    useEffect(() => {
        let interval = null;
        if (secondsRemaining > 0) {
            interval = setInterval(() => {
                setSecondsRemaining((prev) => {
                    if (prev <= 1) {
                        setCanResend(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (interval)
                clearInterval(interval);
        };
    }, [secondsRemaining]);
    const startCooldown = () => {
        setSecondsRemaining(cooldownSeconds);
        setCanResend(false);
    };
    const reset = () => {
        setSecondsRemaining(0);
        setCanResend(true);
    };
    return {
        canResend,
        secondsRemaining,
        startCooldown,
        reset,
    };
}
/**
 * Hook for tracking OTP verification attempts
 * - Counts failed attempts
 * - Locks out after 3 attempts
 * - Resets on successful verification
 */
export function useOtpAttempts(maxAttempts = 3) {
    const [attempts, setAttempts] = useState(0);
    const [isLockedOut, setIsLockedOut] = useState(false);
    const recordAttempt = (success) => {
        if (success) {
            setAttempts(0);
            setIsLockedOut(false);
        }
        else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            if (newAttempts >= maxAttempts) {
                setIsLockedOut(true);
            }
        }
    };
    const reset = () => {
        setAttempts(0);
        setIsLockedOut(false);
    };
    return {
        attempts,
        remainingAttempts: Math.max(0, maxAttempts - attempts),
        isLockedOut,
        recordAttempt,
        reset,
    };
}
//# sourceMappingURL=otpHooks.js.map