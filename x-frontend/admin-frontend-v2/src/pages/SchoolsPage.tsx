import {
  ArrowPathIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AdminErrorDisplay } from '../components/ui/admin-error-display';
import { AdminLoadingState } from '../components/ui/admin-loading-state';
import { Button } from '../components/ui/button';
import { StatusBadge } from '../components/ui/data-table';
import { Input } from '../components/ui/input';
import { useAdminAuth } from '../hooks/useAdminAuth';
import {
  AdminSchool,
  AdminSchoolImpersonationData,
  adminApi,
} from '../services/adminApi';
import {
  ADMIN_BUTTON_TEXTS,
  AdminErrorHandler,
  formatAdminDate,
} from '../utils/admin-frontend-utils';

const cycleLabel = (cycle?: AdminSchool['billing_cycle']) => {
  if (!cycle) return 'Not configured';
  return cycle.charAt(0).toUpperCase() + cycle.slice(1);
};

const formatPackId = (packId?: string | null) => packId ?? 'Not assigned';

const describeBillingWindow = (
  start?: string | null,
  end?: string | null,
) => {
  if (!start && !end) return 'No cycle window set';
  if (start && !end) return `Starts ${formatAdminDate(start)}`;
  if (!start && end) return `Ends ${formatAdminDate(end)}`;
  return `${formatAdminDate(start)} → ${formatAdminDate(end)}`;
};

const describeLastBilled = (timestamp?: string | null) =>
  timestamp ? formatAdminDate(timestamp) : 'Never billed';

export default function SchoolsPage() {
  const navigate = useNavigate();
  const { token } = useAdminAuth();

  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impersonationLoading, setImpersonationLoading] = useState<Record<string, boolean>>({});

    // Set page title
    useEffect(() => {
    document.title = 'Schools Management | One-CEFR Admin';
  }, []);  useEffect(() => {
    if (!token) return;
    fetchSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredSchools = useMemo(() => {
    if (!searchTerm.trim()) return schools;

    const search = searchTerm.toLowerCase();
    return schools.filter((school) =>
      [
        school.name,
        school.display_name ?? '',
        school.contact_email ?? '',
        school.admin_email ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }, [schools, searchTerm]);

  const fetchSchools = async () => {
    if (!token) return;

    setLoading(true);
    AdminErrorHandler.clear(setError);

    const response = await AdminErrorHandler.handleAsync(
      () => adminApi.getSchools(token, 1, 100),
      (message) => setError(message),
      'Schools List',
    );

    if (response) {
      if (response.success && response.data) {
        setSchools(response.data.schools || []);
      } else {
        setError(response?.message || 'Failed to load schools');
      }
    }

    setLoading(false);
  };

  const handleCreateSchool = () => {
    navigate('/institutes/create');
  };

  const handleEditSchool = (schoolId: string) => {
    navigate(`/institutes/${schoolId}/edit`);
  };

  const handleDeactivateSchool = async (school: AdminSchool) => {
    if (!token) return;
    const confirmed = window.confirm(
      `Deactivate ${school.name}? This action can be reversed later by reactivating the school.`,
    );

    if (!confirmed) return;

    const result = await AdminErrorHandler.handleAsync(
      () => adminApi.deleteSchool(token, school.id),
      (message) => setError(message),
      'Deactivate School',
    );

    if (result?.success) {
      await fetchSchools();
    }
  };

  const handleReactivateSchool = async (school: AdminSchool) => {
    if (!token) return;
    const confirmed = window.confirm(
      `Reactivate ${school.name}? This will make the school active again.`,
    );

    if (!confirmed) return;

    const result = await AdminErrorHandler.handleAsync(
      () => adminApi.reactivateSchool(token, school.id),
      (message) => setError(message),
      'Reactivate School',
    );

    if (result?.success) {
      await fetchSchools();
    }
  };

  const handleImpersonate = async (school: AdminSchool) => {
    if (!token) return;

    const confirmed = window.confirm(
      `Impersonate ${school.name}? This opens the school portal in a new tab.`,
    );
    if (!confirmed) return;

    setImpersonationLoading((prev) => ({ ...prev, [school.id]: true }));

    try {
      const response = await adminApi.impersonateSchool(token, school.id);

      if (!response.success || !response.data) {
        const message = response.message || 'Failed to generate impersonation token.';
        window.alert(message);
        return;
      }

      const data = response.data as AdminSchoolImpersonationData;
      const targetUrl = `${import.meta.env?.VITE_SCHOOL_PORTAL_URL || '/school/impersonation'}?token=${encodeURIComponent(data.access_token)}&schoolId=${encodeURIComponent(data.school_id)}&expiresIn=${encodeURIComponent(String(data.expires_in))}`;

      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Impersonation failed', err);
      window.alert('Unable to start impersonation. Please try again.');
    } finally {
      setImpersonationLoading((prev) => ({ ...prev, [school.id]: false }));
    }
  };

  const handleRefresh = () => {
    fetchSchools();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Institutes</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage school accounts, billing configuration, and impersonation access.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-2"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreateSchool} className="gap-2">
            <PlusIcon className="h-4 w-4" />
            {ADMIN_BUTTON_TEXTS.CREATE_SCHOOL}
          </Button>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by school name or email"
            className="flex-1"
          />
        </div>
      </div>

      {error && (
        <AdminErrorDisplay
          title="Unable to load schools"
          message={error}
          onRetry={handleRefresh}
        />
      )}

      {loading ? (
        <AdminLoadingState message="Loading schools" />
      ) : filteredSchools.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 text-center rounded-xl p-12 text-gray-500">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-700">No schools found</h2>
          <p className="mt-2 text-sm">
            {searchTerm
              ? 'Try adjusting your search or refresh the list.'
              : 'Create a school to start configuring billing settings.'}
          </p>
          {!searchTerm && (
            <Button onClick={handleCreateSchool} className="mt-4 gap-2">
              <PlusIcon className="h-4 w-4" />
              {ADMIN_BUTTON_TEXTS.CREATE_SCHOOL}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSchools.map((school) => (
            <div
              key={school.id}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col gap-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-900">
                    <BuildingOfficeIcon className="h-5 w-5 text-eu-blue" />
                    <span className="text-lg font-semibold">{school.name}</span>
                  </div>
                  {school.display_name && (
                    <p className="text-sm text-gray-500">{school.display_name}</p>
                  )}
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    {school.school_type?.toUpperCase() || 'UNKNOWN'} · Created {formatAdminDate(school.created_at ?? null)}
                  </p>
                  {school.user_count !== undefined && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500">
                      <UserGroupIcon className="h-4 w-4" />
                      {school.user_count} users · {school.active_user_count ?? 0} active
                    </p>
                  )}
                </div>
                <StatusBadge status={school.is_active} />
              </div>

              <div className="grid gap-4">
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 tracking-wide uppercase">Billing Configuration</h3>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-500">Billing Pack ID</p>
                      <p className="font-mono text-sm text-gray-900">{formatPackId(school.billing_pack_id)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Student Pack ID</p>
                      <p className="font-mono text-sm text-gray-900">{formatPackId(school.student_pack_id)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Billing Cycle</p>
                      <p className="text-sm text-gray-900">{cycleLabel(school.billing_cycle)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Billing Window</p>
                      <p className="text-sm text-gray-900">{describeBillingWindow(school.cycle_start, school.cycle_end)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Last Billed</p>
                      <p className="text-sm text-gray-900">{describeLastBilled(school.last_billed_at)}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold text-gray-500 tracking-wide uppercase">Contacts</h3>
                  <div className="mt-2 grid gap-2">
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Primary:</span>{' '}
                      {school.contact_email || 'Not set'}
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Admin:</span>{' '}
                      {school.admin_email || 'Not set'}
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Billing:</span>{' '}
                      {school.billing_email || 'Not set'}
                    </div>
                  </div>
                </section>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleEditSchool(school.id)}
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit Details
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleImpersonate(school)}
                  disabled={!!impersonationLoading[school.id]}
                >
                  <ArrowPathIcon
                    className={`h-4 w-4 ${impersonationLoading[school.id] ? 'animate-spin' : ''}`}
                  />
                  Impersonate
                </Button>
                {school.is_active ? (
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => handleDeactivateSchool(school)}
                  >
                    <TrashIcon className="h-4 w-4" />
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleReactivateSchool(school)}
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    Activate
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
