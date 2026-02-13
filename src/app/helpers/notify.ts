import { uiIsPageVisible } from '@helpers';
import type { NotificationCategory } from '@interfaces';
import { Subject } from 'rxjs';

const notification = new Subject<{
  message: string;
  type: 'info' | 'error' | 'success' | 'warning';
  category: NotificationCategory;
}>();
export const notifyNotification$ = notification.asObservable();

export function notify(category: NotificationCategory, message: string): void {
  if (!uiIsPageVisible()) return;

  notification.next({ message, type: 'info', category });
}

export function notifyError(message: string): void {
  if (!uiIsPageVisible()) return;
  notification.next({ message, type: 'error', category: 'Error' });
}

export function notifySuccess(message: string): void {
  if (!uiIsPageVisible()) return;
  notification.next({ message, type: 'success', category: 'Success' });
}
