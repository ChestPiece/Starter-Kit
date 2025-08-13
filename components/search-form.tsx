"use client";

import { useId, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarInput } from "@/components/ui/sidebar";
import { SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import { RiSearch2Line, RiCloseLine } from "@remixicon/react";
import { cn } from "@/lib/utils";

interface SearchableItem {
  title: string;
  url: string;
  section?: string;
  description?: string;
}

interface SearchFormProps extends React.ComponentProps<"form"> {
  navItems?: any[];
}

export function SearchForm({ navItems = [], ...props }: SearchFormProps) {
  const id = useId();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Create searchable items from navigation
  const searchableItems: SearchableItem[] = [];

  navItems.forEach((section) => {
    // Add settings as searchable item
    if (section.title === "Settings") {
      searchableItems.push({
        title: "Settings",
        url: "/settings",
        section: section.title,
        description: "Application settings and preferences",
      });
    }

    // Add navigation items
    section.items?.forEach((item: any) => {
      searchableItems.push({
        title: item.title,
        url: item.url,
        section: section.title,
        description: getItemDescription(item.title),
      });

      // Add sub-items if they exist
      item.items?.forEach((subItem: any) => {
        searchableItems.push({
          title: subItem.title,
          url: subItem.url,
          section: `${section.title} > ${item.title}`,
          description: getItemDescription(subItem.title),
        });
      });
    });
  });

  function getItemDescription(title: string): string {
    const descriptions: Record<string, string> = {
      Dashboard: "View overview and analytics",
      Users: "Manage user accounts and permissions",
      Settings: "Configure application settings",
    };
    return descriptions[title] || `Navigate to ${title}`;
  }

  // Filter items based on query
  const filteredItems = query.trim()
    ? searchableItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.section?.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.trim().length > 0);
    setSelectedIndex(0);
  };

  // Handle navigation to selected item
  const navigateToItem = (item: SearchableItem) => {
    router.push(item.url);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredItems.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredItems.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          navigateToItem(filteredItems[selectedIndex]);
        }
        break;
      case "Escape":
        setQuery("");
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle "/" key shortcut to focus search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !isInputFocused()) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    const isInputFocused = () => {
      const activeElement = document.activeElement as HTMLElement;
      return (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.contentEditable === "true")
      );
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Clear search
  const clearSearch = () => {
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={resultsRef}>
      <form {...props} onSubmit={(e) => e.preventDefault()}>
        <SidebarGroup className="py-0">
          <SidebarGroupContent className="relative">
            <div className="relative">
              <SidebarInput
                ref={inputRef}
                id={id}
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className={cn("ps-9", query ? "pe-9" : "pe-9")}
                placeholder="Search..."
                aria-label="Search navigation and features"
                autoComplete="off"
              />
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/60 peer-disabled:opacity-50">
                <RiSearch2Line size={20} aria-hidden="true" />
              </div>
              <div className="absolute inset-y-0 end-0 flex items-center justify-center pe-2">
                {query ? (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <RiCloseLine size={16} />
                  </button>
                ) : (
                  <kbd className="inline-flex size-5 max-h-full items-center justify-center rounded bg-input px-1 font-[inherit] text-[0.625rem] font-medium text-muted-foreground/70">
                    /
                  </kbd>
                )}
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </form>

      {/* Search Results Dropdown */}
      {isOpen && filteredItems.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-96 overflow-y-auto">
          <div className="p-1">
            {filteredItems.map((item, index) => (
              <button
                key={`${item.url}-${index}`}
                onClick={() => navigateToItem(item)}
                className={cn(
                  "w-full text-left px-2 py-2 rounded-sm text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                  index === selectedIndex && "bg-accent text-accent-foreground"
                )}
              >
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {item.section && `${item.section} • `}
                  {item.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {isOpen && query.trim() && filteredItems.length === 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg">
          <div className="p-3 text-sm text-muted-foreground text-center">
            No results found for "{query}"
          </div>
        </div>
      )}
    </div>
  );
}
