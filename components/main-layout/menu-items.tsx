// Role-based navigation system
import {
  RiScanLine,
  RiMessage2Line,
  RiSettings3Line,
  RiTeamLine,
} from "@remixicon/react";

export const getNavData = (user: { roles?: { name: string } }) => {
  const userRole = user?.roles?.name || "user";

  // Base navigation available to all authenticated users
  const baseNav = [
    {
      title: "Dashboard",
      url: "#",
      items: [
        {
          title: "Dashboard",
          url: "/",
          icon: RiScanLine,
          isActive: false,
        },
      ],
    },
  ];

  // Role-specific navigation
  switch (userRole) {
    case "admin":
      // Admin gets full access to everything
      return {
        navMain: [
          ...baseNav,
          {
            title: "Administration",
            url: "#",
            items: [
              {
                title: "Settings",
                url: "/settings",
                icon: RiSettings3Line,
                isActive: false,
              },
              {
                title: "Users",
                url: "/users",
                icon: RiTeamLine,
                isActive: false,
                resource: "users",
              },
            ],
          },
        ],
      };

    case "manager":
      // Manager gets dashboard + settings only
      return {
        navMain: [
          ...baseNav,
          {
            title: "Management",
            url: "#",
            items: [
              {
                title: "Settings",
                url: "/settings",
                icon: RiSettings3Line,
                isActive: false,
              },
            ],
          },
        ],
      };

    case "user":
    default:
      // Simple user gets only dashboard (mini profile accessible via user dropdown)
      return {
        navMain: baseNav,
      };
  }
};
