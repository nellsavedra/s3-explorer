"use client";

import { Home } from "lucide-react";
import React from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface PrefixBreadcrumbsProps {
  prefix: string;
  rootPrefix: string;
  homeLabel: string;
  onNavigate: (prefix: string) => void;
}

export function PrefixBreadcrumbs({
  prefix,
  rootPrefix,
  homeLabel,
  onNavigate,
}: PrefixBreadcrumbsProps) {
  const relative = prefix.startsWith(rootPrefix)
    ? prefix.slice(rootPrefix.length)
    : "";
  const segments = relative.split("/").filter(Boolean);

  const navigate =
    (target: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onNavigate(target);
    };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {segments.length === 0 ? (
            <BreadcrumbPage className="inline-flex items-center gap-1.5">
              <Home className="size-4" />
              {homeLabel}
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink
              href="#"
              onClick={navigate(rootPrefix)}
              className="inline-flex items-center gap-1.5"
            >
              <Home className="size-4" />
              {homeLabel}
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {segments.map((segment, index) => {
          const target = `${rootPrefix}${segments.slice(0, index + 1).join("/")}/`;
          const isLast = index === segments.length - 1;
          return (
            <React.Fragment key={target}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{segment}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href="#" onClick={navigate(target)}>
                    {segment}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
