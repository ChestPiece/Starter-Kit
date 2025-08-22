# Code Splitting Migration Examples

This document provides practical examples of how to migrate existing components to use dynamic imports for code splitting.

## Table of Contents

1. [Basic Component Migration](#basic-component-migration)
2. [Form Component Migration](#form-component-migration)
3. [Modal/Dialog Migration](#modal-dialog-migration)
4. [Data Table Migration](#data-table-migration)
5. [Settings Page Migration](#settings-page-migration)
6. [Route-Level Code Splitting](#route-level-code-splitting)
7. [Conditional Loading](#conditional-loading)
8. [Testing Dynamic Components](#testing-dynamic-components)

## Basic Component Migration

### Before: Direct Import

```tsx
// components/dashboard/analytics.tsx
import { AnalyticsChart } from './analytics-chart'
import { MetricsCard } from './metrics-card'

export function Analytics() {
  return (
    <div className="space-y-4">
      <MetricsCard />
      <AnalyticsChart />
    </div>
  )
}
```

### After: Dynamic Import

```tsx
// components/dashboard/dynamic-analytics.tsx
import { createDashboardImport } from '@/lib/utils/dynamic-imports'

// Create dynamic imports
const DynamicAnalyticsChart = createDashboardImport(
  () => import('./analytics-chart').then(mod => ({ default: mod.AnalyticsChart })),
  'Analytics Chart'
)

const DynamicMetricsCard = createDashboardImport(
  () => import('./metrics-card').then(mod => ({ default: mod.MetricsCard })),
  'Metrics Card'
)

export function Analytics() {
  return (
    <div className="space-y-4">
      <DynamicMetricsCard />
      <DynamicAnalyticsChart />
    </div>
  )
}
```

## Form Component Migration

### Before: Heavy Form with Validation

```tsx
// components/forms/user-profile-form.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  bio: z.string().optional()
})

export function UserProfileForm() {
  const form = useForm({
    resolver: zodResolver(schema)
  })

  return (
    <Form {...form}>
      {/* Form fields */}
    </Form>
  )
}
```

### After: Dynamic Form Import

```tsx
// components/forms/dynamic-user-profile-form.tsx
import { createFormImport } from '@/lib/utils/dynamic-imports'

export const DynamicUserProfileForm = createFormImport(
  () => import('./user-profile-form').then(mod => ({ default: mod.UserProfileForm })),
  'User Profile Form'
)

// Usage in parent component
import { DynamicUserProfileForm } from './dynamic-user-profile-form'

export function UserSettings() {
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      <Button onClick={() => setShowForm(true)}>Edit Profile</Button>
      {showForm && <DynamicUserProfileForm />}
    </div>
  )
}
```

## Modal/Dialog Migration

### Before: Always Loaded Modal

```tsx
// components/modals/user-details-modal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UserForm } from '../forms/user-form'

interface UserDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string
}

export function UserDetailsModal({ open, onOpenChange, userId }: UserDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>
        <UserForm userId={userId} />
      </DialogContent>
    </Dialog>
  )
}
```

### After: Dynamic Modal Loading

```tsx
// components/modals/dynamic-user-details-modal.tsx
import { createModalImport } from '@/lib/utils/dynamic-imports'

export const DynamicUserDetailsModal = createModalImport(
  () => import('./user-details-modal').then(mod => ({ default: mod.UserDetailsModal })),
  'User Details Modal'
)

// Usage with conditional rendering
import { DynamicUserDetailsModal } from './dynamic-user-details-modal'

export function UserList() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  return (
    <div>
      {/* User list */}
      {selectedUserId && (
        <DynamicUserDetailsModal
          open={!!selectedUserId}
          onOpenChange={(open) => !open && setSelectedUserId(null)}
          userId={selectedUserId}
        />
      )}
    </div>
  )
}
```

## Data Table Migration

### Before: Heavy Data Table

```tsx
// components/tables/users-table.tsx
import { DataTable } from '@/components/ui/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { columns } from './columns'
import { useUsers } from '@/hooks/use-users'

export function UsersTable() {
  const { data, isLoading } = useUsers()

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="space-y-4">
      <DataTableToolbar />
      <DataTable columns={columns} data={data || []} />
    </div>
  )
}
```

### After: Dynamic Table with Lazy Loading

```tsx
// components/tables/dynamic-users-table.tsx
import { createTableImport, createLazyImport } from '@/lib/utils/dynamic-imports'
import { useUsers } from '@/hooks/use-users'

const DynamicDataTable = createTableImport(
  () => import('@/components/ui/data-table').then(mod => ({ default: mod.DataTable })),
  'Data Table'
)

const DynamicDataTableToolbar = createTableImport(
  () => import('@/components/data-table/data-table-toolbar').then(mod => ({ default: mod.DataTableToolbar })),
  'Table Toolbar'
)

// Lazy load columns definition
const LazyUsersTable = createLazyImport(
  () => import('./columns').then(mod => {
    const { columns } = mod
    
    return function UsersTableContent() {
      const { data, isLoading } = useUsers()

      if (isLoading) return <div>Loading...</div>

      return (
        <div className="space-y-4">
          <DynamicDataTableToolbar />
          <DynamicDataTable columns={columns} data={data || []} />
        </div>
      )
    }
  }),
  'Users Table'
)

export function UsersTable() {
  return <LazyUsersTable />
}
```

## Settings Page Migration

### Before: Monolithic Settings

```tsx
// app/settings/page.tsx
import { GeneralSettings } from '@/components/settings/general'
import { SecuritySettings } from '@/components/settings/security'
import { NotificationSettings } from '@/components/settings/notifications'
import { BillingSettings } from '@/components/settings/billing'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function SettingsPage() {
  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>
      
      <TabsContent value="general">
        <GeneralSettings />
      </TabsContent>
      <TabsContent value="security">
        <SecuritySettings />
      </TabsContent>
      <TabsContent value="notifications">
        <NotificationSettings />
      </TabsContent>
      <TabsContent value="billing">
        <BillingSettings />
      </TabsContent>
    </Tabs>
  )
}
```

### After: Dynamic Settings with Tab-Based Loading

```tsx
// app/settings/page.tsx
import { useState } from 'react'
import { createSettingsImport } from '@/lib/utils/dynamic-imports'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Create dynamic imports for each settings section
const DynamicGeneralSettings = createSettingsImport(
  () => import('@/components/settings/general').then(mod => ({ default: mod.GeneralSettings })),
  'General Settings'
)

const DynamicSecuritySettings = createSettingsImport(
  () => import('@/components/settings/security').then(mod => ({ default: mod.SecuritySettings })),
  'Security Settings'
)

const DynamicNotificationSettings = createSettingsImport(
  () => import('@/components/settings/notifications').then(mod => ({ default: mod.NotificationSettings })),
  'Notification Settings'
)

const DynamicBillingSettings = createSettingsImport(
  () => import('@/components/settings/billing').then(mod => ({ default: mod.BillingSettings })),
  'Billing Settings'
)

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>
      
      <TabsContent value="general">
        {activeTab === 'general' && <DynamicGeneralSettings />}
      </TabsContent>
      <TabsContent value="security">
        {activeTab === 'security' && <DynamicSecuritySettings />}
      </TabsContent>
      <TabsContent value="notifications">
        {activeTab === 'notifications' && <DynamicNotificationSettings />}
      </TabsContent>
      <TabsContent value="billing">
        {activeTab === 'billing' && <DynamicBillingSettings />}
      </TabsContent>
    </Tabs>
  )
}
```

## Route-Level Code Splitting

### Before: Heavy Page Component

```tsx
// app/admin/users/page.tsx
import { UsersTable } from '@/components/tables/users-table'
import { UserFilters } from '@/components/filters/user-filters'
import { UserActions } from '@/components/actions/user-actions'
import { UserStats } from '@/components/stats/user-stats'

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <UserStats />
      <UserFilters />
      <UserActions />
      <UsersTable />
    </div>
  )
}
```

### After: Dynamic Page Components

```tsx
// app/admin/users/page.tsx
import { Suspense } from 'react'
import { createDashboardImport } from '@/lib/utils/dynamic-imports'
import { PageSkeleton } from '@/components/ui/skeletons'

const DynamicUserStats = createDashboardImport(
  () => import('@/components/stats/user-stats').then(mod => ({ default: mod.UserStats })),
  'User Statistics'
)

const DynamicUserFilters = createDashboardImport(
  () => import('@/components/filters/user-filters').then(mod => ({ default: mod.UserFilters })),
  'User Filters'
)

const DynamicUserActions = createDashboardImport(
  () => import('@/components/actions/user-actions').then(mod => ({ default: mod.UserActions })),
  'User Actions'
)

const DynamicUsersTable = createDashboardImport(
  () => import('@/components/tables/users-table').then(mod => ({ default: mod.UsersTable })),
  'Users Table'
)

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<PageSkeleton />}>
        <DynamicUserStats />
        <DynamicUserFilters />
        <DynamicUserActions />
        <DynamicUsersTable />
      </Suspense>
    </div>
  )
}
```

## Conditional Loading

### Role-Based Component Loading

```tsx
// components/admin/admin-panel.tsx
import { useUser } from '@/hooks/use-user'
import { createDashboardImport } from '@/lib/utils/dynamic-imports'

const DynamicAdminDashboard = createDashboardImport(
  () => import('./admin-dashboard').then(mod => ({ default: mod.AdminDashboard })),
  'Admin Dashboard'
)

const DynamicUserManagement = createDashboardImport(
  () => import('./user-management').then(mod => ({ default: mod.UserManagement })),
  'User Management'
)

export function AdminPanel() {
  const { user, isLoading } = useUser()
  
  if (isLoading) return <div>Loading...</div>
  
  if (!user?.isAdmin) {
    return <div>Access denied</div>
  }

  return (
    <div>
      <DynamicAdminDashboard />
      <DynamicUserManagement />
    </div>
  )
}
```

### Feature Flag Based Loading

```tsx
// components/features/beta-features.tsx
import { useFeatureFlag } from '@/hooks/use-feature-flag'
import { createDynamicImport } from '@/lib/utils/dynamic-imports'

const DynamicNewFeature = createDynamicImport(
  () => import('./new-feature').then(mod => ({ default: mod.NewFeature })),
  {
    loading: () => <div>Loading new feature...</div>,
    error: () => <div>Feature unavailable</div>
  }
)

export function BetaFeatures() {
  const { isEnabled } = useFeatureFlag('new-feature')
  
  if (!isEnabled) return null
  
  return <DynamicNewFeature />
}
```

## Testing Dynamic Components

### Unit Testing

```tsx
// __tests__/dynamic-components.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { DynamicUserForm } from '@/components/forms/dynamic-user-form'

// Mock the dynamic import
jest.mock('@/components/forms/user-form', () => ({
  UserForm: () => <div data-testid="user-form">User Form</div>
}))

describe('DynamicUserForm', () => {
  it('should render loading state initially', () => {
    render(<DynamicUserForm />)
    expect(screen.getByText('Loading User Form...')).toBeInTheDocument()
  })

  it('should render the actual component after loading', async () => {
    render(<DynamicUserForm />)
    
    await waitFor(() => {
      expect(screen.getByTestId('user-form')).toBeInTheDocument()
    })
  })
})
```

### Integration Testing

```tsx
// __tests__/settings-page.integration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SettingsPage from '@/app/settings/page'

describe('Settings Page Integration', () => {
  it('should load settings sections dynamically', async () => {
    render(<SettingsPage />)
    
    // Click on security tab
    fireEvent.click(screen.getByText('Security'))
    
    // Wait for dynamic component to load
    await waitFor(() => {
      expect(screen.getByText('Security Settings')).toBeInTheDocument()
    })
  })
})
```

## Performance Monitoring

### Bundle Analysis Script

```bash
# Run bundle analysis
npm run analyze

# Run code splitting analysis
npm run analyze:code-splitting
```

### Performance Metrics

```tsx
// utils/performance-monitor.ts
export function measureDynamicImport<T>(importFn: () => Promise<T>, componentName: string) {
  return async () => {
    const start = performance.now()
    
    try {
      const result = await importFn()
      const end = performance.now()
      
      console.log(`Dynamic import for ${componentName} took ${end - start}ms`)
      
      return result
    } catch (error) {
      console.error(`Failed to load ${componentName}:`, error)
      throw error
    }
  }
}

// Usage
const DynamicComponent = createDynamicImport(
  measureDynamicImport(
    () => import('./heavy-component'),
    'Heavy Component'
  )
)
```

## Best Practices Summary

1. **Start with High-Impact Components**: Focus on components with heavy dependencies first
2. **Use Appropriate Loading States**: Provide meaningful feedback during loading
3. **Implement Error Boundaries**: Handle loading failures gracefully
4. **Test Dynamic Imports**: Ensure components load correctly in different scenarios
5. **Monitor Performance**: Use bundle analysis to measure improvements
6. **Progressive Enhancement**: Load critical components first, then enhance with dynamic ones
7. **Consider User Experience**: Balance performance gains with loading states
8. **Document Changes**: Keep track of which components are dynamically loaded

## Migration Checklist

- [ ] Identify components for code splitting using the analysis script
- [ ] Create dynamic import wrappers
- [ ] Update parent components to use dynamic versions
- [ ] Add appropriate loading states
- [ ] Implement error handling
- [ ] Update tests
- [ ] Run bundle analysis to verify improvements
- [ ] Monitor performance in production