'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import Checkbox from '@/components/atoms/Checkbox';
import SocialLoginButton from '@/components/molecules/SocialLoginButton';
import { MailIcon, PhoneIcon, LockIcon, EyeIcon, EyeOffIcon } from '@/components/icons';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useLoginMutation } from '@/store/api/auth.api';
import { setUser } from '@/store/user.slice';
import './index.css';

type LoginMethod = 'email' | 'phone';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [login] = useLoginMutation();
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);

  // Check if user just registered
  const justRegistered = searchParams.get('registered') === 'true';

  // Email/Password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  // Phone state (for future implementation)
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOTP] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Check if user is already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Resend timer effect
  useEffect(() => {
    if (resendTimer === 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    // Validation
    let hasError = false;

    if (!email) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsLoading(true);

    try {
      // Call the real login API
      const result = await login({
        email,
        password,
        rememberMe,
      }).unwrap();

      if (result?.user) {
        dispatch(
          setUser({
            id: result.user.id ?? null,
            name: result.user.name ?? null,
            email: result.user.email ?? null,
            role: result.user.role ?? null,
            createdAt: result.user.createdAt ?? null,
            updatedAt: result.user.updatedAt ?? null,
          })
        );
      }

      const redirectUrl = searchParams?.get?.('redirect') || '/';
      router.push(redirectUrl);
    } catch (error: any) {
      console.error('Login error:', error);

      const errorMessage = error?.data?.message || error?.data?.error || error?.message || 'An error occurred. Please try again.';

      if (typeof errorMessage === 'string') {
        if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('user')) {
          setEmailError('Invalid email or user not found');
        } else if (errorMessage.toLowerCase().includes('password') || errorMessage.toLowerCase().includes('credential')) {
          setPasswordError('Invalid password');
        } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
          setGeneralError('Network error. Please check your connection and try again.');
        } else {
          setGeneralError(errorMessage);
        }
      } else {
        setGeneralError('Failed to login. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    setPhoneError('');

    if (!phoneNumber) {
      setPhoneError('Phone number is required');
      return;
    }
    if (phoneNumber.length < 10) {
      setPhoneError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement actual OTP sending when server supports it
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowOTP(true);
      setResendTimer(30);
    } catch (error) {
      setPhoneError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    if (!otp || otp.length !== 6) {
      setOtpError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement actual OTP verification when server supports it
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, redirect to homepage
      router.push('/');
    } catch (error) {
      setOtpError('Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setIsLoading(true);
    try {
      // TODO: Implement OAuth flow when server supports it
      console.log(`Login with ${provider}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Social login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          {/* Header */}
          <div className="login-header">
            <Link href="/" className="logo-link">
              <h1 className="login-logo">Asharvi</h1>
            </Link>
            <h2 className="login-title">Welcome Back</h2>
            <p className="login-subtitle">Login to continue your parenting journey</p>
          </div>

          {/* Success Message for Registration */}
          {justRegistered && (
            <div className="success-banner">
              <p>✓ Registration successful! Please login to continue.</p>
            </div>
          )}

          {/* General Error Message */}
          {generalError && (
            <div className="error-banner">
              <p>{generalError}</p>
            </div>
          )}

          {/* Method Toggle */}
          <div className="method-toggle">
            <button
              type="button"
              className={`method-btn ${loginMethod === 'email' ? 'active' : ''}`}
              onClick={() => setLoginMethod('email')}
              disabled={isLoading}
            >
              <MailIcon className="method-icon" />
              Email
            </button>
            <button
              type="button"
              className={`method-btn ${loginMethod === 'phone' ? 'active' : ''}`}
              onClick={() => setLoginMethod('phone')}
              disabled={isLoading}
            >
              <PhoneIcon className="method-icon" />
              Phone
            </button>
          </div>

          {/* Email/Password Form */}
          {loginMethod === 'email' && (
            <form onSubmit={handleEmailLogin} className="login-form">
              <Input
                id="email"
                type="email"
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={emailError}
                leftIcon={<MailIcon style={{ width: 20, height: 20 }} />}
                required
                fullWidth
                disabled={isLoading}
              />

              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={passwordError}
                leftIcon={<LockIcon style={{ width: 20, height: 20 }} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOffIcon style={{ width: 20, height: 20 }} />
                    ) : (
                      <EyeIcon style={{ width: 20, height: 20 }} />
                    )}
                  </button>
                }
                required
                fullWidth
                disabled={isLoading}
              />

              <div className="form-options">
                <Checkbox
                  id="rememberMe"
                  label="Remember me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                <Link href="/auth/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoading}
                className="w-full"
              >
                Login
              </Button>
            </form>
          )}

          {/* Phone/OTP Form */}
          {loginMethod === 'phone' && !showOTP && (
            <div className="login-form">
              <div className="phone-field-group">
                <label className="phone-group-label">Phone Number *</label>
                <div className="phone-inputs">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="country-code-select"
                    disabled={isLoading}
                  >
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+61">🇦🇺 +61</option>
                  </select>
                  <div className="phone-number-input">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      error={phoneError}
                      leftIcon={<PhoneIcon style={{ width: 20, height: 20 }} />}
                      fullWidth
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleSendOTP}
                loading={isLoading}
                className="w-full"
              >
                Send OTP
              </Button>
            </div>
          )}

          {/* OTP Verification */}
          {loginMethod === 'phone' && showOTP && (
            <form onSubmit={handleVerifyOTP} className="login-form">
              <Input
                id="otp"
                type="text"
                label="Enter OTP"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                error={otpError}
                helperText={`OTP sent to ${countryCode} ${phoneNumber}`}
                maxLength={6}
                fullWidth
                disabled={isLoading}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoading}
                className="w-full"
              >
                Verify OTP
              </Button>

              {resendTimer > 0 ? (
                <p className="resend-timer">Resend code in {resendTimer} seconds</p>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOTP}
                  className="resend-button"
                  disabled={isLoading}
                >
                  Resend OTP
                </button>
              )}
            </form>
          )}

          {/* Divider */}
          <div className="divider">
            <span className="divider-line" />
            <span className="divider-text">OR</span>
            <span className="divider-line" />
          </div>

          {/* Social Login */}
          <div className="social-login">
            <SocialLoginButton
              provider="google"
              onClick={() => handleSocialLogin('google')}
              disabled={isLoading}
            />
            <SocialLoginButton
              provider="facebook"
              onClick={() => handleSocialLogin('facebook')}
              disabled={isLoading}
            />
            <SocialLoginButton
              provider="apple"
              onClick={() => handleSocialLogin('apple')}
              disabled={isLoading}
            />
          </div>

          {/* Footer Links */}
          <div className="login-footer">
            <p className="footer-text">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="footer-link">
                Sign up
              </Link>
            </p>
            <Link href="/" className="guest-link">
              Continue as guest
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
