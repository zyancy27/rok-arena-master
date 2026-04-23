import { useLocation, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home } from 'lucide-react';

// Map route segments to human-readable labels
const ROUTE_LABELS: Record<string, string> = {
  hub: 'Hub',
  characters: 'Solar System',
  list: 'My Characters',
  new: 'Create Character',
  edit: 'Edit',
  battles: 'Battles',
  practice: 'PvE Battle',
  simulation: 'EvE Battle',
  profile: 'Profile',
  friends: 'Friends',
  races: 'Races',
  stories: 'Stories',
  teams: 'Teams',
  settings: 'Settings',
  admin: 'Admin',
  rules: 'Rules',
};

export default function PageBreadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs on the hub (it's the root)
  if (segments.length <= 1 && segments[0] === 'hub') return null;
  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    const isLast = i === segments.length - 1;
    // Skip UUIDs in display but still build path
    const isUuid = /^[0-9a-f]{8}-/.test(seg);
    const label = isUuid ? 'Details' : (ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1));

    return { path, label, isLast };
  });

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/hub" className="flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
              <span className="sr-only sm:not-sr-only">Hub</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb, i) => {
          // Skip "hub" since we already have the home icon
          if (crumb.label === 'Hub' && i === 0) return null;
          return (
            <span key={crumb.path} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.path}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
