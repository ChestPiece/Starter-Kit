// Simple password reset service using only Supabase built-in functionality
import { createClient } from '@/lib/supabase/client';

export const passwordResetService = {
  /**
   * Create a password reset request using Supabase's built-in resetPasswordForEmail
   */
  createResetRequest: async (email: string): Promise<{ success: boolean; message: string }> => {
    const supabase = createClient();
    
    try {
      const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`;
      
      // Use Supabase's built-in password reset functionality
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Password reset error:', error);
        
        // Handle specific error types
        if (
          error.message?.includes("rate limit") ||
          error.message?.includes("security purposes") ||
          error.message?.includes("send rate limit")
        ) {
          return {
            success: false,
            message: 'Too many reset requests. Please wait before trying again.'
          };
        } else if (error.message?.includes("User not found") || error.message?.includes("email not found")) {
          // Don't reveal that email doesn't exist for security
          return {
            success: true,
            message: 'If an account with that email exists, you will receive a password reset link.'
          };
        } else {
          return {
            success: false,
            message: 'Unable to send reset email at this time. Please try again later.'
          };
        }
      }
      
      console.log(`✅ Password reset email sent to ${email} via Supabase`);
      return {
        success: true,
        message: 'If an account with that email exists, you will receive a password reset link.'
      };
      
    } catch (error) {
      console.error('Error in createResetRequest:', error);
      return {
        success: false,
        message: 'An error occurred while processing your request. Please try again later.'
      };
    }
  },

  /**
   * Reset password using Supabase's built-in functionality
   * This is handled automatically by Supabase when the user clicks the reset link
   */
  resetPassword: async (newPassword: string): Promise<{ success: boolean; message: string }> => {
    const supabase = createClient();
    
    try {
      // Update the user's password - only works if user has valid recovery session
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (authError) {
        console.error('Error updating password:', authError);
        return {
          success: false,
          message: 'Failed to update password. Please try again or request a new reset link.'
        };
      }
      
      console.log('✅ Password updated successfully via Supabase');
      return {
        success: true,
        message: 'Password has been successfully reset. You can now log in with your new password.'
      };
      
    } catch (error) {
      console.error('Error in resetPassword:', error);
      return {
        success: false,
        message: 'An error occurred while resetting your password. Please try again.'
      };
    }
  }
};


