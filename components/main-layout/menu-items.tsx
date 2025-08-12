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
      title: "Main",
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
      // Admin gets full access: dashboard + settings (single entry) + users
      return {
        navMain: [
          ...baseNav,
          {
            title: "Settings",
            url: "/settings",
            items: [],
          },
          {
            title: "Administration",
            url: "#",
            items: [
              {
                title: "Users",
                url: "/users",
                icon: RiTeamLine,
                isActive: false,
              },
            ],
          },
        ],
      };

    case "manager":
      // Manager gets dashboard + settings (single entry)
      return {
        navMain: [
          ...baseNav,
          {
            title: "Settings",
            url: "/settings",
            items: [],
          },
        ],
      };

    case "user":
    default:
      // Regular user sees only Dashboard in the sidebar
      return {
        navMain: [...baseNav],
      };
  }
};
