import React from 'react';
import { Input } from './input';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  showPassword: boolean;
  onToggle: () => void;
  error?: string;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
  required?: boolean;
}

/**
 * Reusable password input component with show/hide toggle
 * Prevents focus loss by being a stable component reference
 */
export const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  name,
  value,
  onChange,
  placeholder = "Enter password",
  showPassword,
  onToggle,
  error,
  disabled,
  autoComplete = "current-password",
  className = "",
  required = false
}) => {
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className={`pr-10 ${error ? 'border-red-500' : ''} ${className}`}
        required={required}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 transition-colors"
        disabled={disabled}
        tabIndex={-1} // Prevent tab focus on toggle button
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};
