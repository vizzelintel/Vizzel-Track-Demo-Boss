'use client';

import { useLogout } from '@/hooks/use-logout';
import { TEST_IDS } from '@/components/test-ids';

export function LogoutButton() {
  const { logout } = useLogout();

  return (
    <button
      onClick={logout}
      className="w-full rounded-md py-2 text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-zinc-800"
      data-testid={TEST_IDS.LOGOUT_BUTTON.BUTTON}
    >
      Logout
    </button>
  );
}
