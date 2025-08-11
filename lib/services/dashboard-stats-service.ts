// Dashboard statistics service for real-time data from Supabase
import { createClient } from '@/lib/supabase/client';

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  recentSignups: number;
  totalRoles: number;
  pendingPasswordResets: number;
}

export const dashboardStatsService = {
  /**
   * Get comprehensive dashboard statistics
   */
  getDashboardStats: async (): Promise<DashboardStats> => {
    const supabase = createClient();
    
    try {
      // Get total users count
      const { count: totalUsers, error: totalUsersError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });
      
      if (totalUsersError) {
        console.error('Error fetching total users:', totalUsersError);
      }

      // Get active users count (users who have logged in within last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: activeUsers, error: activeUsersError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('last_login', thirtyDaysAgo.toISOString());
      
      if (activeUsersError) {
        console.error('Error fetching active users:', activeUsersError);
      }

      // Get admin users count
      const { count: adminUsers, error: adminUsersError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          roles!role_id (name)
        `, { count: 'exact', head: true })
        .eq('roles.name', 'admin');
      
      if (adminUsersError) {
        console.error('Error fetching admin users:', adminUsersError);
      }

      // Get recent signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: recentSignups, error: recentSignupsError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());
      
      if (recentSignupsError) {
        console.error('Error fetching recent signups:', recentSignupsError);
      }

      // Get total roles count
      const { count: totalRoles, error: totalRolesError } = await supabase
        .from('roles')
        .select('*', { count: 'exact', head: true });
      
      if (totalRolesError) {
        console.error('Error fetching total roles:', totalRolesError);
      }

      // Get pending password resets (unexpired and unused)
      const { count: pendingPasswordResets, error: pendingPasswordResetsError } = await supabase
        .from('password_resets')
        .select('*', { count: 'exact', head: true })
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString());
      
      if (pendingPasswordResetsError) {
        console.error('Error fetching pending password resets:', pendingPasswordResetsError);
      }

      return {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        adminUsers: adminUsers || 0,
        recentSignups: recentSignups || 0,
        totalRoles: totalRoles || 0,
        pendingPasswordResets: pendingPasswordResets || 0,
      };

    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      // Return fallback stats on error
      return {
        totalUsers: 0,
        activeUsers: 0,
        adminUsers: 0,
        recentSignups: 0,
        totalRoles: 0,
        pendingPasswordResets: 0,
      };
    }
  },

  /**
   * Get user growth data for charts (last 30 days)
   */
  getUserGrowthData: async (): Promise<{ date: string; users: number }[]> => {
    const supabase = createClient();
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching user growth data:', error);
        return [];
      }

      // Group users by date
      const growthData: { [key: string]: number } = {};
      
      data?.forEach(user => {
        const date = new Date(user.created_at).toISOString().split('T')[0];
        growthData[date] = (growthData[date] || 0) + 1;
      });

      // Convert to array format
      return Object.entries(growthData).map(([date, users]) => ({
        date,
        users
      }));

    } catch (error) {
      console.error('Error in getUserGrowthData:', error);
      return [];
    }
  },

  /**
   * Get role distribution data
   */
  getRoleDistribution: async (): Promise<{ role: string; count: number }[]> => {
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          roles!role_id (name)
        `);
      
      if (error) {
        console.error('Error fetching role distribution:', error);
        return [];
      }

      // Count users by role
      const roleCount: { [key: string]: number } = {};
      
      data?.forEach(user => {
        const roleName = user.roles?.name || 'user';
        roleCount[roleName] = (roleCount[roleName] || 0) + 1;
      });

      // Convert to array format
      return Object.entries(roleCount).map(([role, count]) => ({
        role,
        count
      }));

    } catch (error) {
      console.error('Error in getRoleDistribution:', error);
      return [];
    }
  },

  /**
   * Get recent user activity
   */
  getRecentUserActivity: async (limit: number = 10): Promise<any[]> => {
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          last_login,
          created_at,
          roles!role_id (name)
        `)
        .order('last_login', { ascending: false, nullsLast: true })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching recent user activity:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error in getRecentUserActivity:', error);
      return [];
    }
  },

  /**
   * Get system health metrics
   */
  getSystemHealth: async (): Promise<{
    databaseConnected: boolean;
    authServiceAvailable: boolean;
    storageAvailable: boolean;
  }> => {
    const supabase = createClient();
    
    try {
      // Test database connection
      const { error: dbError } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      
      // Test auth service
      const { error: authError } = await supabase.auth.getSession();
      
      // Test storage (if available)
      const { error: storageError } = await supabase
        .storage
        .from('uploads')
        .list('', { limit: 1 });

      return {
        databaseConnected: !dbError,
        authServiceAvailable: !authError,
        storageAvailable: !storageError,
      };

    } catch (error) {
      console.error('Error in getSystemHealth:', error);
      return {
        databaseConnected: false,
        authServiceAvailable: false,
        storageAvailable: false,
      };
    }
  }
};


