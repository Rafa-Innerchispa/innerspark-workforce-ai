/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import InnerOSModulesPage from './page';
import { ECOSYSTEM_MODULES } from '@/lib/ecosystemModules';

const mockPush = jest.fn();
const mockLogout = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt?: string }) => <img alt={props.alt || ''} />,
}));

jest.mock('@/components/AriaOrchestrator', () => ({
  __esModule: true,
  default: () => <div data-testid="aria-orchestrator" />,
}));

jest.mock('@/components/InnerOSShell', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/contexts/InnerOSLangContext', () => ({
  useInnerOSLang: () => ({
    lang: 'en',
    toggleLang: jest.fn(),
    setLang: jest.fn(),
    copy: require('@/lib/innerosCopy').innerosCopy.en,
  }),
}));

function modulesForCompany(companyId: string, role: string) {
  const { resolveAllowedModuleIds } = require('@/lib/entityEntitlements');
  const allowed = resolveAllowedModuleIds(companyId, role);
  return ECOSYSTEM_MODULES.filter((m) => allowed.includes(m.id as never));
}

function setupAuth(companyId: string, role: string) {
  mockUseAuth.mockReturnValue({
    user: { id: 'u1', name: 'Test User', role, companyId },
    activeCompanyId: companyId,
    logout: mockLogout,
    isLoading: false,
  });
}

describe('InnerOS modules page (browser RBAC)', () => {
  const originalFetch = global.fetch;
  const originalAlert = global.alert;

  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.alert = originalAlert;
  });

  it('pcdoctor admin renders all authorized module cards', async () => {
    setupAuth('pcdoctor', 'admin');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ modules: modulesForCompany('pcdoctor', 'admin') }),
    }) as jest.Mock;

    render(<InnerOSModulesPage />);

    await waitFor(() => {
      expect(screen.getByText('QuoteOps Cockpit')).toBeInTheDocument();
      expect(screen.getByText('FounderOS')).toBeInTheDocument();
    });
  });

  it('femar admin renders workforce-only module cards', async () => {
    setupAuth('femar', 'admin');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ modules: modulesForCompany('femar', 'admin') }),
    }) as jest.Mock;

    render(<InnerOSModulesPage />);

    await waitFor(() => {
      expect(screen.getByText('InnerSpark Workforce AI')).toBeInTheDocument();
    });
    expect(screen.queryByText('QuoteOps Cockpit')).not.toBeInTheDocument();
    expect(screen.queryByText('FounderOS')).not.toBeInTheDocument();
  });

  it('iapro admin renders workforce-only module cards', async () => {
    setupAuth('iapro', 'admin');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ modules: modulesForCompany('iapro', 'admin') }),
    }) as jest.Mock;

    render(<InnerOSModulesPage />);

    await waitFor(() => {
      expect(screen.getByText('InnerSpark Workforce AI')).toBeInTheDocument();
    });
    expect(screen.queryByText('QuoteOps Cockpit')).not.toBeInTheDocument();
  });

  it('module click on denied foreign access shows alert (403)', async () => {
    setupAuth('femar', 'admin');
    const quoteops = ECOSYSTEM_MODULES.find((m) => m.id === 'quoteops')!;
    const tamperedList = [...modulesForCompany('femar', 'admin'), quoteops];

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ modules: tamperedList }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ ok: false, error: 'Module access denied: quoteops' }),
      }) as jest.Mock;

    render(<InnerOSModulesPage />);

    await waitFor(() => {
      expect(screen.getByText('QuoteOps Cockpit')).toBeInTheDocument();
    });

    const openButtons = screen.getAllByRole('button');
    const moduleButton = openButtons.find((btn) =>
      btn.textContent?.includes('QuoteOps Cockpit')
    );
    expect(moduleButton).toBeTruthy();
    fireEvent.click(moduleButton!);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Access denied for this module');
    });
  });

  it('redirects unauthenticated users to login', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      activeCompanyId: null,
      logout: mockLogout,
      isLoading: false,
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    }) as jest.Mock;

    render(<InnerOSModulesPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/app/login');
    });
  });
});
