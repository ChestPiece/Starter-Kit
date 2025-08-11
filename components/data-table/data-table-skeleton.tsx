import React from "react";
import { Skeleton } from "../ui/skeleton";

const DataTableSkeleton = ({ type }: { type: string }) => {
  return (
    <div className="animate-pulse w-full mb-4">
      {[...Array(type === "selections" ? 5 : 10)].map((_, i) => (
        <div key={i} className="h-[25px] p-2 border-b flex items-center">
          <Skeleton className="h-[20px] w-[97%] rounded-sm bg-primary/10" />
        </div>
      ))}
    </div>
  );
};

export default DataTableSkeleton;
