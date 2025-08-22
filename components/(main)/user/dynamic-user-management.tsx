"use client";

import { createTableImport, createFormImport } from '@/lib/utils/dynamic-imports';

// Dynamic import for UserManagementPage component
const UserManagementPage = createTableImport(
  () => import('./index')
);

// Dynamic import for AddUser component
const AddUser = createFormImport(
  () => import('./component/add-user')
);

// Dynamic import for EditUser component
const EditUser = createFormImport(
  () => import('./component/edit-user')
);

// Re-export components
export { UserManagementPage, AddUser, EditUser };
export default UserManagementPage;