// Password reset service for handling forgot password functionality
import { createClient } from '@/lib/supabase/client';
import crypto from 'crypto';

export interface PasswordResetRequest {
  id?: string;
  email: string;
  token: string;
  expires_at: string;
  user_id?: string;
  used_at?: string;
  created_at?: string;
}

export const passwordResetService = {
  /**
   * Create a password reset request
   */
  createResetRequest: async (email: string): Promise<{ success: boolean; message: string }> => {
    const supabase = createClient();
    
    try {
      // First check if user exists
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('email', email)
        .single();
      
      if (userError || !userProfile) {
        // Don't reveal that email doesn't exist for security
        return {
          success: true,
          message: 'If an account with that email exists, you will receive a password reset link.'
        };
      }
      
      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Set expiration to 1 hour from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      // Create password reset request
      const { error: insertError } = await supabase
        .from('password_resets')
        .insert([{
          email: email,
          token: resetToken,
          expires_at: expiresAt.toISOString(),
          user_id: userProfile.id,
          created_at: new Date().toISOString()
        }]);
      
      if (insertError) {
        console.error('Error creating password reset request:', insertError);
        throw insertError;
      }
      
      // Send email with reset link using email service
      try {
        const { sendPasswordResetEmail } = await import('@/lib/email-service');
        const resetUrl = `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
        
        await sendPasswordResetEmail(email, resetUrl);
        console.log(`Password reset email sent to ${email}`);
      } catch (emailError) {
        console.error('Error sending password reset email:', emailError);
        // Continue with success response even if email fails - for security reasons
        // In production, you might want to implement retry logic or queue the email
      }
      
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
   * Verify a reset token
   */
  verifyResetToken: async (token: string): Promise<{ valid: boolean; email?: string; user_id?: string }> => {
    const supabase = createClient();
    
    try {
      const { data: resetRequest, error } = await supabase
        .from('password_resets')
        .select('*')
        .eq('token', token)
        .is('used_at', null) // Not yet used
        .gt('expires_at', new Date().toISOString()) // Not expired
        .single();
      
      if (error || !resetRequest) {
        return { valid: false };
      }
      
      return {
        valid: true,
        email: resetRequest.email,
        user_id: resetRequest.user_id
      };
      
    } catch (error) {
      console.error('Error verifying reset token:', error);
      return { valid: false };
    }
  },

  /**
   * Reset password using token
   */
  resetPassword: async (token: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const supabase = createClient();
    
    try {
      // First verify the token
      const tokenVerification = await passwordResetService.verifyResetToken(token);
      
      if (!tokenVerification.valid || !tokenVerification.user_id) {
        return {
          success: false,
          message: 'Invalid or expired reset token. Please request a new password reset.'
        };
      }
      
      // Update the user's password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (authError) {
        console.error('Error updating password:', authError);
        return {
          success: false,
          message: 'Failed to update password. Please try again.'
        };
      }
      
      // Mark the reset token as used
      const { error: updateError } = await supabase
        .from('password_resets')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);
      
      if (updateError) {
        console.error('Error marking token as used:', updateError);
        // Don't fail the request since password was successfully updated
      }
      
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
  },

  /**
   * Clean up expired reset tokens (maintenance function)
   */
  cleanupExpiredTokens: async (): Promise<number> => {
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('password_resets')
        .delete()
        .lt('expires_at', new Date().toISOString());
      
      if (error) {
        console.error('Error cleaning up expired tokens:', error);
        throw error;
      }
      
      return 0; // Count not available in this version of Supabase
      
    } catch (error) {
      console.error('Error in cleanupExpiredTokens:', error);
      return 0;
    }
  },

  /**
   * Get user's recent reset requests (for rate limiting)
   */
  getRecentResetRequests: async (email: string, hours: number = 1): Promise<number> => {
    const supabase = createClient();
    
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);
      
      const { count, error } = await supabase
        .from('password_resets')
        .select('*', { count: 'exact', head: true })
        .eq('email', email)
        .gt('created_at', cutoffTime.toISOString());
      
      if (error) {
        console.error('Error getting recent reset requests:', error);
        throw error;
      }
      
      return count || 0;
      
    } catch (error) {
      console.error('Error in getRecentResetRequests:', error);
      return 0;
    }
  }
};


