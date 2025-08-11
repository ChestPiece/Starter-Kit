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
      // Admin gets full access: dashboard + all settings + users
      return {
        navMain: [
          ...baseNav,
          {
            title: "Settings",
            url: "#",
            items: [
              {
                title: "Profile Settings",
                url: "/settings?tab=profile",
                icon: RiSettings3Line,
                isActive: false,
              },
              {
                title: "Organization Settings",
                url: "/settings?tab=organization",
                icon: RiSettings3Line,
                isActive: false,
              },
              {
                title: "Appearance Settings",
                url: "/settings?tab=appearance",
                icon: RiSettings3Line,
                isActive: false,
              },
            ],
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
      // Manager gets dashboard + all settings components
      return {
        navMain: [
          ...baseNav,
          {
            title: "Management",
            url: "#",
            items: [
              {
                title: "Profile Settings",
                url: "/settings?tab=profile",
                icon: RiSettings3Line,
                isActive: false,
              },
              {
                title: "Organization Settings",
                url: "/settings?tab=organization",
                icon: RiSettings3Line,
                isActive: false,
              },
              {
                title: "Appearance Settings",
                url: "/settings?tab=appearance",
                icon: RiSettings3Line,
                isActive: false,
              },
            ],
          },
        ],
      };

    case "user":
    default:
      // Simple user gets dashboard only (can access profile via settings but limited navigation)
      return {
        navMain: [
          ...baseNav,
          {
            title: "Personal",
            url: "#",
            items: [
              {
                title: "Profile Settings",
                url: "/settings?tab=profile",
                icon: RiSettings3Line,
                isActive: false,
              },
            ],
          },
        ],
      };
  }
};
