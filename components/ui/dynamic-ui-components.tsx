"use client";

import { createDynamicImport } from '@/lib/utils/dynamic-imports';

// Dynamic imports for heavy UI components with Radix dependencies

// Command component (includes search functionality)
const Command = createDynamicImport(
  () => import('./command'),
  { loadingMessage: 'Loading command palette...', ssr: false }
);

// Sidebar component (large component with many sub-components)
const Sidebar = createDynamicImport(
  () => import('./sidebar'),
  { loadingMessage: 'Loading sidebar...', showSkeleton: true, ssr: false }
);

// Sheet component (modal/drawer)
const Sheet = createDynamicImport(
  () => import('./sheet'),
  { loadingMessage: 'Loading sheet...', ssr: false }
);

// Dialog component
const Dialog = createDynamicImport(
  () => import('./dialog'),
  { loadingMessage: 'Loading dialog...', ssr: false }
);

// Dropdown Menu component
const DropdownMenu = createDynamicImport(
  () => import('./dropdown-menu'),
  { loadingMessage: 'Loading menu...', ssr: false }
);

// Select component
const Select = createDynamicImport(
  () => import('./select'),
  { loadingMessage: 'Loading select...', ssr: false }
);

// Popover component
const Popover = createDynamicImport(
  () => import('./popover'),
  { loadingMessage: 'Loading popover...', ssr: false }
);

// Tooltip component
const Tooltip = createDynamicImport(
  () => import('./tooltip'),
  { loadingMessage: 'Loading tooltip...', ssr: false }
);

// AlertDialog component
const AlertDialog = createDynamicImport(
  () => import('./alert-dialog'),
  { loadingMessage: 'Loading alert...', ssr: false }
);

// Accordion component
const Accordion = createDynamicImport(
  () => import('./accordian'),
  { loadingMessage: 'Loading accordion...', ssr: false }
);

// Tabs component
const Tabs = createDynamicImport(
  () => import('./tabs'),
  { loadingMessage: 'Loading tabs...', ssr: false }
);

// ScrollArea component
const ScrollArea = createDynamicImport(
  () => import('./scroll-area'),
  { loadingMessage: 'Loading scroll area...', ssr: false }
);

// Drawer component
const Drawer = createDynamicImport(
  () => import('./drawer'),
  { loadingMessage: 'Loading drawer...', ssr: false }
);

// Form component (heavy with validation)
const Form = createDynamicImport(
  () => import('./form'),
  { loadingMessage: 'Loading form...', showSkeleton: true, ssr: false }
);

// Multiselect component
const Multiselect = createDynamicImport(
  () => import('./multiselect'),
  { loadingMessage: 'Loading multiselect...', ssr: false }
);

// ConfirmationDialogBox component
const ConfirmationDialogBox = createDynamicImport(
  () => import('./confirmation-dialog-box'),
  { loadingMessage: 'Loading confirmation...', ssr: false }
);

// Re-export all dynamic components
export {
  Command,
  Sidebar,
  Sheet,
  Dialog,
  DropdownMenu,
  Select,
  Popover,
  Tooltip,
  AlertDialog,
  Accordion,
  Tabs,
  ScrollArea,
  Drawer,
  Form,
  Multiselect,
  ConfirmationDialogBox
};

// Export individual component loaders for granular imports
export const DynamicCommand = Command;
export const DynamicSidebar = Sidebar;
export const DynamicSheet = Sheet;
export const DynamicDialog = Dialog;
export const DynamicDropdownMenu = DropdownMenu;
export const DynamicSelect = Select;
export const DynamicPopover = Popover;
export const DynamicTooltip = Tooltip;
export const DynamicAlertDialog = AlertDialog;
export const DynamicAccordion = Accordion;
export const DynamicTabs = Tabs;
export const DynamicScrollArea = ScrollArea;
export const DynamicDrawer = Drawer;
export const DynamicForm = Form;
export const DynamicMultiselect = Multiselect;
export const DynamicConfirmationDialogBox = ConfirmationDialogBox;