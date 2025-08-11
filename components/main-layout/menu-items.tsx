// Role restrictions removed - all users get full access
import {
  RiScanLine,
  RiMessage2Line,
  RiSettings3Line,
  RiTeamLine,
} from "@remixicon/react";

export const getNavData = (user: { roles?: { name: string } }) => {
  // Give ALL users full access to the application
  const fullAccessNav = [
    {
      title: "Sections",
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
    {
      title: "Application",
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
  ];

  // Return the same navigation for all users
  return { navMain: fullAccessNav };
};
