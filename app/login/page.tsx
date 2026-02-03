'use client';

import React, { useState, useTransition } from 'react';
import { loginAction, signupAction } from '../auth-actions';
import { FileText, LogIn, UserPlus, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const result = isLogin
                ? await loginAction(formData)
                : await signupAction(formData);

            if (result?.error) {
                setError(result.error);
            }
        });
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="app-logo">
                        <motion.div
                            initial={{ rotate: -20, scale: 0.8 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        >
                            <FileText size={40} color="var(--primary)" />
                        </motion.div>
                        <h1>Summons Manager</h1>
                    </div>
                    <p className="auth-subtitle">
                        {isLogin ? 'Welcome back! Please login to your account.' : 'Create a new account to get started.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <AnimatePresence mode="wait">
                        {!isLogin && (
                            <motion.div
                                key="signup-fields"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="signup-only-fields"
                            >
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="firstName">First Name</label>
                                        <div className="input-wrapper">
                                            <User size={18} className="input-icon" />
                                            <input type="text" id="firstName" name="firstName" required={!isLogin} placeholder="John" />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="lastName">Last Name</label>
                                        <div className="input-wrapper">
                                            <User size={18} className="input-icon" />
                                            <input type="text" id="lastName" name="lastName" required={!isLogin} placeholder="Doe" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <div className="input-wrapper">
                            <Mail size={18} className="input-icon" />
                            <input type="email" id="email" name="email" required placeholder="name@example.com" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input type="password" id="password" name="password" required placeholder="••••••••" />
                        </div>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="auth-error"
                        >
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </motion.div>
                    )}

                    <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={isPending}>
                        {isPending ? (
                            <><Loader2 size={20} className="animate-spin" /> Processing...</>
                        ) : (
                            isLogin ? <><LogIn size={20} /> Login</> : <><UserPlus size={20} /> Create Account</>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError(null);
                        }}
                    >
                        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
                    </button>
                </div>
            </div>

            <style jsx>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--background);
          padding: var(--space-4);
          background-image: radial-gradient(circle at 2px 2px, var(--border) 1px, transparent 0);
          background-size: 40px 40px;
        }
        .auth-card {
          width: 100%;
          max-width: 480px;
          background: var(--background-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: var(--space-8);
          box-shadow: var(--shadow-2xl);
        }
        .auth-header {
          text-align: center;
          margin-bottom: var(--space-8);
        }
        .app-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }
        .app-logo h1 {
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -0.025em;
          color: var(--foreground);
        }
        .auth-subtitle {
          color: var(--foreground-muted);
          font-size: 0.95rem;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--foreground);
        }
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          color: var(--foreground-muted);
          pointer-events: none;
        }
        .input-wrapper input {
          width: 100%;
          padding: 10px 12px 10px 40px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--foreground);
          font-size: 1rem;
          transition: all 0.2s;
        }
        .input-wrapper input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
        }
        .auth-submit {
          margin-top: var(--space-2);
          width: 100%;
          justify-content: center;
          gap: var(--space-2);
        }
        .auth-error {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3);
          background: rgba(var(--error-rgb), 0.1);
          border: 1px solid var(--error);
          border-radius: var(--radius-md);
          color: var(--error);
          font-size: 0.875rem;
        }
        .auth-footer {
          margin-top: var(--space-6);
          text-align: center;
          border-top: 1px solid var(--border);
          padding-top: var(--space-4);
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
