"use client";

import { createTableImport } from '@/lib/utils/dynamic-imports';

// Dynamic import for DataTable component
const DataTable = createTableImport(
  () => import('./data-table')
);

// Dynamic import for DataTableToolbar
const DataTableToolbar = createTableImport(
  () => import('./data-table-toolbar')
);

// Dynamic import for UserDataTableToolbar
const UserDataTableToolbar = createTableImport(
  () => import('./toolbars/user-toolbar')
);

// Dynamic import for DataTableViewOptions
const DataTableViewOptions = createTableImport(
  () => import('./data-table-view-options')
);

// Dynamic import for DataTableFacetedFilter
const DataTableFacetedFilter = createTableImport(
  () => import('./data-table-faceted-filter')
);

// Re-export components
export { 
  DataTable, 
  DataTableToolbar, 
  UserDataTableToolbar, 
  DataTableViewOptions, 
  DataTableFacetedFilter 
};
export default DataTable;