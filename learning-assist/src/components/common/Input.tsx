import React, { InputHTMLAttributes, ReactNode, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  floating?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  success,
  helperText,
  leftIcon,
  rightIcon,
  floating = false,
  type = 'text',
  className = '',
  id,
  placeholder,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  // Check if input has value (works with both controlled and uncontrolled inputs)
  const hasValue = (props.value !== undefined && props.value !== '') || (props.defaultValue !== undefined && props.defaultValue !== '');
  const isLabelFloating = floating && (isFocused || hasValue);
  
  // When using floating labels, don't show placeholder
  const effectivePlaceholder = floating ? '' : placeholder;
  
  const baseInputStyles = 'w-full rounded-lg bg-white dark:bg-gray-800 border-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
  
  const stateStyles = error
    ? 'border-error-500 focus:border-error-500 focus:ring-2 focus:ring-error-500/20'
    : success
    ? 'border-success-500 focus:border-success-500 focus:ring-2 focus:ring-success-500/20'
    : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';
  
  const paddingStyles = leftIcon
    ? 'pl-10 pr-4'
    : rightIcon || type === 'password' || error || success
    ? 'pl-4 pr-10'
    : 'px-4';
  
  const heightStyles = floating ? 'pt-6 pb-2' : 'py-2.5';
  
  const inputType = type === 'password' && showPassword ? 'text' : type;
  
  return (
    <div className="w-full">
      {/* Regular Label (non-floating) */}
      {label && !floating && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
            {leftIcon}
          </div>
        )}
        
        {/* Input Field */}
        <input
          id={inputId}
          type={inputType}
          className={`${baseInputStyles} ${stateStyles} ${paddingStyles} ${heightStyles} ${className}`}
          placeholder={effectivePlaceholder}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        
        {/* Floating Label */}
        {label && floating && (
          <label
            htmlFor={inputId}
            className={`absolute transition-all duration-200 pointer-events-none ${
              leftIcon ? 'left-10' : 'left-4'
            } ${
              isLabelFloating
                ? 'top-2 text-xs font-medium text-primary-600 dark:text-primary-400'
                : 'top-1/2 -translate-y-1/2 text-base text-gray-400 dark:text-gray-500'
            }`}
          >
            {label}
          </label>
        )}
        
        {/* Right Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Password Toggle */}
          {type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
          
          {/* Error Icon */}
          {error && (
            <AlertCircle size={18} className="text-error-500" />
          )}
          
          {/* Success Icon */}
          {success && (
            <CheckCircle2 size={18} className="text-success-500" />
          )}
          
          {/* Custom Right Icon */}
          {rightIcon && !error && !success && type !== 'password' && (
            <div className="text-gray-400 dark:text-gray-500">
              {rightIcon}
            </div>
          )}
        </div>
      </div>
      
      {/* Helper/Error/Success Text */}
      {(error || success || helperText) && (
        <p className={`mt-1.5 text-xs ${
          error
            ? 'text-error-600 dark:text-error-400'
            : success
            ? 'text-success-600 dark:text-success-400'
            : 'text-gray-500 dark:text-gray-400'
        }`}>
          {error || success || helperText}
        </p>
      )}
    </div>
  );
};

export default Input;

