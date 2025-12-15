import React, { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@/lib/constants";

//Iconos
const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const FileIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);
const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const MessageIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const BriefcaseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);
const MedicalIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20a8 8 0 0 0 8-8 8 8 0 0 0-8-8 8 8 0 0 0-8 8 8 8 0 0 0 8 8z" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </svg>
);
const LogOutIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

interface NavItem {
  href: string;
  label: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
  roles: Role[];
}

// Menú de navegación
const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Panel General",
    icon: HomeIcon,
    roles: Object.values(Role) as Role[],
  },
  {
    href: "/dashboard/documentos",
    label: "Documentos",
    icon: FileIcon,
    roles: Object.values(Role) as Role[],
  },
  {
    href: "/dashboard/solicitudes",
    label: "Gestión Solicitudes",
    icon: BriefcaseIcon,
    roles: Object.values(Role) as Role[],
  },
  {
    href: "/dashboard/comunicados",
    label: "Comunicados",
    icon: MessageIcon,
    roles: Object.values(Role) as Role[],
  },
  {
    href: "/dashboard/licencias",
    label: "Gestión Licencias",
    icon: MedicalIcon,
    roles: [Role.SUBDIRECCION],
  },
  {
    href: "/dashboard/admin",
    label: "Admin Usuarios",
    icon: UserIcon,
    roles: [Role.ADMIN, Role.DIRECCION],
  },
];

interface SidebarProps {
  userRole: Role;
  onLogout: () => void;
}

export default function Sidebar({
  userRole,
  onLogout,
}: Readonly<SidebarProps>) {
  const pathname = usePathname();

  const filteredItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-blue-800 text-white flex flex-col shadow-xl z-50">
      {/* Header / Logo */}
      <div className="p-6 border-b border-blue-700">
        <h1 className="text-xl font-bold">Intranet CESFAM</h1>
        <p className="text-xs text-blue-300 mt-1">Rol: {userRole}</p>
      </div>

      {/* Navegación */}
      <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (pathname.startsWith(item.href) && item.href !== "/dashboard");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center p-3 rounded-lg transition duration-150 ${
                isActive
                  ? "bg-blue-600 font-semibold shadow-md"
                  : "hover:bg-blue-700"
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-blue-700">
        <button
          onClick={onLogout}
          className="w-full flex items-center p-3 rounded-lg text-left transition duration-150 hover:bg-red-600 bg-red-700 font-semibold"
        >
          <LogOutIcon className="w-5 h-5 mr-3" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
