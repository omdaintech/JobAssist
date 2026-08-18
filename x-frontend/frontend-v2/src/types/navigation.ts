export type ToastVariant = 'info' | 'success' | 'error' | 'warning';

export interface NavigationToastState {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

export interface PracticeNavigationState {
  toast?: NavigationToastState;
}
